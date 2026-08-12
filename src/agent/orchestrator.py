from agent.intent_router import route_intent
from agent.response_policy import build_guarded_answer
from planning.route_planner import plan_route
from rag.retriever import HybridRetriever, format_context


class TravelAgentService:
    def __init__(self):
        self.retriever = HybridRetriever()

    def answer(self, message: str) -> dict:
        intent = route_intent(message)
        if intent.intent == "route_planning":
            return {"intent": intent.intent, "answer": plan_route(message), "sources": [], "recall_report": None}

        hits, report = self.retriever.retrieve(message, intent.intent)
        answer = build_guarded_answer(message=message, intent=intent, hits=hits, recall_report=report)
        return {
            "intent": intent.intent,
            "answer": answer,
            "context": format_context(hits),
            "sources": [hit.chunk.source for hit in hits],
            "recall_report": report.model_dump(),
        }


def handle_user_message(message: str) -> str:
    result = TravelAgentService().answer(message)
    return result["answer"]

