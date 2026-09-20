"""查看业务库（SQLite）：表结构、行数、实际取值。用于核对 data_status / 票价等到底存了什么。

用法：
    python docs/tools/inspect_db.py                       # 默认 <仓库>/data/processed/business.sqlite3
    python docs/tools/inspect_db.py --db path\\to.sqlite3

只用标准库。
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sqlite3

REPO = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO / "data" / "processed" / "business.sqlite3"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(DEFAULT_DB))
    ap.add_argument("--limit", type=int, default=4, help="每张表样例行数")
    args = ap.parse_args()

    path = pathlib.Path(args.db)
    if not path.exists():
        raise SystemExit(f"库不存在：{path}\n（先跑 src/ingest/seed_business_db.py，或让容器启动一次）")
    print(f"库文件：{path}  （{path.stat().st_size / 1024:.1f} KB）")

    con = sqlite3.connect(str(path))
    tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    print("表：", tables)

    for table in tables:
        if table == "sqlite_sequence":
            continue
        cols = [r[1] for r in con.execute(f"PRAGMA table_info({table})")]
        rows = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"\n[{table}] 行数={rows}\n  列：{cols}")
        for row in con.execute(f"SELECT * FROM {table} LIMIT {args.limit}"):
            print("   ", json.dumps(dict(zip(cols, row)), ensure_ascii=False))

    # 关心两个协议字段的实际取值
    print("\n=== 值得注意的取值 ===")
    try:
        vals = [r[0] for r in con.execute("SELECT DISTINCT data_status FROM spot_tickets")]
        print("  spot_tickets.data_status 出现过的值：", vals,
              "（协议只允许 sample|maintained|live|pending|stale）")
    except sqlite3.Error as exc:
        print("  读 spot_tickets.data_status 失败：", exc)
    try:
        rows = list(con.execute("SELECT spot_id, price_min, price_max FROM spot_tickets"))
        zero = [r[0] for r in rows if r[1] == 0 and r[2] == 0]
        if zero:
            print("  票价为 0/0（未知却写成 0，见 docs/BACKEND-TODO.md P0-2）：", zero)
    except sqlite3.Error:
        pass


if __name__ == "__main__":
    main()
