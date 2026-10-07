"""为行程补充高德交通时间，保留同名地点与失败路段的真实缺口。"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from math import ceil, isfinite
from urllib.parse import urlencode
from tools.amap_tools import search_amap_places, get_amap_route


def resolve_point(name: str) -> dict:
    """只自动采用唯一同名地点，不直接采用第一条模糊搜索结果。"""
    result = search_amap_places(name, city="南充")
    items = (result.get("data") or {}).get("items") or []
    matches = [item for item in items if item.get("name") == name]
    if result.get("status") == "ok" and len(matches) == 1:
        return {"id": matches[0]["id"], "status": "resolved"}
    return {"id": None, "status": "needs_confirmation" if items else "unavailable",
            "candidates": items, "message": "请确认具体地点或校区。" if items else result.get("message", "地点查询未返回结果。")}


def fill_leg(leg: dict, points: dict, mode: str) -> dict:
    """采用高德第一条带有效耗时的方案，分钟向上取整。"""
    origin, destination = points[leg["origin"]], points[leg["destination"]]
    leg.update(data_status="unavailable", source=None, mode=mode)
    if not origin.get("id") or not destination.get("id"):
        leg.update(data_status="needs_confirmation" if any(p["status"] == "needs_confirmation" for p in (origin, destination)) else "unavailable",
                   message="请先确认起终点的具体地点。")
        return leg
    if origin["id"] == destination["id"]:
        leg.update(minutes=0, duration_seconds=0, distance_m=0, data_status="same_place", message="同一高德地点，无需两地交通。")
        return leg
    result = get_amap_route(origin["id"], destination["id"], mode)
    data = result.get("data") or {}
    if result.get("status") == "ok":
        for index, route in enumerate(data.get("alternatives") or []):
            seconds = route.get("duration_seconds")
            if not isinstance(seconds, (int, float)) or isinstance(seconds, bool) or not isfinite(seconds) or seconds <= 0:
                continue
            leg.update(minutes=ceil(seconds / 60), duration_seconds=seconds,
                       distance_m=route.get("distance_m"), fare_yuan=route.get("fare_yuan"),
                       steps=route.get("steps") or [], lines=route.get("lines") or [],
                       origin_poi=data.get("origin"), destination_poi=data.get("destination"),
                       alternative_index=index, source="高德地图", data_status="amap_estimate",
                       queried_at=data.get("queried_at"),
                       url="/?" + urlencode({"amap_origin": origin["id"], "amap_destination": destination["id"], "amap_mode": mode}) + "#outing",
                       message="高德预计耗时，非实时到站时间；游览停留与休息另计。")
            return leg
    leg["message"] = result.get("message") if result.get("status") != "ok" else "高德方案未提供有效耗时。"
    return leg


def fill_transport(days: list[dict], request, places: list[dict]) -> dict:
    points = {p["name"]: {"id": p["amap_poi_id"], "status": "resolved"} for p in places}
    if request.origin_poi_id:
        points[request.origin.strip()] = {"id": request.origin_poi_id, "status": "user_confirmed"}
    names = {leg[key] for day in days for leg in day["legs"] for key in ("origin", "destination")}
    missing = sorted(names - points.keys())
    # 并行少量独立网络查询，不阻塞 MCP 的事件循环。
    with ThreadPoolExecutor(max_workers=3) as pool:
        points.update(zip(missing, pool.map(resolve_point, missing)))
        for day in days:
            day["legs"] = list(pool.map(lambda leg: fill_leg(leg, points, request.mode), day["legs"]))
            known = sum(leg["minutes"] for leg in day["legs"] if leg["minutes"] is not None)
            unknown = sum(leg["minutes"] is None for leg in day["legs"])
            total = day["visit_minutes"] + day["rest_minutes"] + known
            complete = unknown == 0
            fits = total <= day["available_minutes"]
            day.update(known_transport_minutes=known, unknown_leg_count=unknown,
                       transport_minutes=known if complete else None,
                       total_minutes=total if complete else None, minimum_total_minutes=total,
                       remaining_minutes=day["available_minutes"] - total if complete else None,
                       time_feasible=fits if complete or not fits else None,
                       feasibility="exceeds_time_budget" if not fits else "fits_time_budget" if complete else "pending_transport",
                       opening_status="not_checked",
                       note=("按主题顺序编排，未做最短路径优化。交通、游览与休息合计在时间预算内；仍需结合开放时段安排。" if complete and fits else
                             "交通、游览与休息合计超过时间预算，建议减少地点或延长时间。" if not fits else
                             "部分路段尚无耗时，请确认具体起点或更换交通方式后再判断时间是否足够。"))
    return points
