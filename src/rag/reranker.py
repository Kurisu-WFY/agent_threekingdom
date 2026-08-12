from domain import RetrievalHit
from rag.tokenizer import tokenize


SOURCE_WEIGHT = {"A": 1.0, "B": 0.75, "C": 0.35}


def rerank(query: str, hits: list[RetrievalHit], top_n: int) -> list[RetrievalHit]:
    query_tokens = set(tokenize(query))
    for hit in hits:
        content_tokens = set(tokenize(hit.chunk.title + " " + hit.chunk.content + " " + " ".join(hit.chunk.entities)))
        overlap = len(query_tokens & content_tokens)
        hit.lexical_score = overlap / max(len(query_tokens), 1)
        hit.source_score = SOURCE_WEIGHT.get(hit.chunk.source_level, 0.2)
        hit.rerank_score = (
            0.55 * hit.vector_score
            + 0.25 * hit.lexical_score
            + 0.15 * hit.source_score
            + 0.05 * (1.0 if hit.chunk.risk_note == "" else 0.7)
        )
    return sorted(hits, key=lambda item: item.rerank_score, reverse=True)[:top_n]

