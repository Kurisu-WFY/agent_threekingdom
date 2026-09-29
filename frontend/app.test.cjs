// 运行命令：node frontend/app.test.cjs，无需额外依赖。
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
class Element {
  constructor(tag) { this.tag = tag; this.value = ''; this.children = []; this.dataset = {}; this.style = {}; this.hidden = true; this.classList = { toggle() {}, add() {}, remove() {} }; }
  querySelector() { return get('submit'); }
  setAttribute() {}
  addEventListener() {}
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
  focus() { this.focused = true; }
}
const nodes = new Map();
function get(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }
const requests = [];
const context = vm.createContext({
  document: { querySelector: get, querySelectorAll: () => [], createElement: tag => new Element(tag), body: new Element(), addEventListener() {} },
  window: { addEventListener() {} }, AbortSignal, URL,
  fetch: (url, options) => url === '/health' ? Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) }) : new Promise((resolve, reject) => requests.push({ resolve, reject, body: JSON.parse(options.body) }))
});
// 应用状态测试使用通信替身；SSE 字节级解析另行测试。
context.window.SGTChatTransport = {request: (payload, onEvent = () => {}) =>
  context.fetch('/chat/stream', {body:JSON.stringify(payload)}).then(async response => {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data.session_id) onEvent({type:'session',session_id:data.session_id});
    return data;
  })};
vm.runInContext(fs.readFileSync(__dirname + '/app.js', 'utf8'), context);
const run = code => vm.runInContext(code, context);
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  assert.equal(get('#chat-panel').hidden, true);
  assert.equal(get('submit').disabled, true);
  assert.equal(get('#history-list').children[0].children.length, 1);
  run('deleteChat(chats[0])');
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 1);
  get('#new-chat').onclick();
  get('#new-chat').onclick();
  assert.equal(run('chats.length'), 1);
  run("send('南充一天路线')");
  assert.equal(requests.length, 1);
  run("send('重复提交')");
  assert.equal(requests.length, 1);
  get('#message').value = '保留的草稿';
  get('#new-chat').onclick();
  run("send('文化问题')");
  assert.equal(requests.length, 2);
  requests[0].resolve({ ok: true, json: async () => ({ answer: '南充路线', session_id:'session-a' }) });
  await flush();
  assert.equal(run('chats[1].messages[2].text'), '南充路线');
  assert.equal(run('chats[1].sessionId'), 'session-a');
  assert.equal(requests[1].body.session_id, null);
  assert.equal(run('chats[0].pending'), true);
  get('#history-list').children[1].children[0].onclick();
  assert.equal(get('#message').value, '保留的草稿');
  requests[1].reject(new Error('offline'));
  await flush();
  assert.equal(run('chats[0].messages[2].error'), true);
  run('requestReply(chats[0], chats[0].messages[2])');
  assert.deepEqual(requests[2].body, requests[1].body);
  requests[2].resolve({ ok: true, json: async () => ({ answer: '文化回答' }) });
  await flush();
  assert.equal(run('chats[0].messages.length'), 3);
  assert.equal(run('chats[0].messages[2].error'), false);
  assert.equal(run('chats[0].pending'), false);
  run('deleteChat(chats[0])');
  assert.equal(run('chats.length'), 1);
  assert.equal(get('#message').value, '保留的草稿');
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  assert.equal(run('active'), 0);
  run('deleteChat(chats[active])');
  const remaining = run('chats[0]');
  run('deleteChat(chats[active])');
  assert.equal(run('chats.length'), 1);
  assert.equal(run('chats[0]'), remaining);
  assert.equal(get('#history-list').children[0].children.length, 1);
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  get('#new-chat').onclick();
  run("send('等待中删除')");
  run('deleteChat(chats[active])');
  const messageCount = run('chats[active].messages.length');
  requests[3].resolve({ ok: true, json: async () => ({ answer: '迟到的回答' }) });
  await flush();
  assert.equal(run('chats[active].messages.length'), messageCount);
  get('#undo-delete').onclick();
  assert.equal(run('chats[active].messages[2].text'), '迟到的回答');
  assert.equal(run('chats.length'), 3);
  for (const failure of [
    {ok:false,status:422,json:async()=>({detail:'missing message'})},
    {ok:true,json:async()=>{throw new SyntaxError('invalid JSON')}},
    {ok:true,json:async()=>({route:null})},
    Object.assign(new Error('timeout'),{name:'TimeoutError'})
  ]) {
    run("send('错误态回归')");
    const request = requests[requests.length-1];
    if(failure instanceof Error) request.reject(failure); else request.resolve(failure);
    await flush();
    assert.equal(run('chats[active].messages.at(-1).error'),true);
    assert.equal(run('chats[active].pending'),false);
    const errorMessage = run('chats[active].messages.at(-1)');
    assert.match(textTree(run('messageNode(chats[active].messages.at(-1))')),/重新请求/);
    run('requestReply(chats[active],chats[active].messages.at(-1))');
    requests.at(-1).resolve({ok:true,json:async()=>({answer:'重试成功',intent:{intent:'culture_qa'}})});
    await flush();
    assert.equal(errorMessage.error,false);
  }
  await assert.rejects(context.window.SGTChat.request('   '),/填写/);
  for(const failure of [{ok:false,status:503},{ok:true,json:async()=>{throw new SyntaxError('bad JSON');}},Object.assign(Error('timeout'),{name:'TimeoutError'})]) {
    const p=context.window.SGTChat.request('请规划路线');const assertion=assert.rejects(p);const req=requests.at(-1);
    assert.equal(req.body.message,'请规划路线');if(failure instanceof Error)req.reject(failure);else req.resolve(failure);await assertion;
  }
  context.window.CharacterChat={backendMode:()=> '学术'};
  const modeRequest=run("window.SGTChat.request('文化模式校验')");assert.equal(requests.at(-1).body.mode,'学术');requests.at(-1).resolve({ok:true,json:async()=>({answer:'模式回答',intent:{intent:'culture_qa'}})});await modeRequest;delete context.window.CharacterChat;
  console.log('PASS: HTTP 422, invalid JSON, missing answer and timeout render retry and recover');
  console.log('PASS: single-chat delete guard, no phantom chat on undo, empty-chat reuse, pending response isolation');
  console.log('PASS: initial state, duplicate guard, independent requests, drafts, retry payload and recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });

function textTree(node) { return (node.textContent || '') + (node.children || []).map(textTree).join(' '); }
function allNodes(node) { return [node,...(node.children||[]).flatMap(allNodes)]; }
assert.match(textTree(run('metaNode({intent:{intent:"culture_qa"}})')), /待核验/);
assert.match(textTree(run('metaNode({intent:{intent:"culture_qa"},retrieval:{coverage:0.55,passed:true}})')), /意图 · 文化问答.*召回覆盖 · 55%（仅表示检索匹配）/);
assert.doesNotMatch(textTree(run('metaNode({intent:{intent:"unknown"},retrieval:{coverage:2}})')), /意图 ·|召回覆盖/);
assert.match(textTree(run('metaNode({intent:{intent:"budget_ticket"},route:null})')), /不能认定为免费/);
assert.match(textTree(run('trustNode({data_status:"live",updated_at:"2026-09-12T10:00:00+08:00",sources:[{title:"来源",source_url:"https://example.com",source_level:"C"}]})')), /不能支撑史实结论/);
assert.match(textTree(run('trustNode({updated_at:"2026-09-12",sources:[{title:"不安全",source_url:"javascript:alert(1)",source_level:"A"}]})')), /来源链接待核验/);
assert.doesNotThrow(() => run('routeCard({name:"路线"},[null,{}, {name:"站点"}])'));
console.log('PASS: polymorphic responses, trust metadata, missing timestamps, unsafe sources, malformed stops');

run(fs.readFileSync(__dirname + '/answer-format.js', 'utf8'));
context.testUserMessage={role:'user',text:'**粗体** 和 `代码`\n- 第一项\ncoverage: 0.5\n| coverage | 内容 |\n| --- | --- |\n| 50% | 原文 |\n<img src=x onerror=alert(1)>'};
const userBubble=run('bubbleNode(testUserMessage)');
const userNodes=allNodes(userBubble);
assert.ok(userNodes.some(n=>n.tag==='strong'&&n.textContent==='粗体'));
assert.ok(userNodes.some(n=>n.tag==='code'&&n.textContent==='代码'));
assert.ok(userNodes.some(n=>n.tag==='ul'));
assert.ok(textTree(userBubble).includes('coverage: 0.5'));
assert.ok(userNodes.some(n=>n.tag==='th'&&textTree(n).includes('coverage')));
assert.ok(!userNodes.some(n=>n.tag==='img'));
context.testAssistantMessage={role:'assistant',text:'## 标题\n- 第一项'};
assert.ok(allNodes(run('bubbleNode(testAssistantMessage)')).some(n=>n.tag==='h4'));

const trusted = run('trustNode({data_status:"maintained",updated_at:"2026-09-12T10:00:00Z",sources:[{title:"官方",source_url:"https://example.com/info",source_level:"A"}]})');
assert.match(textTree(trusted), /维护数据/);
assert.match(textTree(trusted), /2026-09-12T10:00:00Z/);
assert.equal(trusted.children[2].children[0].href, 'https://example.com/info');
assert.equal(trusted.children[2].children[0].rel, 'noopener noreferrer');
assert.match(textTree(run('trustNode({data_status:"constructor"})')), /待核验/);
