(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.TravelApi;
  const storageKey = 'sanguo.travel-plans.v1';
  let current = null;
  let city = '南充';
  let cityRequest = 0;
  let saved = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) saved = stored.filter(item => item && typeof item.id === 'string' && item.preferences && typeof item.preferences.city === 'string' && Number.isInteger(item.preferences.days) && item.preferences.days > 0 && item.preferences.days <= 14 && item.plan && Array.isArray(item.plan.days)).slice(0, 20);
  } catch { $('#plan-status').textContent = '无法读取本机保存记录，仍可新建和复制方案。'; }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function empty(target, message) { target.replaceChildren(node('p', message, 'module-empty')); }
  function action(text, handler) {
    const button = node('button', text, 'module-button');
    button.type = 'button';
    button.onclick = handler;
    return button;
  }
  function sources(target, items) {
    const details = node('details');
    details.append(node('summary', '参考资料与来源'));
    if (!Array.isArray(items) || !items.length) details.append(node('p', '暂无参考来源，相关内容待核验。'));
    else items.forEach(source => {
      const row = node('p', `${source.title || '未命名来源'} · 来源等级 ${source.source_level || '未标注'}`);
      try {
        const url = new URL(source.source_url);
        if (['https:', 'http:'].includes(url.protocol)) {
          const link = node('a', ' 查看出处');
          link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link);
        }
      } catch { /* 无有效链接时保留来源文本 */ }
      details.append(row);
    });
    details.append(node('p', 'C 级来源不用于支撑史实结论。', 'map-note'));
    target.append(details);
  }
  function dataStatus(record) {
    const names = { sample: '示例数据', maintained: '维护数据', live: '实时查询', pending: '待接入', stale: '已过期' };
    return `${names[record.data_status] || '状态未标注'} · 更新：${record.updated_at || '未提供'}`;
  }
  async function loadCity(nextCity) {
    city = nextCity;
    const version = ++cityRequest;
    document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.city === city)));
    $('#plan-destination').textContent = `规划${city}行程`;
    const target = $('#destination-results');
    empty(target, '正在查询景区资料…');
    try {
      const result = await api.listSpots(city);
      if (version !== cityRequest) return;
      if (result.status !== 'ok') return empty(target, result.message || '暂无景区资料。');
      if (!Array.isArray(result.data.spots)) throw new Error('景区数据格式不完整。');
      target.replaceChildren();
      if (!result.data.spots.length) return empty(target, '该目的地暂未提供景区资料。');
      result.data.spots.forEach(spot => {
        const card = node('article', null, 'result-card');
        card.append(node('h3', spot.name), node('p', spot.description || '简介待补充'), node('p', dataStatus(spot), 'map-note'));
        sources(card, spot.sources);
        target.append(card);
      });
    } catch (error) { if (version === cityRequest) empty(target, error.message); }
  }
  function chooseCity(nextCity) {
    $('#trip-form').elements.city.value = nextCity;
    showContentView('planner');
  }
  document.querySelectorAll('[data-city]').forEach(button => button.onclick = () => loadCity(button.dataset.city));
  document.querySelectorAll('[data-destination]').forEach(button => button.onclick = () => chooseCity(button.dataset.destination));
  $('#plan-destination').onclick = () => chooseCity(city);
  $('#open-culture').onclick = () => toggleChat(true);

  function renderPlan() {
    const target = $('#plan-results');
    if (!current) return empty(target, '还没有行程。先选择目的地和出行条件，生成一份草稿。');
    const { preferences: p, plan } = current;
    target.replaceChildren(node('h3', plan.title || `${p.city} ${p.days}天行程`), node('p', `${p.date}出发 · ${p.people}人 · ${p.group} · ${p.transport}`), node('p', `${p.hotel_tier} · ${p.rooms}间房 · ${Math.max(0, p.days - 1)}晚`));
    target.append(node('p', current.draft ? '出行草稿 · 景区与路线待接入，不构成实际游览建议' : dataStatus(plan), 'data-banner'));
    if (p.notes) target.append(node('p', '补充需求：' + p.notes));
    plan.days.forEach(day => {
      const card = node('article', null, 'result-card');
      card.append(node('h3', `第 ${day.day} 天`));
      if (!Array.isArray(day.stops) || !day.stops.length) card.append(node('p', '站点与游览顺序待路线服务提供。'));
      else {
        const list = node('ol');
        day.stops.forEach(stop => list.append(node('li', `${stop.name || '未命名站点'}${stop.stay_minutes ? ` · 建议停留 ${stop.stay_minutes} 分钟` : ''}${stop.note ? ' · ' + stop.note : ''}`)));
        card.append(list);
      }
      target.append(card);
    });
    sources(target, plan.sources);
    $('#save-plan').disabled = $('#copy-plan').disabled = false;
  }
  $('#trip-form').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const preferences = Object.fromEntries(new FormData(form));
    ['days', 'people', 'rooms'].forEach(key => preferences[key] = Number(preferences[key]));
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    $('#planner-status').textContent = '正在整理行程…';
    try {
      const result = await api.createPlan(preferences);
      if (result.status === 'empty') { $('#planner-status').textContent = result.message || '暂无匹配路线，请调整条件。'; return; }
      const draft = result.status === 'unavailable';
      const plan = draft ? { title: `${preferences.city} ${preferences.days}天出行草稿`, days: Array.from({ length: preferences.days }, (_, i) => ({ day: i + 1, stops: [] })), sources: [] } : result.data;
      if (!Array.isArray(plan.days) || !plan.days.length) throw new Error('行程数据缺少每日安排。');
      current = { id: crypto.randomUUID(), preferences, plan, draft };
      renderPlan();
      empty($('#budget-results'), '行程已更新，请重新查询预算。');
      empty($('#travel-results'), '行程已更新，请重新查询出行信息。');
      $('#planner-status').textContent = draft ? '已生成草稿，具体路线待接入。' : '行程已生成。';
      $('#plan-status').textContent = '';
      showContentView('plan');
    } catch (error) { $('#planner-status').textContent = error.message; }
    finally { button.disabled = false; }
  };
  function renderSaved() {
    const target = $('#saved-plans');
    target.replaceChildren();
    if (!saved.length) return empty(target, '尚未保存方案。');
    saved.forEach(item => {
      const row = node('div', null, 'saved-plan');
      row.append(node('span', `${item.plan.title || item.preferences.city} · ${item.preferences.date}`), action('打开', () => {
        current = item;
        Object.entries(item.preferences).forEach(([key, value]) => { if ($('#trip-form').elements.namedItem(key)) $('#trip-form').elements.namedItem(key).value = value; });
        renderPlan();
        empty($('#budget-results'), '已切换行程，请重新查询预算。');
        empty($('#travel-results'), '已切换行程，请重新查询出行信息。');
        $('#plan-status').textContent = '已打开本机保存的方案。';
      }));
      target.append(row);
    });
  }
  $('#save-plan').onclick = () => {
    if (!current) return;
    const next = [current, ...saved.filter(item => item.id !== current.id)].slice(0, 20);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); saved = next; renderSaved(); $('#plan-status').textContent = '已保存到本机（最多保留最近20份）。'; }
    catch { $('#plan-status').textContent = '浏览器无法保存，请使用复制方案。'; }
  };
  $('#copy-plan').onclick = async () => {
    if (!current) return;
    try { await navigator.clipboard.writeText($('#plan-results').innerText); $('#plan-status').textContent = '方案已复制。'; }
    catch { $('#plan-status').textContent = '复制失败，可选中方案文字手动复制。'; }
  };
  async function queryCurrent(button, target, method, renderResult) {
    if (!current) return empty(target, '请先在“规划行程”中填写出行条件并生成草稿。');
    const selected = current;
    button.disabled = true;
    empty(target, '正在查询…');
    try {
      const result = await method(selected.preferences);
      if (current !== selected) return;
      if (result.status !== 'ok') return empty(target, result.message || '暂无数据。');
      target.replaceChildren(); renderResult(target, result.data);
    } catch (error) { if (current === selected) empty(target, error.message); }
    finally { button.disabled = false; }
  }
  $('#load-budget').onclick = event => queryCurrent(event.currentTarget, $('#budget-results'), api.estimateBudget, (target, data) => {
    if (!Array.isArray(data.items)) throw new Error('预算数据缺少费用明细。');
    if (!data.items.length) return empty(target, '暂无费用明细，不能计算预算总额。');
    data.items.forEach(item => {
      const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) ? `${item.amount} 元` : '未计入';
      const card = node('article', null, 'result-card');
      card.append(node('h3', `${item.label}：${amount}`), node('p', item.basis || '计算依据未提供'), node('p', dataStatus(item), 'map-note'));
      sources(card, item.sources); target.append(card);
    });
    target.append(node('p', '以上为分项估算；未计入项目不代表免费，不作为完整旅行总价。', 'data-banner'));
  });
  $('#load-travel').onclick = event => queryCurrent(event.currentTarget, $('#travel-results'), api.getTravelInfo, (target, data) => {
    if (!Array.isArray(data.items)) throw new Error('出行信息格式不完整。');
    if (!data.items.length) return empty(target, '暂无天气或交通信息。');
    data.items.forEach(item => {
      const card = node('article', null, 'result-card');
      card.append(node('h3', item.title), node('p', item.summary), node('p', dataStatus(item), 'map-note'));
      sources(card, item.sources); target.append(card);
    });
  });
  renderPlan(); renderSaved(); loadCity(city);
  empty($('#budget-results'), '费用资料待接入。可先生成行程草稿。');
  empty($('#travel-results'), '天气与交通服务待接入。');
})();
