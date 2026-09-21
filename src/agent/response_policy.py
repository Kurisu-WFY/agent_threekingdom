try:
    from .intent_router import IntentResult
except ImportError:
    from intent_router import IntentResult
from san_guo_core.models import RecallReport, RetrievalHit


def build_guarded_answer(
    message: str,
    intent: IntentResult,
    hits: list[RetrievalHit],
    recall_report: RecallReport,
) -> str:
    if not hits:
        return (
            "资料不足，无法生成可靠回答。\n"
            f"意图：{intent.intent}\n"
            "处理方式：补充权威资料后重新入库，或将问题限定在已入库的人物、事件、地点范围内。"
        )

    warning_text = "\n".join(f"- {warning}" for warning in recall_report.warnings)
    source_lines = "\n".join(
        f"- {hit.chunk.title}｜{hit.chunk.source}｜可信等级 {hit.chunk.source_level}"
        for hit in hits
    )
    facts = "\n".join(f"- {hit.chunk.content[:180]}" for hit in hits[:3])

    if recall_report.warnings:
        risk = f"\n召回检查提示：\n{warning_text}\n"
    else:
        risk = "\n召回检查：通过。\n"

    return (
        "基于当前知识库生成的检索式回答如下。\n\n"
        f"用户问题：{message}\n"
        f"识别意图：{intent.intent}\n\n"
        f"检索到的资料摘录（作者观点不等于已证实史实）：\n{facts}\n"
        f"{risk}\n"
        f"来源：\n{source_lines}"
    )
