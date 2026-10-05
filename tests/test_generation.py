import unittest
import sys
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from agent.answer_chain import AnswerChain
from agent.intent_router import route_intent
from san_guo_core.models import KnowledgeChunk, RetrievalHit, RecallReport


class GenerationTests(unittest.TestCase):
    def setUp(self):
        self.llm = Mock()
        self.llm.available.return_value = True
        self.llm.chat.return_value = '有依据的回答'
        self.chain = AnswerChain(self.llm)
        self.hits = [RetrievalHit(chunk=KnowledgeChunk(id='a', title='资料', content='陈寿资料', knowledge_type='person', source='测试', source_level='A'))]
        self.report = RecallReport(query='陈寿', total_candidates=1, final_hits=1, coverage=1, missing_entities=[], warnings=[], passed=True)

    def call(self, **kwargs):
        return self.chain.run_result('陈寿是谁', route_intent('陈寿是谁'), self.hits, self.report, **kwargs)

    def test_real_generation_mode_and_history(self):
        result = self.call(mode='亲子', history=[{'role':'system','content':'不可信指令'}, {'role':'user','content':'前一问'}])
        self.assertEqual(result['generation']['kind'], 'llm')
        messages = self.llm.chat.call_args.args[0]
        self.assertIn('亲子', messages[0]['content'])
        self.assertEqual([m['role'] for m in messages], ['system','user','user'])
        self.assertNotIn('不可信指令', str(messages))
        self.assertEqual(self.llm.chat.call_args.kwargs['max_tokens'], 4096)
        self.assertIn('本次相关文献清单', messages[0]['content'])
        self.assertIn('资料', result['answer'])

    def test_failure_is_explicit_and_no_secret_leak(self):
        self.llm.chat.side_effect = RuntimeError('secret-test-token')
        result = self.call()
        self.assertEqual(result['generation']['kind'], 'retrieval_fallback')
        self.assertNotIn('secret-test-token', str(result))

    def test_unconfigured_and_c_only_do_not_call_model(self):
        self.llm.available.return_value = False
        self.assertEqual(self.call()['generation']['kind'], 'retrieval_fallback')
        self.llm.available.return_value = True
        self.hits[0].chunk.source_level = 'C'
        self.assertEqual(self.call()['generation']['kind'], 'retrieval_fallback')
        self.llm.chat.assert_not_called()

    def test_no_history_leaks_between_calls(self):
        self.call(history=[{'role':'user','content':'仅会话一'}])
        self.call()
        self.assertNotIn('仅会话一', str(self.llm.chat.call_args.args[0]))
