from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

from .config_loader import AppConfig
from .document_grouper import DocumentGrouper
from .gemini_client import GeminiClient
from .group_extractor import GroupExtractor
from .page_classifier import PageClassifier
from .pdf_splitter import format_page_range, split_pdf_to_pages


class ClaimsPipeline:
    """Pipeline 6 ขั้นตอน:
    1. Split Page → แยก PDF เป็นหน้าๆ
    2. OCR + Classify ทีละหน้า (ขนาน)
    3. Group เอกสาร (deterministic)
    4. Extract ทีละกลุ่ม
    5. รวมผลลัพธ์ + เติม provenance
    """

    def __init__(self, config: AppConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.client = GeminiClient(config, logger)
        self.classifier = PageClassifier(self.client, config, logger)
        self.grouper = DocumentGrouper(logger)
        self.extractor = GroupExtractor(self.client, config, logger)

    def process_pdf(self, pdf_path: Path) -> list[dict[str, Any]]:
        self.logger.info(f"┌── Pipeline: {pdf_path.name}")

        with tempfile.TemporaryDirectory(prefix="claim_pipeline_") as tmp:
            tmp_dir = Path(tmp)

            self.logger.info("│  [1/5] Split Page")
            pages = split_pdf_to_pages(pdf_path, tmp_dir / "pages")
            self.logger.info(f"│        → {len(pages)} หน้า")

            self.logger.info("│  [2/5] OCR + Classify ทีละหน้า")
            page_infos = self.classifier.classify_all(pages)
            failed_pages = [p for p in page_infos if p.error]
            if failed_pages:
                self.logger.warning(
                    f"│        ⚠ classify ล้มเหลว {len(failed_pages)} หน้า"
                )

            self.logger.info("│  [3/5] Group เอกสาร")
            groups = self.grouper.group(page_infos)
            self.logger.info(f"│        → {len(groups)} กลุ่ม")

            self.logger.info("│  [4/5] Extract ทีละกลุ่ม")
            all_records: list[dict[str, Any]] = []
            for grp in groups:
                try:
                    recs = self.extractor.extract(grp, tmp_dir / "groups")
                except Exception as e:
                    self.logger.error(
                        f"│        ✗ Group {grp.group_id} extract ล้มเหลว: {e}"
                    )
                    continue

                page_range = format_page_range(grp.page_numbers)
                for r in recs:
                    r["source_file"] = pdf_path.name
                    r["page_range"] = page_range
                all_records.extend(recs)

            self.logger.info(
                f"│  [5/5] รวมผลลัพธ์ → {len(all_records)} เรกคอร์ด"
            )
            self.logger.info(f"└── เสร็จ: {pdf_path.name}")
            return all_records
