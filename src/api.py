from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from agent.orchestrator import TravelAgentService
from cache.redis_cache import redis_health
from san_guo_core.settings import get_settings


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


class ChatRequest(BaseModel):
    message: str
    mode: str = "大众"
    history: list[dict[str, str]] = Field(default_factory=list)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "vector_backend": settings.vector_backend,
        "milvus_collection": settings.milvus_collection,
        "redis": redis_health(),
    }


@app.post("/chat")
def chat(request: ChatRequest) -> dict:
    return service.answer(request.message, mode=request.mode, history=request.history or None)


# 若存在 frontend/index.html，则把 / 根路径挂载为前端页面（与 /health、/chat 共存，路由优先）
_frontend = Path(__file__).resolve().parent.parent / "frontend"
if _frontend.exists():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
