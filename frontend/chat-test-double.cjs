// Shared JSON-shaped double for existing UI state tests; real SSE has its own tests.
module.exports = ctx => {
  ctx.window.SGTChatTransport = {request: (payload, onEvent = () => {}) =>
    ctx.fetch('/chat/stream', {body:JSON.stringify(payload)}).then(async response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.session_id) onEvent({type:'session',session_id:data.session_id});
      return data;
    })};
};
