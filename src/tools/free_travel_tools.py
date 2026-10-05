"""无需密钥的演示服务，由 HTTP 和 MCP 共用，绝不推测景点坐标。"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import date, datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import sqlite3
import tempfile
import time

import httpx
from pydantic import BaseModel, Field, ValidationError
from typing import Literal

from san_guo_core.settings import PROJECT_ROOT

# 本机接口和 MCP 进程共用缓存；限制缓存大小，不存储密钥。
CACHE = Path(tempfile.gettempdir()) / ("sanguo-travel-" + hashlib.sha256(str(PROJECT_ROOT).encode()).hexdigest()[:12] + ".sqlite3")
ALIASES = {"南充": "Nanchong", "南充市": "Nanchong", "阆中": "Langzhong", "阆中市": "Langzhong", "广元": "Guangyuan", "广元市": "Guangyuan"}
HOSTS = {"geo": "https://geocoding-api.open-meteo.com/v1/search", "weather": "https://api.open-meteo.com/v1/forecast", "air": "https://air-quality-api.open-meteo.com/v1/air-quality"}


def unavailable(message: str) -> dict:
    return {"status": "unavailable", "message": message, "data": None}


def fetch(url: str, params: dict, ttl: int, group: str) -> dict:
    key = hashlib.sha256((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()
    with closing(sqlite3.connect(CACHE, timeout=3)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, expires REAL, payload TEXT)")
        db.execute("CREATE TABLE IF NOT EXISTS throttle (name TEXT PRIMARY KEY, next REAL)")
        db.execute("BEGIN IMMEDIATE")
        now = time.time()
        db.execute("DELETE FROM cache WHERE expires < ?", (now,))
        cached = db.execute("SELECT payload FROM cache WHERE key=?", (key,)).fetchone()
        if cached:
            return json.loads(cached[0])
        row = db.execute("SELECT next FROM throttle WHERE name=?", (group,)).fetchone()
        wait = max(0, (row[0] if row else now) - now)
        if wait > 2:
            raise ValueError("查询较频繁，请稍后重试。")
        db.execute("INSERT OR REPLACE INTO throttle VALUES (?, ?)", (group, now + wait + 1.1))
    if wait:
        time.sleep(wait)
    with httpx.Client(timeout=6, headers={"User-Agent": "SanGuoTravelDemo/0.2 (noncommercial local travel planner)"}) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, dict) or payload.get("error"):
        raise ValueError("外部服务未返回有效数据。")
    result = {"payload": payload, "fetched_at": datetime.now(timezone.utc).isoformat()}
    with closing(sqlite3.connect(CACHE, timeout=3)) as db, db:
        # 为本地演示缓存设置简单的存储上限。
        if db.execute("SELECT COUNT(*) FROM cache").fetchone()[0] >= 500:
            db.execute("DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY expires LIMIT 50)")
        db.execute("INSERT OR REPLACE INTO cache VALUES (?, ?, ?)", (key, time.time() + ttl, json.dumps(result)))
    return result


def metadata(kind: str, fetched_at: str, url: str, title: str) -> dict:
    return {"data_status": kind, "updated_at": fetched_at, "fetched_at": fetched_at,
            "source_level": "C", "sources": [{"title": title, "source_url": url, "source_level": "C"}]}


def lookup_travel_city(city: str) -> dict:
    """仅匹配支持的四川目的地，不选择其他地区的同名城市。"""
    query = ALIASES.get(city.strip()) if isinstance(city, str) else None
    if not query:
        return unavailable("当前支持南充、阆中、广元；城市中心仅用于天气，不代表景区入口。")
    try:
        result = fetch(HOSTS["geo"], {"name": query, "count": 10, "language": "zh", "format": "json"}, 86400, "geo")
        names = {city.strip().removesuffix("市").lower(), query.lower()}
        matches = [r for r in result["payload"].get("results", []) if r.get("country_code") == "CN" and r.get("admin1_id") == 1794299 and str(r.get("name", "")).removesuffix("市").lower() in names]
        if len(matches) != 1:
            return unavailable("城市定位为空或存在歧义，未自动选择坐标。")
        r = matches[0]
        lat, lon = float(r["latitude"]), float(r["longitude"])
        if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("城市坐标异常。")
        return {"status": "ok", "message": "城市中心定位，不能作为景区入口。", "data": {
            "city": city, "latitude": lat, "longitude": lon, "coordinate_system": "WGS84",
            **metadata("external", result["fetched_at"], "https://open-meteo.com/en/docs/geocoding-api", "Open-Meteo / GeoNames 城市定位")}}
    except (httpx.HTTPError, ValueError, KeyError, TypeError, sqlite3.Error):
        return unavailable("城市定位服务暂不可用，请稍后重试。")


def get_travel_weather(city: str, travel_date: str | None = None) -> dict:
    """前端与智能体共用高德天气，只返回供应商提供的日期。"""
    from tools.amap_tools import request, AmapError
    codes = {'南充': '511300', '阆中': '511381', '广元': '510800', '成都': '510100'}
    code = codes.get(city.removesuffix('市').strip())
    if not code:
        return unavailable('当前支持南充、阆中、广元和成都的天气查询。')
    try:
        requested = date.fromisoformat(travel_date) if travel_date else None
        with httpx.Client(timeout=12, follow_redirects=False) as client:
            result = request(client, '/v3/weather/weatherInfo', {'city': code, 'extensions': 'all'})
        forecasts = result.get('forecasts') or []
        raw = forecasts[0] if forecasts else {}
        rows = [item for item in raw.get('casts', []) if isinstance(item, dict) and item.get('date')]
        now = datetime.now(timezone.utc).isoformat()
        warnings = []
        if requested and requested.isoformat() not in [row['date'] for row in rows]:
            warnings.append('所选日期超出当前预报范围；下方显示供应商实际返回的日期。')
        sources = [{'title': '高德天气预报', 'source_level': 'C', 'source_url': 'https://lbs.amap.com/api/webservice/guide/api/weatherinfo'}]
        return {'status': 'ok' if rows else 'empty', 'message': '；'.join(warnings) or '已取得高德天气预报。',
                'data': {'forecast': rows, 'fetched_at': now, 'reporttime': raw.get('reporttime'),
                         'location': {'city': city, 'adcode': code}, 'sources': sources, 'warnings': warnings,
                         'items': []}}
    except (ValueError, TypeError, AmapError):
        return unavailable('高德天气查询未完成，请核对日期、服务权限或稍后重试。')


class RoadRequest(BaseModel):
    origin_longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    origin_latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    destination_longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    destination_latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    coordinate_system: Literal["WGS84"]
    mode: Literal["walking", "driving"] = "walking"


def get_road_route(**arguments) -> dict:
    try:
        p = RoadRequest(**arguments)
    except ValidationError:
        return unavailable("需要有效的 WGS84 起终点经纬度；不接受未经转换的高德/百度坐标。")
    profile = "foot" if p.mode == "walking" else "car"
    coordinates = f"{p.origin_longitude},{p.origin_latitude};{p.destination_longitude},{p.destination_latitude}"
    try:
        result = fetch(f"https://routing.openstreetmap.de/routed-{profile}/route/v1/driving/{coordinates}", {"overview": "simplified", "geometries": "geojson", "steps": "false"}, 1800, "osrm")
        payload = result["payload"]
        if payload.get("code") != "Ok" or not payload.get("routes"):
            return unavailable("没有找到可用道路路线；未用直线距离代替。")
        route = payload["routes"][0]
        return {"status": "ok", "message": "道路参考路线，无实时路况；起终点会吸附道路，入口/封路/通行条件请现场核实。", "data": {
            "mode": p.mode, "coordinate_system": "WGS84", "distance_m": route["distance"], "duration_seconds": route["duration"], "geometry": route.get("geometry"),
            "snapped_waypoints": [{"location": w.get("location"), "distance_from_input_m": w.get("distance")} for w in payload.get("waypoints", [])],
            "fix_map_url": "https://www.openstreetmap.org/", **metadata("reference_route", result["fetched_at"], "https://routing.openstreetmap.de/about.html", "© OpenStreetMap contributors / FOSSGIS OSRM")}}
    except (httpx.HTTPError, ValueError, KeyError, TypeError, sqlite3.Error):
        return unavailable("公共路线服务暂不可用，请稍后重试；不影响文化问答。")
