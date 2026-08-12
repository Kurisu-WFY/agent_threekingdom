from config import get_settings
from domain import RecallReport, RetrievalHit

def inspect_recall(query: str, candidates: list[RetrievalHit], final_hits: list[RetrievalHit]) -> RecallReport:
    settings = get_settings()
    known_entities = sorted(
        {entity for hit in candidates for entity in hit.chunk.entities if entity},
        key=len,
        reverse=True,
    )
    query_entities = [entity for entity in known_entities if entity in query]
    final_text = "\n".join(
        hit.chunk.title + "\n" + hit.chunk.content + "\n" + " ".join(hit.chunk.entities)
        for hit in final_hits
    )
    missing = [entity for entity in query_entities if entity not in final_text]
    covered = 1 - (len(missing) / max(len(query_entities), 1))
    warnings: list[str] = []

    if not candidates:
        warnings.append("初召回为空：需要检查知识库是否入库、向量模型是否可用、查询是否过窄。")
    if final_hits and max(hit.rerank_score for hit in final_hits) < settings.min_rerank_score:
        warnings.append("最高重排分低于阈值：回答应降级为资料不足或追问。")
    if missing:
        warnings.append("用户问题中的部分实体没有被最终上下文覆盖。")
    if all(hit.chunk.source_level == "C" for hit in final_hits) and final_hits:
        warnings.append("最终结果全部来自 C 级来源，不能支撑历史事实结论。")

    return RecallReport(
        query=query,
        total_candidates=len(candidates),
        final_hits=len(final_hits),
        coverage=covered,
        missing_entities=missing,
        warnings=warnings,
        passed=covered >= settings.min_recall_coverage and not any("初召回为空" in w for w in warnings),
    )
