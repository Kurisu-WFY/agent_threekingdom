from agent.chain import AnswerChain
from agent.intent_router import route_intent
from planning.route_planner import plan_route
from rag.retriever import HybridRetriever, format_context


class TravelAgentService:
    def __init__(self):
        self.retriever = HybridRetriever()
        self.chain = AnswerChain()

    def answer(self, message: str, *, mode: str = "大众", history: list[dict[str, str]] | None = None) -> dict:
        intent = route_intent(message)
        if intent.intent == "route_planning":
            return {"intent": intent.intent, "answer": plan_route(message), "sources": [], "recall_report": None}

        hits, report = self.retriever.retrieve(message, intent.intent)
        answer = self.chain.run(message, intent, hits, report, mode=mode, history=history)
        return {
            "intent": intent.intent,
            "answer": answer,
            "context": format_context(hits),
            "sources": [hit.chunk.source for hit in hits],
            "recall_report": report.model_dump(),
        }


def handle_user_message(message: str, mode: str = "大众") -> str:
    return TravelAgentService().answer(message, mode=mode)["answer"]