"""执行真实的 BGE 和项目混合检索检查，不调用付费大模型。"""
import json
from pathlib import Path
from rag.hybrid_retriever import HybridRetriever
from san_guo_core.settings import get_settings

queries = [
    '陈寿文质辨洽的思想是什么？',
    '陈寿故里碑与陈寿故里的争议有哪些？',
    '陈寿三国志的正统观是什么？',
    '南充名人文化旅游资源如何评价？',
    '民族歌剧陈寿有什么艺术特点？',
]
retriever = HybridRetriever()
report = []
for query in queries:
    hits, recall = retriever.retrieve(query, 'culture_qa')
    row = {'query': query, 'recall': recall.model_dump(), 'hits': [
        {'source': h.chunk.source, 'category': h.chunk.category,
         'score': h.rerank_score, 'content': h.chunk.content} for h in hits]}
    report.append(row)
    print(query, [h.chunk.source for h in hits], flush=True)
destination = get_settings().vector_store_path.parent / 'retrieval-check.json'
destination.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(destination)
