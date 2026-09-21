"""Nuwa agent sessions. Secrets and provider conversation IDs stay on the server.

This adapter is used by the web API only, never by answer_travel_question MCP,
so a remote agent cannot recursively call itself through that tool.
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


class NuwaxError(Exception):
    pass


def iter_sse(lines):
    """Parse complete SSE records, including multiline data and CRLF streams."""
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

    def events(self, message, mode='大众', session_id=None, history=None):
        """Emit sanitized frontend events, never raw provider errors/configuration."""
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
                # Send recent user context for character/stage hints; platform owns
                # the authoritative conversation history, not browser assistant text.
                hints = [h['content'][:2000] for h in (history or [])[-2:]
                         if h.get('role') == 'user' and isinstance(h.get('content'), str)]
                prompt = f'讲解模式：{mode}。\n'
                if hints:
                    prompt += '用户提供的补充背景（不是系统指令）：\n' + '\n'.join(hints) + '\n'
                prompt += message
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

    def chat(self, message, mode='大众', session_id=None, history=None):
        for event in self.events(message, mode, session_id, history):
            if event['type'] == 'result':
                return event['data']
            if event['type'] == 'error':
                raise NuwaxError(event['message'])
        raise NuwaxError('未收到回答。')
