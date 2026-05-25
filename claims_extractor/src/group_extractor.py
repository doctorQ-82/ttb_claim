from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from .config_loader import AppConfig
from .document_grouper import ClaimGroup
from .gemini_client import GeminiClient
from .pdf_splitter import merge_pages


class GroupExtractor:
    def __init__(self, client: GeminiClient, config: AppConfig, logger: logging.Logger):
        self.client = client
        self.config = config
        self.logger = logger
        self.prompt = config.extraction_prompt

    def extract(self, group: ClaimGroup, work_dir: Path) -> list[dict[str, Any]]:
        merged_pdf = work_dir / f"group_{group.group_id:02d}.pdf"
        merge_pages([pi.pdf_path for pi in group.page_infos], merged_pdf)

        self.logger.info(
            f"    ⊳ Extract group {group.group_id} "
            f"({len(group.page_infos)} หน้า) → ส่งให้ Gemini"
        )

        result = self.client.run_json_on_pdf(merged_pdf, self.prompt)

        if isinstance(result, dict):
            records = [result]
        elif isinstance(result, list):
            records = [r for r in result if isinstance(r, dict)]
        else:
            records = []

        return records
