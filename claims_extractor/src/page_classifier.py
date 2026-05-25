from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

from .config_loader import AppConfig
from .gemini_client import GeminiClient

PAGE_TYPES = {
    "policy_schedule",
    "claim_form",
    "insurance_card",
    "receipt",
    "medical_certificate",
    "medical_record",
    "id_document",
    "stamp_page",
    "other",
}


@dataclass
class PageInfo:
    page_no: int
    pdf_path: Path
    page_type: str = "other"
    policy_number: str = "N/A"
    insured_name: str = "N/A"
    received_date: str = "N/A"
    received_by: str = "N/A"
    summary: str = ""
    raw: dict = field(default_factory=dict)
    error: str | None = None


class PageClassifier:
    def __init__(self, client: GeminiClient, config: AppConfig, logger: logging.Logger):
        self.client = client
        self.config = config
        self.logger = logger
        self.prompt = config.classification_prompt

    def classify_all(self, pages: list[tuple[int, Path]]) -> list[PageInfo]:
        workers = max(1, min(self.config.processing.max_workers, len(pages)))
        results: dict[int, PageInfo] = {}

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(self._classify_one, page_no, pdf_path): page_no
                for page_no, pdf_path in pages
            }
            for fut in as_completed(futures):
                page_no = futures[fut]
                try:
                    results[page_no] = fut.result()
                except Exception as e:
                    self.logger.error(f"    ✗ Classify หน้า {page_no} ล้มเหลว: {e}")
                    pdf_path = next(p for n, p in pages if n == page_no)
                    results[page_no] = PageInfo(
                        page_no=page_no, pdf_path=pdf_path, error=str(e)
                    )

        return [results[n] for n, _ in pages]

    def _classify_one(self, page_no: int, pdf_path: Path) -> PageInfo:
        data = self.client.run_json_on_pdf(pdf_path, self.prompt)
        if isinstance(data, list):
            data = data[0] if data else {}
        if not isinstance(data, dict):
            data = {}

        page_type = (data.get("page_type") or "other").strip().lower()
        if page_type not in PAGE_TYPES:
            page_type = "other"

        info = PageInfo(
            page_no=page_no,
            pdf_path=pdf_path,
            page_type=page_type,
            policy_number=(data.get("policy_number") or "N/A").strip() or "N/A",
            insured_name=(data.get("insured_name") or "N/A").strip() or "N/A",
            received_date=(data.get("received_date") or "N/A").strip() or "N/A",
            received_by=(data.get("received_by") or "N/A").strip() or "N/A",
            summary=(data.get("page_summary") or "").strip(),
            raw=data,
        )
        self.logger.info(
            f"    ▸ p.{page_no:>2} | {info.page_type:<20} "
            f"| policy={info.policy_number} | name={info.insured_name[:30]}"
        )
        return info
