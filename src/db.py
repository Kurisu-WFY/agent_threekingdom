import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from san_guo_core.settings import get_settings


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS scenic_spots (
    spot_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    lat REAL,
    lng REAL,
    theme_json TEXT NOT NULL DEFAULT '[]',
    relation_level TEXT NOT NULL DEFAULT 'candidate',
    recommended_duration_min INTEGER NOT NULL DEFAULT 90,
    suitable_users_json TEXT NOT NULL DEFAULT '[]',
    open_time TEXT NOT NULL DEFAULT '',
    ticket_source_status TEXT NOT NULL DEFAULT 'manual_pending',
    notes TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS spot_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_id TEXT NOT NULL,
    ticket_name TEXT NOT NULL,
    price_min REAL,
    price_max REAL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    booking_url TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT 'manual_demo_table',
    source_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    data_status TEXT NOT NULL DEFAULT 'manual_fixed',
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE(spot_id, ticket_name),
    FOREIGN KEY (spot_id) REFERENCES scenic_spots(spot_id)
);

CREATE TABLE IF NOT EXISTS hotel_budget_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    tier TEXT NOT NULL,
    price_min REAL NOT NULL,
    price_max REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    source_type TEXT NOT NULL DEFAULT 'manual_demo_table',
    updated_at TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE(city, tier)
);

CREATE TABLE IF NOT EXISTS route_templates (
    route_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT '三国文化',
    target_user TEXT NOT NULL DEFAULT '大众',
    duration_hours REAL NOT NULL,
    transport_mode TEXT NOT NULL DEFAULT '步行/打车',
    summary TEXT NOT NULL DEFAULT '',
    risk_note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id TEXT NOT NULL,
    stop_order INTEGER NOT NULL,
    spot_id TEXT NOT NULL,
    stay_minutes INTEGER NOT NULL DEFAULT 60,
    reason TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (route_id) REFERENCES route_templates(route_id),
    FOREIGN KEY (spot_id) REFERENCES scenic_spots(spot_id),
    UNIQUE(route_id, stop_order)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    user_profile_json TEXT NOT NULL DEFAULT '{}',
    preferences_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_plans (
    plan_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    route_id TEXT NOT NULL DEFAULT '',
    itinerary_json TEXT NOT NULL DEFAULT '{}',
    budget_json TEXT NOT NULL DEFAULT '{}',
    assumptions_json TEXT NOT NULL DEFAULT '[]',
    warnings_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_documents (
    doc_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_path TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    authority_level TEXT NOT NULL DEFAULT 'C',
    updated_at TEXT NOT NULL DEFAULT '',
    checksum TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS knowledge_chunk_metadata (
    chunk_id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT '',
    spot_id TEXT NOT NULL DEFAULT '',
    time_period TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    confidence TEXT NOT NULL DEFAULT 'medium',
    FOREIGN KEY (doc_id) REFERENCES source_documents(doc_id)
);

CREATE TABLE IF NOT EXISTS external_tool_registry (
    tool_name TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    purpose TEXT NOT NULL,
    mcp_config_json TEXT NOT NULL DEFAULT '{}',
    data_freshness_rule TEXT NOT NULL DEFAULT '',
    risk_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tool_call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL,
    request_json TEXT NOT NULL DEFAULT '{}',
    response_summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'unknown',
    created_at TEXT NOT NULL
);
"""

MIGRATIONS = {
    "scenic_spots": {
        "address": "TEXT NOT NULL DEFAULT ''",
        "lat": "REAL",
        "lng": "REAL",
        "recommended_duration_min": "INTEGER NOT NULL DEFAULT 90",
        "suitable_users_json": "TEXT NOT NULL DEFAULT '[]'",
        "open_time": "TEXT NOT NULL DEFAULT ''",
        "source_url": "TEXT NOT NULL DEFAULT ''",
        "updated_at": "TEXT NOT NULL DEFAULT ''",
    },
}


def get_db_path() -> Path:
    return get_settings().business_db_path


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {row[1] for row in rows}


def _migrate_existing_tables(conn: sqlite3.Connection) -> None:
    for table, columns in MIGRATIONS.items():
        existing = _columns(conn, table)
        if not existing:
            continue
        for name, ddl in columns.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA_SQL)
        _migrate_existing_tables(conn)
