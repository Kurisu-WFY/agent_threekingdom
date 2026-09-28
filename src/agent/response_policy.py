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
            "这部分史实还需要可靠出处。你可以告诉我具体人物、景点或文献名称，我再帮你核对。"
        )

    warning_text = "\n".join(f"- {warning}" for warning in recall_report.warnings)
    source_lines = "\n".join(
        f"- {hit.chunk.title}｜{hit.chunk.source}｜可信等级 {hit.chunk.source_level}"
        for hit in hits
    )
    facts = "\n".join(f"- {hit.chunk.content[:180]}" for hit in hits[:3])

    if recall_report.warnings:
        risk = "\n以下资料可供参考，尚不足以对争议作出定论。\n"
    else:
        risk = ""

    return (
        f"相关资料摘录（研究观点应结合出处理解）：\n{facts}\n"
        f"{risk}\n"
        f"来源：\n{source_lines}"
    )
