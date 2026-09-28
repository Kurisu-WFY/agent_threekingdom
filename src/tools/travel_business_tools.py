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
    results = [row_to_dict(row) for row in rows]
    if not city or city in ('成都', '成都市'):
        if not any(r['spot_id'] == 'chengdu_wuhouci' for r in results):
            results.append({"spot_id": "chengdu_wuhouci", "name": "成都武侯祠博物馆", "city": "成都",
                "address": "成都市武侯祠大街231号", "theme_json": '["蜀汉","刘备","诸葛亮","三国文化"]',
                "suitable_users_json": '["大众","亲子","学术"]', "recommended_duration_min": None,
                "relation_level": "core", "open_time": "官网常规时间：08:30—18:30，17:30停止售票；特别开放安排以当日公告为准",
                "ticket_source_status": "official_page", "ticket_note": "官网公布全价50元/人、半价25元/人；优惠资格见官方票务规定。",
                "source_url": "https://www.wuhouci.net.cn/", "updated_at": "2026-09-28",
                "data_status": "maintained", "notes": "官网资料整理，非实时库存；未提供精确入口坐标。"})
    return results


def get_spot_ticket(spot_name_or_id: str) -> dict:
    if spot_name_or_id in ('chengdu_wuhouci', '成都武侯祠', '成都武侯祠博物馆'):
        return {"found": True, "spot_id": "chengdu_wuhouci", "name": "成都武侯祠博物馆", "city": "成都",
                "ticket_name": "全价门票", "price_min": 50, "price_max": 50, "currency": "CNY",
                "data_status": "maintained", "updated_at": "2026-09-28", "booking_url": "https://www.wuhouci.net.cn/",
                "sources": [{"title": "成都武侯祠博物馆官网", "source_url": "https://www.wuhouci.net.cn/", "source_level": "A"}],
                "warning": "官网页面价格，非实时库存；半价票25元，资格及特别活动以官方公告为准。"}
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
    data["data_status"] = {"manual_demo": "sample", "manual_pending": "pending"}.get(data.get("data_status"), data.get("data_status") or "pending")
    data["sources"] = []
    data["updated_at"] = None
    if data["data_status"] in ("sample", "pending"):
        for field in ("price_min", "price_max"):
            if data.get(field) == 0:
                data[field] = None
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


def recommend_route(city: str = "南充", hours: float | None = None, target_user: str | None = None,
                    excluded_place_ids: list[str] | None = None) -> dict:
    routes = list_route_templates(city=city, target_user=target_user)
    if not routes:
        return {"found": False, "message": "未找到匹配路线，需维护 route_templates 和 route_stops。", "route": None, "stops": []}
    if hours:
        routes = [r for r in routes if float(r["duration_hours"]) <= hours]
        routes = sorted(routes, key=lambda r: abs(float(r["duration_hours"]) - float(hours)))
    if not routes:
        message = "没有满足时长上限的文化路线模板，请增加时间或选择其他目的地。"
        return {"found": False, "message": message, "selection_reason": message, "route": None, "stops": []}
    detail = get_route_detail(routes[0]["route_id"])
    mapping = {"wanjuanlou": "nanchong_xishan_wanjuanlou", "hanhuanhouci": "nanchong_langzhong_huanhouci",
               "jianmenguan": "guangyuan_jianmen_shudao", "zhaohua": "guangyuan_zhaohua_ancient_city"}
    excluded = {mapping.get(value, value) for value in (excluded_place_ids or [])}
    detail["stops"] = [s for s in detail["stops"] if s["spot_id"] not in excluded]
    if not detail["stops"]:
        message = "模板景点均已完成或本次跳过，暂无其他可安排的站点。"
        return {"found": False, "message": message, "selection_reason": message, "route": None, "stops": []}
    for index, stop in enumerate(detail["stops"], 1):
        stop["stop_order"] = index
    detail["route"].update(data_status="sample", updated_at=None, sources=[])
    detail["selection_reason"] = "按城市与用户类型筛选，在时长上限内选择最接近的模板；交通与兴趣尚未用于路线优化。"
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
