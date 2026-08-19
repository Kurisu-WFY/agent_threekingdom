from __future__ import annotations

from pathlib import Path

from agent.intent_router import IntentResult
from agent.llm_client import LLMClient
from agent.response_policy import build_guarded_answer
from domain import RecallReport, RetrievalHit
from rag.retriever import format_context

PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"
SYSTEM_PROMPT = (PROMPTS_DIR / "system_prompt.md").read_text(encoding="utf-8")
ANSWER_PROMPT = (PROMPTS_DIR / "answer_prompt.md").read_text(encoding="utf-8")

MODE_RULES = {
    "亲子": "用讲故事的口吻：短句、少术语、多比喻和场景，让孩子听得懂、感兴趣。",
    "大众": "旅游向讲解：先给结论再讲背景，语言轻松，结合现场游览场景。",
    "学术": "深度分析：严格区分《三国志》正史、演义文学与地方传说，标注史料依据和争议点。",
}


class AnswerChain:
    def __init__(self, llm: LLMClient | None = None) -> None:
        self.llm = llm or LLMClient()

    def run(
        self,
        message: str,
        intent: IntentResult,
        hits: list[RetrievalHit],
        report: RecallReport,
        *,
        mode: str = "大众",
        history: list[dict[str, str]] | None = None,
    ) -> str:
        if not hits:
            return build_guarded_answer(message, intent, hits, report)

        mode_rule = MODE_RULES.get(mode, MODE_RULES["大众"])
        warning_text = "\n".join(f"- {warning}" for warning in report.warnings) or "通过"
        system = (
            f"{SYSTEM_PROMPT}\n\n{ANSWER_PROMPT}\n\n"
            f"本次叙事模式：{mode}。{mode_rule}\n\n"
            f"[本次检索到的知识库上下文]\n{format_context(hits)}\n\n"
            f"[召回检查]\n{warning_text}\n"
            "规则：只依据上述上下文回答；C 级来源不得支撑历史事实结论；"
            "提及依据时用《三国志》、地方志、景区资料等一般性表述，不要编造具体页码或出处。"
        )

        messages = list(history or []) + [{"role": "user", "content": message}]
        messages = [{"role": "system", "content": system}] + messages

        if not self.llm.available() or not report.passed:
            return build_guarded_answer(message, intent, hits, report)
        try:
            return self.llm.chat(messages)
        except Exception:
            return build_guarded_answer(message, intent, hits, report)
