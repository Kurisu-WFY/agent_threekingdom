/* Same-origin only: API keys and platform session IDs never enter the browser. */
(function (root) {
  async function request(payload, onEvent = () => {}, fetcher = fetch) {
    const response = await fetcher('/chat/stream', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: AbortSignal.timeout(310000)
    });
    if (!response.ok) throw new Error('聊天服务请求失败（HTTP ' + response.status + '）。');
    if (!response.body) throw new Error('浏览器无法读取流式回答。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '', result = null;
    function record(block) {
      const data = block.split('\n').filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart()).join('\n');
      if (!data) return;
      const event = JSON.parse(data);
      if (event.type === 'error') throw new Error(event.message || '智能体执行失败。');
      onEvent(event);
      if (event.type === 'result') result = event.data;
    }
    try {
      while (true) {
        const {value, done} = await reader.read();
        pending += decoder.decode(value, {stream: !done});
        let boundary;
        while ((boundary = pending.indexOf('\n\n')) >= 0) {
          record(pending.slice(0, boundary).replace(/\r/g, ''));
          pending = pending.slice(boundary + 2);
        }
        if (done) break;
      }
      if (pending.trim()) record(pending.replace(/\r/g, ''));
      if (!result || typeof result.answer !== 'string' || !result.answer.trim()) {
        throw new Error('未收到完整回答，平台任务可能仍在执行，请先检查女娲会话。');
      }
      return result;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  root.SGTChatTransport = {request};
  if (typeof module !== 'undefined') module.exports = {request};
})(typeof window === 'undefined' ? globalThis : window);
