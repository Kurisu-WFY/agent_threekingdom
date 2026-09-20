from dataclasses import dataclass


@dataclass
class IntentResult:
    intent: str
    confidence: float
    reason: str


ROUTE_WORDS = ("路线", "行程", "怎么玩", "一日游", "半日", "半天", "两天", "规划", "游览", "旅游")
BUDGET_WORDS = ("预算", "票价", "门票", "酒店", "住宿", "多少钱", "费用")
COMPARE_WORDS = ("三国演义", "正史", "历史", "虚构", "真实", "区别")


def route_intent(message: str) -> IntentResult:
    text = message.strip()
    if any(word in text for word in ROUTE_WORDS):
        return IntentResult("route_planning", 0.82, "命中路线/行程规划词。")
    if any(word in text for word in BUDGET_WORDS):
        return IntentResult("budget_ticket", 0.78, "命中预算/票价/住宿词。")
    if any(word in text for word in COMPARE_WORDS):
        return IntentResult("history_vs_romance", 0.72, "命中史实与演义辨析词。")
    return IntentResult("culture_qa", 0.55, "默认进入三国文化问答。")
