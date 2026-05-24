from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import google.generativeai as genai
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .config_loader import AppConfig


class GeminiExtractionError(Exception):
    pass


class GeminiClient:
    def __init__(self, config: AppConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger

        genai.configure(api_key=config.gemini.api_key)

        self._generation_config = {
            "temperature": config.gemini.temperature,
            "max_output_tokens": config.gemini.max_output_tokens,
            "response_mime_type": config.gemini.response_mime_type,
        }
        self._model = genai.GenerativeModel(
            model_name=config.gemini.model,
            generation_config=self._generation_config,
        )

    def extract_from_pdf(self, pdf_path: Path) -> list[dict[str, Any]]:
        return self._extract_with_retry(pdf_path)

    def _extract_with_retry(self, pdf_path: Path) -> list[dict[str, Any]]:
        attempts = max(1, self.config.processing.retry_attempts)
        min_wait = self.config.processing.retry_initial_wait
        max_wait = self.config.processing.retry_max_wait

        @retry(
            stop=stop_after_attempt(attempts),
            wait=wait_exponential(multiplier=min_wait, max=max_wait),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        )
        def _call() -> list[dict[str, Any]]:
            return self._call_api(pdf_path)

        return _call()

    def _call_api(self, pdf_path: Path) -> list[dict[str, Any]]:
        self.logger.info(f"  → ส่งให้ Gemini: {pdf_path.name}")

        uploaded_file = genai.upload_file(
            path=str(pdf_path),
            mime_type="application/pdf",
            display_name=pdf_path.name,
        )

        try:
            response = self._model.generate_content(
                [uploaded_file, self.config.prompt],
                request_options={"timeout": self.config.processing.request_timeout},
            )
        finally:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception as e:
                self.logger.warning(f"  ⚠ ลบไฟล์อัปโหลดบน Gemini ไม่สำเร็จ: {e}")

        if not response or not getattr(response, "text", None):
            raise GeminiExtractionError("Gemini คืนค่า response ว่าง")

        text = response.text.strip()
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as e:
            raise GeminiExtractionError(
                f"แปลง JSON ไม่สำเร็จ: {e}; raw={text[:500]}"
            ) from e

        if isinstance(parsed, dict):
            parsed = [parsed]
        if not isinstance(parsed, list):
            raise GeminiExtractionError(
                f"รูปแบบ JSON ไม่ใช่ array: type={type(parsed).__name__}"
            )

        return parsed
