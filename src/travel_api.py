"""为旅游界面提供同源接口适配，不伪装实时服务。"""
from __future__ import annotations

import math
import json
from datetime import date as CalendarDate
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from planning.route_planner import plan_route
from tools.free_travel_tools import get_travel_weather, get_road_route, lookup_travel_city, RoadRequest
from tools.travel_business_tools import list_scenic_spots, estimate_hotel_budget

router = APIRouter(prefix="/api/travel")

from tools.amap_tools import AmapSearch, AmapRoute, search_amap_places, get_amap_route


@router.post('/amap/places')
def amap_places(p: AmapSearch):
    return search_amap_places(**p.model_dump())


@router.post('/amap/route')
def amap_route(p: AmapRoute):
    return get_amap_route(**p.model_dump())

from san_guo_core.models import NanchongPlanRequest
from planning.nanchong_itinerary import get_nanchong_travel_catalog, plan_nanchong_itinerary


@router.get("/nanchong/catalog")
def nanchong_catalog():
    return {"status": "ok", "data": get_nanchong_travel_catalog()}


@router.post("/nanchong/plan")
def nanchong_plan(request: NanchongPlanRequest):
    return {"status": "ok", "data": plan_nanchong_itinerary(request)}


class Preferences(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    date: CalendarDate | None = None
    days: float = Field(default=1, ge=0.5, le=14, allow_inf_nan=False)
    people: int = Field(default=1, ge=1, le=50)
    rooms: int = Field(default=1, ge=1, le=50)
    group: str = "大众"
    transport: str = "待确认"
    hotel_tier: Literal["经济型", "舒适型", "品质型"] = "舒适型"
    notes: str = Field(default="", max_length=4000)

    @field_validator("date", mode="before")
    @classmethod
    def empty_date(cls, value):
        return None if value == "" else value

    @field_validator("hotel_tier", mode="before")
    @classmethod
    def legacy_tier(cls, value):
        return "品质型" if value == "高档型" else value


class RoutePreferences(Preferences):
    excluded_place_ids: list[str] = Field(default_factory=list, max_length=100)


def chat_route(p: RoutePreferences, mode: str):
    result = plan_route(p.notes, mode=mode, city=p.city, duration_hours=p.days * 8,
                        target_user=p.group, transport_mode=p.transport,
                        excluded_place_ids=p.excluded_place_ids)
    return {"intent": {"intent": "route_planning", "confidence": 1.0,
                       "reason": "使用路线表单的结构化约束。"}, **result}


def envelope(status: str, message: str, data=None):
    return {"status": status, "message": message, "data": data}


def sample_meta():
    # 种子数据中的日期是导入日期，不是核验日期。
    return {"data_status": "sample", "updated_at": None, "sources": []}


@router.get("/spots")
def spots(city: str = "", audience: str = "", theme: str = ""):
    records = list_scenic_spots(city.strip() or None)
    def string_list(value):
        try:
            parsed = json.loads(value or "[]")
            return [v for v in parsed if isinstance(v, str)] if isinstance(parsed, list) else []
        except (TypeError, ValueError):
            return []
    items = []
    for r in records:
        themes = string_list(r.get("theme_json"))
        users = string_list(r.get("suitable_users_json"))
        if audience and audience not in users:
            continue
        if theme and not any(theme in t for t in themes):
            continue
        items.append({"id": r["spot_id"], "name": r["name"], "city": r["city"],
                      "description": r.get("address") or "景点资料待补充",
                      "themes": themes, "suitable_users": users,
                      "recommended_duration_min": r.get("recommended_duration_min"),
                      "open_time": r.get("open_time"), "relation_level": r.get("relation_level"),
                      "coordinates": None, "coordinate_system": None,
                      "location_note": "数据库坐标尚未核验，不能用于精确落点或导航。", **sample_meta()})
        if r.get("ticket_source_status") == "official_page":
            items[-1].update(data_status="maintained", updated_at=r["updated_at"],
                description=r["address"]+"；"+r["ticket_note"], location_note="到达路线请交给智能体规划，选择官方入口。",
                sources=[{"title":"成都武侯祠博物馆官网", "source_url":r["source_url"], "source_level":"A"}])
    return envelope("ok" if items else "empty", "景区演示资料；开放时间及票价须核验。", {"spots": items})


@router.post("/plans/preview")
def preview(p: Preferences):
    result = plan_route(p.notes, city=p.city, duration_hours=p.days * 8,
                        target_user=p.group, transport_mode=p.transport)
    route = result["route"]
    if not route["found"]:
        return envelope("empty", route["message"])
    # 保留模板顺序；这只是游览分组，不是道路导航。
    days = []
    for stop in route["stops"]:
        minutes = stop.get("stay_minutes") or 0
        if not days or sum(s["stay_minutes"] or 0 for s in days[-1]["stops"]) + minutes > 480:
            days.append({"day": len(days) + 1, "stops": []})
        days[-1]["stops"].append({"name": stop["name"], "stay_minutes": minutes or None,
                                  "note": stop.get("reason", "")})
    return envelope("ok", result["notice"], {"title": route["route"]["name"],
                    "days": days, **sample_meta()})


@router.post("/budget/estimate")
def budget(p: Preferences):
    nights = max(0, math.ceil(p.days) - 1)
    items = []
    if nights:
        hotel = estimate_hotel_budget(p.city, p.hotel_tier, nights, p.rooms)
        low, high = hotel.get("total_min"), hotel.get("total_max")
        items.append({"label": "住宿预算区间", "amount": None,
                      "basis": f"{nights}晚 × {p.rooms}间：{low}–{high}元（演示估算，非锁价）"
                      if hotel.get("found") else "该城市暂无酒店档位数据",
                      "amount_min": low, "amount_max": high, **sample_meta()})
    else:
        items.append({"label": "住宿", "amount": None, "basis": "本次未安排过夜，不计住宿；不代表酒店免费。", **sample_meta()})
    items.extend({"label": label, "amount": None, "basis": f"{p.people}人；尚无可核验报价，未计入总额。",
                  "data_status": "pending", "updated_at": None, "sources": []}
                 for label in ("门票", "交通", "餐饮"))
    return envelope("ok", "仅供预算讨论，未知项不按零元计算。", {"items": items})


@router.post("/travel-info")
def travel_info(p: Preferences):
    return get_travel_weather(p.city, p.date.isoformat() if p.date else None)


@router.post("/road-route")
def road_route(p: RoadRequest):
    return get_road_route(**p.model_dump())


@router.get("/city-location")
def city_location(city: str):
    return lookup_travel_city(city)
