"""核查、真实补查、有限修订及失败边界验证，不模拟成真实远端调用。"""
from agent.reflection import audit_answer, reflection_events, review_plan
from san_guo_core.models import KnowledgeChunk, RetrievalHit


def evidence():
    return [RetrievalHit(chunk=KnowledgeChunk(id='a', title='陈寿故里碑研究_蔡东洲', content='故里碑不足以确定陈寿出生地。',
            source='论文', knowledge_type='text', source_level='B', document_id='a', pdf_page=1)),
            RetrievalHit(chunk=KnowledgeChunk(id='b', title='陈寿故里碑考证_刘敏', content='广安说与南充说尚待论证。',
            source='论文', knowledge_type='text', source_level='B', document_id='b', pdf_page=3))]


def test_actual_research_and_revision():
    calls = []
    def lookup(query):
        calls.append(query)
        return evidence(), None
    def revise(prompt, hits):
        assert '核查发现' in prompt and len(hits) == 2
        return {'answer': '蔡东洲认为故里碑不足为证；刘敏认为两说尚待论证。PDF第1页、PDF第3页。'}
    events = list(reflection_events('陈寿故里碑争议？', {'answer': '故里碑证明陈寿出生在广安。蔡东洲。'}, lookup, revise))
    result = events[-1]['data']
    assert len(calls) > 1 and result['reflection']['rounds'] == 1
    assert result['reflection']['status'] == 'revised'
    assert '证明陈寿出生' not in result['answer']
    assert {'checking', 'researching', 'revising', 'revised'} <= {event.get('stage') for event in events}


def test_stops_after_two_rounds_and_removes_unsafe_draft():
    calls = []
    def revise(prompt, hits):
        calls.append(prompt)
        return {'answer': '故里碑证明陈寿出生在广安。蔡东洲。'}
    result = list(reflection_events('陈寿故里碑争议？', {'answer': '故里碑证明陈寿出生在广安。'}, lambda q: (evidence(), None), revise))[-1]['data']
    assert len(calls) == 2 and result['reflection']['status'] == 'limited'
    assert '故里碑证明' not in result['answer']
    assert result['generation']['kind'] == 'reflection_fallback'


def test_no_fake_revision_for_clean_answer():
    revise = lambda *args: (_ for _ in ()).throw(AssertionError('不应修订'))
    result = list(reflection_events('故里争议？', {'answer': '蔡东洲认为碑不足为证，刘敏保留两说。'}, lambda q: (evidence(), None), revise))[-1]['data']
    assert result['reflection']['rounds'] == 0
    assert not result['reflection']['actions']


def test_failed_research_is_not_success():
    def failed(query):
        raise RuntimeError('密钥不应输出')
    result = list(reflection_events('问题', {'answer': '初稿'}, failed, lambda *args: None))[-1]['data']
    assert result['reflection']['status'] == 'unavailable'
    assert '密钥' not in str(result)


def test_interrupted_supplement_removes_unsafe_assertion():
    def failed(query):
        raise RuntimeError('服务故障')
    result = list(reflection_events('故里争议', {'answer': '故里碑证明陈寿出生在广安。'},
                  failed, lambda *args: None, initial_hits=evidence()))[-1]['data']
    assert '故里碑证明' not in result['answer']
    assert result['reflection']['status'] == 'unavailable'


def test_nuwax_revision_uses_same_session_and_one_final_result():
    from agent.nuwax_client import NuwaxClient
    adapter = NuwaxClient()
    adapter.reflection_lookup = lambda query: (evidence(), None)
    calls = []
    def remote(message, mode, session_id, history, story_id):
        calls.append(session_id)
        yield {'type': 'delta', 'text': '测试流片段'}
        yield {'type': 'result', 'data': {'answer': '故里碑证明陈寿出生在广安。' if len(calls) == 1
               else '蔡东洲认为故里碑不足为证，刘敏认为两说尚待论证。',
               'session_id': 'same-session', 'tool_calls': []}}
    adapter._events = remote
    events = list(adapter.events('陈寿故里碑争议'))
    assert calls == [None, 'same-session']
    assert sum(event['type'] == 'result' for event in events) == 1
    assert sum(event['type'] == 'delta' for event in events) == 1
    assert events[-1]['data']['reflection']['status'] == 'revised'


def test_quote_page_and_plan_risks():
    codes = {issue['code'] for issue in audit_answer('陈寿', '原文记载：“完全伪造的古文引句内容”。PDF第99页。', evidence())}
    assert {'unverified_quote', 'unverified_page'} <= codes
    report = review_plan({'segments':[{'minutes':150},{'minutes':120}], 'costs':[120,90]}, 240, 200)
    assert report['status'] == 'needs_revision' and len(report['issues']) == 2
    assert review_plan({'segments':[{'minutes':None}], 'costs':[None]}, 240, 200)['status'] == 'needs_revision'
    assert review_plan({'segments':[{'minutes':60}], 'costs':[30]}, 240, 200)['status'] == 'checked'
