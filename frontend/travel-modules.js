(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.TravelApi;
  const storageKey = 'sanguo.travel-plans.v1';
  let latestDemand=null, latestOtherAnswer=null, checklistDemand=null;
  let current = null, planningStory = null, planRequest = 0, lastAttempt = null;
  let city = '南充';
  let cityRequest = 0;
  let saved = [];
  const activityState = state => { $('#planner-view').dataset.activityState = state; if(window.TravelModules)updateConditions(); };
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
  function failure(target, label, error, retry) {
    const message=label+'查询失败，尚未取得数据。请检查网络或服务连接后重试。';
    empty(target,message);
    const details=node('details');details.append(node('summary','错误详情'),node('p',String(error?.message||error||'未提供')));target.append(details);
    if(retry)target.append(action('重新查询'+label,retry));
    return message;
  }
  function beijingTime(value, local=false) {
    if(typeof value!=='string'||!value.trim())return '待确认';
    const calendar=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/);
    if(!calendar)return '待确认';
    const [year,month,day]=calendar.slice(1,4).map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
    if(month<1||month>12||day<1||day>[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1]||Number(calendar[4]||0)>23||Number(calendar[5]||0)>59||Number(calendar[6]||0)>59)return '待确认';
    if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$1年$2月$3日')+'（北京时间）';
    const explicit=/(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    if(!explicit&&!local)return '时区未提供，时间待核验';
    const date=new Date(explicit?value:value+'+08:00');if(!Number.isFinite(date.getTime()))return '待确认';
    const parts=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
    const part=type=>parts.find(p=>p.type===type).value;
    return part('year')+'年'+part('month')+'月'+part('day')+'日 '+part('hour')+':'+part('minute')+'（北京时间）';
  }
  function sources(target, items, realtime=false) {
    const details = node('details');
    details.append(node('summary', '参考资料与来源'));
    if (!Array.isArray(items) || !items.length) details.append(node('p', '暂无参考来源，相关内容待核验。'));
    else items.filter(source => source && typeof source === 'object').forEach(source => {
      const levels={A:'权威资料',B:'较可靠资料',C:'文学/传说'};
      const row = node('p', `${source.title || '未命名来源'} · ${realtime ? '实时信息来源 · 需再核验' : '来源等级 ' + (Object.hasOwn(levels,source.source_level) ? source.source_level+'='+levels[source.source_level] : '待核验')}`);
      try {
        const url = new URL(source.source_url);
        if (['https:', 'http:'].includes(url.protocol)) {
          const link = node('a', ' 查看出处');
          link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link);
        }
      } catch { /* 无有效链接时保留来源文本 */ }
      details.append(row);
    });
    details.append(node('p', realtime ? '模型预报、非现场实测；天气信息需在出发前再核验。' : 'C=文学/传说，不能支撑史实结论；其他资料也需核对出处与时效。', 'map-note'));
    target.append(details);
  }
  function dataStatus(record) {
    const names = { sample: '示例数据', maintained: '维护数据', live: '实时查询', forecast: '模型天气预报', model: '模型估计（非实测）', external: '外部查询', reference_route: '道路参考（非实时路况）', pending: '暂无有效数据', stale: '已过期' };
    return `${names[record.data_status] || '状态未标注'} · ${record.fetched_at ? '查询时间（可能为缓存）' : '更新'}：${record.fetched_at || record.updated_at ? beijingTime(record.fetched_at || record.updated_at) : '未提供'}`;
  }
  function spotArtwork(spot) {
    // 按资料中的名称/主题选择艺术图型，不推断景区坐标或真实形制。
    const name=String(spot.name || '');
    const motifs=[
      [/墓|陵|碑/, 'memorial'], [/万卷楼|楼阁/, 'nanchong'],
      [/汉桓侯祠|张飞庙/, 'langzhong'], [/武侯祠/, 'chengdu'],
      [/庞统祠/, 'deyang'], [/剑门关|关楼|关隘/, 'guangyuan'],
      [/昭化古城|古城|城楼/, 'wall'], [/米仓|古道|栈道/, 'bazhong'],
      [/富乐山/, 'mianyang'], [/八濛山/, 'dazhou'], [/祠|庙/, 'langzhong']
    ];
    const themes=Array.isArray(spot.themes)?spot.themes.join(' '):'';
    const file=(motifs.find(([pattern])=>pattern.test(name)) || motifs.find(([pattern])=>pattern.test(themes)))?.[1] || 'scenic';
    const figure=node('figure', null, 'spot-art');
    const image=node('img');image.src='destination-art/'+file+'.svg';image.alt='';image.width=320;image.height=180;
    figure.append(image,node('figcaption','艺术示意 · 非实景 / 非实测复原','story-art-note'));
    return figure;
  }
  async function loadCity(nextCity) {
    city = nextCity;
    const version = ++cityRequest;
    document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.city === city)));
    $('#plan-destination').textContent = '带入活动计划';
    const target = $('#destination-results');
    empty(target, '正在查询景区资料…');
    try {
      const result = await api.listSpots(city);
      if (version !== cityRequest) return;
      if (result.status === 'empty') return empty(target, '当前资料库暂无该目的地景区资料，不代表当地没有景点；可向陈寿检索文化主题或换城浏览。开放时间及票价仍需核验。');
      if (result.status !== 'ok') throw Error(result.message || '景区资料服务暂不可用。');
      if (!Array.isArray(result.data.spots)) throw new Error('景区数据格式不完整。');
      target.replaceChildren();
      if (!result.data.spots.length) return empty(target, '当前资料库暂无该目的地景区资料，不代表当地没有景点；可向陈寿检索文化主题或换城浏览。开放时间及票价仍需核验。');
      result.data.spots.forEach(spot => {
        const card = node('article', null, 'result-card');
        card.append(spotArtwork(spot));
        card.append(node('h3', spot.name), node('p', spot.description || '简介待补充'), node('p', dataStatus(spot), 'map-note'));
        if (Array.isArray(spot.themes) && spot.themes.length) card.append(node('p', '文化主题：' + spot.themes.join('、')));
        if (Array.isArray(spot.suitable_users) && spot.suitable_users.length) card.append(node('p', '适合人群：' + spot.suitable_users.join('、')));
        if (Number.isFinite(spot.recommended_duration_min) && spot.recommended_duration_min > 0) card.append(node('p', '建议停留约 ' + spot.recommended_duration_min + ' 分钟（演示参考）'));
        card.append(node('p', '开放时间：' + (spot.open_time || '待核验')), node('p', spot.location_note || '景点位置待核验', 'map-note'));
        card.append(action('向导讲讲这里', () => { toggleChat(true); send('请介绍' + spot.name + '与三国文化的联系，区分史料、演义和地方传说；资料不足请说明。',{displayText:'请介绍'+spot.name+'与三国文化的联系。'}); }), action('带入活动计划', () => chooseCity(spot.city || city, spot.name)));
        sources(card, spot.sources);
        target.append(card);
      });
    } catch (error) { if (version === cityRequest) failure(target, '景区', error, () => loadCity(city)); }
  }
  let automaticPlaces=[], confirmedCities=[], pendingHandoff=null, committedCity='';
  const citiesOf=value=>[...new Set(String(value||'').split(/[、,，;；]/).map(c=>c.trim().replace(/市$/,'')).filter(Boolean))];
  function conditions(){return Object.fromEntries(new FormData($('#trip-form')));}
  function invalidate(){
    ++planRequest;lastAttempt=null;$('#planner-retry').hidden=true;
    $('#trip-form').querySelector('[type="submit"]').disabled=false;
    activityState(current?'stale':'idle');renderActivityResult();
    if(current){$('#plan-status').textContent='旧条件结果：活动条件已改变，已保存方案保持。';$('#view-current-plan').textContent='查看旧条件结果';}
  }
  function updateChecklistState(){
    const target=$('#activity-checklist-status');if(!checklistDemand||$('#activity-checklist').hidden){target.hidden=true;return;}
    target.hidden=false;target.textContent=checklistDemand.version===planRequest&&checklistDemand.conditionKey===activityConditionKey()?'本次请求快照 · 条件未改变':'旧请求快照 · 条件已改变';
  }
  function updateConditions(){
    updateChecklistState();
    const p=conditions(),days={'0.5':'半天（4 小时）','1':'一天（8 小时）','2':'两天（16 小时）'}[p.days]||'时间待确认';
    const state={'idle':'尚未生成','requesting':'请求中','valid':'已生成','stale':'旧条件结果','other-answer':'尚未收到活动方案','failed':'请求失败'}[$('#planner-view').dataset.activityState]||'尚未生成';
    $('#activity-summary').textContent=(planningStory?planningStory.title+' · '+chapterChoices(planningStory).filter(c=>c.status==='本次保留').map(c=>c.name).join('、'):'尚未选择故事')+'；目的地：'+(p.city||'待确认')+'；时间：'+days+'；'+state;
    $('#planner-auto-places').textContent='自动带入景点：'+(automaticPlaces.length?automaticPlaces.map(x=>x.name+'（'+(x.city||'地区待确认')+'；来源：'+x.source+'）').join('；'):'无')+'。用户备注在补充需求中单独保留。';
    updateAssociation();window.ActivityQueries?.refresh();
  }
  function applyHandoff(next,cross=false){
    const previous=automaticPlaces.slice(),incoming=next.cities;
    if(cross){confirmedCities=[...new Set([...citiesOf(committedCity),...(planningStory?.areas||[]).flatMap(citiesOf),...incoming])];}
    else confirmedCities=incoming;
    automaticPlaces=(cross?previous:previous.filter(p=>incoming.includes(p.city))).concat((next.places||[]).filter(p=>cross||!p.city||incoming.includes(p.city)));
    automaticPlaces=automaticPlaces.filter((p,i,a)=>a.findIndex(x=>x.name===p.name&&x.city===p.city)===i);
    if(next.kind==='story'){if(next.chapterIndices)window.StoryProgress.choose(next.story,next.chapterIndices);planningStory=next.story;field('explanation').value=window.StoryProgress.get(next.story).mode;}
    else if(!cross)planningStory=null;
    field('city').value=confirmedCities.join('、');committedCity=field('city').value;
    if(next.days===0.5)field('days').value='0.5';
    if(next.notes!==undefined)field('notes').value=next.notes;
    if(!field('date').value&&next.kind!=='story'){const today=new Date();field('date').value=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');}
    invalidate();pendingHandoff=null;$('#activity-conflict').hidden=true;storyLabel();
    const removed=previous.filter(p=>!automaticPlaces.includes(p));
    $('#planner-status').textContent=(next.days===0.5?'已将可用时间设为半天（4 小时），已沿用所选章节。':'已带入本次条件。')+(cross?'已明确确认跨城市需求：'+confirmedCities.join('、')+'。':'目的地：'+committedCity+'；移除此前自动带入景点：'+(removed.map(p=>p.name).join('、')||'无')+'。')+'保留：出发地、日期、人数、同行人群、交通方式、住宿偏好。用户备注：'+(next.notesAction==='clear'?'已按确认清空':next.notesAction==='edit'?'已按确认编辑':'保留原文')+'。交通和游览时长待核验'+(next.days===0.5?'，不保证半天可完成。':'。');
    updateConditions();showContentView('planner');
  }
  function handoff(next){
    const old=citiesOf(committedCity||field('city').value),storyCities=(planningStory?.areas||[]).flatMap(citiesOf);
    const differences=next.cities.length!==1||old.some(c=>!next.cities.includes(c))||storyCities.some(c=>!next.cities.includes(c))||automaticPlaces.some(p=>!next.cities.includes(p.city));
    if(!differences&&!pendingHandoff){applyHandoff(next);return;}
    pendingHandoff=next;
    $('#activity-conflict').hidden=false;
    $('#conflict-differences').textContent='当前目的地为'+(old.join('、')||'待确认')+'；'+(next.kind==='story'?'新故事涉及':'新带入目的地为')+(next.cities.join('、')||'地区尚未提供，必须选择目的地')+'；此前自动带入'+(automaticPlaces.map(p=>p.name).join('、')||'无景点')+'。'+(planningStory?'当前故事：'+planningStory.title+'（'+storyCities.join('、')+'）。':'');
    const select=$('#conflict-city');select.replaceChildren();
    for(const value of ['',...new Set([...next.cities,...(window.SGTCities||[])])]){const o=node('option',value||'请选择目的地');o.value=value;select.append(o);}select.value=next.cities.length===1?next.cities[0]:'';
    $('#conflict-retained').textContent='确认后保留：出发地 '+(field('origin').value||'待填')+'；日期 '+(field('date').value||'待填')+'；人数 '+field('people').value+'；同行 '+field('group').value+'；交通 '+field('transport').value+'；住宿 '+(field('hotel_tier').value||'未选择')+'；时间 '+(next.days===0.5?'将设为半天（4 小时）':field('days').value+'天')+'。';
    $('#conflict-places').textContent='跨城市将保留城市：'+[...new Set([...old,...storyCities,...next.cities])].join('、')+'；景点：'+[...automaticPlaces,...(next.places||[])].map(p=>p.name+'（'+p.city+'，'+p.source+'）').join('、')+'；新故事章节：'+(next.story?chapterChoices(next.story,next.chapterIndices).map(c=>c.name+'（'+c.status+'）').join('；'):'无')+'。';
    $('#conflict-notes').value=field('notes').value;$('#conflict-notes-action').value='keep';$('#conflict-cross-confirm').checked=false;$('#conflict-feedback').textContent='此前备注的来源无法自动区分，请明确选择保留、编辑或清空。不按关键词删除原文。';
    $('#conflict-adopt').textContent=next.kind==='story'?'采用新故事目的地':'采用新目的地';
    $('#planner-status').textContent='条件交接存在差异，请先处理生成入口旁的冲突。';showContentView('planner');updateConditions();
  }
  function resolveHandoff(cross){
    if(!pendingHandoff)return;
    if(!$('#conflict-city').value){$('#conflict-feedback').textContent='请先选择明确的目的地。';return;}
    if(cross&&!$('#conflict-cross-confirm').checked){$('#conflict-feedback').textContent='请勾选确认保留列出的跨城市组合。';return;}
    const n={...pendingHandoff,cities:cross?[...new Set([...pendingHandoff.cities,$('#conflict-city').value])]:[$('#conflict-city').value]};
    n.notesAction=$('#conflict-notes-action').value;
    n.notes=$('#conflict-notes-action').value==='clear'?'':$('#conflict-notes-action').value==='edit'?$('#conflict-notes').value:field('notes').value;
    applyHandoff(n,cross);
  }
  $('#conflict-adopt').onclick=()=>resolveHandoff(false);$('#conflict-cross').onclick=()=>resolveHandoff(true);
  $('#conflict-cancel').onclick=()=>{pendingHandoff=null;$('#activity-conflict').hidden=true;field('city').value=committedCity;$('#planner-status').textContent='已取消带入，原活动条件、备注与请求保持。';updateConditions();};
  function chooseCity(nextCity,spot=''){
    const cities=citiesOf(nextCity);
    handoff({kind:'city',cities,places:spot?[{name:spot,city:cities.join('、'),source:'目的地景区资料'}]:[]});
  }
  document.querySelectorAll('[data-city]').forEach(button => button.onclick = () => loadCity(button.dataset.city));
  document.querySelectorAll('[data-destination]').forEach(button => button.onclick = () => chooseCity(button.dataset.destination));
  $('#plan-destination').onclick = () => chooseCity(city);
  document.querySelectorAll('[data-plan-map]').forEach(button => button.onclick = () => {
    const selection=window.TravelMap?.getPlanSelection(true);
    if(!selection || (!selection.cities.length&&!selection.places.length)){$('#map-plan-status').textContent='请先在地图选择地点或市州，再带入活动计划。';return;}
    $('#map-plan-status').textContent='';handoff({kind:'map',cities:selection.cities.flatMap(citiesOf),places:(selection.locations||selection.places.map(name=>({name,city:selection.cities.length===1?selection.cities[0]:''}))).map(p=>({...p,source:'行旅地图用户选点'}))});
  });
  $('#open-culture').onclick = () => toggleChat(true);

  function renderPlan() {
    renderActivityResult();
    const target = $('#plan-results');
    if (!current) return empty(target, '还没有行程草稿。选好目的地和出行条件后，就能生成。');
    if (current.chatRoute) { renderChatPlan(target); return; }
    $('#plan-map').disabled = true;
    const { preferences: p, plan } = current;
    if(current.activityAnswer && !plan.days.length) {
      target.replaceChildren(node('h3',plan.title),node('p',(p.date||p.travel_date||'日期待确认')+' · '+p.people+'人'));
      target.append(window.SGTAnswerTrust ? window.SGTAnswerTrust.render(current.activityEvidence || {}) : node('p','来源 · 待核验；回答提及的文献出处尚未核验，请勿作为已核验引文。','map-note'));
      target.append(window.AgentAnswer ? window.AgentAnswer.render(current.activityAnswer) : node('p',current.activityAnswer));
      $('#save-plan').disabled=$('#copy-plan').disabled=false;
      return;
    }
    target.replaceChildren(node('h3', plan.title || `${p.city} ${p.days}天行程`), node('p', `${p.date}出发 · ${p.people}人 · ${p.group} · ${p.transport}`));
    target.append(node('p', current.draft ? '出行草稿 · 可请向导继续安排活动' : dataStatus(plan), 'data-banner'));
    if (p.notes) target.append(node('p', '补充需求：' + p.notes));
    plan.days.forEach(day => {
      const card = node('article', null, 'result-card');
      card.append(node('h3', `第 ${day.day} 天`));
      if (!Array.isArray(day.stops) || !day.stops.length) card.append(node('p', '活动顺序和时长还需向导提供。'));
      else {
        const list = node('ol');
        day.stops.forEach(stop => list.append(node('li', `${stop.name || '未命名站点'}${stop.stay_minutes ? ` · 建议停留 ${stop.stay_minutes} 分钟` : ''}${stop.note ? ' · ' + stop.note : ''}`)));
        card.append(list);
      }
      target.append(card);
    });
    sources(target, plan.sources);appendOriginalAnswer(target);
    $('#save-plan').disabled = $('#copy-plan').disabled = false;
  }
  const field = name => $('#trip-form').elements.namedItem(name);
  const text = v => typeof v === 'string' && v.trim() ? v.trim() : '待核验';
  const minutes = v => Number.isFinite(v) && v > 0 ? v + ' 分钟' : '待核验';
  function chapterChoices(story,indices) {
    if (!story) return [];
    const state=window.StoryProgress.get(story), places=window.StoryMap.getPlaces(story.id);
    return (story.chapters || []).map((chapter,i)=>({name:chapter.name,placeId:chapter.placeId,
      place:places.find(p=>p.id===chapter.placeId)?.name || '', role:chapter.role || '',
      status:state.completed.has(i)?'已完成':(indices?!indices.includes(i):state.skipped.has(i))?'本次跳过':'本次保留'}));
  }
  function storyLabel() {
    $('#planner-story').textContent=planningStory ? '故事：'+planningStory.title+' · '+chapterChoices(planningStory).map(c=>c.name+'（'+c.status+'）').join('；')+(planningStory.chapters?.length?'。':'章节待补充。')+'本地已寻迹记录保持。' : '尚未选择故事，可填写普通行程需求。';
    $('#planner-back-story').textContent=planningStory?'返回故事':'返回目的地';
    $('#plan-back-story').textContent=planningStory?'返回故事':'返回目的地';
  }
  function restoreForm(preferences) {
    field('hotel_tier').value=preferences.hotel_tier||'';
    Object.entries(preferences).forEach(([key,value])=>{if(field(key))field(key).value=value;});
    field('origin').dispatchEvent?.(new Event('sgt-origin-restored'));
  }
  function openStory(story,days,selection={}){
    handoff({kind:'story',story,days,chapterIndices:selection.chapterIndices,cities:(story.areas||[]).flatMap(citiesOf),places:[]});
  }
  const hotelStars={'经济型':'2.0,2.5','舒适型':'3.0,3.5','高档型':'4.0,4.5','豪华型':'4.5,5.0'};
  function hotelRequirement(p){return p.hotel_tier&&hotelStars[p.hotel_tier]?'住宿档位偏好：'+p.hotel_tier+'（参考星级范围 '+hotelStars[p.hotel_tier]+'）；需要住宿时调用已授权的酒店查询工具，先确认入住日期、晚数和每房人数。只展示工具返回的酒店与参考价，不编造房价。':'住宿：本次未选择。';}
  function makeQuestion(p,story,choices) {
    const duration={'0.5':'半天','1':'一天','2':'两天'}[p.days];
    return '请生成三国文化活动方案，只输出活动安排。'+(story?'故事：'+story.title+'；故事涉及地区：'+(story.areas||[]).join('、')+'。活动仅限已确认目的地，章节是阅读主题，不自动添加异地活动。':'')+
      '出发地：'+p.origin+'；目的地：'+p.city+'；可用时间：'+duration+'；出发日期：'+(p.date||'待确认')+
      '（活动时长合计上限 '+({0.5:4,1:8,2:16}[p.days])+' 小时）；同行：'+p.group+'，'+p.people+'人；讲解偏好：'+p.explanation+'。'+
      '自动带入景点：'+(p.automaticPlaces?.length?p.automaticPlaces.map(x=>x.name+'（'+(x.city||'地区待确认')+'；来源：'+x.source+'）').join('；'):'无')+'。'+
      '章节选择：'+(choices.length?choices.map(c=>c.name+' / '+(c.place||'地点待确认')+'：'+c.status).join('；'):'章节尚未提供，请说明主题关联待确认')+'。'+
      '请只调整未完成且本次保留的章节，已完成节点不重复安排。保留/舍弃/新增活动必须说明原因；不把未返回章节默认为已完成。'+
      hotelRequirement(p)+'先检索文化资料，再说明景点与活动顺序、每项时长、文化讲解要点；无依据标待核验，资料不足请说明。不要编造实时交通、开放时段、空位、价格、天气或坐标。补充需求：'+(p.notes||'无')+'。';
  }
  function visitorSummary(p,story){const summary='请安排'+p.city+'的'+({'0.5':'半天','1':'一天','2':'两天'}[p.days]||p.days+'天')+'文化活动：'+p.origin+'出发，'+(p.date||'日期待确认')+'，'+p.group+' '+p.people+'人，'+({'大众体验版':'大众线','亲子故事版':'亲子线','学术探索版':'学术线'}[p.explanation]||'大众线')+(p.hotel_tier?'；住宿：'+p.hotel_tier:'')+(story?'；主题：'+story.title:'')+(p.notes?'；'+p.notes:'');return /[。！？.!?]$/.test(summary.trimEnd())?summary.trimEnd():summary.trimEnd()+'。';}
  function renderChatPlan(target) {
    const {chatRoute: result,preferences:p,story,choices}=current, route=result.route;
    target.replaceChildren(node('h3',text(route.name)),node('p','关联故事：'+(story?.title||'普通行程')),
      node('p','你的出行条件：'+p.origin+'出发 · '+({'0.5':'半天','1':'一天','2':'两天'}[p.days]||p.days+'天')+' · '+p.transport+' · '+p.group+' · '+p.people+'人'),
      node('p','服务返回的路线模板 / 现实可行性待核验；不是道路导航，尚不能保证满足所有条件。','data-banner'),
      node('p','路线简介：'+text(route.summary)),node('p','总体取舍：'+text(result.selection_reason)),
      node('p','风险提示：'+text(route.risk_note)),node('p','更新时间：'+text(route.updated_at)+' · 来源与时效待核验'),
      node('p','返回的时长：'+(Number.isFinite(route.duration_hours)&&route.duration_hours>0?route.duration_hours+' 小时':'待核验')+'；交通：'+text(route.transport_mode)));
    const hourLimit={0.5:4,1:8,2:16}[p.days];
    if(Number.isFinite(route.duration_hours)&&route.duration_hours>hourLimit)target.append(node('p','时间不符合：返回的路线 '+route.duration_hours+' 小时，超过本次 '+hourLimit+' 小时上限。请压缩或重绘，暂不可按此方案执行。','data-banner'));
    if(route.transport_mode && route.transport_mode!==p.transport)target.append(node('p','出行条件待确认：返回的交通方式与你所选的不一致，请调整需求或核验。','data-banner'));
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
        let reason=c.status==='已完成'?'本地记录已完成，请求不重复安排。':c.status==='本次跳过'?'你选择将本次时间留给其他章节；故事定义保留。':match?'保留理由：'+text(match.reason):'没有收到可确认的对应站点；舍弃原因待核验，不能推断。';
        if(match&&c.status!=='本次保留')reason+=' 返回的结果仍包含该站，与你的选取不一致，需核验。';
        target.append(node('p',c.name+' · '+c.status+'：'+reason));
      });
    }
    target.append(node('p','交通耗时、开放时段、费用与章节匹配未全部核验前，本方案仅供讨论。','map-note'));
    sources(target,route.sources);appendOriginalAnswer(target); $('#save-plan').disabled=$('#copy-plan').disabled=false; $('#plan-map').disabled=false;
  }
  function appendOriginalAnswer(target){if(!current.activityAnswer)return;target.append(window.SGTAnswerTrust?window.SGTAnswerTrust.render(current.activityEvidence||{}):node('p','来源 · 待核验；回答提及的文献出处尚未核验。','map-note'),node('h3','服务原回答'),window.AgentAnswer?window.AgentAnswer.render(current.activityAnswer):node('p',current.activityAnswer));}
  function receiveActivity(reply) {
    const attempt=reply.activityPlan;
    if(!attempt || attempt.version!==planRequest || typeof reply.text!=='string' || !reply.text.trim())return;
    const intent=reply.data?.intent?.intent,route=reply.data?.route;
    // 只接受现有可渲染的结构化路线协议；非空文字、意图标签或 found 标志本身不是方案证据。
    const hasRoute=route?.found===true&&route.route&&typeof route.route==='object'&&!Array.isArray(route.route)&&Array.isArray(route.stops)&&route.stops.length>0&&route.stops.every(stop=>stop&&typeof stop.name==='string'&&stop.name.trim());
    const plan=reply.data?.plan;
    const hasPlan=plan&&typeof plan==='object'&&Array.isArray(plan.days)&&plan.days.length>0&&plan.days.every(day=>day&&Array.isArray(day.stops)&&day.stops.length>0&&day.stops.every(stop=>stop&&typeof stop.name==='string'&&stop.name.trim()));
    if((!hasRoute&&!hasPlan) || intent==='budget_ticket' || reply.data?.generation?.kind==='retrieval_fallback'){
      activityState('other-answer');renderActivityResult();
      $('#planner-status').textContent=(intent==='budget_ticket'?'服务返回了费用回答，尚未收到活动方案':reply.data?.generation?.kind==='retrieval_fallback'?'服务返回了资料摘录，尚未收到活动方案':'尚未收到活动方案，请查看服务原回答')+'；原回答保留在对话中，现有方案保持。';
      latestOtherAnswer=reply.text;$('#activity-recovery').hidden=false;$('#activity-original-answer').replaceChildren(window.AgentAnswer?window.AgentAnswer.render(reply.text):node('p',reply.text));$('#activity-checklist').hidden=true;
      $('#plan-status').textContent='尚未更新活动方案；可返回条件、复制需求或整理章节与条件清单。';
      return;
    }
    planningStory=attempt.story||null;storyLabel();
    current={id:crypto.randomUUID(),preferences:attempt.preferences,story:attempt.story,choices:attempt.choices,
      chatRoute:hasRoute?route:null,activityAnswer:reply.text,activityEvidence:{sources:reply.data?.sources || [],data_status:reply.data?.data_status,updated_at:reply.data?.updated_at},plan:hasRoute?{title:attempt.preferences.city+'文化路线模板',days:[]}:plan,draft:false};
    activityState('valid');$('#activity-recovery').hidden=true;
    renderPlan();
    $('#view-current-plan').hidden=false;$('#view-current-plan').textContent='查看本次方案';
    $('#planner-status').textContent=(hasRoute?'本次方案已生成（路线模板；活动时间及现实可行性待核验）':'本次活动方案已生成（活动时间及现实可行性待核验）')+'，可点“查看本次方案”保存、复制或调整；对话中也可继续追问。';
    $('#plan-status').textContent='已更新活动方案；已寻迹章节记录保持。';
  }
  async function requestPlan(attempt) {
    const version=++planRequest, button=$('#trip-form').querySelector('[type="submit"]');
    const activityPlan={...attempt,version,conditionKey:activityConditionKey()};latestDemand=activityPlan;$('#activity-recovery').hidden=true;$('#activity-checklist').hidden=true;
    activityState('requesting');renderActivityResult();$('#view-current-plan').hidden=!current&&!saved.length;
    $('#view-current-plan').textContent=current?'查看已有方案':'查看本机保存的方案';
    if(window.SGTJourney?.ask){lastAttempt=null;$('#planner-retry').hidden=true;$('#planner-status').textContent='已打开陈寿的活动对话。如果正在回答，本次需求会留在对话草稿里。';window.SGTJourney.ask(attempt.question,{displayText:visitorSummary(attempt.preferences,attempt.story),preserveMap:true,activityPlan});return;}
    lastAttempt=attempt;button.disabled=true;$('#planner-retry').hidden=true;
    $('#planner-status').textContent='正在检索文化资料并生成活动方案；现有方案保持。';
    try {
      const data=await window.SGTChat.request(attempt.question);
      if(version!==planRequest)return;
      if(typeof data?.answer!=='string'||!data.answer.trim())throw Error('未返回有效活动回答。');
      receiveActivity({text:data.answer,data,activityPlan});if($('#planner-view').dataset.activityState==='valid')showContentView('plan');
    } catch(error) {if(version===planRequest){activityState('failed');$('#planner-status').textContent=error.name==='TimeoutError'?'等待活动方案超时，可重试；现有方案保持。':'请求失败：'+error.message+' 可重试；现有方案保持。';$('#planner-retry').hidden=false;}}
    finally{if(version===planRequest)button.disabled=false;}
  }
  $('#trip-form').onsubmit = event => {
    event.preventDefault();const form=event.currentTarget;
    if(pendingHandoff){$('#planner-status').textContent='请先解决活动条件冲突。';$('#activity-conflict').focus();return;}
    if(field('city').value!==committedCity){manualCityChange();if(pendingHandoff){$('#activity-conflict').focus();return;}}
    if(form.querySelector('[type="submit"]').disabled || !form.reportValidity())return;
    const preferences=Object.fromEntries(new FormData(form));preferences.origin=(preferences.origin||'').trim();
    ['days','people'].forEach(k=>preferences[k]=Number(preferences[k]));
    preferences.automaticPlaces=automaticPlaces.map(p=>({...p}));preferences.confirmedCities=confirmedCities.slice();
    if(!preferences.origin || ![0.5,1,2].includes(preferences.days) || !Number.isInteger(preferences.people) || preferences.people<1 || preferences.people>50) {
      $('#planner-status').textContent='请填写有效出发地、可用时间与人数。';return;
    }
    const story=planningStory?JSON.parse(JSON.stringify(planningStory)):null,choices=chapterChoices(planningStory);
    if(choices.length&&!choices.some(c=>c.status==='本次保留')) {$('#planner-status').textContent='没有待规划的保留章节；可返回故事调整选取或撤销完成记录。';return;}
    if(planningStory){window.StoryProgress.get(planningStory).mode=preferences.explanation;window.StoryProgress.save(planningStory);}
    storyLabel();return requestPlan({preferences,story,choices,question:makeQuestion(preferences,story,choices)});
  };
  $('#trip-form').addEventListener('input',event=>{
    if(event?.target===field('city')){updateChecklistState();return;}
    ++planRequest; // 条件改变后，旧活动回答不覆盖方案。
    const stale=current||['requesting','stale','other-answer','failed'].includes($('#planner-view').dataset.activityState);
    activityState(stale?'stale':'idle');

    const button=$('#trip-form').querySelector('[type="submit"]');
    button.disabled=false;
    if(stale)$('#planner-status').textContent='条件已修改，旧请求不会覆盖；请重新生成活动方案。';
    lastAttempt=null;$('#planner-retry').hidden=true;updateConditions();renderActivityResult();
  });
  function manualCityChange(){const value=field('city').value;field('city').value=committedCity;handoff({kind:'manual',cities:citiesOf(value),places:[]});}
  field('city').addEventListener('change',manualCityChange);
  $('#planner-retry').onclick=()=>{if(lastAttempt&&!$('#trip-form').querySelector('[type="submit"]').disabled)return requestPlan(lastAttempt);};
  const backStory=()=>{if(planningStory)window.SGTStoryUI.openStory(planningStory.id,planningStory);else showContentView('destinations');};
  $('#planner-back-story').onclick=$('#plan-back-story').onclick=backStory;
  $('#plan-map').onclick=async()=>{if(current?.chatRoute){const chosen=current;const ok=await window.TravelMap.showPlan(chosen.chatRoute);if(current===chosen&&!ok)$('#plan-status').textContent='地图暂不可用，路线文字仍可查看；稍后重试。';}};
  function getRoadDraft(source){const p=source==='plan'&&current?current.preferences:Object.fromEntries(['origin','city','notes'].map(k=>[k,field(k).value]));return {origin:p.origin||'',city:p.city||'',conditionKey:source==='plan'?null:activityConditionKey(),date:p.date||field('date').value||'',destination:(source==='plan'?current?.chatRoute?.stops?.at(-1)?.name:'') || p.automaticPlaces?.at(-1)?.name || automaticPlaces.at(-1)?.name || p.city || ''};}
  function getParentView(){return 'planner';}
  function failActivity(reply){if(reply?.activityPlan?.version===planRequest){activityState('failed');$('#planner-status').textContent='活动请求失败或过期；现有方案保持，可修改条件后重试。';}}
  window.TravelModules={storyChanged(story){if(planningStory?.id!==story.id)return;field('explanation').value=window.StoryProgress.get(story).mode;invalidate();storyLabel();updateConditions();},openStory,openCity:chooseCity,receiveActivity,failActivity,onEnterTravel,prefillTravel,getParentView,getRoadDraft};
  function renderSaved() {
    const target = $('#saved-plans');
    target.replaceChildren();
    if (!saved.length) return empty(target, '尚未保存方案。');
    if(!current){$('#view-current-plan').hidden=false;$('#view-current-plan').textContent='查看本机保存的方案';}
    saved.forEach(item => {
      const row = node('div', null, 'saved-plan');
      row.append(node('span', `${item.plan.title || item.preferences.city} · ${item.preferences.date}`), action('打开', () => {
        ++planRequest; lastAttempt=null; $('#planner-retry').hidden=true; $('#trip-form').querySelector('[type="submit"]').disabled=false;
        planningStory=(window.SGT_STORIES||[]).find(s=>s.id===item.story?.id)||null;
        current = {...item,story:planningStory,choices:planningStory?chapterChoices(planningStory):[]}; storyLabel();
        pendingHandoff=null;$('#activity-conflict').hidden=true;restoreForm(item.preferences);committedCity=field('city').value;automaticPlaces=item.preferences.automaticPlaces||[];confirmedCities=item.preferences.confirmedCities||citiesOf(committedCity);activityState('valid');updateConditions();
        renderPlan();
        updateAssociation();
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
  function renderActivityResult(){
    const target=$('#activity-result');target.hidden=!current;if(!current)return;
    target.replaceChildren(node('h3',$('#planner-view').dataset.activityState==='valid'?'已有活动结果':'旧条件结果 / 已有方案'),node('p','结果条件：'+current.preferences.city+' · '+current.preferences.days+'天 · '+(current.preferences.date||'日期待确认'),'map-note'));
    if(current.activityAnswer)target.append(window.SGTAnswerTrust?window.SGTAnswerTrust.render(current.activityEvidence||{}):node('p','来源未核验。'),window.AgentAnswer?window.AgentAnswer.render(current.activityAnswer):node('p',current.activityAnswer));
    else target.append(node('p','此处保留已有结果，可进入方案页查看详情。'));
    target.append(action('查看、保存或复制已有方案',()=>showContentView('plan')));
  }
  $('#return-conditions').onclick=()=>{$('#trip-origin').focus();$('#trip-form').scrollIntoView?.({block:'start'});};
  $('#copy-demand').onclick=async()=>{
    if(!latestDemand)return;
    try{await navigator.clipboard.writeText(latestDemand.question);$('#demand-copy-status').textContent='本次需求已复制。';}
    catch{const box=$('#demand-copy-fallback');box.hidden=false;box.value=latestDemand.question;box.focus();box.select?.();$('#demand-copy-status').textContent='复制失败，可选中下方需求文字手动复制。';}
  };
  $('#organize-demand').onclick=()=>{
    if(!latestDemand)return;checklistDemand=latestDemand;const {preferences:p,story,choices}=checklistDemand;
    const content=['整理清单（不是活动方案）','本次请求快照（原内容保留，是否已改变请看上方状态）','故事：'+(story?.title||'未选择'),'章节：'+choices.map(c=>c.name+' / '+c.status).join('；'),'目的地：'+p.city,'可用时间：'+({'0.5':'半天（4小时）','1':'一天（8小时）','2':'两天（16小时）'}[p.days]),'出发地：'+p.origin+'；日期：'+(p.date||'待确认')+'；人数：'+p.people+'；同行：'+p.group,'自动带入景点：'+(p.automaticPlaces||[]).map(x=>x.name+'（'+x.city+'；'+x.source+'）').join('；'),'用户原始备注：'+(p.notes||'无'),'待核验：交通、开放时间、票价、天气、活动时间及现实可行性。章节顺序不是历史行走路线；本地阅读和手动已寻迹不代表实际到访。','服务原回答：'+(latestOtherAnswer||'无')].join('\n');
    $('#activity-checklist').hidden=false;$('#activity-checklist').textContent=content;updateChecklistState();
  };
  function activityConditionKey(){return JSON.stringify({preferences:conditions(),story:planningStory?.id||null,choices:chapterChoices(planningStory),automaticPlaces});}
  const querySnapshots=new Map();
  window.ActivityQueries={contextKey:activityConditionKey,record(kind,snapshot){querySnapshots.set(kind,JSON.parse(JSON.stringify(snapshot)));this.refresh();},refresh(){
    const p=conditions();
    for(const [kind,s] of querySnapshots){const target=$('#'+(kind==='road'?'road':'osrm')+'-association');
      const same=citiesOf(p.city).length===1&&citiesOf(p.city)[0]===citiesOf(s.city)[0];
      target.textContent='独立查询：'+(s.city||'城市尚未确认')+'；'+s.origin+(s.origin_address?'（'+s.origin_address+'）':'')+' → '+s.destination+(s.destination_address?'（'+s.destination_address+'）':'')+'；查询时间：'+beijingTime(s.queried_at)+'；查询时活动日期：'+(s.date||'未提供')+'。'+(!same?'与当前'+(p.city||'目的地待确认')+'活动未关联。':s.linked&&s.conditionKey===activityConditionKey()&&s.date===p.date?'与当前活动的城市和日期相符；起终点已由用户确认，现实可行性仍待核验。':'尚未关联当前活动；活动日期 '+(p.date||'待确认')+'，请按活动条件重新确认具体地点。');
      if(kind==='road'){const detail=$('#road-query-details');detail.hidden=!s.origin_id&&!s.destination_id;$('#road-query-identifiers').textContent='起点原编码：'+(s.origin_id||'未提供')+'；终点原编码：'+(s.destination_id||'未提供')+'。内部查询使用原确认值；编码不是坐标核验或实际到访凭据。';}
    }
    window.AmapPlanner?.conditionsChanged?.({city:p.city,date:p.date,conditionKey:activityConditionKey()});
  }};
  let weatherSnapshot=null;
  function updateAssociation(){
    const target=$('#weather-association');if(!weatherSnapshot){target.textContent='尚未关联当前活动。';return;}
    const p=conditions(),same=citiesOf(p.city).length===1&&citiesOf(p.city)[0]===citiesOf(weatherSnapshot.city)[0],dateOK=p.date&&weatherSnapshot.dates.includes(p.date);
    target.textContent='独立查询：'+weatherSnapshot.city+'；预报日期：'+(weatherSnapshot.dates.join('、')||'未取得')+'；查询时活动日期：'+(weatherSnapshot.activityDate||'未提供')+'。'+(!same?'与当前'+(p.city||'目的地待确认')+'活动未关联。':dateOK?'城市和日期与当前活动条件相符；非现场实测。':'当前活动日期 '+(p.date||'待确认')+' 不在已取得预报日期中，尚未关联该日期。');
  }
  $('#weather-use-activity').onclick=()=>{const p=conditions();if(citiesOf(p.city).length!==1){$('#travel-status').textContent='请先确认一个活动目的地，跨城市天气需分别查询。';return;}$('#travel-city').value=p.city;weatherForm.requestSubmit();};
  let prefilledPlanId=null, weatherVersion=0;
  function prefillTravel(cityName){
    ++weatherVersion;
    $('#load-travel').disabled=false;
    updateAssociation();
    $('#travel-city').value=cityName||'';
    prefilledPlanId=current?.id||null;
    $('#travel-status').textContent=cityName?'目的地已带入，点击查询才会请求天气。':'原回答没有确认一个目的地，请先手动选城再查询。';
  }
  function onEnterTravel(source='planner'){
    if(source==='planner'){prefillTravel(field('city').value);return;}
    if(current?.id && current.id!==prefilledPlanId){
      prefillTravel(current.preferences.city);
    }
  }
  const weatherForm=$('#travel-weather-form'),weatherButton=$('#load-travel'),weatherTarget=$('#travel-results');
  weatherForm.addEventListener('input',()=>{weatherVersion++;weatherButton.disabled=false;empty(weatherTarget,'条件已改变，点击查询以更新天气。');$('#travel-status').textContent='条件已改变，请重新查询。';});
  weatherForm.onsubmit=async event=>{
    event.preventDefault();if(!weatherForm.reportValidity())return;
    const version=++weatherVersion,city=$('#travel-city').value.trim(),activityDate=field('date').value;
    weatherButton.disabled=true;$('#travel-status').textContent='正在查询天气…';empty(weatherTarget,'正在查询…');
    try{
      const adcode={'南充':'511300','阆中':'511381','广元':'510800'}[city.replace(/[市县]$/,'')];
      const result=await api.getTravelInfo({city,...(adcode?{adcode}:{})});if(version!==weatherVersion)return;
      if(result.status!=='ok')throw Error(result.message||'天气服务暂不可用，请重试。');
      const data=result.data;
      const airOnly=item=>/空气质量|AQI|PM2[._]5|PM10|CAMS|air-quality/i.test([item?.title,item?.summary,...(Array.isArray(item?.sources)?item.sources:[]).map(s=>s?.title+' '+s?.source_url)].join(' '));
      const items=(Array.isArray(data.items)?data.items:[]).filter(item=>item&&typeof item==='object'&&!airOnly(item));
      const days=window.WeatherOutlook.outlook(data);weatherSnapshot={city,activityDate,dates:days.map(d=>d.date)};updateAssociation();
      weatherTarget.replaceChildren();
      const forecast=node('div',null,'weather-days');
      const today=window.WeatherOutlook.datesFromToday()[0];
      days.forEach(day=>{
        const card=node('article',null,'weather-day');card.dataset.date=day.date;
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');
        svg.setAttribute('class','weather-icon');svg.setAttribute('viewBox','0 0 80 72');svg.setAttribute('aria-hidden','true');
        use.setAttribute('href','weather-icons.svg#'+day.condition.icon);svg.append(use);
        const offset=(Date.parse(day.date)-Date.parse(today))/86400000;
        card.append(node('h4',([ '今天','明天','后天' ][offset]||'预报')+' · '+day.date),svg,node('p',day.temperature,'weather-temperature'),node('p',day.condition.label,'weather-condition'));forecast.append(card);
      });
      const providedSources=[...(Array.isArray(data.sources)?data.sources:[]),...items.flatMap(item=>Array.isArray(item.sources)?item.sources:[])].filter(s=>s&&typeof s==='object'&&!airOnly({sources:[s]}));
      const sourceNames=[...new Set(providedSources.map(s=>typeof s.title==='string'?s.title.trim():'').filter(Boolean))];
      weatherTarget.append(node('p','服务返回 '+days.length+' 天预报 · 北京时间；天气来源：'+(sourceNames.join('、')||'来源待确认'),'weather-overview'));
      if(days.length)weatherTarget.append(forecast);else weatherTarget.append(node('p','未取得有效日期的天气预报，请稍后重新查询。','data-banner'));
      weatherTarget.append(node('p','天气为模型预报、非现场实测；城市预报不代表景区入口。','weather-boundary'));
      const details=node('details',null,'weather-provenance');details.append(node('summary','来源、查询时间与原始说明'));
      sources(details,providedSources,true);
      details.append(node('p','查询时间（可能为缓存）：'+beijingTime(data.fetched_at||data.updated_at)));
      items.forEach(item=>{const card=node('article',null,'result-card');card.append(node('h3',item.title||'天气资料'),(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(item.summary||'') ? (()=>{const original=node('details');original.append(node('summary','原始服务说明（保留原文）'),node('p',item.summary));return original;})() : node('p',item.summary||'摘要待补充')),node('p',dataStatus(item),'map-note'));sources(card,item.sources,true);details.append(card);});weatherTarget.append(details);
      const warnings=(Array.isArray(data.warnings)?data.warnings:[]).filter(w=>typeof w==='string'&&!airOnly({summary:w}));
      const missing=!days.length||!sourceNames.length||days.some(day=>day.condition.icon==='unknown'||/未取得/.test(day.temperature));
      $('#travel-status').textContent=[city+' · 已取得 '+days.length+' 天预报；出发前请再次核验。',missing?'部分数据未取得，可重新查询。':'',...warnings].filter(Boolean).join(' ');
      if(missing||warnings.length)weatherTarget.append(action('重新查询天气',()=>weatherForm.requestSubmit()));
    }catch(error){if(version===weatherVersion){$('#travel-status').textContent=failure(weatherTarget,'天气',error,()=>weatherForm.requestSubmit());}}
    finally{if(version===weatherVersion)weatherButton.disabled=false;}
  };
  $('#load-hotels').onclick=()=>{const p=Object.fromEntries(new FormData($('#trip-form')));$('#hotel-results').replaceChildren(node('p',p.hotel_tier&&hotelStars[p.hotel_tier]?'住宿档位：'+p.hotel_tier+' · 参考星级范围 '+hotelStars[p.hotel_tier]:'本次尚未选择住宿档位。'),node('p',(p.city||'目的地待填')+' · '+(p.date||'日期待填')+'：住宿查询未接入，尚未取得真实酒店与房价。现在可以记录住宿需求；查询开放后再核验酒店和参考房价。','data-banner'));};
  committedCity=field('city').value;storyLabel();activityState('idle');updateConditions();renderPlan(); renderSaved(); loadCity(city);
    empty($('#travel-results'), '填写目的地后可独立查询天气预报。');
})();
