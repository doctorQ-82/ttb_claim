from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from .config_loader import AppConfig


class GeminiExtractionError(Exception):
    pass


def _extract_retry_delay(exc: Exception) -> float | None:
    """ดึง retryDelay (วินาที) จาก ClientError ของ Gemini 429 — None ถ้าหาไม่เจอ."""
    if not isinstance(exc, genai_errors.ClientError):
        return None
    try:
        body: Any = None
        if hasattr(exc, "details") and exc.details:
            body = exc.details
        elif len(getattr(exc, "args", ())) >= 2 and isinstance(exc.args[1], dict):
            body = exc.args[1]
        if not body:
            return None
        for d in body.get("error", {}).get("details", []):
            t = d.get("@type", "")
            if t.endswith("RetryInfo"):
                delay = d.get("retryDelay", "")
                if isinstance(delay, str) and delay.endswith("s"):
                    return float(delay[:-1])
    except Exception:
        return None
    return None


class GeminiClient:
    def __init__(self, config: AppConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger

        self._client = genai.Client(
            api_key=config.gemini.api_key,
            http_options=types.HttpOptions(
                timeout=config.processing.request_timeout * 1000,
            ),
        )
        self._generation_config = types.GenerateContentConfig(
            temperature=config.gemini.temperature,
            max_output_tokens=config.gemini.max_output_tokens,
            response_mime_type=config.gemini.response_mime_type,
        )

    def run_json_on_pdf(self, pdf_path: Path, prompt: str) -> Any:
        """อัปโหลด PDF + ส่ง prompt → คืนค่า JSON ที่ parse แล้ว (มี retry รวมถึง 429)."""
        attempts = max(1, self.config.processing.retry_attempts)
        min_wait = self.config.processing.retry_initial_wait
        max_wait = self.config.processing.retry_max_wait

        last_exc: Exception | None = None
        for i in range(attempts):
            try:
                return self._call_api(pdf_path, prompt)
            except Exception as e:
                last_exc = e
                if i == attempts - 1:
                    break
                api_delay = _extract_retry_delay(e)
                if api_delay is not None:
                    delay = min(api_delay + 1.0, max_wait * 3)
                    self.logger.warning(
                        f"  ↺ 429 rate-limit — รอ {delay:.0f}s (API กำหนด) "
                        f"แล้ว retry ({i+1}/{attempts})"
                    )
                else:
                    delay = min(min_wait * (2 ** i), max_wait)
                    self.logger.warning(
                        f"  ↺ {type(e).__name__} — รอ {delay:.0f}s "
                        f"แล้ว retry ({i+1}/{attempts})"
                    )
                time.sleep(delay)

        assert last_exc is not None
        raise last_exc

    def _call_api(self, pdf_path: Path, prompt: str) -> Any:
        uploaded_file = self._client.files.upload(
            file=str(pdf_path),
            config=types.UploadFileConfig(
                mime_type="application/pdf",
                display_name=pdf_path.name,
            ),
        )

        try:
            response = self._client.models.generate_content(
                model=self.config.gemini.model,
                contents=[uploaded_file, prompt],
                config=self._generation_config,
            )
        finally:
            try:
                self._client.files.delete(name=uploaded_file.name)
            except Exception as e:
                self.logger.warning(f"  ⚠ ลบไฟล์อัปโหลดบน Gemini ไม่สำเร็จ: {e}")

        if not response or not getattr(response, "text", None):
            raise GeminiExtractionError("Gemini คืนค่า response ว่าง")

        text = response.text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise GeminiExtractionError(
                f"แปลง JSON ไม่สำเร็จ: {e}; raw={text[:500]}"
            ) from e
