from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from db import connect, init_db

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "data" / "examples"
TODAY = date.today().isoformat()


def load_json(name: str):
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


def seed_spots(conn):
    for spot in load_json("scenic_spots_northeast_sichuan.sample.json"):
        conn.execute(
            """
            INSERT OR REPLACE INTO scenic_spots
            (spot_id, name, city, address, lat, lng, theme_json, relation_level,
             recommended_duration_min, suitable_users_json, open_time,
             ticket_source_status, notes, source_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                spot["spot_id"], spot["name"], spot["city"], spot.get("address", ""), spot.get("lat"), spot.get("lng"),
                json.dumps(spot.get("theme", []), ensure_ascii=False), spot.get("relation_level", "candidate"),
                spot.get("recommended_duration_min", 90), json.dumps(spot.get("suitable_users", []), ensure_ascii=False),
                spot.get("open_time", ""), spot.get("ticket_source_status", "manual_fixed"), spot.get("notes", ""),
                spot.get("source_url", ""), spot.get("updated_at", TODAY),
            ),
        )
        ticket = spot.get("demo_ticket")
        if ticket:
            conn.execute(
                """
                INSERT OR REPLACE INTO spot_tickets
                (spot_id, ticket_name, price_min, price_max, currency, booking_url,
                 source_type, source_url, updated_at, data_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    spot["spot_id"], ticket.get("ticket_name", "成人票"), ticket.get("price_min"), ticket.get("price_max"),
                    ticket.get("currency", "CNY"), ticket.get("booking_url", ""), ticket.get("source_type", "manual_demo_table"),
                    ticket.get("source_url", ""), ticket.get("updated_at", TODAY), ticket.get("data_status", "manual_fixed"),
                    ticket.get("notes", "Demo 写死票价，上线前核验。"),
                ),
            )


def seed_hotels(conn):
    for row in load_json("hotel_budget_tiers.sample.json"):
        conn.execute(
            """
            INSERT OR REPLACE INTO hotel_budget_tiers
            (city, tier, price_min, price_max, currency, source_type, updated_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (row["city"], row["tier"], row["price_min"], row["price_max"], row.get("currency", "CNY"), row.get("source_type", "manual_demo_table"), row.get("updated_at", TODAY), row.get("notes", "Demo 预算档位。")),
        )


def seed_routes(conn):
    for route in load_json("routes.sample.json"):
        conn.execute(
            """
            INSERT OR REPLACE INTO route_templates
            (route_id, name, city, theme, target_user, duration_hours, transport_mode, summary, risk_note, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (route["route_id"], route["name"], route["city"], route.get("theme", "三国文化"), route.get("target_user", "大众"), route["duration_hours"], route.get("transport_mode", "步行/打车"), route.get("summary", ""), route.get("risk_note", ""), route.get("updated_at", TODAY)),
        )
        conn.execute("DELETE FROM route_stops WHERE route_id = ?", (route["route_id"],))
        for stop in route.get("stops", []):
            conn.execute(
                """
                INSERT INTO route_stops (route_id, stop_order, spot_id, stay_minutes, reason)
                VALUES (?, ?, ?, ?, ?)
                """,
                (route["route_id"], stop["stop_order"], stop["spot_id"], stop.get("stay_minutes", 60), stop.get("reason", "")),
            )


def seed_tool_registry(conn):
    tools = [
        ("12306-mcp", "Joooook/12306-mcp", "火车票查询", '{"transport":"train"}', "实时查询", "依赖开源 MCP 可用性和 12306 页面/接口变化。"),
        ("baidu-maps-mcp", "Baidu Maps", "POI/地理编码/路线", '{"poi":"hotel/scenic"}', "按调用实时", "需要百度地图开发者 Key 和额度。"),
        ("amap-mcp-server", "Amap", "POI/地理编码/天气/路线", '{"poi":"hotel/scenic","weather":"city"}', "按调用实时", "需要高德开放平台 Key 和额度。"),
    ]
    for item in tools:
        conn.execute(
            """INSERT OR REPLACE INTO external_tool_registry
            (tool_name, provider, purpose, mcp_config_json, data_freshness_rule, risk_note)
            VALUES (?, ?, ?, ?, ?, ?)""",
            item,
        )


def main() -> None:
    init_db()
    with connect() as conn:
        seed_spots(conn)
        seed_hotels(conn)
        seed_routes(conn)
        seed_tool_registry(conn)
    print("Business database seeded")


if __name__ == "__main__":
    main()
