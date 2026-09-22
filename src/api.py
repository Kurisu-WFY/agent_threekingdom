from pathlib import Path

import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field

from agent.orchestrator import TravelAgentService
from cache.redis_cache import redis_health
from san_guo_core.settings import get_settings
from travel_api import router as travel_router, RoutePreferences, chat_route
from agent.nuwax_client import NuwaxClient, NuwaxError


app = FastAPI(title="San Guo AI Travel Agent", version="0.2.0")

# 允许前端跨域调用（本地开发放开，正式部署请收窄为具体前端域名）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = TravelAgentService()
nuwax = NuwaxClient()
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.include_router(travel_router)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000, pattern=r"\S")
    mode: str = "大众"
    history: list[dict[str, str]] = Field(default_factory=list)
    route_preferences: RoutePreferences | None = None
    session_id: str | None = Field(default=None, max_length=128)
    story_id: str | None = Field(default=None, max_length=64)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "chat": {"configured": nuwax.configured or service.answer_chain.llm.available(),
                 "mode": "nuwax" if nuwax.configured else "model_configured" if service.answer_chain.llm.available() else "retrieval_only",
                 "warning": nuwax.warning if nuwax.configured else "",
                 "connection_verified": False},
        "vector_backend": settings.vector_backend,
        "embedding_backend": settings.embedding_backend,
        "embedding_dimension": settings.embedding_dimension,
        "milvus_collection": settings.milvus_collection,
        "redis": redis_health(),
    }


@app.post("/chat")
def chat(request: ChatRequest) -> dict:
    if request.route_preferences is not None:
        return chat_route(request.route_preferences, request.mode)
    if nuwax.configured:
        try:
            return nuwax.chat(request.message, request.mode, request.session_id, request.history, request.story_id)
        except NuwaxError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from None
    return service.answer(request.message, mode=request.mode, history=request.history or None)


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    def stream():
        if nuwax.configured and request.route_preferences is None:
            events = nuwax.events(request.message, request.mode, request.session_id, request.history, request.story_id)
        else:
            events = [{'type': 'result', 'data': chat(request)}]
        for event in events:
            yield 'data: ' + json.dumps(event, ensure_ascii=False) + '\n\n'
    return StreamingResponse(stream(), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})


# 若存在 frontend/index.html，则把 / 根路径挂载为前端页面（与 /health、/chat 共存，路由优先）
_frontend = Path(__file__).resolve().parent.parent / "frontend"
if _frontend.exists():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
