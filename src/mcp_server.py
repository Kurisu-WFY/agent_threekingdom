import json
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
from rag.hybrid_retriever import HybridRetriever, format_context
from tools.travel_business_tools import (
    estimate_hotel_budget,
    get_spot_ticket,
    list_scenic_spots,
    plan_budget,
    search_hotel_poi_request,
)


server = Server("san-guo-travel-agent")


@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="retrieve_culture_knowledge",
            description="检索三国文化、陈寿、《三国志》、南充/川东北三国景区相关知识，并返回 rerank 和召回检查上下文。",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "用户问题"},
                    "intent": {"type": "string", "description": "可选意图，如 culture_qa/history_vs_romance/route_planning"},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="answer_travel_question",
            description="调用本地 Agent 编排，完成意图识别、RAG 检索、召回检查和受控回答。",
            inputSchema={
                "type": "object",
                "properties": {"message": {"type": "string", "description": "用户完整问题"}},
                "required": ["message"],
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
    if name == "retrieve_culture_knowledge":
        hits, report = HybridRetriever().retrieve(arguments["query"], arguments.get("intent"))
        return as_text({"context": format_context(hits), "recall_report": report.model_dump()})
    if name == "answer_travel_question":
        return as_text(TravelAgentService().answer(arguments["message"]))
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
# Streamable HTTP is the current MCP HTTP transport. Stateless JSON responses
# suit this tool-only server and avoid requiring the client to maintain a
# separate SSE channel.
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
