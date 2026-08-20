from __future__ import annotations

from importlib import import_module
from typing import Any




_EXPORTS = {
    "AnswerChain": (".answer_chain", "AnswerChain"),
    "IntentResult": (".intent_router", "IntentResult"),
    "LLMClient": (".llm_client", "LLMClient"),
    "TravelAgentService": (".orchestrator", "TravelAgentService"),
    "build_guarded_answer": (".response_policy", "build_guarded_answer"),
    "handle_user_message": (".orchestrator", "handle_user_message"),
    "route_intent": (".intent_router", "route_intent"),
}


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module 'agent' has no attribute {name!r}")
    module_name, attribute_name = _EXPORTS[name]
    value = getattr(import_module(module_name, __name__), attribute_name)
    globals()[name] = value
    return value
