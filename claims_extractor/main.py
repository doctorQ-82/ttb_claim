from __future__ import annotations

import argparse
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from src.config_loader import AppConfig, load_config
from src.excel_exporter import ExcelExporter
from src.file_manager import list_pdfs, move_file
from src.gemini_client import GeminiClient
from src.logger import setup_logger


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Health Claims PDF Extractor (Gemini Flash)"
    )
    parser.add_argument(
        "--config",
        default=str(Path(__file__).parent / "config.yaml"),
        help="Path ของไฟล์ config.yaml",
    )
    parser.add_argument(
        "--input-dir",
        default=None,
        help="โฟลเดอร์ที่เก็บ PDF (override config)",
    )
    parser.add_argument(
        "--single",
        action="store_true",
        help="ประมวลผลทีละไฟล์ (serial) แทนการรันพร้อมกัน",
    )
    parser.add_argument(
        "--file",
        default=None,
        help="ระบุไฟล์ PDF เพียงไฟล์เดียวที่จะประมวลผล",
    )
    return parser.parse_args()


def process_one(
    pdf_path: Path,
    client: GeminiClient,
    config: AppConfig,
    logger,
) -> tuple[Path, list[dict[str, Any]] | None, str | None]:
    try:
        logger.info(f"▶ เริ่มประมวลผล: {pdf_path.name}")
        records = client.extract_from_pdf(pdf_path)
        for r in records:
            r["source_file"] = pdf_path.name
        logger.info(f"✓ สำเร็จ: {pdf_path.name} — ดึงข้อมูล {len(records)} รายการ")
        return pdf_path, records, None
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        logger.error(f"✗ ล้มเหลว: {pdf_path.name} — {err}")
        logger.debug(traceback.format_exc())
        return pdf_path, None, err


def run(config: AppConfig, args: argparse.Namespace) -> int:
    logger = setup_logger(config.paths.logs_dir)
    logger.info("=" * 60)
    logger.info("Health Claims PDF Extractor — เริ่มทำงาน")
    logger.info("=" * 60)

    input_dir = Path(args.input_dir).resolve() if args.input_dir else config.paths.input_dir

    if args.file:
        single = Path(args.file).resolve()
        if not single.exists() or single.suffix.lower() != ".pdf":
            logger.error(f"ไม่พบไฟล์ PDF: {single}")
            return 2
        pdf_files = [single]
    else:
        pdf_files = list_pdfs(input_dir)

    if not pdf_files:
        logger.warning(f"ไม่พบไฟล์ PDF ใน {input_dir}")
        return 0

    logger.info(f"พบไฟล์ PDF: {len(pdf_files)} ไฟล์ (จาก {input_dir})")
    logger.info(f"โมเดล Gemini: {config.gemini.model}")

    client = GeminiClient(config, logger)

    all_records: list[dict[str, Any]] = []
    success_files: list[Path] = []
    failed_files: list[tuple[Path, str]] = []

    if args.single or len(pdf_files) == 1:
        for pdf in pdf_files:
            path, records, err = process_one(pdf, client, config, logger)
            if records is not None:
                all_records.extend(records)
                success_files.append(path)
            else:
                failed_files.append((path, err or "unknown"))
    else:
        workers = max(1, min(config.processing.max_workers, len(pdf_files)))
        logger.info(f"รันแบบขนาน (max_workers={workers})")
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(process_one, pdf, client, config, logger): pdf
                for pdf in pdf_files
            }
            for fut in as_completed(futures):
                path, records, err = fut.result()
                if records is not None:
                    all_records.extend(records)
                    success_files.append(path)
                else:
                    failed_files.append((path, err or "unknown"))

    if all_records:
        exporter = ExcelExporter(config.paths.output_dir, config.excel)
        output_path = exporter.export(all_records)
        logger.info(f"📊 Export Excel: {output_path}")
    else:
        logger.warning("ไม่มีข้อมูลให้ Export — ข้าม Excel")

    for path in success_files:
        try:
            moved = move_file(path, config.paths.processed_dir)
            logger.info(f"  → ย้ายไป processed/: {moved.name}")
        except Exception as e:
            logger.error(f"ย้ายไฟล์ {path.name} ไม่สำเร็จ: {e}")

    for path, err in failed_files:
        try:
            moved = move_file(path, config.paths.failed_dir)
            logger.info(f"  → ย้ายไป failed/: {moved.name} ({err})")
        except Exception as e:
            logger.error(f"ย้ายไฟล์ {path.name} ไม่สำเร็จ: {e}")

    logger.info("=" * 60)
    logger.info(
        f"สรุป: สำเร็จ {len(success_files)} / ล้มเหลว {len(failed_files)} "
        f"/ รวมเรกคอร์ดที่ดึงได้ {len(all_records)}"
    )
    logger.info("=" * 60)

    return 0 if not failed_files else 1


def main() -> int:
    args = parse_args()
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"[ERROR] โหลด config ไม่สำเร็จ: {e}", file=sys.stderr)
        return 2
    return run(config, args)


if __name__ == "__main__":
    sys.exit(main())
