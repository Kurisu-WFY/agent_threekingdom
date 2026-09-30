(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.TravelApi;
  const storageKey = 'sanguo.travel-plans.v1';
  let current = null, planningStory = null, planRequest = 0, lastAttempt = null;
  let city = '南充';
  let cityRequest = 0;
  let saved = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) saved = stored.filter(item => item && typeof item.id === 'string' && item.preferences && typeof item.preferences.city === 'string' && Number.isFinite(item.preferences.days) && item.preferences.days >= 0.5 && item.preferences.days <= 14 && item.plan && Array.isArray(item.plan.days) && (!item.chatRoute || (item.chatRoute.found===true && item.chatRoute.route && Array.isArray(item.chatRoute.stops) && item.chatRoute.stops.every(s=>s && typeof s.name==='string')))).slice(0, 20);
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
    else items.filter(source => source && typeof source === 'object').forEach(source => {
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
    const names = { sample: '示例数据', maintained: '维护数据', live: '实时查询', forecast: '模型天气预报', model: '模型估计（非实测）', external: '外部查询', reference_route: '道路参考（非实时路况）', pending: '暂无有效数据', stale: '已过期' };
    return `${names[record.data_status] || '状态未标注'} · ${record.fetched_at ? '查询时间（可能为缓存）' : '更新'}：${record.fetched_at || record.updated_at || '未提供'}`;
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
        if (Array.isArray(spot.themes) && spot.themes.length) card.append(node('p', '文化主题：' + spot.themes.join('、')));
        if (Array.isArray(spot.suitable_users) && spot.suitable_users.length) card.append(node('p', '适合人群：' + spot.suitable_users.join('、')));
        if (Number.isFinite(spot.recommended_duration_min) && spot.recommended_duration_min > 0) card.append(node('p', '建议停留约 ' + spot.recommended_duration_min + ' 分钟（演示参考）'));
        card.append(node('p', '开放时间：' + (spot.open_time || '待核验')), node('p', spot.location_note || '景点位置待核验', 'map-note'));
        card.append(action('向导讲讲这里', () => { toggleChat(true); send('请介绍' + spot.name + '与三国文化的联系，区分史料、演义和地方传说；资料不足请说明。'); }), action('让智能体规划路线', () => chooseCity(spot.city || city, spot.name)));
        sources(card, spot.sources);
        target.append(card);
      });
    } catch (error) { if (version === cityRequest) empty(target, error.message); }
  }
  function chooseCity(nextCity, spot = '') {
    if(window.SGTJourney?.ask){window.SGTJourney.ask('请生成'+nextCity+'三国文化活动方案。'+(spot?'希望包含：'+spot+'。':'')+'先确认出发地、时间与人数，再检索文化资料，只说明景点与活动顺序、每项时长、文化讲解要点。不要编造实时交通、开放时段或空位。缺少本地模板不代表该城市没有文化景点；资料不足请说明。',{preserveMap:true});return;}
    ++planRequest; planningStory=null; lastAttempt=null; $('#planner-retry').hidden=true; $('#trip-form').querySelector('[type="submit"]').disabled=false; storyLabel();
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
    if (current.chatRoute) { renderChatPlan(target); return; }
    $('#plan-map').disabled = true;
    const { preferences: p, plan } = current;
    target.replaceChildren(node('h3', plan.title || `${p.city} ${p.days}天行程`), node('p', `${p.date}出发 · ${p.people}人 · ${p.group} · ${p.transport}`), node('p', `${p.hotel_tier} · ${p.rooms}间房 · ${Math.max(0, p.days - 1)}晚`));
    target.append(node('p', current.draft ? '出行草稿 · 可交给智能体进一步安排景点与交通' : dataStatus(plan), 'data-banner'));
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
  const field = name => $('#trip-form').elements.namedItem(name);
  const text = v => typeof v === 'string' && v.trim() ? v.trim() : '待核验';
  const minutes = v => Number.isFinite(v) && v > 0 ? v + ' 分钟' : '待核验';
  function chapterChoices(story) {
    if (!story) return [];
    const state=window.StoryProgress.get(story), places=window.StoryMap.getPlaces(story.id);
    return (story.chapters || []).map((chapter,i)=>({name:chapter.name,placeId:chapter.placeId,
      place:places.find(p=>p.id===chapter.placeId)?.name || '', role:chapter.role || '',
      status:state.completed.has(i)?'已完成':state.skipped.has(i)?'本次跳过':'本次保留'}));
  }
  function storyLabel() {
    $('#planner-story').textContent=planningStory ? '故事线：'+planningStory.title+' · '+chapterChoices(planningStory).map(c=>c.name+'（'+c.status+'）').join('；')+(planningStory.chapters?.length?'。':'章节待补充。')+'本地已寻迹记录保持。' : '尚未选择故事线，可填写普通行程需求。';
  }
  function restoreForm(preferences) {
    Object.entries(preferences).forEach(([key,value])=>{if(field(key))field(key).value=value;});
  }
  function openStory(story) {
    ++planRequest; lastAttempt=null; $('#planner-retry').hidden=true;
    $('#trip-form').querySelector('[type="submit"]').disabled=false;
    planningStory=story; field('explanation').value=window.StoryProgress.get(story).mode;
    storyLabel(); $('#planner-status').textContent='请填写现实约束；核心章节按你在故事详情中的选取。';
    showContentView('planner');
  }
  function makeQuestion(p,story,choices) {
    const duration={'0.5':'半天','1':'一天','2':'两天'}[p.days];
    return '请生成三国文化活动方案，只输出活动安排。'+(story?'故事线：'+story.title+'。':'')+
      '出发地：'+p.origin+'；目的地：'+p.city+'；可用时间：'+duration+'；出发日期：'+(p.date||'待确认')+
      '（活动时长合计上限 '+({0.5:4,1:8,2:16}[p.days])+' 小时）；同行：'+p.group+'，'+p.people+'人；讲解偏好：'+p.explanation+'。'+
      '章节选择：'+(choices.length?choices.map(c=>c.name+' / '+(c.place||'地点待确认')+'：'+c.status).join('；'):'章节尚未提供，请说明主题关联待确认。')+'。'+
      '请只调整未完成且本次保留的章节，已完成节点不重复安排。保留/舍弃/新增活动必须说明原因；不把未返回章节默认为已完成。'+
      '先检索文化资料，再说明景点与活动顺序、每项时长、文化讲解要点；无依据标待核验，资料不足请说明。不要编造实时交通、开放时段、空位、价格、天气或坐标。补充需求：'+(p.notes||'无')+'。';
  }
  function renderChatPlan(target) {
    const {chatRoute: result,preferences:p,story,choices}=current, route=result.route;
    target.replaceChildren(node('h3',text(route.name)),node('p','关联故事：'+(story?.title||'普通行程')),
      node('p','你的约束：'+p.origin+'出发 · '+({'0.5':'半天','1':'一天','2':'两天'}[p.days]||p.days+'天')+' · '+p.transport+' · '+p.group+' · '+p.people+'人'),
      node('p','后端路线模板 / 现实可行性待核验；不是道路导航，尚不能保证满足所有条件。','data-banner'),
      node('p','路线简介：'+text(route.summary)),node('p','总体取舍：'+text(result.selection_reason)),
      node('p','风险提示：'+text(route.risk_note)),node('p','更新时间：'+text(route.updated_at)+' · 来源与时效待核验'),
      node('p','后端时长：'+(Number.isFinite(route.duration_hours)&&route.duration_hours>0?route.duration_hours+' 小时':'待核验')+'；交通：'+text(route.transport_mode)));
    const hourLimit={0.5:4,1:8,2:16}[p.days];
    if(Number.isFinite(route.duration_hours)&&route.duration_hours>hourLimit)target.append(node('p','时间不符合：后端路线 '+route.duration_hours+' 小时，超过本次 '+hourLimit+' 小时上限。请压缩或重绘，暂不可按此方案执行。','data-banner'));
    if(route.transport_mode && route.transport_mode!==p.transport)target.append(node('p','约束待确认：后端交通方式与所选方式不一致，请调整需求或核验。','data-banner'));
    target.append(node('p','总预算：待核验 / 暂无完整费用数据；未知金额不按零元或免费处理。'));
    const list=node('ol',null,'route-stop-cards');
    result.stops.forEach((stop,i)=>{
      const card=node('li',null,'result-card');
      card.append(node('h3',(stop.stop_order || i+1)+' · '+text(stop.name)),node('p','为什么推荐：'+text(stop.reason)),
        node('p','安排停留：'+minutes(stop.stay_minutes)+'；建议游览：'+minutes(stop.recommended_duration_min)),
        node('p','开放时间：'+text(stop.open_time)+' · 待核验'),node('p','地址：'+text(stop.address)),
        node('p','位置示意 / 待定位：无已核验景区入口，地图仅尝试按地址匹配县级驻地。','map-note'));
      const chapter=(choices || []).find(c=>(c.placeId && c.placeId===stop.spot_id)||(c.place&&c.place===stop.name));
      card.append(node('p','故事中的作用：'+(chapter?text(chapter.role):'章节关联待核验')));list.append(card);
    });target.append(list);
    if(choices?.length) {
      target.append(node('h3','章节取舍对照'));
      choices.forEach(c=>{
        const match=result.stops.find(stop=>(c.placeId&&stop.spot_id===c.placeId)||(c.place&&stop.name===c.place));
        let reason=c.status==='已完成'?'本地记录已完成，请求不重复安排。':c.status==='本次跳过'?'你选择将本次时间留给其他章节；故事定义保留。':match?'保留理由：'+text(match.reason):'后端未返回可确认的对应站点；舍弃原因待核验，不能推断。';
        if(match&&c.status!=='本次保留')reason+=' 后端仍返回该站，与你的选取不一致，需核验。';
        target.append(node('p',c.name+' · '+c.status+'：'+reason));
      });
    }
    target.append(node('p','交通耗时、开放时段、费用与章节匹配未全部核验前，本方案仅供讨论。','map-note'));
    sources(target,route.sources); $('#save-plan').disabled=$('#copy-plan').disabled=false; $('#plan-map').disabled=false;
  }
  async function requestPlan(attempt) {
    if(window.SGTJourney?.ask){++planRequest;lastAttempt=null;$('#planner-retry').hidden=true;$('#planner-status').textContent='已打开智能体；若正在回答，本次需求保留在对话草稿中。';window.SGTJourney.ask(attempt.question,{preserveMap:true});return;}
    const version=++planRequest, button=$('#trip-form').querySelector('[type="submit"]');
    lastAttempt=attempt;button.disabled=true;$('#planner-retry').hidden=true;
    $('#planner-status').textContent='正在按故事章节与现实约束规划；上一份方案保留。';
    try {
      const data=await window.SGTChat.request(attempt.question, {...attempt.preferences,
        date: attempt.preferences.date || null,
        explanation: {'亲子故事版':'亲子','大众体验版':'大众','学术探索版':'学术'}[attempt.preferences.explanation] || attempt.preferences.explanation || '大众',
        excluded_place_ids: (attempt.choices || []).filter(c=>c.status!=='本次保留').map(c=>c.placeId)});
      if(version!==planRequest)return;
      if(data.intent?.intent!=='route_planning') {
        $('#planner-status').textContent='本次未返回路线（'+(data.intent?.intent==='budget_ticket'?'预算票价':'文化回答 / 意图待确认')+'），未替换上一份方案。'+data.answer;
        $('#planner-retry').hidden=false;return;
      }
      const result=data.route;
      if(result?.found===false){$('#planner-status').textContent='暂无匹配路线：'+text(result.selection_reason || result.message)+'。请调整条件后重试；上一份方案保留。';$('#planner-retry').hidden=false;return;}
      if(result?.found!==true || !result.route || typeof result.route!=='object' || Array.isArray(result.route) || !Array.isArray(result.stops) || !result.stops.length || result.stops.some(s=>!s||typeof s.name!=='string'||!s.name.trim()))throw new Error('路线数据不完整，请重试或调整条件。');
      current={id:crypto.randomUUID(),preferences:attempt.preferences,story:attempt.story,choices:attempt.choices,
        chatRoute:result,plan:{title:result.route.name,days:[]},draft:false};
        renderPlan();empty($('#budget-results'),'可查询住宿演示预算；费用待核验，未知金额不表示免费。');empty($('#travel-results'),'可查询出发日期的天气预报和当前空气质量；出发前请通过运营方确认班次。');
      $('#planner-status').textContent='已收到后端路线，约束与来源仍需核验。';$('#plan-status').textContent='已更新路线，已寻迹章节记录保持。';showContentView('plan');
    } catch(error) {if(version===planRequest){$('#planner-status').textContent=error.name==='TimeoutError'?'等待路线超时，可重试；上一份方案保留。':'请求失败：'+error.message+' 可重试；上一份方案保留。';$('#planner-retry').hidden=false;}}
    finally{if(version===planRequest)button.disabled=false;}
  }
  $('#trip-form').onsubmit = event => {
    event.preventDefault();const form=event.currentTarget;
    if(form.querySelector('[type="submit"]').disabled || !form.reportValidity())return;
    const preferences=Object.fromEntries(new FormData(form));preferences.origin=(preferences.origin||'').trim();
    ['days','people','rooms'].forEach(k=>preferences[k]=Number(preferences[k]));
    const min=preferences.budget_min,max=preferences.budget_max;
    if(!preferences.origin || ![0.5,1,2].includes(preferences.days) || !['people','rooms'].every(k=>Number.isInteger(preferences[k])&&preferences[k]>=1&&preferences[k]<=50) || [min,max].some(v=>v!==''&&v!==undefined&&(!Number.isFinite(Number(v))||Number(v)<0)) || (min!==''&&max!==''&&Number(min)>Number(max))) {
      $('#planner-status').textContent='请填写有效出发地、可用时间与人数；预算下限不能高于上限。';return;
    }
    const story=planningStory?JSON.parse(JSON.stringify(planningStory)):null,choices=chapterChoices(planningStory);
    if(choices.length&&!choices.some(c=>c.status==='本次保留')) {$('#planner-status').textContent='没有待规划的保留章节；可返回故事线调整选取或撤销完成记录。';return;}
    if(planningStory){window.StoryProgress.get(planningStory).mode=preferences.explanation;window.StoryProgress.save(planningStory);}
    storyLabel();return requestPlan({preferences,story,choices,question:makeQuestion(preferences,story,choices)});
  };
  $('#trip-form').addEventListener('input',()=>{
    const button=$('#trip-form').querySelector('[type="submit"]');
    if(button.disabled){++planRequest;button.disabled=false;$('#planner-status').textContent='条件已修改，旧请求不会覆盖；请重新规划。';}
    lastAttempt=null;$('#planner-retry').hidden=true;
  });
  $('#planner-retry').onclick=()=>{if(lastAttempt&&!$('#trip-form').querySelector('[type="submit"]').disabled)return requestPlan(lastAttempt);};
  const backStory=()=>{if(planningStory)window.SGTStoryUI.openStory(planningStory.id,planningStory);else showContentView('story');};
  $('#planner-back-story').onclick=$('#plan-back-story').onclick=backStory;
  $('#plan-map').onclick=async()=>{if(current?.chatRoute){const chosen=current;const ok=await window.TravelMap.showPlan(chosen.chatRoute);if(current===chosen&&!ok)$('#plan-status').textContent='地图暂不可用，路线文字仍可查看；稍后重试。';}};
  $('#replan-remaining').onclick=()=>{
    if(!current)return;++planRequest;$('#trip-form').querySelector('[type="submit"]').disabled=false;planningStory=current.story;restoreForm(current.preferences);field('days').value=$('#remaining-time').value;
    storyLabel();showContentView('planner');$('#trip-form').requestSubmit();
  };
  window.TravelModules={openStory};
  function renderSaved() {
    const target = $('#saved-plans');
    target.replaceChildren();
    if (!saved.length) return empty(target, '尚未保存方案。');
    saved.forEach(item => {
      const row = node('div', null, 'saved-plan');
      row.append(node('span', `${item.plan.title || item.preferences.city} · ${item.preferences.date}`), action('打开', () => {
        ++planRequest; lastAttempt=null; $('#planner-retry').hidden=true; $('#trip-form').querySelector('[type="submit"]').disabled=false;
        current = item; planningStory=item.story || null; storyLabel();
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
      const range = Number.isFinite(item.amount_min) && Number.isFinite(item.amount_max) && item.amount_min > 0 && item.amount_max >= item.amount_min;
      const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0 ? `${item.amount} 元` : range ? `${item.amount_min}–${item.amount_max} 元（估算）` : '待核验 / 暂无数据';
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
  empty($('#budget-results'), '费用可向陈寿继续了解。可先生成行程草稿。');
    empty($('#travel-results'), '生成行程后可查询天气预报与当前空气质量。免费公共服务可能暂时不可用；出发前请通过运营方确认班次。');
})();
