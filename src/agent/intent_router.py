from dataclasses import dataclass


@dataclass
class IntentResult:
    intent: str
    confidence: float
    missing_slots: list[str]
    reason: str


def route_intent(message: str) -> IntentResult:
    text = message.lower()
    if any(word in message for word in ["路线", "行程", "怎么玩", "一日游", "半日"]):
        return IntentResult("route_planning", 0.75, [], "用户在请求路线或行程规划。")
    if any(word in message for word in ["演义", "正史", "区别", "真假"]):
        return IntentResult("history_vs_romance", 0.75, [], "用户在请求正史与演义辨析。")
    if any(word in message for word in ["讲解", "介绍", "是谁", "什么是"]):
        return IntentResult("culture_qa", 0.65, [], "用户在请求文化问答或讲解。")
    if any(word in text for word in ["ticket", "budget"]) or any(word in message for word in ["票", "预算", "多少钱"]):
        return IntentResult("budget_ticket", 0.65, [], "用户在请求预算或票务信息。")
    return IntentResult("unknown", 0.3, [], "暂未识别明确意图。")

