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
  window: { addEventListener() {} }, AbortSignal,
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
  console.log('PASS: single-chat delete guard, no phantom chat on undo, empty-chat reuse, pending response isolation');
  console.log('PASS: initial state, duplicate guard, independent requests, drafts, retry payload and recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
