const launcher = document.querySelector('#launcher');
const panel = document.querySelector('#chat-panel');
const input = document.querySelector('#message');
const messages = document.querySelector('#messages');
const historyList = document.querySelector('#history-list');
const form = document.querySelector('#chat-form');
const submitButton = form.querySelector('button[type="submit"]');
const viewLabel = document.querySelector('#view-label');

const API = '/chat'; // 与后端同源（后端把本页挂在 / 根路径）
const WELCOME = '展卷相迎。我是万卷史官·陈寿，你的 AI 文化向导。选一条故事线，我们逐章寻迹；有据说史，无据留白。你也可以先问一个人物，或告诉我可用时间。';
const INTENT_LABELS = {
  culture_qa: '文化问答',
  history_vs_romance: '正史 / 演义',
  route_planning: '路线规划',
  budget_ticket: '预算票价'
};

let chats = [{ title: '新对话', messages: [{ role: 'assistant', text: WELCOME }] }];
let active = 0;
let deletedChat = null;

function deleteChat(chat) {
  const index = chats.indexOf(chat);
  if (index < 0 || chats.length <= 1) return;
  saveDraft();
  const current = chats[active];
  deletedChat = { chat, index };
  chats.splice(index, 1);
  active = current === chat ? Math.min(index, chats.length - 1) : chats.indexOf(current);
  input.value = chats[active].draft || '';
  document.querySelector('#delete-notice').hidden = false;
  render();
  document.querySelector('#undo-delete').focus();
}

document.querySelector('#undo-delete').onclick = () => {
  if (!deletedChat) return;
  saveDraft();
  const { chat, index } = deletedChat;
  active = Math.min(index, chats.length);
  chats.splice(active, 0, chat);
  deletedChat = null;
  document.querySelector('#delete-notice').hidden = true;
  input.value = chat.draft || '';
  render();
  input.focus();
};
function updateComposer() {
  submitButton.disabled = !!chats[active].pending || !input.value.trim();
  submitButton.setAttribute('aria-label', chats[active].pending ? '正在生成回答' : '发送消息');
  const minHeight = window.innerWidth <= 760 ? 56 : 44;
  const maxHeight = Math.max(minHeight, (panel.clientHeight || window.innerHeight || 0) / 3);
  input.style.height = minHeight + 'px';
  input.style.overflowY = 'hidden';
  const contentHeight = input.value ? Math.max(minHeight, input.scrollHeight || 0) : minHeight;
  input.style.height = Math.min(contentHeight, maxHeight) + 'px';
  input.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
}

function saveDraft() {
  chats[active].draft = input.value;
}

/* ---------------- 渲染 ---------------- */
function tag(text, variant) {
  const span = document.createElement('span');
  span.className = 'tag' + (variant ? ' ' + variant : '');
  span.textContent = text;
  if (/待核验|待接入|未找到可靠记载|暂无数据/.test(text)) span.setAttribute('data-trust-state','unverified');
  return span;
}

function routeCard(route, stops) {
  const card = document.createElement('div');
  card.className = 'route-card';
  const name = document.createElement('div');
  name.className = 'route-name';
  name.textContent = route.name + (route.duration_hours ? ' · ' + route.duration_hours + ' 小时' : '');
  card.append(name);
  const risk = document.createElement('p'); risk.textContent = '风险提示：' + (route.risk_note || '待核验'); card.append(risk);
  if (Array.isArray(stops) && stops.length) {
    const list = document.createElement('ol');
    list.className = 'route-stops';
    stops.filter(stop => stop && typeof stop.name === 'string').forEach(stop => {
      const li = document.createElement('li');
      li.textContent = stop.name + ' · 推荐理由：' + (stop.reason || '待核验') + ' · 安排停留：' + (Number.isFinite(stop.stay_minutes) && stop.stay_minutes > 0 ? stop.stay_minutes + ' 分钟' : '待核验') + ' · 建议游览：' + (Number.isFinite(stop.recommended_duration_min) && stop.recommended_duration_min > 0 ? stop.recommended_duration_min + ' 分钟' : '待核验') + ' · 开放时间：' + (stop.open_time || '待核验');
      list.append(li);
    });
    card.append(list);
  }
  return card;
}

function trustNode(record, label = '回答') {
  const box = document.createElement('div');
  box.className = 'trust-info';
  const statuses = {sample:'演示数据', maintained:'维护数据', live:'实时数据', pending:'请以官方公告确认', stale:'请确认最新公告'};
  const status = record && Object.hasOwn(statuses, record.data_status) ? statuses[record.data_status] : null;
  box.append(tag(label + ' · ' + (status || '待核验')));
  const date = record && record.updated_at;
  const validDate = typeof date === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) && Number.isFinite(Date.parse(date));
  box.append(tag(validDate ? '更新时间 · ' + date : '更新时间 · 待核验'));
  const sources = record && Array.isArray(record.sources) ? record.sources : [];
  let count = 0;
  sources.forEach(source => {
    if (!source || typeof source.title !== 'string' || !source.title.trim()) return;
    const line = document.createElement('div');
    let url;
    try { url = new URL(source.source_url); } catch (_) {}
    const safe = url && ['http:', 'https:'].includes(url.protocol);
    const link = document.createElement(safe ? 'a' : 'span');
    link.textContent = source.title;
    if (safe) { link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    const level = ['A','B','C'].includes(source.source_level) ? source.source_level : '待核验';
    line.append(link, tag('来源等级 · ' + level));
    if (!safe) line.append(tag('来源链接待核验'));
    if (level === 'C') line.append(tag('仅供参考，不能支撑史实结论'));
    box.append(line); count += 1;
  });
  if (!count) box.append(tag('来源 · 待核验'));
  return box;
}

function metaNode(data) {
  const meta = document.createElement('div');
  meta.className = 'meta';
  const intent = data && data.intent && data.intent.intent;
  if (typeof intent === 'string' && Object.hasOwn(INTENT_LABELS, intent)) meta.append(tag('意图 · ' + INTENT_LABELS[intent]));
  const coverage = data?.retrieval?.coverage;
  if (typeof coverage === 'number' && Number.isFinite(coverage) && coverage >= 0 && coverage <= 1) {
    meta.append(tag('召回覆盖 · ' + Math.round(coverage * 100) + '%（仅表示检索匹配）'));
  }
  if(data?.generation?.kind!=='nuwax')meta.append(trustNode(data));
  if (intent === 'budget_ticket') meta.append(tag('价格信息待核验；未知金额不能认定为免费'));
  const route = intent === 'route_planning' && data?.route?.found === true && data.route.route;
  if (route) {
    meta.append(routeCard(route, data.route.stops), trustNode(route, '路线'));
  }
  return meta;
}

function bubbleNode(message) {
  const bubble = document.createElement('div');
  if (message.pending) {
    bubble.className = 'bubble typing';
    bubble.setAttribute('aria-label', '陈寿正在查阅史料，请稍候');
    bubble.textContent = '正在整理回答，请稍候…';
  } else {
    bubble.className = 'bubble';
    if (message.role === 'assistant' && message.persona && !message.error && window.CharacterChat) bubble.append(window.CharacterChat.answer(message));
    else if (!message.error && window.AgentAnswer) bubble.append(window.AgentAnswer.render(message.text,{preserve:message.role==='user'}));
    else bubble.textContent = message.text;
  }
  return bubble;
}

function messageNode(message) {
  const row = document.createElement('div');
  row.className = 'message ' + (message.role === 'user' ? 'user' : 'assistant');
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (message.persona && message.role !== 'user' && window.CharacterChat) avatar.append(window.CharacterChat.portrait(message.persona));
  else if (message.role !== 'user' && window.ChenshouGuide) avatar.append(window.ChenshouGuide.portrait());
  else avatar.textContent = message.role === 'user' ? '你' : '寿';
  const body = document.createElement('div');
  body.className = 'body';
  body.append(bubbleNode(message));
  if (message.error) {
    const retry = document.createElement('button');
    retry.className = 'retry';
    retry.textContent = '重新请求 · 请陈寿再查一次';
    retry.disabled = !!chats[active].pending;
    retry.onclick = () => requestReply(chats[active], message);
    body.append(retry);
  }
  if (message.data) body.append(metaNode(message.data));
  if (window.TravelAssistant?.canOpen(message)) {
    const sourceChat = chats[active];
    const open = document.createElement('button');
    open.className = 'module-button'; open.textContent = '查看出行方案';
    open.onclick = () => window.TravelAssistant.open(message, () => {
      const index = chats.indexOf(sourceChat);
      if (index < 0) return false;
      saveDraft(); active = index; input.value = sourceChat.draft || ''; render(); toggleChat(true); return true;
    });
    body.append(open);
  }
  row.append(avatar, body);
  return row;
}

function render() {
  historyList.replaceChildren();
  chats.forEach((chat, index) => {
    const item = document.createElement('div');
    item.className = 'history-row';
    const button = document.createElement('button');
    button.className = 'history-item' + (index === active ? ' active' : '');
    button.textContent = chat.title;
    button.title = chat.title;
    button.setAttribute('aria-pressed', String(index === active));
    button.onclick = () => {
      saveDraft();
      active = index;
      input.value = chats[active].draft || '';
      render();
    };
    const remove = document.createElement('button');
    remove.className = 'delete-chat';
    remove.textContent = '删除';
    remove.title = '删除此对话';
    remove.setAttribute('aria-label', '删除对话：' + chat.title);
    remove.onclick = () => deleteChat(chat);
    item.append(button);
    if (chats.length > 1) item.append(remove);
    historyList.append(item);
  });
  messages.replaceChildren();
  chats[active].messages.forEach(message => messages.append(messageNode(message)));
  messages.scrollTop = messages.scrollHeight;
  document.querySelector('#conversation-title').textContent = chats[active].title;
  updateComposer();
  window.CharacterChat?.sync(chats[active]);
  window.ChenshouGuide?.refresh();
  window.ExplorationJournal?.sync(chats);
  window.TravelMap?.syncChat(chats[active]);
}

/* ---------------- 展开 / 收起 ---------------- */
let launcherRestLeft = null;
let chatOpeningScroll = null;

function updateChatLayout() {
  if (!panel.hidden && window.innerWidth > 760) {
    launcher.style.left = Math.max(12, Math.min(launcherRestLeft ?? window.innerWidth, window.innerWidth - panel.offsetWidth - launcher.offsetWidth - 24)) + 'px';
  }
}

function toggleChat(open) {
  if (open === !panel.hidden) return;
  if (open) {
    chatOpeningScroll = { view: currentContentView, top: window.scrollY || 0 };
    const rect = launcher.getBoundingClientRect();
    launcherRestLeft = rect.left;
    launcher.style.left = rect.left + 'px';
    launcher.style.right = 'auto';
    // 固定起点后再设置终点，拖动过的入口也能从当前位置平移。
    void launcher.offsetWidth;
  }
  panel.hidden = !open;
  if (open) updateChatLayout();
  else launcher.style.left = launcherRestLeft + 'px';
  document.body.classList.toggle('chat-open', open);
  launcher.setAttribute('aria-expanded', String(open));
  launcher.setAttribute('aria-label', open ? '关闭对话' : '打开对话，可拖动调整位置');
  updateComposer();
  if (open) input.focus({ preventScroll: true });
  else {
    launcher.focus({ preventScroll: true });
    if (chatOpeningScroll?.view === currentContentView) window.scrollTo({ top: chatOpeningScroll.top, behavior: 'instant' });
    chatOpeningScroll = null;
  }
}

/* ---------------- 拖动入口 ---------------- */
let drag = null;
let suppressClick = false;
let suppressClickReset = null;

launcher.addEventListener('pointerdown', event => {
  suppressClick = false;
  clearTimeout(suppressClickReset);
  if (event.button !== 0 || !panel.hidden) return;
  const rect = launcher.getBoundingClientRect();
  drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
  suppressClick = false;
  launcher.setPointerCapture(event.pointerId);
});

launcher.addEventListener('pointermove', event => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.hypot(dx, dy) > 5) drag.moved = true;
  if (!drag.moved) return;
  launcher.classList.add('dragging');
  const availableWidth = window.innerWidth - (panel.hidden ? 0 : panel.offsetWidth);
  launcher.style.left = Math.max(0, Math.min(availableWidth - launcher.offsetWidth, drag.left + dx)) + 'px';
  launcher.style.top = Math.max(30, Math.min(window.innerHeight - launcher.offsetHeight, drag.top + dy)) + 'px';
  launcher.style.right = launcher.style.bottom = 'auto';
});

launcher.addEventListener('pointerup', () => {
  suppressClick = !!drag?.moved;
  // 只拦截本次拖动后紧随的合成 click；缺失该 click 时也自动复位。
  clearTimeout(suppressClickReset);
  suppressClickReset = setTimeout(() => { suppressClick = false; }, 0);
  drag = null;
  launcher.classList.remove('dragging');
});

launcher.addEventListener('pointercancel', () => {
  drag = null;
  suppressClick = false;
  clearTimeout(suppressClickReset);
  launcher.classList.remove('dragging');
});

launcher.addEventListener('click', event => {
  if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
  toggleChat(panel.hidden);
});

document.querySelector('#close-chat').onclick = () => toggleChat(false);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.hidden) toggleChat(false);
});

document.querySelector('#new-chat').onclick = () => {
  saveDraft();
  const empty = chats.findIndex(chat => chat.messages.length === 1 && !chat.draft?.trim() && !chat.pending);
  if (empty >= 0) active = empty;
  else {
    chats.unshift({ title: '新对话', messages: [{ role: 'assistant', text: WELCOME }] });
    active = 0;
  }
  input.value = chats[active].draft || '';
  render();
  input.focus();
};

/* ---------------- 调用后端 ---------------- */
function ask(text, history, mode = '大众', routePreferences, sessionId, onEvent, storyId) {
  if (!routePreferences) {
    return window.SGTChatTransport.request({message:text, history, mode, session_id:sessionId || null, story_id:storyId || null}, onEvent);
  }
  return fetch(API, {
    signal: AbortSignal.timeout(60000),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, mode, history, ...(routePreferences ? {route_preferences: routePreferences} : {}) })
  }).then(response => {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  });
}

// 现有行程表单共用 /chat 通信，结果仍显示在规划视图中。
window.SGTChat = { async request(text, routePreferences) {
  const message = typeof text === 'string' ? text.trim() : '';
  if (!message) throw new Error('请先填写出行需求。');
  const history = chats[active].messages.filter(item => item.text && !item.error && !item.pending)
    .map(item => ({role:item.role === 'user' ? 'user' : 'assistant', content:(item.persona ? '【人物视角：' + item.persona + '】' : '') + item.text}));
  const data = await ask(message, history, routePreferences?.explanation || window.CharacterChat?.backendMode() || '大众', routePreferences);
  if (!data || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('服务未返回有效回答，请重试。');
  return data;
} };

function send(text, options = {}) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;
  if (chats[active].pending) {
    if (trimmed !== input.value.trim()) input.value = input.value.trim() ? input.value + '\n\n' + trimmed : trimmed;
    saveDraft(); updateComposer(); return;
  }

  const chat = chats[active];
  const history = chat.messages
    .filter(item => item.text && !item.error && !item.pending)
    .map(item => ({ role: item.role === 'user' ? 'user' : 'assistant', content: (item.persona ? '【人物视角：' + item.persona + '】' : '') + item.text }));

  if (chat.messages.length === 1) chat.title = trimmed.slice(0, 10);
  const prepared = window.CharacterChat?.prepare(chat, trimmed);
  chat.messages.push({ role: 'user', text: trimmed, persona: prepared?.persona });
  const reply = { role: 'assistant', text: '', question: prepared?.question || trimmed, history: prepared ? [...history, {role:'user',content:prepared.context}] : history, persona: prepared?.persona, storyId: prepared?.storyId, discovered: prepared?.discovered, mode: prepared?.mode || '大众', preserveMap: prepared?.preserveMap, characterAction: prepared?.action, originalQuestion: trimmed };
  chat.messages.push(reply);
  if (options.preserveMap) reply.preserveMap = true;
  const draftActivity=chat.draftActivityPlan;
  const activityPlan=options.activityPlan || (draftActivity && trimmed.includes(draftActivity.question) ? draftActivity.activityPlan : null);
  if (activityPlan) reply.activityPlan = activityPlan;
  delete chat.draftActivityPlan;
  if (!reply.preserveMap) window.TravelMap?.fromMessage(chat, trimmed);

  input.value = '';
  chat.draft = '';
  requestReply(chat, reply);
}

function requestReply(chat, reply) {
  if (chat.pending) return;
  chat.pending = true;
  reply.pending = true;
  reply.error = false;
  reply.streamText = '';
  reply.progress = '';
  render();

  ask(reply.question, reply.history, reply.mode, null, chat.sessionId, event => {
    if (event.type === 'session') chat.sessionId = event.session_id;
    if (event.type === 'delta') reply.streamText += event.text;
    if (event.type === 'tool') reply.progress = '正在整理回答，请稍候…';
    if (chats[active] === chat && ['session','delta','tool'].includes(event.type)) {
      // 只更新等待中的消息气泡，保留输入框焦点和地图状态。
      const index = chat.messages.indexOf(reply);
      const bubble = messages.children[index]?.querySelector('.bubble');
      if (bubble) bubble.textContent = '正在整理回答，请稍候…';
      messages.scrollTop = messages.scrollHeight;
    }
  }, reply.storyId)
    .then(data => {
      if (!data || typeof data.answer !== 'string' || !data.answer.trim()) {
        throw new Error('服务未返回有效回答');
      }
      reply.pending = false;
      reply.text = data.answer;
      reply.data = data;
      if(chats.includes(chat))window.TravelModules?.receiveActivity(reply);
      if (data.session_id) chat.sessionId = data.session_id;
      if (!reply.preserveMap && (!reply.persona || data?.intent?.intent === 'route_planning')) window.TravelMap?.fromResponse(chat, reply.originalQuestion || reply.question, data);
    })
    .catch(error => {
      reply.pending = false;
      reply.error = true;
      reply.text = error.name === 'TimeoutError'
        ? '回答等待超时，平台任务可能仍在执行，请先检查女娲会话再决定是否重试。'
        : (error.message || '连接失败，尚未取得完整回答，请检查后端服务。');
      if (reply.streamText) reply.text += '\n\n以下为未完成的片段（不代表成功回答）：\n' + reply.streamText;
    })
    .finally(() => {
      chat.pending = false;
      if (chats[active] === chat) render();
    });
}

form.onsubmit = event => {
  event.preventDefault();
  send(input.value);
};

input.addEventListener('input', () => {
  saveDraft();
  updateComposer();
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

/* ---------------- 主内容区的示例问题 ---------------- */
document.querySelectorAll('#starters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const question = chip.dataset.q;
    if (!question) return;
    if (panel.hidden) toggleChat(true);
    if (chats[active].pending) {
      input.value = question;
      saveDraft();
      updateComposer();
    } else send(question);
  });
});

window.addEventListener('resize', () => {
  launcher.style.left = launcher.style.top = launcher.style.bottom = launcher.style.right = '';
  launcherRestLeft = launcher.getBoundingClientRect().left;
  if (!panel.hidden) updateChatLayout();
  updateComposer();
});
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateComposer).observe(panel);

render();

async function checkHealth() {
  let connected = false;
  let modelConfigured = false;
  let chatMode = '';
  let chatWarning = '';
  try {
    const response = await fetch('/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const health = await response.json();
    connected = response.ok && health.status === 'ok';
    modelConfigured = health.chat?.configured === true;
    chatMode = health.chat?.mode || '';
    chatWarning = health.chat?.warning || '';
  } catch { /* 将不可达状态显示在界面中 */ }
  document.querySelectorAll('[data-service-status]').forEach(node => {
    node.textContent = connected ? (chatMode === 'nuwax' ? '女娲智能体已配置' : modelConfigured ? '模型已配置' : '检索演示模式') : '服务暂不可达';
    node.title = connected ? (chatWarning || '已配置不代表连接测试通过；请查看每条回答的来源与工具记录。') : '请检查后端是否启动。';
    node.dataset.state = connected ? 'online' : 'offline';
  });
}
checkHealth();
window.addEventListener('online', checkHealth);

/* ---------------- 主框内容切换 ---------------- */
const contentScrollPositions = new Map();
let currentContentView = 'welcome';
let contentEntrance = null;
function showContentView(view) {
    const sections = Array.from(document.querySelectorAll('[data-view-panel]'));
    const target = sections.find(section => section.dataset.viewPanel === view);
    if (!target || view === currentContentView) return;
    const savedTop = !panel.hidden && chatOpeningScroll?.view === currentContentView ? chatOpeningScroll.top : window.scrollY || 0;
    contentScrollPositions.set(currentContentView, savedTop);
    contentEntrance?.cancel();
    const leaving = sections.find(section => !section.hidden);
    const restoreFocus = leaving?.contains(document.activeElement);
    sections.forEach(section => { section.hidden = section !== target; });
    currentContentView = view;
    const labels = { welcome: '主界面', map: '行旅地图', story: '故事线', node: '文化节点', journal: '我的三国探索志', destinations: '目的地', planner: '规划行程', plan: '活动方案', travel: '天气与交通' };
    labels.outing = '出行助手';
    const label = document.querySelector('#view-label');
    if (label) label.textContent = labels[view] || '主界面';
    document.querySelectorAll('[data-content-view]').forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.contentView === view));
    });
    // 同步恢复视图滚动位置，不重置地图或会话状态。
    window.scrollTo({ top: contentScrollPositions.get(view) || 0, behavior: 'instant' });
    if (restoreFocus) (document.querySelector('.content-switch [data-content-view="' + view + '"]') || target.querySelector('[tabindex="-1"]'))?.focus({ preventScroll: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && target.animate) {
      contentEntrance = target.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
    }
    if (!panel.hidden) updateChatLayout();
    window.ChenshouGuide?.refresh();
}
document.querySelectorAll('[data-content-view]').forEach(button => {
  button.addEventListener('click', () => showContentView(button.dataset.contentView));
});
