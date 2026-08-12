import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from db import connect, init_db


ROOT = Path(__file__).resolve().parents[2]
SPOTS_PATH = ROOT / "data" / "examples" / "scenic_spots_northeast_sichuan.sample.json"
HOTEL_TIERS_PATH = ROOT / "data" / "examples" / "hotel_budget_tiers.sample.json"
MCP_CONFIG_PATH = ROOT / "config" / "mcp_servers.example.json"


DEMO_TICKETS = [
    {
        "spot_id": "nanchong_xishan_wanjuanlou",
        "ticket_name": "景区门票",
        "price_min": None,
        "price_max": None,
        "updated_at": "2026-08-09",
        "notes": "Demo 阶段暂不填具体价格，需人工核实官方来源后写入。",
    },
    {
        "spot_id": "nanchong_langzhong_huanhouci",
        "ticket_name": "景区门票",
        "price_min": None,
        "price_max": None,
        "updated_at": "2026-08-09",
        "notes": "Demo 阶段暂不填具体价格，需人工核实官方来源后写入。",
    },
    {
        "spot_id": "guangyuan_jianmen_shudao",
        "ticket_name": "景区门票",
        "price_min": None,
        "price_max": None,
        "updated_at": "2026-08-09",
        "notes": "已有官方 A 级景区名录线索，但具体票价仍应以最新官方页面为准。",
    },
]


def seed_spots() -> None:
    spots = json.loads(SPOTS_PATH.read_text(encoding="utf-8"))
    with connect() as conn:
        for spot in spots:
            conn.execute(
                """
                INSERT OR REPLACE INTO scenic_spots
                (spot_id, name, city, theme_json, relation_level, ticket_source_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    spot["spot_id"],
                    spot["name"],
                    spot["city"],
                    json.dumps(spot.get("theme", []), ensure_ascii=False),
                    spot.get("relation_level", "candidate"),
                    spot.get("ticket_source_status", "manual_pending"),
                    spot.get("notes", ""),
                ),
            )


def seed_tickets() -> None:
    with connect() as conn:
        conn.execute("DELETE FROM spot_tickets")
        for ticket in DEMO_TICKETS:
            conn.execute(
                """
                INSERT INTO spot_tickets
                (spot_id, ticket_name, price_min, price_max, updated_at, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    ticket["spot_id"],
                    ticket["ticket_name"],
                    ticket["price_min"],
                    ticket["price_max"],
                    ticket["updated_at"],
                    ticket["notes"],
                ),
            )


def seed_hotel_tiers() -> None:
    cities = json.loads(HOTEL_TIERS_PATH.read_text(encoding="utf-8"))
    with connect() as conn:
        for city_item in cities:
            for tier in city_item["budget_tiers"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO hotel_budget_tiers
                    (city, tier, price_min, price_max, currency, source_type, updated_at, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        city_item["city"],
                        tier["tier"],
                        tier["price_min"],
                        tier["price_max"],
                        tier.get("currency", "CNY"),
                        city_item.get("source_type", "manual_demo_table"),
                        city_item.get("updated_at", "2026-08-09"),
                        tier.get("notes", ""),
                    ),
                )


def seed_tool_registry() -> None:
    mcp_config = json.loads(MCP_CONFIG_PATH.read_text(encoding="utf-8"))
    with connect() as conn:
        for name, cfg in mcp_config.get("mcpServers", {}).items():
            conn.execute(
                """
                INSERT OR REPLACE INTO external_tool_registry
                (tool_name, provider, purpose, mcp_config_json, data_freshness_rule, risk_note)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    cfg.get("github", cfg.get("url", "local")),
                    ",".join(cfg.get("enabled_for", [])),
                    json.dumps(cfg, ensure_ascii=False),
                    "realtime_or_external",
                    cfg.get("notes", ""),
                ),
            )


def main() -> None:
    init_db()
    seed_spots()
    seed_tickets()
    seed_hotel_tiers()
    seed_tool_registry()
    print("Business database seeded")


if __name__ == "__main__":
    main()
