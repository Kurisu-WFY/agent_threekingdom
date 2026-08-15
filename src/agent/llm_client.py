from __future__ import annotations

import httpx

from config import get_settings


class LLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.backend = (self.settings.llm_backend or "mock").lower()

    def available(self) -> bool:
        return self.backend != "mock" and bool(self.settings.llm_api_key)

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1500,
    ) -> str:
        if not self.available():
            raise RuntimeError("LLM 未配置：请设置 LLM_BACKEND/LLM_API_KEY/LLM_BASE_URL")
        base_url = (self.settings.llm_base_url or "https://api.deepseek.com/v1").rstrip("/")
        payload = {
            "model": self.settings.llm_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        headers = {"Authorization": f"Bearer {self.settings.llm_api_key}"}
        with httpx.Client(timeout=60) as client:
            response = client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()