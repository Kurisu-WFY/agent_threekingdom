"""按文献覆盖证据，避免固定片段上限让同一作者挤掉其他相关来源。"""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path
from typing import TYPE_CHECKING

from rag.tokenizer import tokenize
from rag.reranker import rerank
from rag.recall_checker import inspect_recall
from san_guo_core.models import KnowledgeChunk, RecallReport, RetrievalHit

if TYPE_CHECKING:
    from rag.hybrid_retriever import HybridRetriever

PEOPLE = ('陈寿', '谯周', '王平', '霍峻', '霍弋', '刘备', '诸葛亮', '关羽', '张飞',
          '马超', '黄忠', '赵云', '庞统', '法正', '姜维', '邓艾', '黄权')
# 具体主题须有相应文字证据；不能只因同属三国或同提陈寿就收进来源清单。
FOCUS_GROUPS = (
    (('故里', '故乡', '籍贯'), ('故里', '故乡', '籍贯', '安汉', '宕渠', '巴西', '阆中人', '成都人')),
    (('故里碑',), ('故里碑', '籍贯', '安汉')),
    (('索米',), ('索米', '千斛', '丁仪', '丁廙')),
    (('编撰', '编纂', '编书', '著史'), ('编撰', '编纂', '编书', '著史', '著述', '撰写', '六十五篇')),
    (('史德',), ('史德', '史家品德', '曲笔', '索米')),
    (('正统',), ('正统', '帝魏', '尊魏')),
    (('民族',), ('民族', '夷夏', '夷狄')),
)


def topic_matches(query: str, chunk: KnowledgeChunk) -> bool:
    # 仅在主题过滤时统一常见人名与主题字形；证据原文保持原样，不能改写引文。
    text = (chunk.title + ' ' + chunk.content).translate(str.maketrans({
        '陳': '陈', '壽': '寿', '譙': '谯', '張': '张', '劉': '刘', '備': '备',
        '關': '关', '馬': '马', '黃': '黄', '龐': '庞', '統': '统', '維': '维',
        '鄧': '邓', '權': '权', '國': '国', '書': '书', '編': '编', '鄉': '乡',
        '傳': '传', '紀': '纪', '撰': '撰', '著': '著',
    }))
    people = [name for name in PEOPLE if name in query]
    # 经审核的人物实体也用于识别字/号（例如“承祚”），具体主题仍须正文或标题匹配。
    person_text = text + ' ' + ' '.join(chunk.entities)
    if people and not any(name in person_text for name in people):
        return False
    for triggers, alternatives in FOCUS_GROUPS:
        if any(term in query for term in triggers) and not any(term in text for term in alternatives):
            return False
    return True


def document_key(chunk: KnowledgeChunk) -> str:
    return chunk.document_id or chunk.source_file or chunk.source


def reference_catalog(hits: list[RetrievalHit]) -> list[dict]:
    documents = {}
    for hit in hits:
        chunk = hit.chunk
        key = document_key(chunk)
        title = re.sub(r'\s*[·，]?\s*PDF第\d+页.*$', '', chunk.title)
        if chunk.category == 'primary_source':
            title = (f'《{Path(chunk.source_file).stem}》' if Path(chunk.source_file).suffix.lower() == '.pdf'
                     else title.split('（原文', 1)[0])
        record = documents.setdefault(key, {
            'document_id': key,
            'title': title,
            'source_level': chunk.source_level, 'pdf_pages': [],
            'source': chunk.source, 'risk_note': chunk.risk_note, 'sections': [], 'category': chunk.category,
        })
        section = re.sub(r'\s*[·，]?\s*PDF第\d+页.*$', '', chunk.title)
        if section not in record['sections']:
            record['sections'].append(section)
        if chunk.pdf_page is not None and chunk.pdf_page not in record['pdf_pages']:
            record['pdf_pages'].append(chunk.pdf_page)
    for record in documents.values():
        record['pdf_pages'].sort()
    return list(documents.values())


def complete_reference_list(answer: str, hits: list[RetrievalHit]) -> str:
    """本地模型漏列题名时补上真实出处，正文观点仍须由模型正确归属。"""
    missing = [ref for ref in reference_catalog(hits) if ref['title'] not in answer]
    if not missing:
        return answer
    lines = []
    for ref in missing:
        pages = '；PDF第' + '、'.join(map(str, ref['pdf_pages'])) + '页' if ref['pdf_pages'] else ''
        kind = '史籍文本' if ref['category'] == 'primary_source' else '相关研究／资料'
        lines.append(f"- {ref['title']}（{kind}{pages}）")
    return answer.rstrip() + '\n\n### 本次补充相关资料\n\n' + '\n'.join(lines)


def retrieve_document_evidence(retriever: HybridRetriever, query: str, intent: str | None = None) -> tuple[list[RetrievalHit], RecallReport]:
    """检索全部已入库片段，按相关性过滤后每文献保留代表段，不承诺库外全量检索。"""
    chunks = list(retriever.vector_store.all_chunks())
    if not chunks or not query.strip():
        return [], inspect_recall(query, [], [])
    settings = retriever.settings
    minimum_vector = getattr(settings, 'evidence_min_vector_score', .55)
    minimum_lexical = getattr(settings, 'evidence_min_lexical_score', .30)
    per_document = getattr(settings, 'evidence_chunks_per_document', 3)
    tokens = set(tokenize(query)) - {'什么', '怎么', '如何', '为什么', '介绍', '讲解', '原文', '资料', '文献', '相关', '原典', '论文', '结合', '说明'}
    # 用用户原始问题衡量相关性，不把自动附加的南充等词当成用户检索条件。
    if hasattr(retriever.vector_store, 'search'):
        vector_hits = [RetrievalHit(chunk=row['chunk'], vector_score=row['score'], matched_query=query)
                       for row in retriever.vector_store.search(query, len(chunks), 0)]
    else:
        vector_hits = retriever._vector_search(query)
    candidates = {hit.chunk.id: hit for hit in vector_hits}
    for chunk in chunks:
        text_tokens = set(tokenize(chunk.title + ' ' + chunk.content + ' ' + ' '.join(chunk.entities)))
        lexical = len(tokens & text_tokens) / max(len(tokens), 1) if tokens else 0
        hit = candidates.setdefault(chunk.id, RetrievalHit(chunk=chunk, matched_query=query))
        hit.lexical_score = lexical
    relevant = [hit for hit in candidates.values()
                if topic_matches(query, hit.chunk)
                and (hit.vector_score >= minimum_vector or hit.lexical_score >= minimum_lexical)]
    ranked = rerank(query, relevant, len(relevant))
    ranked = [hit for hit in ranked if hit.rerank_score >= settings.min_rerank_score]
    # 显式书名原文仍优先；论文保留供观点归属与争议对照，不冒充古籍。
    explicit_books = set(re.findall(r'《([^》]+)》', query))
    def priority(hit):
        books = set(re.findall(r'《([^》]+)》', hit.chunk.title))
        requested = '原文' in query and hit.chunk.category == 'primary_source' and bool(books & explicit_books)
        return (not requested, hit.chunk.category != 'primary_source', -hit.rerank_score)
    ranked.sort(key=priority)
    grouped = defaultdict(list)
    for hit in ranked:
        rows = grouped[document_key(hit.chunk)]
        # 同文重叠段只作一条依据，留出空间给其他证据与不同观点。
        if len(rows) < per_document and not any(
            hit.chunk.content in row.chunk.content or row.chunk.content in hit.chunk.content for row in rows
        ):
            rows.append(hit)
    selected = [hit for rows in grouped.values() for hit in rows]
    return selected, inspect_recall(query, relevant, selected)
