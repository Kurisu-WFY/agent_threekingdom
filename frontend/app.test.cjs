// Run: node frontend/app.test.cjs (no dependencies).
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.value = ''; this.children = []; this.dataset = {}; this.style = {}; this.hidden = true; this.classList = { toggle() {}, add() {}, remove() {} }; }
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
  document: { querySelector: get, querySelectorAll: () => [], createElement: () => new Element(), body: new Element(), addEventListener() {} },
  window: { addEventListener() {} }, AbortSignal, URL,
  fetch: (url, options) => url === '/health' ? Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) }) : new Promise((resolve, reject) => requests.push({ resolve, reject, body: JSON.parse(options.body) }))
});
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
  requests[0].resolve({ ok: true, json: async () => ({ answer: '南充路线' }) });
  await flush();
  assert.equal(run('chats[1].messages[2].text'), '南充路线');
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
  console.log('PASS: HTTP 422, invalid JSON, missing answer and timeout render retry and recover');
  console.log('PASS: single-chat delete guard, no phantom chat on undo, empty-chat reuse, pending response isolation');
  console.log('PASS: initial state, duplicate guard, independent requests, drafts, retry payload and recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });

function textTree(node) { return (node.textContent || '') + (node.children || []).map(textTree).join(' '); }
assert.match(textTree(run('metaNode({intent:{intent:"culture_qa"}})')), /待核验/);
assert.match(textTree(run('metaNode({intent:{intent:"budget_ticket"},route:null})')), /不能认定为免费/);
assert.match(textTree(run('trustNode({data_status:"live",updated_at:"2026-09-12T10:00:00+08:00",sources:[{title:"来源",source_url:"https://example.com",source_level:"C"}]})')), /不能支撑史实结论/);
assert.match(textTree(run('trustNode({updated_at:"2026-09-12",sources:[{title:"不安全",source_url:"javascript:alert(1)",source_level:"A"}]})')), /来源链接待核验/);
assert.doesNotThrow(() => run('routeCard({name:"路线"},[null,{}, {name:"站点"}])'));
console.log('PASS: polymorphic responses, trust metadata, missing timestamps, unsafe sources, malformed stops');

const trusted = run('trustNode({data_status:"maintained",updated_at:"2026-09-12T10:00:00Z",sources:[{title:"官方",source_url:"https://example.com/info",source_level:"A"}]})');
assert.match(textTree(trusted), /维护数据/);
assert.match(textTree(trusted), /2026-09-12T10:00:00Z/);
assert.equal(trusted.children[2].children[0].href, 'https://example.com/info');
assert.equal(trusted.children[2].children[0].rel, 'noopener noreferrer');
assert.match(textTree(run('trustNode({data_status:"constructor"})')), /待核验/);
