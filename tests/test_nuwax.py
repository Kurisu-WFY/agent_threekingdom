import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from agent.nuwax_client import NuwaxClient, iter_sse


class NuwaxTests(unittest.TestCase):
    def setUp(self):
        self.settings = SimpleNamespace(nuwax_api_key='private-test-key', nuwax_agent_id='123',
            nuwax_base_url='https://example.test', nuwax_sandbox_id='456', nuwax_timeout_seconds=240)
        self.adapter = NuwaxClient(self.settings)
        self.requests = []
        self.reply = [
            {'eventType':'MESSAGE','data':{'role':'ASSISTANT','type':'THINK','text':'hidden reasoning'}},
            {'eventType':'MESSAGE','data':{'role':'ASSISTANT','type':'CHAT','text':'你好'}},
            {'eventType':'PROCESSING','data':{'name':'list_scenic_spots','type':'Mcp','status':'FINISHED','result':'private'}},
            {'eventType':'FINAL_RESULT','completed':True,'data':{'success':True,'outputText':'完整回答'}}]
        def handler(request):
            self.requests.append((str(request.url),json.loads(request.content)))
            if request.url.path.endswith('/add'):
                return httpx.Response(200,json={'code':'0000','data':len(self.requests)})
            return httpx.Response(200,headers={'content-type':'text/event-stream'},
                text=''.join('data: '+json.dumps(e,ensure_ascii=False)+'\n\n' for e in self.reply))
        self.client = httpx.Client(transport=httpx.MockTransport(handler))
        # 特意用可复用的上下文包装器替代真实客户端。
        class Wrapper:
            def __enter__(inner): return self.client
            def __exit__(inner,*args): pass
        self.patcher = patch('agent.nuwax_client.httpx.Client',return_value=Wrapper())
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop();self.client.close()

    def test_session_reused_new_session_isolated_and_no_secret(self):
        first=self.adapter.chat('第一问')
        second=self.adapter.chat('第二问',session_id=first['session_id'])
        third=self.adapter.chat('新对话')
        self.assertEqual(first['session_id'],second['session_id'])
        self.assertNotEqual(first['session_id'],third['session_id'])
        self.assertEqual(sum(url.endswith('/add') for url,_ in self.requests),2)
        self.assertEqual(self.requests[1][1]['sandboxId'],456)
        self.assertNotIn('private',str(first));self.assertNotIn('hidden reasoning',str(first))
        self.assertEqual(first['tool_calls'][0]['name'],'list_scenic_spots')

    def test_unknown_session_not_silently_replaced(self):
        result=list(self.adapter.events('hello',session_id='unknown'))
        self.assertEqual(result[-1]['type'],'error');self.assertFalse(self.requests)

    def test_invalid_sandbox_warns_without_sending_secret_as_id(self):
        self.settings.nuwax_sandbox_id='private-computer-key'
        result=self.adapter.chat('test')
        self.assertNotIn('sandboxId',self.requests[1][1])
        self.assertIn('不是数字',result['connection_warning'])
        self.assertNotIn('private-computer-key',str(result))

    def test_failed_or_missing_final_never_reports_success(self):
        for reply in [[], [{'eventType':'FINAL_RESULT','data':{'success':False,'error':'private-test-key'}}],
                      [{'eventType':'ERROR','error':'private-test-key'}]]:
            self.reply=reply
            events=list(self.adapter.events('test'))
            self.assertEqual(events[-1]['type'],'error')
            self.assertNotIn('private-test-key',str(events))

    def test_busy_session_rejected(self):
        data=self.adapter.chat('test');session=self.adapter.sessions[data['session_id']]
        with session.lock:
            events=list(self.adapter.events('again',session_id=data['session_id']))
        self.assertEqual(events[-1]['type'],'error')

    def test_app_url_rejected(self):
        self.settings.nuwax_base_url+=' /app/1'
        self.assertEqual(list(self.adapter.events('test'))[-1]['type'],'error')

    def test_sse_multiline(self):
        self.assertEqual(list(iter_sse([':comment','data: {','data: "a": 1}', ''])),[{'a':1}])
