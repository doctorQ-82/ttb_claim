from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .page_classifier import PageInfo


def _is_na(v: str | None) -> bool:
    return not v or v.strip().upper() == "N/A"


@dataclass
class ClaimGroup:
    group_id: int
    page_infos: list[PageInfo] = field(default_factory=list)
    policy_number: str = "N/A"
    insured_name: str = "N/A"

    @property
    def page_numbers(self) -> list[int]:
        return [p.page_no for p in self.page_infos]


class DocumentGrouper:
    """จัดกลุ่มหน้าตาม (policy_number, insured_name).

    Rule:
    - หน้าที่มี identifier ไม่ N/A และตรงกับกลุ่มปัจจุบัน → ใส่กลุ่มเดิม
    - หน้าที่มี identifier ไม่ N/A และไม่ตรงกับกลุ่มปัจจุบัน → เริ่มกลุ่มใหม่
    - หน้าที่ identifier เป็น N/A ทั้งคู่ → ใส่กลุ่มปัจจุบัน (ติด anchor ล่าสุด)
    - ถ้าทั้งไฟล์ไม่มีหน้าที่ระบุ identifier เลย → เป็น 1 กลุ่ม
    """

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def group(self, pages: list[PageInfo]) -> list[ClaimGroup]:
        if not pages:
            return []

        groups: list[ClaimGroup] = []
        current: ClaimGroup | None = None

        for p in pages:
            page_policy = None if _is_na(p.policy_number) else p.policy_number
            page_name = None if _is_na(p.insured_name) else p.insured_name

            if current is None:
                current = ClaimGroup(
                    group_id=1,
                    page_infos=[p],
                    policy_number=page_policy or "N/A",
                    insured_name=page_name or "N/A",
                )
                groups.append(current)
                continue

            cur_policy = None if _is_na(current.policy_number) else current.policy_number
            cur_name = None if _is_na(current.insured_name) else current.insured_name

            policy_conflict = (
                page_policy is not None and cur_policy is not None
                and page_policy != cur_policy
            )
            name_conflict = (
                page_name is not None and cur_name is not None
                and page_name != cur_name
            )

            if policy_conflict or name_conflict:
                current = ClaimGroup(
                    group_id=len(groups) + 1,
                    page_infos=[p],
                    policy_number=page_policy or "N/A",
                    insured_name=page_name or "N/A",
                )
                groups.append(current)
            else:
                current.page_infos.append(p)
                if cur_policy is None and page_policy is not None:
                    current.policy_number = page_policy
                if cur_name is None and page_name is not None:
                    current.insured_name = page_name

        for g in groups:
            self.logger.info(
                f"    ◆ Group {g.group_id}: pages={g.page_numbers} "
                f"| policy={g.policy_number} | name={g.insured_name[:30]}"
            )
        return groups
