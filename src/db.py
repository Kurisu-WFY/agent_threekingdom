import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from config import get_settings


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS scenic_spots (
    spot_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    theme_json TEXT NOT NULL DEFAULT '[]',
    relation_level TEXT NOT NULL DEFAULT 'candidate',
    ticket_source_status TEXT NOT NULL DEFAULT 'manual_pending',
    notes TEXT NOT NULL DEFAULT ''
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

CREATE TABLE IF NOT EXISTS external_tool_registry (
    tool_name TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    purpose TEXT NOT NULL,
    mcp_config_json TEXT NOT NULL DEFAULT '{}',
    data_freshness_rule TEXT NOT NULL DEFAULT '',
    risk_note TEXT NOT NULL DEFAULT ''
);
"""


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


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA_SQL)

