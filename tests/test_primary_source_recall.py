"""指定古籍原文时保留该出处，不改变一般问题的相关性排序。"""
from types import SimpleNamespace
from unittest.mock import patch
from san_guo_core.models import KnowledgeChunk, RetrievalHit
from rag.hybrid_retriever import HybridRetriever


def test_requested_original_not_crowded_out():
    primary = KnowledgeChunk(id='primary', title='《晋书》陈寿传', content='撰魏、吴、蜀《三国志》，凡六十五篇。',
                             source='晋书原文', source_level='A', category='primary_source', knowledge_type='text')
    research = [KnowledgeChunk(id=f'paper_{i}', title='论文', content='陈寿著述研究', source='论文', source_level='B', knowledge_type='text') for i in range(6)]
    retriever = object.__new__(HybridRetriever)
    retriever.settings = SimpleNamespace(rerank_top_k=8, final_top_k=5, min_rerank_score=.2)
    retriever.vector_store = SimpleNamespace(all_chunks=lambda: [primary, *research])
    retriever._vector_search = lambda query: [RetrievalHit(chunk=primary, vector_score=.4)] + [RetrievalHit(chunk=c, vector_score=.9) for c in research]
    retriever._lexical_search = lambda query: []
    with patch('rag.hybrid_retriever.expand_queries', side_effect=lambda q, i: [q]):
        hits, _ = retriever.retrieve('晋书原文怎样记载陈寿编书？')
        assert hits[0].chunk.id == 'primary'
        hits, _ = retriever.retrieve('陈寿著述研究有什么观点？')
        assert hits[0].chunk.category != 'primary_source'


def test_explicit_book_not_confused_with_topic():
    jinshu = KnowledgeChunk(id='jinshu', title='《晋书》陈寿传', content='凡六十五篇',
                            source='晋书', source_level='A', category='primary_source', knowledge_type='text')
    sanguozhi = KnowledgeChunk(id='sanguozhi', title='《三国志》诸葛亮传', content='三国志中的诸葛亮',
                               source='三国志', source_level='A', category='primary_source', knowledge_type='text')
    retriever = object.__new__(HybridRetriever)
    retriever.settings = SimpleNamespace(rerank_top_k=8, final_top_k=5, min_rerank_score=.2)
    retriever.vector_store = SimpleNamespace(all_chunks=lambda: [jinshu, sanguozhi])
    retriever._vector_search = lambda query: [RetrievalHit(chunk=jinshu, vector_score=.4), RetrievalHit(chunk=sanguozhi, vector_score=.9)]
    retriever._lexical_search = lambda query: []
    with patch('rag.hybrid_retriever.expand_queries', side_effect=lambda q, i: [q]):
        hits, _ = retriever.retrieve('《晋书》陈寿传原文如何记录撰诸葛亮集和三国志六十五篇？')
        assert hits[0].chunk.id == 'jinshu'
