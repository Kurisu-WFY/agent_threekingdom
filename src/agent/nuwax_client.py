"""女娲智能体会话适配，密钥和平台会话标识只保留在服务端。

此适配器仅供网页接口使用，不供 answer_travel_question 工具调用，
避免远程智能体通过该工具递归调用自身。
"""
from __future__ import annotations

import json
import secrets
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx

from san_guo_core.settings import get_settings
from agent.web_prompt import build_web_prompt


class NuwaxError(Exception):
    pass


def iter_sse(lines):
    """解析完整的 SSE 记录，支持多行数据和回车换行符。"""
    data = []
    for line in lines:
        if not line:
            if data:
                yield json.loads('\n'.join(data))
                data = []
        elif line.startswith('data:'):
            data.append(line[5:].lstrip(' '))
    if data:
        yield json.loads('\n'.join(data))


@dataclass
class Session:
    conversation_id: int
    used: float = field(default_factory=time.monotonic)
    lock: threading.Lock = field(default_factory=threading.Lock)


class NuwaxClient:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self.sessions = {}
        self.lock = threading.Lock()
        self.reflection_lookup = None

    @property
    def configured(self):
        return bool(self.settings.nuwax_api_key and self.settings.nuwax_agent_id.isdigit())

    @property
    def warning(self):
        value = self.settings.nuwax_sandbox_id
        if value and not value.isdigit():
            return '电脑 ID 不是数字，未使用该值；当前未显式指定本地电脑。'
        if not value:
            return '未显式指定电脑；是否连接本地 MCP 需以实际工具执行记录确认。'
        return ''

    def _conversation(self, client, base, token):
        with self.lock:
            now = time.monotonic()
            for key, session in list(self.sessions.items()):
                if now - session.used > 86400 and not session.lock.locked():
                    del self.sessions[key]
            if token:
                session = self.sessions.get(token)
                if session is None:
                    raise NuwaxError('对话已失效或后端已重启，请新建对话。')
                session.used = now
                return token, session
            if len(self.sessions) >= 256:
                raise NuwaxError('会话数量达到本地服务上限，请稍后再试。')
            response = client.post(base + '/api/v1/chat/conversation/add',
                                   json={'agentId': int(self.settings.nuwax_agent_id)})
            response.raise_for_status()
            body = response.json()
            if body.get('code') != '0000' or not str(body.get('data', '')).isdigit():
                raise NuwaxError('女娲创建会话失败，请检查智能体 ID、发布状态和 API Key 权限。')
            token = secrets.token_urlsafe(24)
            session = Session(int(body['data']))
            self.sessions[token] = session
            return token, session

    def events(self, message, mode='大众', session_id=None, history=None, story_id=None):
        """网页由后端核查最终初稿；修订请求仍由原女娲智能体生成，不冒充模型回答。"""
        from agent.intent_router import route_intent
        from agent.reflection import reflection_events
        draft = None
        for event in self._events(message, mode, session_id, history, story_id):
            if event['type'] == 'result':
                draft = event['data']
            else:
                yield event
        if draft is None:
            return
        if self.reflection_lookup is None or route_intent(message).intent not in ('culture_qa', 'history_vs_romance'):
            yield {'type': 'result', 'data': draft}
            return
        started = time.monotonic()
        def revise(prompt, hits):
            if time.monotonic() - started > 120:
                return None
            for event in self._events(prompt, mode, draft['session_id'], [], story_id):
                if event['type'] == 'result':
                    candidate = event['data']
                    candidate['tool_calls'] = draft.get('tool_calls', []) + candidate.get('tool_calls', [])
                    return candidate
                if event['type'] == 'error':
                    return None
            return None
        yield from reflection_events(message, draft, self.reflection_lookup, revise)

    def _events(self, message, mode='大众', session_id=None, history=None, story_id=None):
        """输出经过清理的前端事件，不透传平台原始错误或配置。"""
        session = None
        acquired = False
        try:
            if not self.configured:
                raise NuwaxError('女娲智能体未配置完整。')
            base = self.settings.nuwax_base_url.rstrip('/')
            url = urlsplit(base)
            if url.scheme not in ('http', 'https') or not url.hostname or url.path not in ('', '/') or url.query or url.username:
                raise NuwaxError('NUWAX_BASE_URL 必须是平台根地址，不能包含 /app/ 页面路径。')
            headers = {'Authorization': 'Bearer ' + self.settings.nuwax_api_key}
            with httpx.Client(headers=headers, timeout=httpx.Timeout(60, connect=15), follow_redirects=False) as client:
                token, session = self._conversation(client, base, session_id)
                acquired = session.lock.acquire(blocking=False)
                if not acquired:
                    raise NuwaxError('此对话仍在执行，请等待完成后再发送。')
                yield {'type': 'session', 'session_id': token, 'warning': self.warning}
                # 发送近期用户上下文，提供人物和阶段提示；
                # 以平台保存的会话历史为准，而非浏览器传来的助手文本。
                prompt = build_web_prompt(message, mode, history, story_id)
                payload = {'conversationId': session.conversation_id, 'message': prompt}
                if self.settings.nuwax_sandbox_id.isdigit():
                    payload['sandboxId'] = int(self.settings.nuwax_sandbox_id)
                answer, calls = '', []
                started = time.monotonic()
                with client.stream('POST', base + f'/api/v1/chat/{session.conversation_id}', json=payload) as response:
                    response.raise_for_status()
                    if 'text/event-stream' not in response.headers.get('content-type', ''):
                        raise NuwaxError('女娲返回的不是会话事件流，请检查接口地址。')
                    for event in iter_sse(response.iter_lines()):
                        if time.monotonic() - started > self.settings.nuwax_timeout_seconds:
                            raise NuwaxError('智能体执行超时；平台任务可能仍在运行，请先检查女娲会话，避免重复提交。')
                        kind, data = event.get('eventType'), event.get('data') or {}
                        if not isinstance(data, dict):
                            data = {}
                        if kind == 'ERROR' or event.get('error'):
                            raise NuwaxError('女娲执行失败，请检查平台会话日志和本地电脑状态。')
                        if kind == 'MESSAGE' and data.get('role') == 'ASSISTANT' and data.get('type') == 'CHAT':
                            text = data.get('text') or ''
                            if isinstance(text, str) and text:
                                answer += text
                                yield {'type': 'delta', 'text': text}
                        elif kind == 'PROCESSING':
                            call = {k: str(data.get(k) or '')[:200] for k in ('name', 'type', 'status')}
                            calls.append(call)
                            yield {'type': 'tool', **call}
                        elif kind == 'FINAL_RESULT':
                            if data.get('success') is not True:
                                raise NuwaxError('女娲未成功完成本次回答，请检查平台会话。')
                            answer = data.get('outputText') or answer
                            if not isinstance(answer, str) or not answer.strip():
                                raise NuwaxError('智能体完成了任务，但没有返回文字回答。')
                            yield {'type': 'result', 'data': {
                                'answer': answer, 'session_id': token, 'tool_calls': calls,
                                'generation': {'kind': 'nuwax', 'reason': '女娲智能体真实返回；资料与动态信息仍需核验。'},
                                'connection_warning': self.warning}}
                            return
                        else:
                            yield {'type': 'heartbeat'}
                raise NuwaxError('连接提前结束，未收到完成确认；请检查女娲会话后再重试。')
        except NuwaxError as exc:
            yield {'type': 'error', 'message': str(exc)}
        except httpx.TimeoutException:
            yield {'type': 'error', 'message': '女娲连接超时；平台任务可能仍在运行，请勿连续重复提交。'}
        except Exception:
            yield {'type': 'error', 'message': '女娲接口请求失败，请检查网络、接口权限及平台日志。'}
        finally:
            if acquired:
                session.used = time.monotonic()
                session.lock.release()

    def chat(self, message, mode='大众', session_id=None, history=None, story_id=None):
        for event in self.events(message, mode, session_id, history, story_id):
            if event['type'] == 'result':
                return event['data']
            if event['type'] == 'error':
                raise NuwaxError(event['message'])
        raise NuwaxError('未收到回答。')
