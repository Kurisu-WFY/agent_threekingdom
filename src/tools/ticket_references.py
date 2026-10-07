"""公开页面整理的门票参考表，不替换业务数据库或实时售票接口。"""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

REFERENCE_PATH = Path(__file__).resolve().parents[2] / "data/examples/ticket_references.json"


def find_ticket_reference(name_or_id: str) -> dict | None:
    """仅按已知名称和别名精确匹配，避免同名祠庙或景区串价。"""
    key = name_or_id.strip()
    records = json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))
    for row in records:
        if key not in [row["spot_id"], row["name"], *row.get("aliases", [])]:
            continue
        result = deepcopy(row)
        result["found"] = True
        result["is_realtime"] = False
        result["source_type"] = "maintained_web_reference"
        result["booking_url"] = result["sources"][0]["source_url"]
        result["source_url"] = result["booking_url"]
        result["warning"] = "预计费用参考，实际金额与票种以购票页面为准。"
        return result
    return None
