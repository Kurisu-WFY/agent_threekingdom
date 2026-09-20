/* 不用浏览器回放前端地图逻辑：用最小 DOM 桩加载真实 travel-map.js，喂真实 /chat 响应。
 *
 * 用法：
 *   node docs/tools/replay_frontend_map.cjs frontend
 *   node docs/tools/replay_frontend_map.cjs frontend --base http://127.0.0.1:8002
 *   node docs/tools/replay_frontend_map.cjs frontend --fixture response.json
 *   node docs/tools/replay_frontend_map.cjs frontend --question "南充一天三国文化路线"
 *
 * 默认直接向 --base 发一次真实 /chat 请求（拿 route_planning 的响应）；给了 --fixture 就用文件。
 * 输出：发送后（地名识别）→ 回答后（后端站点）的路线状态与地图状态栏文本。
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const argv = process.argv.slice(2);
const feDir = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(__dirname, '..', '..', 'frontend'));
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const BASE = opt('base', 'http://127.0.0.1:8002');
const FIXTURE = opt('fixture', null);
const QUESTION = opt('question', '南充一天三国文化路线');

/* ---------------- 最小 DOM 桩 ---------------- */
function makeNode(tag = 'div') {
  const node = {
    tagName: tag, children: [], attributes: {}, textContent: '', value: '', hidden: false,
    disabled: false, className: '', style: {}, dataset: {}, scrollTop: 0, innerText: '',
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    append(...kids) { kids.forEach(k => { k.parent = this; this.children.push(k); }); },
    replaceChildren(...kids) { this.children = []; this.append(...kids); this.firstElementChild = this.children[0]; },
    addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
    setPointerCapture() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 900, height: 680 }; },
    getScreenCTM() { return { a: 1, b: 0, inverse: () => ({}) }; },
    closest() { return null; },
    querySelector() { return makeNode(); }
  };
  Object.defineProperty(node, 'firstElementChild', { writable: true, value: undefined });
  return node;
}
const registry = new Map();
['route-map', 'map-place-picker', 'map-picker-title', 'map-picker-list', 'map-picker-close',
 'map-prefecture', 'map-county', 'map-add-stop', 'county-points', 'route-lines', 'route-points',
 'map-route-list', 'map-route-status', 'map-zoom-range', 'map-zoom-value', 'map-zoom-in',
 'map-zoom-out', 'map-reset', 'map-fit', 'map-clear', 'map-view'].forEach(id => registry.set('#' + id, makeNode()));
registry.set('.interactive-map', makeNode());

global.document = {
  querySelector: sel => registry.get(sel) || (registry.set(sel, makeNode()), registry.get(sel)),
  createElement: tag => makeNode(tag),
  createElementNS: (ns, tag) => makeNode(tag),
  addEventListener() {}
};
global.Option = class Option { constructor(text, value) { this.text = text; this.value = value; } };
global.DOMPoint = class DOMPoint { constructor(x, y) { this.x = x; this.y = y; } };
const realFetch = global.fetch;   // ⚠️ 必须在覆盖 global.fetch 之前留住真实实现
global.fetch = async (url, init) => {
  // 绝对 URL（http/https）走真实网络：地图桩只负责拦同源的本地 JSON 资源。
  if (/^https?:\/\//i.test(String(url))) return realFetch(url, init);
  const file = path.join(feDir, String(url));
  return { ok: fs.existsSync(file), json: async () => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) };
};
global.window = global;
global.showContentView = () => {};
const chat = { messages: [] };
global.chats = [chat];
global.active = 0;

global.window.MapRouteCore = require(path.join(feDir, 'map-route-core.js'));
vm.runInThisContext(fs.readFileSync(path.join(feDir, 'travel-map.js'), 'utf8'), { filename: 'travel-map.js' });

const wait = ms => new Promise(r => setTimeout(r, ms));

async function getResponse() {
  if (FIXTURE) {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8').replace(/^\uFEFF/, ''));
    return raw.route_planning?.json ?? raw.route_planning ?? raw;
  }
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: QUESTION })
  });
  if (!res.ok) throw new Error(`后端返回 HTTP ${res.status}`);
  return res.json();
}

(async () => {
  console.log(`前端目录: ${feDir}`);
  console.log(`问题: ${QUESTION}   响应来源: ${FIXTURE ? 'fixture ' + FIXTURE : 'live ' + BASE}`);
  await wait();                                    // 等点位 JSON 加载
  const response = await getResponse();
  const map = global.window.TravelMap;

  map.syncChat(chat);
  map.fromMessage(chat, QUESTION);                 // 与 app.js send() 一致
  await wait();
  console.log('发送后（地名识别）:', JSON.stringify({
    kind: chat.mapRoute?.kind,
    located: chat.mapRoute?.points?.filter(Boolean).map(p => p.name) ?? []
  }));

  map.fromResponse(chat, QUESTION, response);      // 与 app.js requestReply() 一致
  await wait();
  console.log('回答后（后端站点）:', JSON.stringify({
    kind: chat.mapRoute?.kind,
    located: chat.mapRoute?.points?.map(p => (p ? p.name : null)) ?? [],
    pending: chat.mapRoute?.backendStopsPending ?? []
  }));
  console.log('地图状态栏:', registry.get('#map-route-status').textContent);
  console.log('已定位点数:', chat.mapRoute?.points?.filter(Boolean).length ?? 0);
})().catch(err => { console.error('回放失败：', err.message); process.exit(1); });
