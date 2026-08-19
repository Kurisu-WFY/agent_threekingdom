from __future__ import annotations

from datetime import date
from typing import Any

from db import connect, init_db


def row_to_dict(row: Any) -> dict:
    return dict(row) if row else {}


def ensure_demo_data() -> None:
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT 1 FROM scenic_spots LIMIT 1").fetchone()
    if row:
        return
    from ingest.seed_business_db import main as seed_business_db

    seed_business_db()


def list_scenic_spots(city: str | None = None) -> list[dict]:
    ensure_demo_data()
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
    ensure_demo_data()
    pattern = f"%{spot_name_or_id}%"
    with connect() as conn:
        row = conn.execute(
            """
            SELECT s.spot_id, s.name, s.city, s.ticket_source_status,
                   t.ticket_name, t.price_min, t.price_max, t.currency, t.booking_url,
                   t.source_type, t.source_url, t.updated_at, t.data_status, t.notes
            FROM scenic_spots s
            LEFT JOIN spot_tickets t ON s.spot_id = t.spot_id
            WHERE s.spot_id = ? OR s.name LIKE ?
            ORDER BY t.updated_at DESC
            LIMIT 1
            """,
            (spot_name_or_id, pattern),
        ).fetchone()
    if not row:
        return {"found": False, "message": "未找到该景区，需在 scenic_spots 表维护基础信息。"}
    data = row_to_dict(row)
    data["found"] = True
    if data.get("price_min") is None:
        data["warning"] = "当前只有景区记录，没有已核实票价；正式展示前需补充官方或 OTA 来源。"
    return data


def estimate_hotel_budget(city: str, tier: str = "舒适型", nights: int = 1, rooms: int = 1) -> dict:
    ensure_demo_data()
    nights = max(int(nights or 1), 1)
    rooms = max(int(rooms or 1), 1)
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM hotel_budget_tiers WHERE city LIKE ? AND tier = ? LIMIT 1",
            (f"%{city}%", tier),
        ).fetchone()
    if not row:
        return {"found": False, "message": "未找到该城市/档位的酒店预算，请维护 hotel_budget_tiers 表。"}
    data = row_to_dict(row)
    data.update({
        "found": True,
        "nights": nights,
        "rooms": rooms,
        "total_min": data["price_min"] * nights * rooms,
        "total_max": data["price_max"] * nights * rooms,
        "warning": "该结果为人工预算档位估算，不是实时锁价；实际价格以酒店或 OTA 下单页为准。",
    })
    return data


def search_hotel_poi_request(city: str, near_spot: str | None = None, keyword: str = "酒店") -> dict:
    return {
        "action": "call_external_mcp",
        "preferred_tools": ["baidu-maps-mcp", "amap-mcp-server"],
        "tool_purpose": "poi_search",
        "parameters": {"city": city, "keyword": keyword, "near_spot": near_spot},
        "note": "本地只封装调用意图；真实 POI 查询由 Agent 平台调用百度/高德 MCP。",
    }


def list_route_templates(city: str | None = None, target_user: str | None = None) -> list[dict]:
    ensure_demo_data()
    sql = "SELECT * FROM route_templates WHERE 1=1"
    params: list[Any] = []
    if city:
        sql += " AND city LIKE ?"
        params.append(f"%{city}%")
    if target_user:
        sql += " AND (target_user = ? OR target_user = '大众')"
        params.append(target_user)
    sql += " ORDER BY duration_hours, name"
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [row_to_dict(row) for row in rows]


def get_route_detail(route_id: str) -> dict:
    ensure_demo_data()
    with connect() as conn:
        route = conn.execute("SELECT * FROM route_templates WHERE route_id = ?", (route_id,)).fetchone()
        stops = conn.execute(
            """
            SELECT rs.stop_order, rs.stay_minutes, rs.reason,
                   s.spot_id, s.name, s.city, s.address, s.recommended_duration_min, s.open_time
            FROM route_stops rs
            JOIN scenic_spots s ON s.spot_id = rs.spot_id
            WHERE rs.route_id = ?
            ORDER BY rs.stop_order
            """,
            (route_id,),
        ).fetchall()
    if not route:
        return {"found": False, "message": "未找到路线模板，请维护 route_templates 表。"}
    return {"found": True, "route": row_to_dict(route), "stops": [row_to_dict(row) for row in stops]}


def recommend_route(city: str = "南充", hours: float | None = None, target_user: str | None = None) -> dict:
    routes = list_route_templates(city=city, target_user=target_user)
    if not routes:
        return {"found": False, "message": "未找到匹配路线，需维护 route_templates 和 route_stops。"}
    if hours:
        routes = sorted(routes, key=lambda r: abs(float(r["duration_hours"]) - float(hours)))
    detail = get_route_detail(routes[0]["route_id"])
    detail["selection_reason"] = "按城市、用户类型和时长接近度选择。"
    return detail


def plan_budget(city: str, hotel_tier: str = "舒适型", nights: int = 1, rooms: int = 1, train_budget: float = 0) -> dict:
    hotel = estimate_hotel_budget(city=city, tier=hotel_tier, nights=nights, rooms=rooms)
    if not hotel.get("found"):
        return hotel
    return {
        "found": True,
        "city": city,
        "hotel": hotel,
        "train_budget": train_budget,
        "estimated_total_min": hotel["total_min"] + train_budget,
        "estimated_total_max": hotel["total_max"] + train_budget,
        "generated_at": date.today().isoformat(),
        "warning": "预算只包含住宿和传入的路费，不含餐饮、打车、演出、购物和节假日涨价。",
    }
