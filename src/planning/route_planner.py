from __future__ import annotations

import re

from tools.business_tools import recommend_route, search_hotel_poi_request


CITY_ALIASES = {
    "阆中": "阆中",
    "南充": "南充",
    "广元": "广元",
    "剑阁": "广元",
    "剑门关": "广元",
    "昭化": "广元",
}


def _guess_city(text: str) -> str:
    for key, city in CITY_ALIASES.items():
        if key in text:
            return city
    return "南充"


def _guess_hours(text: str) -> float | None:
    if "半日" in text or "半天" in text:
        return 4
    if "一日" in text or "一天" in text:
        return 8
    if "两天" in text or "2日" in text or "二日" in text:
        return 16
    match = re.search(r"(\d+(?:\.\d+)?)\s*小时", text)
    return float(match.group(1)) if match else None


def _guess_target_user(text: str) -> str:
    if "亲子" in text or "孩子" in text or "小孩" in text:
        return "亲子"
    if "学术" in text or "论文" in text or "研究" in text:
        return "学术"
    if "年轻" in text or "打卡" in text:
        return "年轻游客"
    return "大众"


def plan_route(user_message: str, mode: str = "大众") -> dict:
    city = _guess_city(user_message)
    hours = _guess_hours(user_message)
    target_user = _guess_target_user(user_message) or mode
    route = recommend_route(city=city, hours=hours, target_user=target_user)
    hotel_poi = search_hotel_poi_request(city=city, near_spot=None)
    if not route.get("found"):
        return {"answer": route["message"], "route": route, "hotel_poi_request": hotel_poi}
    r = route["route"]
    stops = route["stops"]
    lines = [f"推荐路线：{r['name']}（{r['duration_hours']}小时，{r['transport_mode']}）", r.get("summary", "")]
    for stop in stops:
        lines.append(f"{stop['stop_order']}. {stop['name']}：停留约 {stop['stay_minutes']} 分钟。{stop.get('reason', '')}")
    if r.get("risk_note"):
        lines.append(f"注意：{r['risk_note']}")
    return {"answer": "\n".join([line for line in lines if line]), "route": route, "hotel_poi_request": hotel_poi}
