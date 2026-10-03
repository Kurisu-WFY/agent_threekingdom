// 现有界面状态测试共用 JSON 结构的测试替身；真实 SSE 通信另有测试。
module.exports = ctx => {
  ctx.window.confirm = () => true;
  ctx.window.SGTChatTransport = {request: (payload, onEvent = () => {}) =>
    ctx.fetch('/chat/stream', {body:JSON.stringify(payload)}).then(async response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.session_id) onEvent({type:'session',session_id:data.session_id});
      return data;
    })};
};
