from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader, PdfWriter


def split_pdf_to_pages(pdf_path: Path, output_dir: Path) -> list[tuple[int, Path]]:
    """แยก PDF เป็นไฟล์หน้าละไฟล์ คืน list ของ (page_no, single_page_pdf_path).

    page_no เริ่มจาก 1.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(pdf_path))

    pages: list[tuple[int, Path]] = []
    for idx, page in enumerate(reader.pages, start=1):
        writer = PdfWriter()
        writer.add_page(page)
        out_path = output_dir / f"page_{idx:03d}.pdf"
        with open(out_path, "wb") as f:
            writer.write(f)
        pages.append((idx, out_path))

    return pages


def merge_pages(page_paths: list[Path], output_path: Path) -> Path:
    """รวมหลาย PDF หน้าเดียวกลับเป็นไฟล์เดียว (เรียงตามที่ส่งเข้ามา)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer = PdfWriter()
    for p in page_paths:
        reader = PdfReader(str(p))
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def format_page_range(page_numbers: list[int]) -> str:
    """แปลง [1,2,3,5,6] → '1-3,5-6'"""
    if not page_numbers:
        return ""
    nums = sorted(set(page_numbers))
    ranges: list[str] = []
    start = prev = nums[0]
    for n in nums[1:]:
        if n == prev + 1:
            prev = n
        else:
            ranges.append(f"{start}-{prev}" if start != prev else f"{start}")
            start = prev = n
    ranges.append(f"{start}-{prev}" if start != prev else f"{start}")
    return ",".join(ranges)
