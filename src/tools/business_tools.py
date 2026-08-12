from __future__ import annotations

from datetime import date
from typing import Any

from db import connect, init_db


def row_to_dict(row: Any) -> dict:
    return dict(row) if row else {}


def list_scenic_spots(city: str | None = None) -> list[dict]:
    init_db()
    with connect() as conn:
        if city:
            rows = conn.execute(
                "SELECT * FROM scenic_spots WHERE city LIKE ? ORDER BY relation_level, name",
                (f"%{city}%",),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM scenic_spots ORDER BY relation_level, city, name").fetchall()
    return [row_to_dict(row) for row in rows]


def get_spot_ticket(spot_name_or_id: str) -> dict:
    init_db()
    pattern = f"%{spot_name_or_id}%"
    with connect() as conn:
        row = conn.execute(
            """
            SELECT s.spot_id, s.name, s.city, t.ticket_name, t.price_min, t.price_max,
                   t.currency, t.booking_url, t.source_type, t.source_url, t.updated_at,
                   t.data_status, t.notes
            FROM scenic_spots s
            LEFT JOIN spot_tickets t ON s.spot_id = t.spot_id
            WHERE s.spot_id = ? OR s.name LIKE ?
            ORDER BY t.updated_at DESC
            LIMIT 1
            """,
            (spot_name_or_id, pattern),
        ).fetchone()

    if not row:
        return {"found": False, "message": "未找到该景区，请先在 scenic_spots 表维护。"}

    data = row_to_dict(row)
    data["found"] = True
    if data.get("price_min") is None:
        data["warning"] = "当前只有景区记录，没有已核实票价。Demo 可人工补价格，上线前必须补来源。"
    return data


def estimate_hotel_budget(city: str, tier: str = "舒适型", nights: int = 1, rooms: int = 1) -> dict:
    init_db()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT * FROM hotel_budget_tiers
            WHERE city LIKE ? AND tier = ?
            LIMIT 1
            """,
            (f"%{city}%", tier),
        ).fetchone()

    if not row:
        return {
            "found": False,
            "message": "未找到该城市/档位的酒店预算，请维护 hotel_budget_tiers 表。",
        }

    data = row_to_dict(row)
    data["found"] = True
    data["nights"] = nights
    data["rooms"] = rooms
    data["total_min"] = data["price_min"] * nights * rooms
    data["total_max"] = data["price_max"] * nights * rooms
    data["warning"] = "这是人工预算档位估算，不是实时锁价；实际价格以酒店或 OTA 下单页为准。"
    return data


def search_hotel_poi_request(city: str, near_spot: str | None = None, keyword: str = "酒店") -> dict:
    return {
        "action": "call_external_mcp",
        "preferred_tools": ["baidu-maps-mcp", "amap-mcp-server"],
        "tool_purpose": "poi_search",
        "parameters": {
            "city": city,
            "keyword": keyword,
            "near_spot": near_spot,
        },
        "note": "本地 MCP 只封装调用意图；真实 POI 查询应由 Agent 平台调用百度/高德 MCP。",
    }


def plan_budget(city: str, hotel_tier: str = "舒适型", nights: int = 1, rooms: int = 1, train_budget: float = 0) -> dict:
    hotel = estimate_hotel_budget(city=city, tier=hotel_tier, nights=nights, rooms=rooms)
    if not hotel.get("found"):
        return hotel
    return {
        "city": city,
        "hotel": hotel,
        "train_budget": train_budget,
        "estimated_total_min": hotel["total_min"] + train_budget,
        "estimated_total_max": hotel["total_max"] + train_budget,
        "generated_at": date.today().isoformat(),
        "warning": "预算只包含住宿和传入的路费，不含餐饮、打车、演出、购物和临时涨价。",
    }

