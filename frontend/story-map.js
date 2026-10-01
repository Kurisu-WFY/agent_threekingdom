/* 只负责故事叠加层；底图几何、投影、点选和手势仍由 TravelMap 处理。 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const core = window.MapRouteCore;
  const ns = 'http://www.w3.org/2000/svg';
  const progress = new Map(), overrides = new Map();
  let active = null, resolved = [], labels = [], markers = [], epoch = 0, cardOpen = false;
  function node(tag, cls, text) {
    const item = document.createElement(tag); if (cls) item.className = cls;
    if (text !== undefined) item.textContent = text; return item;
  }
  function svgNode(tag, attrs, text) {
    const item = document.createElementNS(ns, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => item.setAttribute(key, value));
    if (text !== undefined) item.textContent = text; return item;
  }
  const value = text => typeof text === 'string' && text.trim() ? text.trim() : '待确认';
  const list = items => Array.isArray(items) && items.length ? items.map(value).join('、') : '待确认';
  const state = () => active ? (window.StoryProgress ? window.StoryProgress.get(active) : progress.get(active.id)) : null;
  const persist = () => { if(active && window.StoryProgress) window.StoryProgress.save(active); };
  function safeUrl(raw) {
    try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch (_) { return null; }
  }
  function reliableCoordinate(place) {
    return place?.coordinate_system === 'GCJ-02' && ['maintained', 'live'].includes(place.dataStatus) &&
      typeof place.updatedAt === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(place.updatedAt) && Number.isFinite(Date.parse(place.updatedAt)) &&
      Array.isArray(place.sources) && place.sources.some(source => source && ['A','B'].includes(source.source_level) && safeUrl(source.source_url));
  }
  function locate(chapter, places) {
    const place = places.find(item => item.id === chapter.placeId);
    if (!place) return { chapter, place: { name: '地点待确认', building: 'book' }, point: null, exact: false, note: '待定位 · 地点数据待确认' };
    if (reliableCoordinate(place)) {
      const parsed = core.structured({ map_route: { stops: [place] } }, []);
      if (parsed?.points[0]) return { chapter, place, point: parsed.points[0], exact: true, note: '景区位置有来源；入口与导航仍待确认' };
    }
    const counties = window.TravelMap.getPlaces().filter(item => item.level === 'county');
    const parsed = place.fallbackName ? core.structured({ map_route: { stops: [{ name: place.fallbackName, parent: place.fallbackParent }] } }, counties) : null;
    const point = parsed?.points[0] || null;
    return { chapter, place, point, exact: false, note: point ? '坐标待核验 / 景区待定位 · ' + point.name + '驻地示意（关联待确认）' : '待定位 · 具体遗址与县区待确认' };
  }
  function currentStatus(index) {
    if (state().skipped?.has(index)) return '本次跳过';
    return state().completed.has(index) ? '已寻迹' : state().current === index ? '当前章' : '待探索';
  }
  function onViewport(view, rect) {
    if (!active || !rect.width || !rect.height) return;
    const scale = Math.min(rect.width / view[2], rect.height / view[3]);
    markers.forEach(marker => marker.glyph.setAttribute('transform', 'scale(' + (1 / scale) + ')'));
  }
  function draw() {
    labels = []; markers = [];
    $('#story-order-lines').replaceChildren(); $('#story-ink-lines').replaceChildren(); $('#story-map-nodes').replaceChildren();
    $('#story-chapter-list').replaceChildren();
    if (!active) return;
    const current = state().current;
    const notice = $('.story-map-memory'); if(notice && window.StoryProgress)notice.textContent=window.StoryProgress.notice();
    $('#story-map-progress').textContent = resolved.length ? '第 ' + (current + 1) + ' / ' + resolved.length + ' 幕 · 已寻迹 ' + state().completed.size + ' / ' + resolved.length : '章节待确认 · 暂无探索进度';
    $('#story-map-badge').textContent = $('#story-map-progress').textContent;
    $('#story-map-status').textContent = resolved.length ? (overrides.has(active.id) ? '已接收故事数据 / 核验状态见章节 · ' : '前端章节模板 / 资料待确认 · ') + resolved.filter(item => item.point).length + ' 个有位置资料的章节（含本次跳过） · ' + resolved.filter(item => !item.point).length + ' 个待定位。到达路线请交给智能体规划。' : '可先向陈寿了解这条故事线，或退出故事模式继续浏览地图。';
    resolved.forEach((item, index) => {
      const status = currentStatus(index);
      const li = node('li', 'chapter-list-item');
      const button = node('button', 'chapter-list-button', (index + 1) + ' · ' + value(item.chapter.name) + ' · ' + status);
      button.disabled = Boolean(state().skipped?.has(index));
      button.type = 'button'; button.setAttribute('aria-current', current === index ? 'step' : 'false');
      button.setAttribute('aria-controls', 'story-node-card'); button.dataset.state = status;
      button.addEventListener('click', () => selectChapter(index));
      li.append(button, node('small', '', item.note), node('small', '', state().skipped?.has(index) ? '本次跳过：由你选择将有限时间留给其他章节。' : state().skipped?.size ? '本次保留：你选取的核心章节，时长待核验。' : '')); $('#story-chapter-list').append(li);
      if (!item.point || state().skipped?.has(index)) return;
      const [x, y] = core.project(item.point.center);
      if (index && resolved[index - 1].point && !state().skipped?.has(index-1)) {
        const [px, py] = core.project(resolved[index - 1].point.center);
        $('#story-order-lines').append(svgNode('path', { d: 'M' + px + ',' + py + 'L' + x + ',' + y, class: 'story-order-segment' }));
        const dx = x - px, dy = y - py;
        $('#story-ink-lines').append(svgNode('path', { d: 'M' + px + ',' + py + 'Q' + ((px+x)/2-dy*.16) + ',' + ((py+y)/2+dx*.16) + ' ' + x + ',' + y, class: 'story-ink-segment' }));
      }
      const group = svgNode('g', { class: 'story-map-node' + (index === current ? ' is-current' : '') + (state().completed.has(index) ? ' is-complete' : index !== current ? ' is-unvisited' : ''), 'data-story-chapter': index, tabindex: '0', role: 'button', 'aria-label': value(item.chapter.name) + '，' + status + '，' + item.note, 'aria-controls': 'story-node-card', 'aria-current': index === current ? 'step' : 'false' });
      const anchor = svgNode('g', { transform: 'translate(' + x + ',' + y + ')' });
      const glyph = svgNode('g', {});
      glyph.append(svgNode('rect', { x:-24,y:-25,width:48,height:50,rx:6,class:'story-node-seal' }));
      const icon = window.SGTStoryUI.icon(item.place.building); icon.setAttribute('x', '-21'); icon.setAttribute('y', '-22'); icon.setAttribute('width', '42'); icon.setAttribute('height', '42'); glyph.append(icon);
      glyph.append(svgNode('rect', {x:-29,y:-34,width:19,height:20,rx:2,class:'chapter-number-seal'}),svgNode('text',{x:-19.5,y:-20,'text-anchor':'middle',class:'chapter-number-text'},index+1));
      if (state().completed.has(index)) {
        const stamp=svgNode('g',{transform:'rotate(-8 0 35)'});
        stamp.append(svgNode('rect',{x:-24,y:26,width:48,height:17,rx:2,class:'chapter-complete-border'}),svgNode('text',{x:0,y:38,'text-anchor':'middle',class:'chapter-complete-stamp'},'已寻迹'));glyph.append(stamp);
      }
      anchor.append(glyph); group.append(anchor);
      const label = svgNode('text', {x,y,class:'story-map-label'},item.place.name); group.append(label);
      group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectChapter(index); } });
      $('#story-map-nodes').append(group); markers.push({glyph,index,group});
      labels.push({id:'story-'+index,x,y,name:item.place.name,size:12,node:label,story:true,markerRadius:34});
    });
    window.TravelMap.refreshLabels();
  }
  function sources(record) {
    const details = node('details', 'chapter-sources'); details.append(node('summary', '', '展开史料来源 · ' + (record.sources?.length || 0) + ' 条'));
    if (!Array.isArray(record.sources) || !record.sources.length) details.append(node('p', '', '来源待确认。当前模板尚无可核验的史料，不能支撑史实结论。'));
    else record.sources.filter(source=>source && typeof source==='object').forEach(source => {
      const row = node('p'); const url = safeUrl(source.source_url);
      const title = value(source.title) + ' · ' + (['A','B','C'].includes(source.source_level) ? source.source_level : '等级待确认');
      if (url) { const link = node('a', '', title); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link); }
      else row.append(node('span', '', title + ' · 链接待确认'));
      if (source.source_level === 'C') row.append(node('small', '', ' C 级仅作线索，不能支撑史实结论。'));
      details.append(row);
    });
    return details;
  }
  function renderCard() {
    if (!active || !resolved.length || !cardOpen) return;
    const index = state().current, item = resolved[index], chapter = item.chapter;
    $('#story-node-card').hidden = false;
    $('#story-building-visual').replaceChildren(window.SGTStoryUI.icon(item.place.building));
    $('#story-node-title').textContent = value(chapter.name);
    $('#story-node-location').textContent = item.place.name + ' · ' + item.note;
    const content = $('#story-node-content');
    const statuses = {pending:'待确认',sample:'示例资料 / 待核验',maintained:'维护资料',live:'实时资料',stale:'过期资料'};
    const verified = ['maintained','live'].includes(chapter.dataStatus) && chapter.updatedAt && /(?:Z|[+-]\d{2}:\d{2})$/.test(chapter.updatedAt) && Number.isFinite(Date.parse(chapter.updatedAt)) && Array.isArray(chapter.sources) && chapter.sources.some(s=>s && ['A','B'].includes(s.source_level)&&safeUrl(s.source_url));
    content.replaceChildren(node('p', 'chapter-trust', '资料状态：' + (statuses[chapter.dataStatus] || '待确认') + (verified ? '' : ' · 史料待核验')),
      node('p', '', '为什么推荐：' + value(chapter.reason)), node('p', '', '在故事中的作用：' + value(chapter.role)),
      node('p', '', '讲解模式：' + (state().mode || '大众体验版')),
      node('p', '', '相关人物：' + list(chapter.people)), node('p', '', '相关事件：' + list(chapter.events)),
      node('p', 'chapter-narrative', typeof chapter.story === 'string' && chapter.story.trim() ? chapter.story : '故事内容待确认。接入可核验史料后，再讲述这一章。'),
      node('p', 'map-note', '更新时间：' + (verified ? chapter.updatedAt : '待确认')), sources(chapter));
    $('#chapter-add').disabled = !item.point;
    $('#chapter-add').textContent = item.exact ? '加入路线' : item.point ? '加入路线（驻地示意）' : '加入路线（待定位）';
    $('#chapter-navigate').disabled = true; $('#chapter-navigate').textContent = '导航到这里（待确认）';
    $('#chapter-complete').textContent = state().completed.has(index) ? '撤销已寻迹' : '标记已寻迹';
    $('#chapter-next').disabled = !resolved.some((_,i)=>i>index&&!state().skipped?.has(i));
    $('#story-node-feedback').textContent = '点击章节后由陈寿接续讲解；资料不足时保留疑问。';
  }
  function askCurrent(compare) {
    if (!active || !resolved.length) return;
    const index = state().current, item = resolved[index];
    const previous = index ? resolved[index-1].chapter : null;
    const question = '【故事章节讲解】讲解模式：' + (state().mode || '大众体验版') + '。大众用清晰易懂的表达，亲子用问题引导，学术侧重史料依据与不确定性；保持当前故事与地点。故事线：' + active.title + '。' +
      (previous ? '上一章（章节顺序，不代表已到访）：' + previous.name + '；已有文本：' + value(previous.story) + '。' : '这是开篇。') +
      '当前第 ' + (index+1) + '/' + resolved.length + ' 幕：' + item.chapter.name + '；地点：' + item.place.name + '；定位情况：' + item.note + '。' +
      '当前章节资料：' + value(item.chapter.story) + '；人物：' + list(item.chapter.people) + '；事件：' + list(item.chapter.events) + '。' +
      (compare ? '请对照正史、演义和地方传说，分别说明依据。' : '请承接上一章的主题介绍本章，只使用可靠资料并说明来源。') +
      '缺资料请明确说待确认，不编造上一章讲解、史实或道路导航，不把驻地当景区入口。';
    window.SGTJourney.ask(question);
    $('#story-node-feedback').textContent = '已交给陈寿；正在回答时，本章问题会存入对话草稿。';
  }
  function revealCard() {
    if (!active || !cardOpen || $('#map-view').hidden) return;
    const card=$('#story-node-card'), map=$('#map-view');
    if (window.innerWidth > 760 && !$('#chat-panel').hidden) {
      map.scrollTop += card.getBoundingClientRect().top-map.getBoundingClientRect().top;
    } else if ($('#chat-panel').hidden) card.scrollIntoView({block:'start',behavior:'instant'});
  }
  function selectChapter(index) {
    if (!active || !Number.isInteger(index) || !resolved[index] || state().skipped?.has(index)) return;
    $('#map-place-picker').hidden = true;
    state().current = index; state().started = true; persist(); cardOpen = true; draw(); renderCard();
    $('#story-node-title').focus({preventScroll:true});
    if(window.CulturalNode){openDetail();window.ChenshouGuide?.enter(window.StoryMap.getContext());return;}
    if (!state().asked.has(index)) { state().asked.add(index); askCurrent(false); }
    revealCard();
  }
  async function open(id) {
    const story = overrides.get(id)?.story || window.SGT_STORIES.find(item=>item.id===id);
    if (!story?.chapters?.length) return false;
    const request = ++epoch;
    if (!await window.TravelMap.ready || request !== epoch) {
      if (request === epoch) { showContentView('map'); $('#map-route-status').textContent='地图资料暂不可用，请刷新后重试。故事模式尚未开启。'; }
      return false;
    }
    active = story; cardOpen = false;
    if (!progress.has(id)) progress.set(id,{current:0,completed:new Set(),asked:new Set()});
    const places = overrides.get(id)?.places || window.SGT_PLACES;
    resolved = (story.chapters || []).map(chapter=>locate(chapter,places));
    if(window.StoryProgress && story.chapters?.length) { state().started=true; persist(); }

    $('#map-view').classList.add('story-mode'); $('#map-view').dataset.storyId = id;
    $('#story-map-badge').hidden = false; $('#story-map-toolbar').hidden = false; $('#story-map-chapters').hidden = false; $('#story-node-card').hidden = true;
    $('#story-map-title').textContent = story.title;
    showContentView('map'); window.CharacterChat?.refresh(); window.TravelMap.beginStory(resolved.map(item=>item.point).filter(Boolean)); draw();
    $('#story-map-title').focus({preventScroll:true}); return true;
  }
  function openDetail(){if(active&&resolved[state().current])window.CulturalNode?.open({...resolved[state().current],story:active,index:state().current,returnTo:'map'});}
  function exit() {
    ++epoch; active = null; resolved = []; cardOpen = false; draw();
    $('#map-view').classList.remove('story-mode'); delete $('#map-view').dataset.storyId;
    $('#story-map-badge').hidden = true; $('#story-map-toolbar').hidden = true; $('#story-map-chapters').hidden = true; $('#story-node-card').hidden = true;
    window.TravelMap.endStory(); $('#map-prefecture').focus({preventScroll:true});
  }
  // 后端适配入口：后续接口客户端在此提供数据，不猜测或擅自启用端点。
  function setData(payload) {
    const nonempty=v=>typeof v==='string'&&v.trim().length>0;
    const story=payload?.story,places=payload?.places;
    const fallback=()=>{
      const id=nonempty(story?.id)?story.id:active?.id;
      if(window.SGT_STORIES.some(s=>s.id===id)) {
        overrides.delete(id);
        if(active?.id===id)return open(id).then(()=>{ $('#map-route-status').textContent='故事资料不完整，已保留静态模板；可向陈寿继续了解。';return false; });
      }
      $('#map-route-status').textContent='故事资料不完整，保留当前内容；可向陈寿继续了解。';
      return Promise.resolve(false);
    };
    if(!story||!nonempty(story.id)||!nonempty(story.title)||!Array.isArray(story.chapters)||!story.chapters.length||!Array.isArray(places))return fallback();
    if(places.some(p=>!p||!nonempty(p.id)||!nonempty(p.name)||!['tower','shrine','pass','wall','road'].includes(p.building))||new Set(places.map(p=>p.id)).size!==places.length)return fallback();
    if(story.chapters.some(c=>!c||!nonempty(c.placeId)||!nonempty(c.name)||!places.some(p=>p.id===c.placeId)))return fallback();
    const arrays=(record,keys)=>keys.every(k=>record[k]==null||Array.isArray(record[k]));
    const meta=record=>record&&typeof record==='object'&&!Array.isArray(record)&&arrays(record,['sources']);
    if(!arrays(story,['people','events','areas','sources'])||places.some(p=>!arrays(p,['sources']))||story.chapters.some(c=>!arrays(c,['people','events','sources','disputes','inferences'])||['history','romance','differences','compilation','relationships'].some(k=>c[k]!=null&&!meta(c[k]))||['disputes','inferences'].some(k=>(c[k]||[]).some(r=>!meta(r)))))return fallback();
    // 对格式错误的数据整体拒绝，不应用仅部分有效的覆盖内容。
    let copy;try{copy=JSON.parse(JSON.stringify(payload));}catch(_){return fallback();}
    overrides.set(story.id,copy);progress.delete(story.id);
    if(active?.id===story.id)return open(story.id);
    return Promise.resolve(true);
  }
  $('#story-exit').addEventListener('click',exit);
  $('#story-fit').addEventListener('click',()=>window.TravelMap.fitStory(resolved.map(item=>item.point).filter(Boolean)));
  $('#story-card-close').addEventListener('click',()=>{cardOpen=false;$('#story-node-card').hidden=true;const marker=markers.find(m=>m.index===state()?.current);if(marker)marker.group.focus();else $('#story-map-title').focus();});
  $('#story-node-card').addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();$('#story-card-close').click();}});
  $('#chapter-detail').addEventListener('click',openDetail);
  $('#chapter-enter').addEventListener('click',()=>{if(active)window.SGTStoryUI.openStory(active.id,active);});
  $('#chapter-ask').addEventListener('click',()=>askCurrent(false));
  $('#chapter-compare').addEventListener('click',()=>askCurrent(true));
  $('#chapter-add').addEventListener('click',()=>{if(!active)return;const item=resolved[state().current];if(!item?.point)return;const added=window.TravelMap.addStoryPlace(item.point);$('#story-node-feedback').textContent=added?'已加入现有路线：'+item.point.name+(item.exact?'。':'驻地示意，不是景区入口。'):'该位置已在当前路线中。';});
  $('#chapter-complete').addEventListener('click',()=>{if(!active||!resolved.length)return;const s=state();if(s.completed.has(s.current))s.completed.delete(s.current);else s.completed.add(s.current);persist();draw();renderCard();$('#story-node-feedback').textContent=s.completed.size===resolved.length?'全章已寻迹！进入故事查看收尾与下一条推荐。':(window.StoryProgress?window.StoryProgress.notice():'已更新本页探索记录，可撤销；不代表实际到访。');});
  $('#chapter-next').addEventListener('click',()=>{if(active)selectChapter(resolved.findIndex((_,i)=>i>state().current&&!state().skipped?.has(i)));});
  if(window.StoryProgress)window.StoryProgress.subscribe(story=>{if(active?.id===story.id&&resolved.length){draw();renderCard();}});
  window.StoryMap = {getContext:()=>active?{story:active,chapter:resolved[state().current]?.chapter,place:resolved[state().current]?.place,index:state().current}:null,describePlace:(place,chapter)=>locate(chapter,[place]),getPlaces:id=>overrides.get(id)?.places || window.SGT_PLACES,open,exit,selectChapter,setData,revealCard,onViewport,getLabels:()=>labels,isActive:()=>Boolean(active)};
})();
