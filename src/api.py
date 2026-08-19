from fastapi import FastAPI
from pydantic import BaseModel, Field

from agent.orchestrator import TravelAgentService
from cache.redis_cache import redis_health
from config import get_settings


app = FastAPI(title="San Guo AI Travel Agent", version="0.2.0")
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
