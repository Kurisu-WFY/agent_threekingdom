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
    try:
        requested = date.fromisoformat(travel_date) if travel_date else None
    except (ValueError, TypeError):
        return unavailable("日期请使用 YYYY-MM-DD。")
    location = lookup_travel_city(city)
    if location["status"] != "ok":
        return location
    point = location["data"]
    params = {"latitude": point["latitude"], "longitude": point["longitude"], "timezone": "Asia/Shanghai"}
    weather_params = {**params, "forecast_days": 7, "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max"}
    air_params = {**params, "current": "pm2_5,pm10"}
    def safe_query(kind, values):
        try:
            return fetch(HOSTS[kind], values, 1800, kind)
        except (httpx.HTTPError, ValueError, KeyError, TypeError, sqlite3.Error):
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        weather_future = pool.submit(safe_query, "weather", weather_params)
        air_future = pool.submit(safe_query, "air", air_params)
        weather, air = weather_future.result(), air_future.result()
    items, forecast, warnings = [], [], []
    if weather:
        daily = weather["payload"].get("daily", {})
        for i, day in enumerate(daily.get("time", [])):
            if requested and day != requested.isoformat():
                continue
            def value(key):
                values = daily.get(key) or []
                v = values[i] if i < len(values) else None
                return v if isinstance(v, (float, int)) and math.isfinite(v) else None
            row = {"date": day, "temperature_max_c": value("temperature_2m_max"), "temperature_min_c": value("temperature_2m_min"), "rain_probability_percent": value("precipitation_probability_max"), "uv_index_max": value("uv_index_max")}
            if all(v is None for k, v in row.items() if k != "date"):
                continue
            forecast.append(row)
            show = lambda v: "暂无数据" if v is None else str(v)
            advice = ""
            if row["rain_probability_percent"] is not None and row["rain_probability_percent"] >= 40:
                advice += "建议带伞，预留室内参观备选。"
            if row["uv_index_max"] is not None and row["uv_index_max"] >= 6:
                advice += "建议注意防晒。"
            items.append({"title": f"{city} · {day} 天气预报", "summary": f"最低 {show(row['temperature_min_c'])} ℃ / 最高 {show(row['temperature_max_c'])} ℃；最高降雨概率 {show(row['rain_probability_percent'])}%；最高紫外线指数 {show(row['uv_index_max'])}。{advice} 城市级模型预报，不是景区实测。", **metadata("forecast", weather["fetched_at"], "https://open-meteo.com/", "Open-Meteo 天气预报（CC BY 4.0）")})
    if not forecast:
        warnings.append("所选日期不在返回预报范围内，或天气服务暂不可用；未用其他日期替代。")
    air_data = None
    if air:
        current = air["payload"].get("current", {})
        units = air["payload"].get("current_units", {})
        if current.get("time") and any(isinstance(current.get(k), (int, float)) for k in ("pm2_5", "pm10")):
            air_data = {**current, "units": units, "timezone": "Asia/Shanghai"}
            items.append({"title": f"{city} · 当前空气质量模型估计", "summary": f"数据时刻 {current['time']}（北京时间）；PM2.5：{current.get('pm2_5', '暂无')} {units.get('pm2_5', '')}；PM10：{current.get('pm10', '暂无')} {units.get('pm10', '')}。不是监测站实测，也不是出行日期的空气预报。", **metadata("model", air["fetched_at"], "https://open-meteo.com/en/docs/air-quality-api", "Open-Meteo / CAMS 空气质量")})
    if air_data is None:
        warnings.append("空气质量服务暂无有效结果。")
    for message in warnings:
        items.append({"title": "查询提示", "summary": message, "data_status": "pending", "updated_at": None, "sources": []})
    return {"status": "ok" if forecast or air_data else "unavailable", "message": "；".join(warnings) or "查询成功；公共免费接口仅用于非商业 Demo，结果可能来自30分钟缓存。", "data": {"location": point, "forecast": forecast, "air_quality": air_data, "warnings": warnings, "items": items}}


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
