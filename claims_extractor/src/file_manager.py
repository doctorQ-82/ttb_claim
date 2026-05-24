from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


def list_pdfs(input_dir: Path) -> list[Path]:
    if not input_dir.exists():
        return []
    return sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() == ".pdf"
    )


def move_file(src: Path, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / src.name

    if target.exists():
        stem, suffix = src.stem, src.suffix
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = dest_dir / f"{stem}_{ts}{suffix}"

    shutil.move(str(src), str(target))
    return target
