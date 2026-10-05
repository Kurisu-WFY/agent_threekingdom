try:
    from .intent_router import IntentResult
except ImportError:
    from intent_router import IntentResult
from san_guo_core.models import RecallReport, RetrievalHit
from rag.document_evidence import document_key


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

    groups = {}
    for hit in hits:
        groups.setdefault(document_key(hit.chunk), []).append(hit)
    sections = []
    for rows in groups.values():
        chunk = rows[0].chunk
        pages = sorted({row.chunk.pdf_page for row in rows if row.chunk.pdf_page is not None})
        location = '；PDF第' + '、'.join(map(str, pages)) + '页' if pages else ''
        kind = '史籍文本' if chunk.category == 'primary_source' else '研究／相关资料'
        excerpts = '\n'.join(f'> {row.chunk.content}' for row in rows)
        sections.append(f'### {chunk.title}\n{kind}；出处：{chunk.source}{location}\n\n{excerpts}')

    if recall_report.warnings:
        risk = "\n以下资料可供参考，尚不足以对争议作出定论。\n"
    else:
        risk = ""

    return (
        '以下为按出处整理的资料摘录，未作模型综合分析；研究观点须归属于作者，史籍传闻不能直接视为已证事实。\n\n'
        + '\n\n'.join(sections) + '\n' + risk
    )
