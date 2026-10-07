const launcher = document.querySelector('#launcher');
const panel = document.querySelector('#chat-panel');
const input = document.querySelector('#message');
const messages = document.querySelector('#messages');
const historyList = document.querySelector('#history-list');
const form = document.querySelector('#chat-form');
const submitButton = form.querySelector('button[type="submit"]');
const viewLabel = document.querySelector('#view-label');

const API = '/chat'; // 与后端同源（后端把本页挂在 / 根路径）
const WELCOME = '我是陈寿，这里的 AI 文化向导。我们可以从编撰《三国志》的过程出发，了解南充、广元与阆中的三国文化，也可以聊四川三国建筑背后的历史。史料有依据才说，缺少资料时会说明待确认。';
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
  if (!window.confirm('确认删除“' + chat.title + '”对话？删除后可撤销。')) return;
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
  if (/待确认|待接入|未找到可靠记载|暂无数据/.test(text)) span.setAttribute('data-trust-state','unverified');
  return span;
}

function routeCard(route, stops) {
  const card = document.createElement('div');
  card.className = 'route-card';
  const name = document.createElement('div');
  name.className = 'route-name';
  name.textContent = route.name + (route.duration_hours ? ' · ' + route.duration_hours + ' 小时' : '');
  card.append(name);
  const risk = document.createElement('p'); risk.textContent = '风险提示：' + (route.risk_note || '待确认'); card.append(risk);
  if (Array.isArray(stops) && stops.length) {
    const list = document.createElement('ol');
    list.className = 'route-stops';
    stops.filter(stop => stop && typeof stop.name === 'string').forEach(stop => {
      const li = document.createElement('li');
      li.textContent = stop.name + ' · 推荐理由：' + (stop.reason || '待确认') + ' · 本次安排：' + (Number.isFinite(stop.stay_minutes) && stop.stay_minutes > 0 ? stop.stay_minutes + ' 分钟' : '时长含义待确认') + ' · 资料中的一般游览参考：' + (Number.isFinite(stop.recommended_duration_min) && stop.recommended_duration_min > 0 ? stop.recommended_duration_min + ' 分钟（请在出发前确认）' : '时长含义待确认') + ' · 开放时间：' + (stop.open_time || '待确认');
      list.append(li);
    });
    card.append(list);
  }
  return card;
}

function trustNode(record, label = '回答') {
  const box = document.createElement('div');
  box.className = 'trust-info';
  const realtime = ['forecast','model'].includes(record?.data_status);
  const levels = {A:'权威资料',B:'较可靠资料',C:'文学/传说'};
  const statuses = {sample:'演示数据', maintained:'维护数据', live:'实时数据', pending:'待确认', stale:'已过期，请重新查询',forecast:'模型天气预报',model:'空气质量模型估计'};
  const status = record && Object.hasOwn(statuses, record.data_status) ? statuses[record.data_status] : null;
  // 缺失状态不生成占位标签，原始元数据仍留在回答记录中。
  if (status && record.data_status !== 'pending') box.append(tag(label + ' · ' + status));
  if (realtime) box.append(tag('模型预报、非现场实测；天气与空气信息需在出发前再核验。'));
  const date = record && record.updated_at;
  const validDate = typeof date === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) && Number.isFinite(Date.parse(date));
  if (validDate) box.append(tag('更新时间 · ' + date));
  const sources = record && Array.isArray(record.sources) ? record.sources : [];
  let accessible = 0;
  sources.forEach(source => {
    if (!source || typeof source.title !== 'string' || !source.title.trim()) return;
    const line = document.createElement('div');
    let url;
    try { url = new URL(source.source_url); } catch (_) {}
    const safe = url && ['http:', 'https:'].includes(url.protocol);
    const link = document.createElement(safe ? 'a' : 'span');
    link.textContent = source.title;
    if (safe) { link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; accessible += 1; }
    const level = ['A','B','C'].includes(source.source_level) ? source.source_level : '待确认';
    line.append(link, tag(realtime ? '实时信息来源 · 出发前再确认' : '来源等级 · ' + level + (levels[level] ? '=' + levels[level] : '')));
    if (!safe) line.append(tag('未提供可打开的来源链接'));
    if (!realtime && level === 'C') line.append(tag('文学/传说不能支撑史实结论'));
    box.append(line);
  });
  if (!accessible) box.append(tag(realtime ? '实时信息出处尚未确认，请查询最新预报。' : '文献引用请以回答中附带的实际来源为依据。'));
  return box;
}
window.SGTAnswerTrust = { render: trustNode };

function budgetScope(data) {
  // 仅识别已确认的服务整段格式；前缀或说明中出现门票明细时不下范围结论。
  const hotelOnly = /^(?:南充|阆中|广元)(?:经济型|舒适型|品质型)酒店预算：\d+(?:\.\d+)? - \d+(?:\.\d+)? CNY\/晚\/间。\n说明：景区票价为维护数据；酒店和交通价格波动较大，正式服务应接入 OTA、地图和 12306 等实时工具。$/;
  return data?.intent?.intent === 'budget_ticket' && typeof data.answer === 'string' && hotelOnly.test(data.answer.trim())
    ? '本次未取得可核对的门票费用，以下仅为住宿预算。请提供具体景区，以便继续查询门票。' : '';
}

function metaNode(data) {
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.setAttribute('tabindex','0');
  meta.setAttribute('aria-label','回答类型与来源，可横向滚动');
  const intent = data && data.intent && data.intent.intent;
  if (typeof intent === 'string' && Object.hasOwn(INTENT_LABELS, intent)) meta.append(tag('意图 · ' + INTENT_LABELS[intent]));
  const coverage = data?.retrieval?.coverage;
  if (typeof coverage === 'number' && Number.isFinite(coverage) && coverage >= 0 && coverage <= 1) {
    meta.append(tag(coverage > 0 ? '检索到相关资料，回答仍需核对出处' : '本次未检索到相关资料，回答仍需核对出处'));
  }
  meta.append(trustNode(data));
  if (intent === 'budget_ticket') meta.append(tag('价格信息待确认；未知金额不能认定为免费'));
  const route = intent === 'route_planning' && data?.route?.found === true && data.route.route;
  if (route) {
    meta.append(trustNode(route, '路线'));
  }
  return meta;
}

function bubbleNode(message) {
  const bubble = document.createElement('div');
  if (message.pending) {
    bubble.className = 'bubble typing';
    bubble.setAttribute('aria-label', '陈寿正在整理回答，请稍候');
    bubble.textContent = message.progress || '陈寿正在整理回答，请稍候';
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
  if (message.role !== 'user' && window.CharacterChat) avatar.append(window.CharacterChat.portrait());
  else if (message.role !== 'user' && window.ChenshouGuide) avatar.append(window.ChenshouGuide.portrait());
  else avatar.textContent = message.role === 'user' ? '你' : '寿';
  const body = document.createElement('div');
  body.className = 'body';
  const identity = document.createElement('div');
  identity.className = 'message-identity';
  const name = document.createElement('span');
  name.className = 'message-name';
  name.textContent = message.role === 'user' ? '你' : '陈寿';
  identity.append(avatar, name);
  const scope = message.role === 'assistant' && !message.pending && !message.error && budgetScope(message.data);
  if (scope) body.append(tag(scope));
  body.append(bubbleNode(message));
  if (scope) {
    body.append(tag('住宿价格仅供估算，请以预订平台当天报价为准。这是参考预算，尚非报价，需确认。'));
  }
  if (message.role === 'assistant' && !message.pending && !message.error && message.data?.intent?.intent === 'route_planning' && /适合展示文化解释、路线推荐和预算估算能力/.test(message.text || '')) body.append(tag('当前内容为文化游览参考；实际到达路线、开放时间与费用请在出发前逐项核验。'));
  if (message.role === 'assistant' && !message.pending && !message.error && window.CharacterChat?.actions) {
    const actions = window.CharacterChat.actions(message);
    if (actions.children.length) body.append(actions);
  }
  if (message.error) {
    if(message.errorDetail){const details=document.createElement('details');details.append(Object.assign(document.createElement('summary'),{textContent:'错误详情'}),Object.assign(document.createElement('p'),{textContent:message.errorDetail}));body.append(details);}
    const retry = document.createElement('button');
    retry.className = 'retry';
    retry.textContent = '重试，请陈寿再回答一次';
    retry.disabled = !!chats[active].pending;
    retry.onclick = () => requestReply(chats[active], message);
    body.append(retry);
  }
  if (message.data) {
    if (message.data.reflection) {
      const check = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = '核查与修订说明';
      check.append(summary);
      const note = document.createElement('p');
      note.textContent = message.data.reflection.summary;
      check.append(note);
      for (const text of [...(message.data.reflection.actions || []), ...(message.data.reflection.remaining || [])]) {
        const line = document.createElement('p'); line.textContent = text; check.append(line);
      }
      body.append(check);
    }
    body.append(metaNode(message.data));
    const route = message.data.intent?.intent === 'route_planning' && message.data.route?.found === true && message.data.route.route;
    if (route) body.append(routeCard(route, message.data.route.stops));
  }
  if (window.TravelAssistant?.canOpen(message)) {
    const sourceChat = chats[active];
    const open = document.createElement('button');
    open.className = 'module-button'; open.textContent = '查看出行方案';
    open.onclick = () => {const sourceView=currentContentView;window.TravelAssistant.open(message, () => {
      const index = chats.indexOf(sourceChat);
      if (index < 0) return false;
      saveDraft(); active = index; input.value = sourceChat.draft || ''; render(); showContentView(sourceView);toggleChat(true); return true;
    });};
    body.append(open);
  }
  row.append(identity, body);
  return row;
}

let renamingChat = null, renameDraft = '', renderedHistory = [];
function renderHistory(focusChat = null, focusEditor = false) {
  const editingFocused = document.activeElement?.closest?.('.history-rename');
  if (renamingChat && !chats.includes(renamingChat)) renamingChat = null;
  const nextHistory = chats.map((chat,index)=>({chat,title:chat.title,active:index===active,editing:chat===renamingChat}));
  // 回答进度不会改变历史列表。保留原DOM，以免打断光标、按钮焦点和输入法组合输入。
  if(nextHistory.length===renderedHistory.length && nextHistory.every((entry,index)=>{
    const previous=renderedHistory[index];return entry.chat===previous.chat&&entry.title===previous.title&&entry.active===previous.active&&entry.editing===previous.editing;
  }))return;
  renderedHistory=nextHistory;
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
    const rename = document.createElement('button');
    rename.type = 'button'; rename.className = 'rename-chat'; rename.textContent = '改名';
    rename.setAttribute('aria-label', '重命名对话：' + chat.title);
    rename.setAttribute('aria-expanded', String(renamingChat === chat));
    rename.onclick = () => { renamingChat = chat; renameDraft = chat.title; renderHistory(null, true); };
    item.append(button, rename);
    if (chats.length > 1) item.append(remove);
    let editField;
    if (renamingChat === chat) {
      const editor = document.createElement('form'); editor.className = 'history-rename';
      const label = document.createElement('label'); label.textContent = '对话名称（最多60字）';
      const field = document.createElement('input'); field.type = 'text'; field.required = true; field.maxLength = 60; field.value = renameDraft;
      field.addEventListener('input', () => { renameDraft = field.value; }); label.append(field);
      const notice = document.createElement('p'); notice.className = 'history-rename-notice'; notice.setAttribute('role', 'alert');
      const save = document.createElement('button'); save.type = 'submit'; save.textContent = '保存';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消';
      const close = () => { renamingChat = null; renameDraft = ''; renderHistory(chat); };
      cancel.onclick = close;
      field.addEventListener('keydown', event => { if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } });
      editor.addEventListener('submit', event => {
        event.preventDefault(); const name = field.value.trim();
        if (!name || name.length > 60) { notice.textContent = '请填写1至60字的对话名称。'; field.focus(); return; }
        chat.title = name; chat.customTitle = true; close();
      });
      editor.append(label, notice, save, cancel); item.append(editor);
      editField = field;
    }
    historyList.append(item);
    if (focusChat === chat) rename.focus();
    else if (editField && (focusEditor || editingFocused)) editField.focus();
  });
  document.querySelector('#conversation-title').textContent = chats[active].title;
}
const revealedAnswers = new WeakSet();
function revealAnswer(message, row) {
  // 完整回答只淡入一次；历史重绘、用户消息、错误与减少动态偏好直接显示。
  if (message.role !== 'assistant' || !message.data || message.pending || message.error || revealedAnswers.has(message) || panel.hidden) return;
  revealedAnswers.add(message);
  if (!window.requestAnimationFrame || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const bubble = row.querySelector('.bubble');
  bubble.classList.add('answer-reveal');
  window.requestAnimationFrame(() => {
    if (!bubble.isConnected) return;
    // 长回答从首段开始读，不修改原始文字、链接或格式。
    if (row.offsetHeight > messages.clientHeight - 44) {
      messages.scrollTop += row.getBoundingClientRect().top - messages.getBoundingClientRect().top - 44;
    }
  });
}

function render() {
  renderHistory();
  messages.replaceChildren();
  chats[active].messages.forEach(message => {
    const row = messageNode(message);
    messages.append(row);
    revealAnswer(message, row);
  });
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
    const viewPanel = document.querySelector('[data-view-panel="' + currentContentView + '"]');
    chatOpeningScroll = { view: currentContentView, top: window.scrollY || 0, viewPanel, innerTop: viewPanel?.scrollTop || 0 };
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
    if (chatOpeningScroll?.view === currentContentView) {
      if (chatOpeningScroll.viewPanel) chatOpeningScroll.viewPanel.scrollTop = chatOpeningScroll.innerTop;
      window.scrollTo({ top: chatOpeningScroll.top, behavior: 'instant' });
    }
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
    .map(item => ({role:item.role === 'user' ? 'user' : 'assistant', content:(item.persona ? '【人物视角：陈寿】' : '') + (item.requestText || item.text)}));
  const data = await ask(message, history, routePreferences?.explanation || window.CharacterChat?.backendMode() || '大众', routePreferences);
  if (!data || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('没有收到有效回答，请重试。');
  return data;
} };

function send(text, options = {}) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;
  if (chats[active].pending) {
    const summary=options.displayText?.trim() || trimmed;
    if (summary !== input.value.trim()) input.value = input.value.trim() ? input.value + '\n\n' + summary : summary;
    if(options.displayText)(chats[active].draftRequests ||= []).push({summary,question:trimmed,options});
    saveDraft(); updateComposer(); return;
  }

  const chat = chats[active];
  const history = chat.messages
    .filter(item => item.text && !item.error && !item.pending)
    .map(item => ({ role: item.role === 'user' ? 'user' : 'assistant', content: (item.persona ? '【人物视角：陈寿】' : '') + (item.requestText || item.text) }));

  const visible=options.displayText?.trim() || trimmed;
  let requestText=trimmed, queuedActivity=null;
  for(const draft of chat.draftRequests || [])if(visible.includes(draft.summary)){
    requestText=requestText.replace(draft.summary,draft.question);
    if(draft.options.activityPlan)queuedActivity=draft.options.activityPlan;
  }
  delete chat.draftRequests;
  if (chat.messages.length === 1 && !chat.customTitle) chat.title = visible.slice(0, 10);
  const prepared = window.CharacterChat?.prepare(chat, requestText);
  chat.messages.push({ role: 'user', text: visible, requestText, persona: prepared?.persona });
  const reply = { role: 'assistant', text: '', question: prepared?.question || requestText, history: prepared ? [...history, {role:'user',content:prepared.context}] : history, persona: prepared?.persona, storyId: prepared?.storyId, discovered: prepared?.discovered, mode: prepared?.mode || '大众', preserveMap: prepared?.preserveMap, characterAction: prepared?.action, originalQuestion: visible };
  chat.messages.push(reply);
  if (options.preserveMap) reply.preserveMap = true;
  const draftActivity=chat.draftActivityPlan;
  const activityPlan=options.activityPlan || queuedActivity || (draftActivity && trimmed.includes(draftActivity.question) ? draftActivity.activityPlan : null);
  if (activityPlan) { reply.activityPlan = activityPlan; reply.preserveMap = true; }
  delete chat.draftActivityPlan;
  if (!reply.preserveMap) window.TravelMap?.fromMessage(chat, trimmed);

  input.value = '';
  chat.draft = '';
  requestReply(chat, reply);
}

function requestReply(chat, reply) {
  if (chat.pending) return;
  if (reply.persona && reply.persona !== '陈寿' && window.CharacterChat) {
    reply.history = window.CharacterChat.normalizeHistory(reply.history);
    reply.persona = '陈寿';
  }
  chat.pending = true;
  reply.pending = true;
  reply.error = false;
  delete reply.errorDetail;
  reply.streamText = '';
  reply.progress = '';
  render();

  ask(reply.question, reply.history, reply.mode, null, chat.sessionId, event => {
    if (event.type === 'session') chat.sessionId = event.session_id;
    if (event.type === 'delta') reply.streamText += event.text;
    if (event.type === 'tool') reply.progress = '正在整理回答，请稍候…';
    if (event.type === 'review') reply.progress = event.message;
    if (chats[active] === chat && ['session','delta','tool','review'].includes(event.type)) {
      // 只更新等待中的消息气泡，保留输入框焦点和地图状态。
      const index = chat.messages.indexOf(reply);
      const bubble = messages.children[index]?.querySelector('.bubble');
      if (bubble) { bubble.textContent = reply.progress || '正在整理回答，请稍候…'; bubble.setAttribute('aria-live', 'polite'); }
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
      if(chats[active]===chat)window.TravelModules?.receiveActivity(reply);
      if (data.session_id) chat.sessionId = data.session_id;
      if (!reply.preserveMap && (!reply.persona || data?.intent?.intent === 'route_planning')) window.TravelMap?.fromResponse(chat, reply.originalQuestion || reply.question, data);
    })
    .catch(error => {
      reply.pending = false;
      reply.error = true;
      if (chats[active] === chat && reply.activityPlan) window.TravelModules?.failActivity?.(reply);
      reply.errorDetail=error.message || '';
      reply.text = error.name === 'TimeoutError'
        ? '等候回答超时。平台任务可能仍在执行，请先检查女娲会话，再决定是否重试。'
        : /Failed to fetch|NetworkError|Load failed|network.*(?:error|failed)|offline/i.test(error.message || '')
          ? '网络连接失败，尚未取得回答。请检查网络或服务连接后重试。'
          : /HTTP \d+/.test(error.message || '') ? '服务暂时无法完成回答，请稍后重试。'
          : (error.message || '连接失败，尚未取得完整回答，请检查服务连接。');
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
    node.title = connected ? (chatWarning || '已配置不代表连接测试通过；请查看每条回答的来源与工具记录。') : '请检查服务是否启动。';
    node.dataset.state = connected ? 'online' : 'offline';
  });
}
checkHealth();
window.addEventListener('online', checkHealth);

/* 顶栏只改变绘制效果，保持高度及布局尺寸；多次滚动合并到一帧。 */
function initTopbarScroll() {
  const topbar = document.querySelector('.topbar');
  const content = document.querySelector('.content');
  if (!topbar || !window.requestAnimationFrame) return () => {};
  let frame = null, compact = null;
  function sync() {
    frame = null;
    const visible = content?.querySelector('[data-view-panel]:not([hidden])');
    const next = (window.scrollY || 0) > 4 || (visible?.scrollTop || 0) > 24;
    if (next !== compact) { topbar.classList.toggle('is-scrolled', next); compact = next; }
  }
  function schedule() { if (frame === null) frame = window.requestAnimationFrame(sync); }
  window.addEventListener('scroll', schedule, { passive: true });
  content?.addEventListener('scroll', schedule, { passive: true, capture: true });
  sync();
  return schedule;
}
const updateTopbarScroll = initTopbarScroll();

/* ---------------- 主框内容切换 ---------------- */
let currentContentView = 'welcome';
window.getContentView = () => currentContentView;
let contentEntrance = null;
let nodeSource = null;
function showContentView(view) {
    if(view==='outing'){
      const source=currentContentView;
      showContentView('planner');
      window.TravelAssistant?.onEnter?.(source);
      document.querySelector('#outing-title')?.focus({preventScroll:true});
      document.querySelector('#outing-view')?.scrollIntoView?.({block:'start',behavior:'instant'});
      return;
    }
    if(view==='travel'){
      const source=currentContentView;
      showContentView('planner');
      window.TravelModules?.onEnterTravel?.(source);
      document.querySelector('#travel-weather-form')?.scrollIntoView?.({block:'center',behavior:'instant'});
      document.querySelector('#travel-city')?.focus({preventScroll:true});
      return;
    }
    const sections = Array.from(document.querySelectorAll('[data-view-panel]'));
    const target = sections.find(section => section.dataset.viewPanel === view);
    if (!target || view === currentContentView) return;
    contentEntrance?.cancel();
    const leaving = sections.find(section => section.dataset.viewPanel === currentContentView);
    const restoreFocus = leaving?.contains(document.activeElement);
    if (view !== 'node' && nodeSource) {
      nodeSource.inert = false;
      delete nodeSource.dataset.nodeSource;
      nodeSource = null;
    }
    if (view === 'node' && leaving && leaving.dataset.viewPanel !== 'node') {
      nodeSource = leaving;
      nodeSource.dataset.nodeSource = '';
      nodeSource.inert = true;
    }
    sections.forEach(section => { section.hidden = section !== target && section !== nodeSource; });
    currentContentView = view;
    window.SGTNavigation?.write();
    if(view==='planner')window.AmapRouteMap?.enter?.();
    if(view==='outing')window.TravelAssistant?.onEnter?.(leaving?.dataset.viewPanel);
    const labels = { welcome:'文化探索', story:'故事详情', destinations:'目的地', map:'行旅地图', planner:'活动计划', plan:'活动方案', travel:'天气', outing:'出发核验', journal:'探索志', node:'文化节点' };
    const taskParent={story:'welcome',plan:'planner',travel:'planner',outing:'planner'};
    const origin=view==='node'?(window.CulturalNode?.getContext?.()?.returnTo||'welcome'):null;
    const parent=view==='node'?(taskParent[origin]||origin):taskParent[view]||null;
    const label = document.querySelector('#view-label');
    if (label) label.textContent = parent?`${labels[parent]||'文化探索'} · ${labels[view]}`:labels[view] || '文化探索';
    document.querySelectorAll('[data-content-view]').forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.contentView === view));
    });
    document.querySelectorAll('.content-switch [data-content-view]').forEach(option=>{
      if(parent && option.dataset.contentView===parent)option.setAttribute('aria-current','location');
      else option.removeAttribute('aria-current');
    });
    if (restoreFocus) (document.querySelector('.content-switch [data-content-view="' + view + '"]') || target.querySelector('[tabindex="-1"]'))?.focus({ preventScroll: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && target.animate) {
      contentEntrance = target.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
    }
    if (!panel.hidden) updateChatLayout();
    updateTopbarScroll();
    window.ChenshouGuide?.refresh();
}
document.querySelectorAll('[data-content-view]').forEach(button => {
  button.addEventListener('click', () => {if(button.dataset.contentView==='map')window.TravelMap?.clearMentionReturn?.();showContentView(button.dataset.contentView);});
});
