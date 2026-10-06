"""验证逐文献覆盖、分页、相关性与完整出处，不依赖本地模型。"""
import asyncio
import json
from types import SimpleNamespace
from unittest.mock import patch

from rag.document_evidence import retrieve_document_evidence, reference_catalog
from san_guo_core.models import KnowledgeChunk


def fixture():
    chunks = [KnowledgeChunk(id=f'{doc}_{part}', document_id=f'doc{doc}', title=f'王平研究{doc}',
              content=f'王平守汉中相关论点{doc}，第{part}段的独立依据', source=f'论文{doc}',
              knowledge_type='text', source_level='B', pdf_page=part + 1)
              for doc in range(9) for part in range(5)]
    chunks.append(KnowledgeChunk(id='other', document_id='other', title='无关食谱', content='蛋糕与烤箱',
                                source='食谱', knowledge_type='text', source_level='B'))
    store = SimpleNamespace(all_chunks=lambda: chunks, search=lambda query, limit, min_score:
                            [{'chunk': c, 'score': .8 if c.id != 'other' else .1} for c in chunks])
    settings = SimpleNamespace(min_rerank_score=.2, min_recall_coverage=.55,
                               evidence_min_vector_score=.55, evidence_min_lexical_score=.30,
                               evidence_chunks_per_document=3)
    retriever = SimpleNamespace(vector_store=store, settings=settings)
    return retrieve_document_evidence(retriever, '王平守汉中')


def test_all_relevant_documents_not_five_chunks():
    hits, report = fixture()
    catalog = reference_catalog(hits)
    assert len(catalog) == 9 and len(hits) == 27
    assert all(ref['document_id'] != 'other' for ref in catalog)
    assert all(len(ref['pdf_pages']) == 3 for ref in catalog)


def test_mcp_pagination_has_no_missing_documents():
    import mcp_server
    hits, report = fixture()
    async def verify():
        seen, offset = [], 0
        with patch('mcp_server.HybridRetriever', return_value=object()), \
             patch('mcp_server.retrieve_document_evidence', return_value=(hits, report)):
            while True:
                result = await mcp_server.call_tool('retrieve_culture_knowledge', {'query': '王平', 'offset': offset, 'page_size': 4})
                payload = json.loads(result[0].text)
                seen.extend(ref['document_id'] for ref in payload['references'])
                if not payload['has_more']:
                    assert payload['next_offset'] is None
                    break
                assert payload['next_offset'] > offset
                offset = payload['next_offset']
        assert len(seen) == len(set(seen)) == 9
    asyncio.run(verify())


def test_fallback_lists_all_sources_without_diagnostics():
    from agent.response_policy import build_guarded_answer
    hits, report = fixture()
    answer = build_guarded_answer('王平', None, hits, report)
    assert all(f'王平研究{i}' in answer for i in range(9))
    assert '第4段' not in answer
    assert 'chunk' not in answer and 'rerank' not in answer and 'coverage' not in answer


def test_web_prompt_requests_full_references():
    from agent.web_prompt import build_web_prompt
    prompt = build_web_prompt('陈寿故里碑有什么争议？')
    assert '逐篇说明' in prompt and 'next_offset' in prompt and '不声称穷尽' in prompt


def test_same_person_different_topic_is_not_related():
    from rag.document_evidence import topic_matches
    chunk = KnowledgeChunk(id='politics', title='陈寿政治思想', content='陈寿史评的政治理念',
                           source='论文', knowledge_type='text', source_level='B')
    assert not topic_matches('陈寿故里碑有什么争议？', chunk)
    assert not topic_matches('王平的籍贯是什么？', chunk)


def test_reviewed_entity_resolves_style_name_without_bypassing_topic():
    from rag.document_evidence import topic_matches
    chunk = KnowledgeChunk(id='style_name', title='姚莹国不置史按语', content='承祚又憑何書之？',
                           entities=['陈寿'], source='清人按语', knowledge_type='text', source_level='B')
    assert topic_matches('陈寿国不置史', chunk)
    assert not topic_matches('陈寿故里碑争议', chunk)


def test_traditional_person_not_rejected_by_simplified_query():
    from rag.document_evidence import topic_matches
    chunk = KnowledgeChunk(id='traditional', title='唐庚考辨', content='陳壽曰：蜀不置史。',
                           source='宋人考辨', knowledge_type='text', source_level='B')
    assert topic_matches('陈寿国不置史如何理解？', chunk)
    assert chunk.content == '陳壽曰：蜀不置史。'
    assert not topic_matches('王平的籍贯是什么？', chunk)


def test_reference_appendix_only_uses_returned_sources():
    from rag.document_evidence import complete_reference_list
    hits, _ = fixture()
    answer = complete_reference_list('已经解释王平研究0的观点。', hits)
    assert all(f'王平研究{i}' in answer for i in range(9))
    assert answer.count('王平研究0') == 1
    assert '无关食谱' not in answer and 'doc8' not in answer
