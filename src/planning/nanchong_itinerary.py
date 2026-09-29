"""依据有来源的地名规划行程，不编造景点坐标或实时报价。"""
from __future__ import annotations

from urllib.parse import urlencode
from san_guo_core.models import NanchongPlanRequest


PLACES = [
    {"id": "wanjuanlou", "name": "西山风景区万卷楼景区", "address": "南充·玉屏路6号（地图页面地址，入口需确认）", "minutes": 90,
     "purpose": "陈寿与《三国志》文化主题；历史讲解另走知识库检索。", "url": "https://www.amap.com/place/B0331005E8"},
    {"id": "beihu", "name": "南充市北湖公园", "address": "南充市顺庆区文化路369号", "minutes": 60,
     "purpose": "城市休闲与缓冲，不作为三国遗迹。", "url": "https://ditu.amap.com/place/B033101SWG"},
]
HOTEL = {"name": "南充北湖宾馆", "address": "南充市顺庆区文化路301号", "area": "北湖·文化路片区",
         "url": "https://hotels.ctrip.com/hotels/1808103.html", "price": None,
         "notice": "仅提供有公开页面的住宿候选，不保证价格、空房或适合当前预算；请在预订页重新选择日期、人数、房型。"}


def get_nanchong_travel_catalog() -> dict:
    return {"city": "南充", "places": PLACES, "hotel": HOTEL, "source_level": "C",
            "checked_on": "2026-09-28", "data_status": "public_page_reference",
            "notice": "核对的是公开页面名称与地址，并非实地入口核验；停留时长为编辑建议，非实时数据。"}


def direction_url(origin: str, destination: str, mode: str) -> str:
    return "https://api.map.baidu.com/direction?" + urlencode({
        "origin": origin, "destination": destination, "region": "南充", "mode": mode,
        "output": "html", "src": "webapp.sanguo.travel"})


def plan_nanchong_itinerary(request: NanchongPlanRequest) -> dict:
    selected = [p.copy() for p in PLACES if p["id"] in request.places]
    groups = [selected] if request.days != 2 else [selected[:1], selected[1:]]
    days = []
    for index, stops in enumerate(groups):
        start = request.origin.strip() if index == 0 else HOTEL["name"]
        end = HOTEL["name"] if request.days == 2 and index == 0 else request.origin.strip()
        legs = []
        for stop in stops:
            legs.append({"origin": start, "destination": stop["name"], "minutes": None,
                         "url": direction_url(start, stop["name"], request.mode)})
            start = stop["name"]
        if stops or start != end:
            legs.append({"origin": start, "destination": end, "minutes": None,
                         "url": direction_url(start, end, request.mode)})
        visit = sum(p["minutes"] for p in stops)
        rest = 30 if request.days == 0.5 else 60
        days.append({"day": index + 1, "stops": stops, "legs": legs, "visit_minutes": visit,
                     "rest_minutes": rest, "available_minutes": 240 if request.days == 0.5 else 480,
                     "remaining_before_transport": (240 if request.days == 0.5 else 480) - visit - rest,
                     "feasibility": "pending_transport_and_opening",
                     "note": "按主题顺序编排，未做最短路径优化；预留餐饮/休息，交通耗时与开放时间确认后才能判断可行。"})
    nights = 1 if request.days == 2 else 0
    charged_days = 2 if request.days == 2 else 1
    # 按用户要求明确预留演示预算，并非调研得到的市场价格。
    hotel_rate = request.hotel_per_room if request.hotel_per_room is not None else 200
    meal_rate = request.meals_per_person_day if request.meals_per_person_day is not None else 60
    allowances = {
        "住宿": round(hotel_rate * request.rooms * nights, 2),
        "餐饮": round(meal_rate * request.people * charged_days, 2),
        "交通": request.transport_total if request.transport_total is not None else 30 * request.people * charged_days,
        "门票": 30 * request.people * len(selected),
    }
    item_status = {"住宿": ("not_needed" if not nights else "user_allowance" if request.hotel_per_room is not None else "demo_estimate"),
                   "餐饮": "user_allowance" if request.meals_per_person_day is not None else "demo_estimate",
                   "交通": "user_allowance" if request.transport_total is not None else "demo_estimate",
                   "门票": "demo_estimate"}
    subtotal = round(sum(v for v in allowances.values() if v is not None), 2)
    return {"city": "南充", "request": request.model_dump(mode="json"), "days": days,
            "lodging": {"nights": nights, "candidate": HOTEL if nights else None,
                        "notice": "两日路线暂以北湖宾馆为候选落脚点，未预订；更换住宿后需在地图修改起终点。" if nights else "不安排过夜住宿。"},
            "budget": {"data_status": "demo_estimate_with_user_allowances", "items": allowances, "item_status": item_status, "subtotal": subtotal,
                       "estimated_total": subtotal, "total": None, "over_limit": request.budget_limit is not None and subtotal > request.budget_limit,
                       "notice": "演示估算，非实际报价：未填住宿按200元/间夜、餐饮60元/人天、市内交通30元/人天；门票统一预留30元/人/地点（不代表地点收费）。半日按1个出行日额度计算。你填写的额度优先；不含城际往返、购物等费用，不保证实际够用。"},
            "catalog": get_nanchong_travel_catalog(), "frontend_path": "/?v=outing#outing",
            "warnings": ["点击地图才将起终点名称交给百度，请确认同名地点和景区入口；没有抓取返回路线或实时班次。",
                         "当前仅覆盖南充两个目的地；两日为宽松草案，不代表已补齐全城景点。"]}
