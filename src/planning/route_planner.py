from __future__ import annotations

import re

from tools.travel_business_tools import recommend_route, search_hotel_poi_request


CITY_ALIASES = {
    "南充": "南充",
    "万卷楼": "南充",
    "西山": "南充",
    "陈寿": "南充",
    "成都": "成都",
    "阆中": "阆中",
    "张飞庙": "阆中",
    "汉桓侯祠": "阆中",
    "襄阳": "襄阳",
    "广元": "广元",
    "剑阁": "广元",
    "剑门关": "广元",
    "昭化": "广元",
}


def _guess_city(user_message: str) -> str:
    explicit = re.search(r"目的地[：:]\s*([^；;。]+)", user_message)
    if explicit:
        return explicit.group(1).strip()
    for city_alias, city_name in CITY_ALIASES.items():
        if city_alias in user_message:
            return city_name
    return "南充"


def _guess_duration_hours(user_message: str) -> float | None:
    if "半天" in user_message or "半日" in user_message or "4小时" in user_message:
        return 4
    if "一天" in user_message or "一日" in user_message:
        return 8
    if "两天" in user_message or "2天" in user_message or "周末" in user_message:
        return 16
    duration_match = re.search(r"(\d+(?:\.\d+)?)\s*小时", user_message)
    return float(duration_match.group(1)) if duration_match else None


def _guess_target_user(user_message: str) -> str:
    if "亲子" in user_message or "家庭" in user_message or "小孩" in user_message:
        return "亲子"
    if "学生" in user_message or "同学" in user_message or "研学" in user_message:
        return "学生"
    if "老人" in user_message or "长辈" in user_message:
        return "老年游客"
    return "大众"


def plan_route(
    user_message: str,
    mode: str = "大众",
    *,
    city: str | None = None,
    duration_hours: float | None = None,
    target_user: str | None = None,
    interests: list[str] | None = None,
    transport_mode: str | None = None,
    excluded_place_ids: list[str] | None = None,
) -> dict:
    """返回最匹配的人工整理演示路线及其文化解读。

    MCP 客户端使用显式参数；聊天接口保留从自然语言推断参数的兜底逻辑。
    """
    city_name = city or _guess_city(user_message)
    duration_hours = duration_hours if duration_hours is not None else _guess_duration_hours(user_message)
    target_user = target_user or _guess_target_user(user_message) or mode

    route_result = recommend_route(
        city=city_name,
        hours=duration_hours,
        target_user=target_user,
        excluded_place_ids=excluded_place_ids,
    )
    hotel_poi_request = search_hotel_poi_request(city=city_name, near_spot=None)

    if not route_result.get("found"):
        return {
            "answer": route_result["message"],
            "route": route_result,
            "hotel_poi_request": hotel_poi_request,
        }

    route_template = route_result["route"]
    route_stops = route_result["stops"]
    answer_lines = [
        (
            f"推荐路线：{route_template['name']}，"
            f"{route_template['duration_hours']}小时，"
            f"{route_template['transport_mode']}"
        ),
        route_template.get("summary", ""),
    ]

    for stop in route_stops:
        answer_lines.append(
            f"{stop['stop_order']}. {stop['name']}，"
            f"停留约 {stop['stay_minutes']} 分钟。"
            f"{stop.get('reason', '')}"
        )

    if route_template.get("risk_note"):
        answer_lines.append(f"注意：{route_template['risk_note']}")

    return {
        "answer": "\n".join(line for line in answer_lines if line),
        "route": route_result,
        "hotel_poi_request": hotel_poi_request,
        "planning_preferences": {
            "city": city_name,
            "duration_hours": duration_hours,
            "target_user": target_user,
            "interests": interests or [],
            "transport_mode": transport_mode or route_template.get("transport_mode", ""),
        },
        "data_status": "sample",
        "notice": "路线顺序和停留时间来自 Demo 模板；实时交通、天气、营业时间和导航需接入地图/天气服务后确认。",
    }
