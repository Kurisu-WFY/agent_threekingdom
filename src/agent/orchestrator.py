from __future__ import annotations

try:
    from .answer_chain import AnswerChain
    from .intent_router import route_intent
except ImportError:
    from chain import AnswerChain
    from intent_router import route_intent
from planning.route_planner import plan_route
from rag.hybrid_retriever import HybridRetriever
from tools.travel_business_tools import get_spot_ticket, plan_budget


class TravelAgentService:
    def __init__(self) -> None:
        self.hybrid_retriever = HybridRetriever()
        self.answer_chain = AnswerChain()

    def answer(self, message: str, mode: str = "大众", history: list[dict] | None = None) -> dict:
        intent = route_intent(message)
        if intent.intent == "route_planning":
            route_result = plan_route(message, mode=mode)
            return {"intent": intent.__dict__, **route_result}
        if intent.intent == "budget_ticket":
            return {"intent": intent.__dict__, "answer": self._answer_budget(message), "route": None}

        retrieval_hits, recall_report = self.hybrid_retriever.retrieve(message, intent=intent.intent)
        answer_text = self.answer_chain.run(
            message=message,
            intent=intent,
            hits=retrieval_hits,
            report=recall_report,
            mode=mode,
            history=history or [],
        )
        return {
            "intent": intent.__dict__,
            "answer": answer_text,
            "retrieval": recall_report.model_dump(),
        }

    def _answer_budget(self, message: str) -> str:
        city = "阆中" if "阆中" in message else "广元" if ("广元" in message or "剑门" in message or "昭化" in message) else "南充"
        tier = "经济型" if "经济" in message else "品质型" if ("品质" in message or "高端" in message) else "舒适型"
        budget = plan_budget(city=city, hotel_tier=tier, nights=1, rooms=1)
        ticket_lines = []
        for name in ["万卷楼", "汉桓侯祠", "张飞庙", "剑门关", "昭化古城", "王平墓"]:
            if name in message:
                ticket = get_spot_ticket(name)
                if ticket.get("found"):
                    if ticket.get('price_min') is None or ticket.get('price_max') is None:
                        ticket_lines.append(f"{ticket['name']}：票价待核验，不能视为免费。")
                        continue
                    ticket_lines.append(
                        f"{ticket['name']}：{ticket.get('price_min')} - {ticket.get('price_max')} "
                        f"{ticket.get('currency')}（{ticket.get('data_status')}）"
                    )
        lines = [f"{city}{tier}酒店预算：{budget.get('estimated_total_min')} - {budget.get('estimated_total_max')} CNY/晚/间。"]
        if ticket_lines:
            lines.append("景区票价：" + "；".join(ticket_lines))
        lines.append("说明：景区票价为维护数据；酒店和交通价格波动较大，正式服务应接入 OTA、地图和 12306 等实时工具。")
        return "\n".join(lines)


def handle_user_message(message: str, mode: str = "大众", history: list[dict] | None = None) -> dict:
    return TravelAgentService().answer(message=message, mode=mode, history=history or [])
