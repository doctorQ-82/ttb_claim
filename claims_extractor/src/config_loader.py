from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


@dataclass
class GeminiConfig:
    model: str
    temperature: float
    max_output_tokens: int
    response_mime_type: str
    api_key: str


@dataclass
class PathsConfig:
    input_dir: Path
    processed_dir: Path
    failed_dir: Path
    output_dir: Path
    logs_dir: Path


@dataclass
class ProcessingConfig:
    max_workers: int
    retry_attempts: int
    retry_initial_wait: float
    retry_max_wait: float
    request_timeout: int


@dataclass
class ExcelColumn:
    key: str
    header: str


@dataclass
class ExcelConfig:
    filename_template: str
    sheet_name: str
    columns: list[ExcelColumn] = field(default_factory=list)


@dataclass
class AppConfig:
    gemini: GeminiConfig
    paths: PathsConfig
    processing: ProcessingConfig
    excel: ExcelConfig
    prompt: str


def _resolve_path(base: Path, value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else (base / p).resolve()


def load_config(config_path: str | Path = "config.yaml") -> AppConfig:
    load_dotenv()

    config_path = Path(config_path).resolve()
    base_dir = config_path.parent

    with open(config_path, "r", encoding="utf-8") as f:
        raw: dict[str, Any] = yaml.safe_load(f)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY ไม่ถูกตั้งค่า — กรุณาสร้างไฟล์ .env และระบุ API Key"
        )

    gemini_raw = raw.get("gemini", {})
    gemini = GeminiConfig(
        model=gemini_raw.get("model", "gemini-2.0-flash"),
        temperature=float(gemini_raw.get("temperature", 0.1)),
        max_output_tokens=int(gemini_raw.get("max_output_tokens", 8192)),
        response_mime_type=gemini_raw.get("response_mime_type", "application/json"),
        api_key=api_key,
    )

    paths_raw = raw.get("paths", {})
    paths = PathsConfig(
        input_dir=_resolve_path(base_dir, paths_raw.get("input_dir", "input")),
        processed_dir=_resolve_path(base_dir, paths_raw.get("processed_dir", "processed")),
        failed_dir=_resolve_path(base_dir, paths_raw.get("failed_dir", "failed")),
        output_dir=_resolve_path(base_dir, paths_raw.get("output_dir", "output")),
        logs_dir=_resolve_path(base_dir, paths_raw.get("logs_dir", "logs")),
    )

    proc_raw = raw.get("processing", {})
    processing = ProcessingConfig(
        max_workers=int(proc_raw.get("max_workers", 4)),
        retry_attempts=int(proc_raw.get("retry_attempts", 3)),
        retry_initial_wait=float(proc_raw.get("retry_initial_wait", 2)),
        retry_max_wait=float(proc_raw.get("retry_max_wait", 30)),
        request_timeout=int(proc_raw.get("request_timeout", 120)),
    )

    excel_raw = raw.get("excel", {})
    columns = [
        ExcelColumn(key=c["key"], header=c["header"])
        for c in excel_raw.get("columns", [])
    ]
    excel = ExcelConfig(
        filename_template=excel_raw.get(
            "filename_template", "claims_extract_{timestamp}.xlsx"
        ),
        sheet_name=excel_raw.get("sheet_name", "Claims"),
        columns=columns,
    )

    prompt = raw.get("prompt", "").strip()
    if not prompt:
        raise RuntimeError("config.yaml ไม่มี prompt — กรุณาตรวจสอบ")

    for p in (paths.input_dir, paths.processed_dir, paths.failed_dir,
              paths.output_dir, paths.logs_dir):
        p.mkdir(parents=True, exist_ok=True)

    return AppConfig(
        gemini=gemini,
        paths=paths,
        processing=processing,
        excel=excel,
        prompt=prompt,
    )
