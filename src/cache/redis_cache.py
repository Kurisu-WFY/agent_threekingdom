import json
from typing import Any

from san_guo_core.settings import get_settings


class RedisCache:
    def __init__(self):
        self.settings = get_settings()
        self.client = None
        try:
            import redis

            self.client = redis.Redis.from_url(self.settings.redis_url, decode_responses=True)
        except Exception:
            self.client = None

    def available(self) -> bool:
        if self.client is None:
            return False
        try:
            return bool(self.client.ping())
        except Exception:
            return False

    def get_json(self, key: str) -> Any | None:
        if self.client is None:
            return None
        value = self.client.get(key)
        return json.loads(value) if value else None

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        if self.client is None:
            return
        self.client.setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))


def redis_health() -> dict:
    cache = RedisCache()
    return {
        "enabled": cache.client is not None,
        "available": cache.available(),
        "url": get_settings().redis_url,
        "note": "Redis is optional for local demo. Use it for sessions, rate limits, and external MCP result cache in deployment.",
    }
