import json
import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.types import TextContent, Tool
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.routing import Mount, Route

from agent.orchestrator import TravelAgentService
from planning.route_planner import plan_route
from tools.free_travel_tools import get_travel_weather, lookup_travel_city, get_road_route, RoadRequest
from rag.hybrid_retriever import HybridRetriever, format_context
from rag.document_evidence import retrieve_document_evidence, reference_catalog, document_key
from agent.reflection import audit_answer, review_plan
from tools.travel_business_tools import (
    estimate_hotel_budget,
    get_spot_ticket,
    list_scenic_spots,
    plan_budget,
    search_hotel_poi_request,
)


server = Server("san-guo-travel-agent")
from tools.amap_tools import AmapSearch, AmapRoute, search_amap_places, get_amap_route
from tools.rollinggo_tools import HotelSearch, HotelDetail, hotel_status, search_hotels, hotel_detail
from san_guo_core.models import NanchongPlanRequest
from planning.nanchong_itinerary import get_nanchong_travel_catalog, plan_nanchong_itinerary


@server.list_tools()
async def list_tools():
    return [
        Tool(name='review_culture_answer', description='对文化回答初稿实际核对出处、引文和不同观点覆盖。返回issues及补查query；有问题先补检索再修订，最多两轮。不代表全部史实已验证。', inputSchema={'type':'object','properties':{'query':{'type':'string'},'draft':{'type':'string','maxLength':20000}},'required':['query','draft']}),
        Tool(name='review_travel_plan', description='核对结构化行程的时长、未知交通、费用及预算；有问题调整后再查，最多两轮。不验证实时路况或空房。', inputSchema={'type':'object','properties':{'plan':{'type':'object','properties':{'segments':{'type':'array','items':{'type':'object','properties':{'minutes':{'type':['number','null'],'minimum':0}}}},'costs':{'type':'array','items':{'type':['number','null'],'minimum':0}}}},'available_minutes':{'type':['number','null'],'minimum':0},'budget_limit':{'type':['number','null'],'minimum':0}},'required':['plan']}),
        Tool(name='get_hotel_service_status', description='检查本机住宿查询授权状态，不返回账号或凭据。', inputSchema={'type':'object','properties':{}}),
        Tool(name='search_rollinggo_hotels', description='真实酒店搜索与参考房价查询。明确目的地、入住日期、晚数、成人数后调用；不能用住宿预算档位冒充报价。逐家中文展示名称、星级、参考价、设施和真实图片链接，不展示内部ID。不进行预订。', inputSchema=HotelSearch.model_json_schema()),
        Tool(name='get_rollinggo_hotel_detail', description='使用酒店搜索真实返回的ID查询可售房型、价格与取消政策，日期及人数与用户条件保持一致。只查询，不锁价或下单。对用户展示中文房型、币种、总价/每晚价格与退改规则。', inputSchema=HotelDetail.model_json_schema()),
        Tool(name='search_amap_places', description='高德地点搜索：必须提供城市和地点名，返回候选地点ID及地址。同名、校区或入口有歧义时先让用户确认；不要编造坐标。', inputSchema=AmapSearch.model_json_schema()),
        Tool(name='get_amap_route', description='高德公交、驾车或步行路线。先调用search_amap_places取得并确认起终点ID，再查询；不可编造ID。结果含距离、预计时间和步骤，不代表实时到站或购票成功。', inputSchema=AmapRoute.model_json_schema()),
        Tool(name="get_nanchong_travel_catalog", description="南充公开页面地点及住宿候选目录；不是实时票价、空房或已核验入口。", inputSchema={"type": "object", "properties": {}}),
        Tool(name="plan_nanchong_itinerary", description="南充半日/一日/两日草案：逐段查询高德预计耗时，汇总交通/游览/休息并判断时间预算，含地图链接、住宿候选和预算。同名起点先搜索确认origin_poi_id；空耗时不得按零计算，时间预算足够不等于开放条件已确认。", inputSchema=NanchongPlanRequest.model_json_schema()),
        Tool(name="get_travel_weather", description="免费查询南充、阆中、广元未来7天天气预报及当前空气质量模型估计。可指定YYYY-MM-DD日期；超出范围不替代。非商业Demo，无实测保证。",
             inputSchema={"type": "object", "properties": {"city": {"type": "string"}, "travel_date": {"type": "string", "description": "可选出行日期YYYY-MM-DD"}}, "required": ["city"]}),
        Tool(name="lookup_travel_city", description="查询南充、阆中、广元城市中心WGS84坐标。只用于城市定位/天气，不代表景点、酒店或入口，不能冒充精准POI。",
             inputSchema={"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}),
        Tool(name="get_road_route", description="根据用户提供或可靠来源核实的WGS84起终点，查询步行/驾车道路参考路线。不能使用未经核验的景点坐标或GCJ02坐标；无实时路况，不是公共交通班次。",
             inputSchema=RoadRequest.model_json_schema()),
        Tool(
            name="retrieve_culture_knowledge",
            description="检索已入库三国文化原典和研究文献，按文献覆盖相关证据，返回出处、PDF页码及上下文。默认每页8份来源；has_more为真时用next_offset继续同一问题，直到相关文献取完。不能宣称库外文献也已穷尽，检索诊断不展示给游客。",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "用户问题"},
                    "intent": {"type": "string", "description": "可选意图，如 culture_qa/history_vs_romance/route_planning"},
                    "offset": {"type": "integer", "minimum": 0, "default": 0, "description": "文献分页起点，继续时使用返回的next_offset"},
                    "page_size": {"type": "integer", "minimum": 1, "maximum": 12, "default": 8, "description": "每页文献数，不是片段数"},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="answer_travel_question",
            description="调用本地 Agent 编排，完成意图识别、RAG 检索、召回检查和受控回答。可指定亲子、大众或学术叙事模式。",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "用户完整问题"},
                    "mode": {
                        "type": "string",
                        "enum": ["亲子", "大众", "学术"],
                        "description": "叙事模式，默认大众。",
                    },
                    "history": {
                        "type": "array",
                        "description": "可选的先前对话，元素格式为 {role, content}。",
                        "items": {"type": "object"},
                    },
                },
                "required": ["message"],
            },
        ),
        Tool(
            name="plan_cultural_route",
            description="按城市、游览时长、游客类型、兴趣和出行方式，选择最匹配的三国文化 Demo 路线，并返回每站历史叙事理由。",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "目的地，如南充、阆中、广元。"},
                    "duration_hours": {"type": "number", "description": "可游览小时数，如 4、8、16。"},
                    "group_type": {
                        "type": "string",
                        "enum": ["亲子", "大众", "学术"],
                        "description": "游客类型/叙事深度。",
                    },
                    "interests": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "兴趣，如陈寿、蜀汉人物、军事地理、亲子研学。",
                    },
                    "transport_mode": {"type": "string", "description": "出行方式，如步行、打车、自驾。"},
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="list_scenic_spots",
            description="列出已维护的川东北三国文化相关景区，可按城市过滤。",
            inputSchema={
                "type": "object",
                "properties": {"city": {"type": "string", "description": "可选城市，如南充/阆中/广元"}},
            },
        ),
        Tool(
            name="get_spot_ticket",
            description="查询景区门票维护数据，返回价格区间、来源和数据状态。",
            inputSchema={
                "type": "object",
                "properties": {"spot_name_or_id": {"type": "string", "description": "景区名称或 spot_id"}},
                "required": ["spot_name_or_id"],
            },
        ),
        Tool(
            name="estimate_hotel_budget",
            description="按城市、住宿档位、晚数和房间数估算酒店预算，不查询实时酒店价格。",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市，如南充/阆中/广元"},
                    "tier": {"type": "string", "description": "经济型/舒适型/品质型"},
                    "nights": {"type": "integer", "description": "住宿晚数"},
                    "rooms": {"type": "integer", "description": "房间数"},
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="search_hotel_poi_request",
            description="生成调用百度/高德 MCP 查询酒店 POI 的参数。真实 POI 查询由 Agent 平台外部 MCP 完成。",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市"},
                    "near_spot": {"type": "string", "description": "附近景区"},
                    "keyword": {"type": "string", "description": "搜索关键词，默认酒店"},
                },
                "required": ["city"],
            },
        ),
        Tool(
            name="plan_budget",
            description="根据酒店预算档位和已知路费估算行程预算。",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "hotel_tier": {"type": "string"},
                    "nights": {"type": "integer"},
                    "rooms": {"type": "integer"},
                    "train_budget": {"type": "number"},
                },
                "required": ["city"],
            },
        ),
    ]


def as_text(data) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(data, ensure_ascii=False, indent=2))]


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == 'review_culture_answer':
        hits, report = await asyncio.to_thread(lambda: retrieve_document_evidence(HybridRetriever(), arguments['query']))
        issues = audit_answer(arguments['query'], arguments['draft'], hits)
        return as_text({'status': 'needs_revision' if issues else 'checked', 'issues': issues,
                        'references': reference_catalog(hits), 'summary': '仅核对规则性风险与已返回出处，不验证全部历史语义。'})
    if name == 'review_travel_plan':
        return as_text(review_plan(arguments['plan'], arguments.get('available_minutes'), arguments.get('budget_limit')))
    if name == 'get_hotel_service_status':
        return as_text(await asyncio.to_thread(hotel_status))
    if name == 'search_rollinggo_hotels':
        return as_text(await asyncio.to_thread(search_hotels, HotelSearch(**arguments)))
    if name == 'get_rollinggo_hotel_detail':
        return as_text(await asyncio.to_thread(hotel_detail, HotelDetail(**arguments)))
    if name == 'search_amap_places':
        p = AmapSearch(**arguments)
        return as_text(await asyncio.to_thread(search_amap_places, **p.model_dump()))
    if name == 'get_amap_route':
        p = AmapRoute(**arguments)
        result = await asyncio.to_thread(get_amap_route, **p.model_dump())
        # 地图页会重新核验轨迹，不把大量坐标塞进模型上下文。
        for route in (result.get('data') or {}).get('alternatives', []):
            route.pop('lines', None)
        return as_text(result)
    if name == "get_nanchong_travel_catalog":
        return as_text(get_nanchong_travel_catalog())
    if name == "plan_nanchong_itinerary":
        return as_text(await asyncio.to_thread(plan_nanchong_itinerary, NanchongPlanRequest.model_validate(arguments)))
    if name == "get_travel_weather":
        return as_text(await asyncio.to_thread(get_travel_weather, arguments.get("city", ""), arguments.get("travel_date")))
    if name == "lookup_travel_city":
        return as_text(await asyncio.to_thread(lookup_travel_city, arguments.get("city", "")))
    if name == "get_road_route":
        return as_text(await asyncio.to_thread(get_road_route, **arguments))
    if name == "retrieve_culture_knowledge":
        # 本地模型初始化与推理在工作线程执行，避免阻塞MCP协议的事件循环。
        offset, page_size = arguments.get('offset', 0), arguments.get('page_size', 8)
        if type(offset) is not int or offset < 0 or type(page_size) is not int or not 1 <= page_size <= 12:
            raise ValueError('文献分页参数不合法')
        hits, report = await asyncio.to_thread(lambda: retrieve_document_evidence(HybridRetriever(), arguments['query'], arguments.get('intent')))
        references = reference_catalog(hits)
        selected = references[offset:offset + page_size]
        keys = {reference['document_id'] for reference in selected}
        page_hits = [hit for hit in hits if document_key(hit.chunk) in keys]
        has_more = offset + page_size < len(references)
        return as_text({'context': format_context(page_hits), 'references': selected,
                        'has_more': has_more, 'next_offset': offset + page_size if has_more else None,
                        'scope_note': '仅覆盖当前已入库且本次检索判定相关的资料；未入库或未召回的文献不在此清单。',
                        'recall_report': report.model_dump()})
    if name == "answer_travel_question":
        history = arguments.get("history")
        return as_text(
            TravelAgentService().answer(
                arguments["message"],
                mode=arguments.get("mode", "大众"),
                history=history if isinstance(history, list) else None,
            )
        )
    if name == "plan_cultural_route":
        city = arguments["city"]
        duration_hours = arguments.get("duration_hours")
        group_type = arguments.get("group_type", "大众")
        interests = arguments.get("interests") or []
        transport_mode = arguments.get("transport_mode")
        request_summary = " ".join(
            part
            for part in [
                city,
                f"{duration_hours}小时" if duration_hours is not None else "",
                group_type,
                " ".join(str(item) for item in interests),
                transport_mode or "",
            ]
            if part
        )
        return as_text(
            plan_route(
                request_summary,
                mode=group_type,
                city=city,
                duration_hours=float(duration_hours) if duration_hours is not None else None,
                target_user=group_type,
                interests=[str(item) for item in interests],
                transport_mode=transport_mode,
            )
        )
    if name == "list_scenic_spots":
        return as_text(list_scenic_spots(arguments.get("city")))
    if name == "get_spot_ticket":
        return as_text(get_spot_ticket(arguments["spot_name_or_id"]))
    if name == "estimate_hotel_budget":
        return as_text(
            estimate_hotel_budget(
                city=arguments["city"],
                tier=arguments.get("tier", "舒适型"),
                nights=int(arguments.get("nights", 1)),
                rooms=int(arguments.get("rooms", 1)),
            )
        )
    if name == "search_hotel_poi_request":
        return as_text(
            search_hotel_poi_request(
                city=arguments["city"],
                near_spot=arguments.get("near_spot"),
                keyword=arguments.get("keyword", "酒店"),
            )
        )
    if name == "plan_budget":
        return as_text(
            plan_budget(
                city=arguments["city"],
                hotel_tier=arguments.get("hotel_tier", "舒适型"),
                nights=int(arguments.get("nights", 1)),
                rooms=int(arguments.get("rooms", 1)),
                train_budget=float(arguments.get("train_budget", 0)),
            )
        )
    return as_text({"error": f"Unknown tool: {name}"})


sse = SseServerTransport("/messages")
# 流式 HTTP 是当前使用的 MCP 网络传输方式。无状态 JSON 响应
# 适合此仅提供工具的服务，无需客户端额外维护独立的 SSE 通道。
streamable_http = StreamableHTTPSessionManager(server, stateless=True, json_response=True)


async def handle_sse(request: Request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await server.run(streams[0], streams[1], server.create_initialization_options())


@asynccontextmanager
async def lifespan(_: Starlette):
    async with streamable_http.run():
        yield


app = Starlette(
    routes=[
        Mount("/mcp", app=streamable_http.handle_request),
        Route("/sse", endpoint=handle_sse),
        Mount("/messages", app=sse.handle_post_message),
    ],
    lifespan=lifespan,
)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
