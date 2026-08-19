import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag.retriever import HybridRetriever


DEFAULT_CASES = [
    {
        "query": "陈寿是谁，他和南充有什么关系",
        "expected_entities": ["陈寿", "南充"],
        "intent": "culture_qa",
    },
    {
        "query": "三国志和三国演义有什么区别",
        "expected_entities": ["三国志", "三国演义"],
        "intent": "history_vs_romance",
    },
]


def load_cases(path: str = "eval_queries.json") -> list[dict]:
    case_path = Path(path)
    if case_path.exists():
        return json.loads(case_path.read_text(encoding="utf-8"))
    return DEFAULT_CASES


def main() -> None:
    retriever = HybridRetriever()
    cases = load_cases()
    passed = 0
    for case in cases:
        hits, report = retriever.retrieve(case["query"], case.get("intent"))
        text = "\n".join(hit.chunk.title + hit.chunk.content + " ".join(hit.chunk.entities) for hit in hits)
        entity_hit = all(entity in text for entity in case.get("expected_entities", []))
        ok = report.passed and entity_hit
        passed += int(ok)
        print(f"\nQuery: {case['query']}")
        print(f"Passed: {ok}")
        print(f"Coverage: {report.coverage:.2f}")
        print(f"Warnings: {'; '.join(report.warnings) or 'None'}")
        for i, hit in enumerate(hits, 1):
            print(f"  {i}. {hit.chunk.id} rerank={hit.rerank_score:.3f} source={hit.chunk.source_level}")
    print(f"\nRecall check: {passed}/{len(cases)} = {passed / max(len(cases), 1):.2%}")


if __name__ == "__main__":
    main()
