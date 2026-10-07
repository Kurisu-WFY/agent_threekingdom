/* 仅提供编辑模板，不将缺失内容编造成路线。 */
(() => {
  'use strict';
  window.SGT_STORIES = [
    { id: 'chenshou-book-history', title: '陈寿编书史', chapters: [] }
  ].map(story => Object.assign({ coreQuestion: '', summary: '', people: [], events: [], durationHours: null, areas: [], chapters: [], dataStatus: 'pending', updatedAt: null, sources: [] }, story));
  // 兜底区县名称取自仓库 scenic_spots_northeast_sichuan.sample.json 中的地址。
  // 不复制未经核验的经纬度；故事章节仅接收后端提供的内容。
  window.SGT_PLACES = [
    { id: 'wanjuanlou', name: '万卷楼', building: 'tower' },
    { id: 'hanhuanhouci', name: '汉桓侯祠', building: 'shrine' },
    { id: 'jianmenguan', name: '剑门关', building: 'pass', fallbackName: '剑阁县', fallbackParent: '广元市' },
    { id: 'zhaohua', name: '昭化古城', building: 'wall', fallbackName: '昭化区', fallbackParent: '广元市' },
    { id: 'micangdao', name: '米仓道', building: 'road' }
  ].map(place => Object.assign({ coordinates: null, dataStatus: 'pending', sources: [] }, place));
  const modeLabel=mode=>({'大众体验版':'大众线','亲子故事版':'亲子线','学术探索版':'学术线'}[mode]||'大众线');
  const progress = window.StoryProgress;
  const $ = selector => document.querySelector(selector);
  const text = value => typeof value === 'string' && value.trim() ? value.trim() : '待补充';
  const list = value => Array.isArray(value) && value.length ? value.map(text).join(' · ') : '待补充';
  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }
  function facts(story, compact) {
    const dl = node(compact ? 'span' : 'dl', 'story-facts');
    [['核心人物', list(story.people)], ['预计时长', Number.isFinite(story.durationHours) && story.durationHours > 0 ? story.durationHours + ' 小时 · 待确认' : '待补充'], ['涉及地区', list(story.areas)], ['章节数量', Array.isArray(story.chapters) && story.chapters.length ? story.chapters.length + ' 章' : '待补充']].forEach(([key, value]) => {
      if (value === '待补充') return;
      const row = node(compact ? 'span' : 'div'); row.append(node(compact ? 'span' : 'dt', 'fact-label', key), node(compact ? 'span' : 'dd', 'fact-value', value)); dl.append(row);
    });
    return dl;
  }
  let readingChapter=0;
  let selected = window.SGT_STORIES[0];
  let previewStory = null;
  function preview(story) {
    previewStory = story;
    const chapters = $('#preview-chapters');
    chapters.replaceChildren();
    $('#preview-selection').textContent = story ? text(story.title) : '点选上方主题，预览章节。';
    (story?.chapters || []).forEach(chapter => chapters.append(node('li', '', chapter.name)));
    $('#preview-map-note').textContent = story ? (story.chapters.length ? '章节顺序已设定；地点与史料待确认。' : '章节与地点待补充 / 待确认；尚不能开始探索，可先向陈寿提问。') : '也可以直接打开四川地图，按市州与县区找地点。';
    $('#preview-story-open').disabled = Boolean(story && !story.chapters.length);
    $('#preview-story-open').textContent = story ? (story.chapters.length ? '进入故事地图' : '故事地图（章节待补充）') : '打开四川地图';
    $('#preview-detail-open').disabled = !story;
    $('#preview-clear').hidden = !story;
    Array.from($('#story-cards').children).forEach(shell => shell.children[0].setAttribute('aria-pressed', String(shell.dataset.storyId === story?.id)));
  }
  function select(story, open) {
    if(selected?.id!==story.id)readingChapter=0;
    selected = story;readingChapter=Math.min(readingChapter,Math.max(0,story.chapters.length-1));
    $('#story-title').textContent = text(story.title);
    const detail = $('#story-detail-content');
    detail.replaceChildren(node('p', 'story-disclosure', '想了解这个主题的故事和出处，可以问陈寿'), facts(story));
    for (const [heading, value] of [['核心问题', story.coreQuestion], ['故事简介', story.summary]]) {
      if (value) detail.append(node('h3', '', heading), node('p', '', text(value)));
    }
    detail.append(node('p', 'story-empty', story.chapters.length?'阅读章节附有资料出处；章节顺序不是历史行走路线，实际交通需另行规划。':'史料、景区落点与出行条件待确认，暂不生成历史讲解或路线。'));
    $('#story-action-status').textContent = story.chapters.length?'章节资料已加载，可以阅读或带入活动计划。':'当前为主题模板，尚未形成可执行行程。';
    renderSystem(story, detail);
    if (open) { preview(story); showContentView('story'); }
    window.CharacterChat?.refresh();
  }
  function action(label, fn) {
    const b=node('button','module-button',label); b.type='button'; b.addEventListener('click',fn); return b;
  }
  function provenance(record) {
    const d=node('details','chapter-sources');
    d.append(node('summary','', '史料依据 · 资料状态：' + ({pending:'待确认',maintained:'维护资料',live:'实时查询',sample:'示例资料',stale:'已过期'}[record.dataStatus] || '待确认')));
    d.append(node('p','', '当前显示：故事主题资料；待确认项：史料出处与具体内容；更新时间：' + (record.updatedAt || '未提供')));
    if (!record.sources?.length) d.append(node('p','', '来源待补充；当前资料中未找到可靠记载。'));
    const groups=new Map();
    const sourceKey=s=>JSON.stringify([s.document_id||'',s.title||'',s.source_url||'',s.pdf_page??s.page??'',s.anchor||'']);
    (record.sources||[]).filter(s=>s&&typeof s==='object').forEach(source=>{const key=sourceKey(source);if(!groups.has(key))groups.set(key,{source,levels:new Set(),chapters:new Set()});groups.get(key).levels.add(source.source_level||'待确认');});
    if(record===selected)(selected.chapters||[]).forEach((c,i)=>(c.sources||[]).forEach(source=>{const g=groups.get(sourceKey(source));if(g){g.chapters.add((i+1)+' · '+c.name);g.levels.add(source.source_level||'待确认');}}));
    for(const {source:s,levels,chapters} of groups.values()){
      const row=node('p','',text(s.title)+' · 来源等级：'+(levels.size>1?'等级冲突：':'')+[...levels].join(' / ')+(s.pdf_page?' · PDF第'+s.pdf_page+'页':s.page?' · 已提供页码：'+s.page:'')+(s.anchor?' · 已提供锚点：'+s.anchor:''));
      try { const url=new URL(s.source_url); if(['http:','https:'].includes(url.protocol)) { const a=node('a','','查看来源'); a.href=url.href; a.target='_blank'; a.rel='noopener noreferrer'; row.append(a);if(!s.pdf_page&&!s.page&&(url.search||url.hash))row.append(node('span','',' · 链接定位：'+url.search+url.hash)); } } catch (_) {}
      if(chapters.size)row.append(node('span','',' · 关联章节：'+[...chapters].join('；')));
      if(levels.has('C'))row.append(node('small','','C 级仅作线索，不能支撑史实结论。'));
      d.append(row);
    } return d;
  }
  function renderSystem(story, detail) {
    const s=progress.get(story), chapters=story.chapters || [];
    const places=window.StoryMap?.getPlaces ? window.StoryMap.getPlaces(story.id) : window.SGT_PLACES;
    detail.append(node('p','story-local-notice',progress.notice()),node('p','story-progress-seal',chapters.length?progress.status(story)+' · 已寻迹 '+s.completed.size+' / '+chapters.length:'尚未开始 · 可先向陈寿了解主题'));
    detail.append(node('h3','','故事线'));
    const modes=node('div','story-controls');
    ['大众体验版','亲子故事版','学术探索版'].forEach(mode=>{
      const b=action(modeLabel(mode),()=>{s.mode=mode;progress.save(story);}); b.setAttribute('aria-pressed',String(s.mode===mode)); modes.append(b);
    }); detail.append(action('带入活动计划',()=>window.TravelModules.openStory(story)));
    detail.append(modes,node('p','map-note','选择接下来向陈寿提问时的讲解方式；当前资料正文保持原文。讲解来自现有的陈寿对话服务，资料不足时会说明待确认。'));
    if(story.people?.length || story.events?.length)detail.append(node('h3','','相关人物与关键事件'),node('p','',[story.people?.length?'人物：'+list(story.people):'',story.events?.length?'事件：'+list(story.events):''].filter(Boolean).join('；')));
    const constraints=[['交通',story.constraints?.transport],['开放时间',story.constraints?.openTime],['游览时长',story.constraints?.duration],['预算',story.constraints?.budget]].filter(([,v])=>v);
    if(constraints.length)detail.append(node('h3','','出行条件'),node('p','',constraints.map(([k,v])=>k+'：'+v).join('；')+' · 待确认'));
    if(chapters.length){
      const c=chapters[readingChapter],place=places.find(p=>p.id===c.placeId),section=node('section','story-current-chapter');
      const heading=node('h3','','第 '+(readingChapter+1)+' 章 · '+c.name);heading.id='story-reading-title';heading.setAttribute('tabindex','-1');
      section.append(heading,node('p','map-note',(s.started?'当前阅读章节':'预览章节 · 尚未开始')+'；'+(s.completed.has(readingChapter)?'手动已寻迹，不代表实际到访':s.skipped.has(readingChapter)?'本次跳过':'本次保留')));
      if(c.reason)section.append(node('p','','为什么推荐：'+c.reason));if(c.role)section.append(node('p','','在故事中的作用：'+c.role));
      section.append(node('p','chapter-fulltext',c.story||'本章正文待补充。'),provenance(c));
      const chapterActions=node('div','chapter-actions'),ask=action('用'+modeLabel(s.mode)+'方式讲这一章',askReading);ask.id='chapter-explain-current';chapterActions.append(ask);
      if(place)chapterActions.append(action('阅读本章地点资料',()=>window.CulturalNode?.open({...window.StoryMap.describePlace(place,c),story,chapter:c,index:readingChapter,returnTo:'story'})));
      section.append(chapterActions);
      detail.append(section);
    }
    const totalSources=provenance(story);totalSources.setAttribute('aria-label','故事总来源');detail.append(totalSources);
    renderChapterMap(story,places);
    const axis=node('ol','story-chapter-axis');
    chapters.forEach((c,i)=>{
      const place=places.find(p=>p.id===c.placeId), li=node('li','');
      const status=s.skipped.has(i)?'本次跳过':s.completed.has(i)?'已完成 · 已寻迹':s.started&&s.current===i?'当前':'待探索';
      li.dataset.state=status; li.append(node('h4','',c.name+' · '+status),node('p','','地点 / 建筑：'+(place?place.name+' / '+({wall:'城楼',pass:'关楼',road:'古道',tower:'楼阁',shrine:'祠庙'}[place.building]||'形制待补充'):'待补充')),
        node('p','story-disclosure','向陈寿了解本章故事与出处'));
      const chapterActions=node('div','chapter-actions');chapterActions.append(action('阅读这一章',()=>selectReading(i)));li.setAttribute('aria-current',i===readingChapter?'step':'false');
      if(s.skipped.size) li.append(node('p','map-note',s.skipped.has(i)?'本次跳过：你选择将有限时间留给其他章节；未从故事中删除。':'本次保留：你选择的核心章节；是否能在半天走完请在出发前确认。'));
      if(place)chapterActions.append(action('阅读地点资料',()=>window.CulturalNode?.open({...window.StoryMap.describePlace(place,c),story,chapter:c,index:i,returnTo:'story'})));
      if(!s.skipped.has(i)) chapterActions.append(action('进入这一章',async()=>{if(await window.StoryMap.open(story.id))window.StoryMap.selectChapter(i);}));
      li.append(chapterActions);
      axis.append(li);
    });
    const sidebar = $('#story-detail-sidebar');
    sidebar.replaceChildren(node('h3', '', '章节顺序'));
    if (chapters.length) sidebar.append(axis);
    else sidebar.append(node('p', 'story-empty', '章节与地点待补充，可先与陈寿讨论主题。'));
    if(chapters.length) {
      const box=node('fieldset','story-compression');box.append(node('legend','','我只有半天 · 选择本次保留的核心章节'));
      const inputs=chapters.map((c,i)=>{const label=node('label',''),input=node('input');input.type='checkbox';input.checked=!s.skipped.has(i);label.append(input,node('span','',c.name));box.append(label);return input;});
      const feedback=node('p','map-note','核心章节尚待编辑确认，由你选择；规划时将查询交通并计算游览时间，不保证半天可完成。');feedback.setAttribute('role','status');
      box.append(action('按选中章节带入活动计划',()=>{const indices=inputs.map((v,i)=>v.checked?i:-1).filter(i=>i>=0);if(!indices.length)feedback.textContent='请至少保留一章。';else window.TravelModules.openStory(story,0.5,{chapterIndices:indices});}),action('应用本次选取',()=>{if(!progress.choose(story,inputs.map((v,i)=>v.checked?i:-1)))feedback.textContent='请至少保留一章。';}),action('恢复全部章节',()=>{progress.choose(story,chapters.map((_,i)=>i));}),feedback);detail.append(box);
    }
    if(progress.status(story)==='已寻迹') {
      const visitedPlaces=chapters.map(c=>places.find(p=>p.id===c.placeId)?.name || '地点待补充');
      detail.append(node('h3','','这条故事已读完'),node('p','','你已手动完成本故事全部章节，回顾了：'+visitedPlaces.join('、')+'。相关人物：'+list(story.people)+'。史料请在出发前确认，探索记录不代表实际到访。'));
    } else if(s.skipped.size && chapters.every((_,i)=>s.skipped.has(i)||s.completed.has(i))) detail.append(node('p','','本次所选章节已完成；仍有跳过章节，整条故事保持探索中。'));
    $('#story-map-open').disabled=!chapters.length;
    $('#story-map-open').textContent=chapters.length?'开始探索 →':'开始探索（章节待补充）';
  }
  function selectReading(index){
    if(!Number.isInteger(index)||!selected.chapters[index])return false;
    readingChapter=index;select(selected,false);window.SGTNavigation?.write();
    if(!$('#story-view').hidden){const heading=$('#story-reading-title');heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});}
    return true;
  }
  function askReading(){
    const c=selected.chapters[readingChapter];if(!c)return;
    const mode=progress.get(selected).mode;
    window.SGTJourney.ask('【故事章节讲解】故事：'+selected.title+'；当前章节：'+c.name+'；讲解模式：'+mode+'；资料原文：'+(c.story||'待补充')+'。按所选偏好讲解同一章，区分史料、文学与研究观点；C 级来源不能支撑史实结论；未确认引文明确标注，不编造史实。',{displayText:'请陈寿用'+modeLabel(mode)+'方式讲'+c.name,preserveMap:true});
    $('#story-action-status').textContent='已请求本章讲解，原始资料正文保持原文；回答未收到前不视为已改写。';
  }
  function renderChapterMap(story,places){
    const target=$('#story-map-relations');if(!target)return;target.replaceChildren(node('p','map-note','章节顺序不是历史行走路线；编号对应阅读章节，实际道路需另行规划。'));
    const ol=node('ol','chapter-map-relations');
    (story.chapters||[]).forEach((c,i)=>{const p=places.find(p=>p.id===c.placeId),located=p&&window.StoryMap?.describePlace?.(p,c),li=node('li',i===readingChapter?'is-current':'');
      li.append(action((i+1)+' · '+c.name+' / '+(p?.name||'地点待确认'),()=>selectReading(i)),node('p','map-note',located?.point?(located.exact?'有来源的景区坐标；入口与导航待确认':'县级驻地示意，不是景区入口；'+located.note):'坐标待确认，不绘制精确地点。'));ol.append(li);
    });target.append(ol);drawPreviewPoints(story,places);
  }
  function drawPreviewPoints(story,places){
    const layer=$('#story-preview-points');if(!layer||!window.MapRouteCore?.project)return;layer.replaceChildren();
    const groups=new Map();
    (story.chapters||[]).forEach((c,i)=>{const p=places.find(p=>p.id===c.placeId),located=p&&window.StoryMap?.describePlace?.(p,c);if(!located?.point)return;const key=located.point.center.join(',');if(!groups.has(key))groups.set(key,{located,chapters:[]});groups.get(key).chapters.push({i,p});});
    for(const {located,chapters} of groups.values()){
      const current=chapters.some(c=>c.i===readingChapter),[x,y]=window.MapRouteCore.project(located.point.center),g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','preview-chapter-point'+(current?' is-current':''));
      const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',current?'9':'7');
      const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',x+12);label.setAttribute('y',y);label.textContent=chapters.map(c=>c.i+1).join('/')+' · '+[...new Set(chapters.map(c=>c.p.name))].join('、')+(located.exact?'':'（驻地示意）');g.append(circle,label);layer.append(g);
    }
  }
  progress.subscribe(story=>{if(selected)select(selected,false);window.TravelModules?.storyChanged?.(story);});
  const cards = $('#story-cards');
  window.SGT_STORIES.forEach((story, index) => {
    const card = node('button', 'story-card'); card.type = 'button';
    card.setAttribute('aria-controls', 'culture-preview'); card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', '预览故事：' + story.title);
    if(story.coreQuestion)card.append(node('span', 'story-core-question', '核心问题：' + story.coreQuestion));
    card.append(node('span', 'story-number', ['壹', '贰', '叁', '肆', '伍'][index]), node('strong', 'story-card-title', story.title), facts(story, true), node('span', 'story-card-end', story.chapters.length ? '预览章节与地点' : '章节与地点待补充'));
    card.append(node('span','story-summary',story.summary || '陈寿编书史：章节待补充，史料与地点待确认。'));
    card.addEventListener('click', () => { select(story, false); preview(story); });
    const shell = node('article', 'story-card-shell'); shell.dataset.storyId = story.id;
    const badge = node('span', 'story-progress-seal', progress.status(story));
    card.append(badge);
    shell.dataset.progress = progress.status(story);
    progress.subscribe(() => { badge.textContent = progress.status(story); shell.dataset.progress = progress.status(story); });
    shell.append(card);
    cards.append(shell);
  });
  $('#story-map-open').addEventListener('click', () => {if(selected.chapters.length)window.StoryMap.open(selected.id);});
  $('#preview-story-open').addEventListener('click', () => {
    if (previewStory?.chapters.length) window.StoryMap.open(previewStory.id);
    else if (!previewStory) { window.StoryMap.exit(); showContentView('map'); }
  });
  $('#preview-detail-open').addEventListener('click', () => { if (previewStory) select(previewStory, true); });
  $('#preview-clear').addEventListener('click', () => preview(null));
  // 一个轮廓组件在目录与详情之间移动，不复制 SVG 或改变几何计算。
  const sharedMap = $('#culture-shared-map');
  if (window.MutationObserver) {
    const moveMap = () => {
      const destination = $('#story-view').hidden ? $('#culture-map-home') : $('#story-detail-map');
      if (sharedMap.parentElement !== destination) destination.append(sharedMap);
    };
    new window.MutationObserver(moveMap).observe($('#story-view'), { attributes: true, attributeFilter: ['hidden'] });
    moveMap();
  }
  $('#story-ask').addEventListener('click', () => {
    window.SGTJourney.ask('请介绍“' + selected.title + '”这条故事，适合怎么游览？');
    $('#story-action-status').textContent = '已发给向导。如果正在回答，问题会留在对话草稿里。';
  });
  const silhouettes = {
    road: 'M52 150Q120 124 65 104Q30 86 98 68Q130 56 84 26M75 153Q147 126 88 104Q56 91 120 74Q154 53 108 24M12 141L27 107L41 139M117 137L133 97L150 137',
    book: 'M22 37L80 50L138 37V136L80 151L22 136ZM80 50V151M34 59L66 67M34 79L66 87M94 67L126 59M94 87L126 79',
    person: 'M28 22H132V147H28ZM58 69A22 22 0 1 0 102 69A22 22 0 1 0 58 69M45 125Q48 95 80 98Q112 95 115 125',
    tower: 'M20 142H140M42 142V88H118V142M30 88H130L116 74H44ZM50 74V48H110V74M38 48H122L104 30H56ZM62 142V108H78V142M93 109V125',
    shrine: 'M15 142H145M30 142V83H130V142M15 83Q40 80 50 61H110Q120 80 145 83ZM55 142V99H105V142M42 98V127M118 98V127M10 149H150',
    pass: 'M8 145L24 48L46 92L55 145M105 145L117 72L136 34L153 145M46 145V99H114V145M39 99L57 81H103L121 99ZM69 145V121Q80 108 91 121V145',
    wall: 'M12 143V99H30V89H45V99H60V89H75V99H90V89H105V99H120V89H137V99H148V143ZM65 143V123Q80 108 95 123V143M53 89V62H107V89M43 62L61 46H99L117 62Z'
  };
  function icon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 165'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', silhouettes[kind] || silhouettes.book); path.setAttribute('class','building-face');
    svg.setAttribute('class','building-miniature');svg.setAttribute('data-building',kind);
    const base=document.createElementNS('http://www.w3.org/2000/svg','ellipse');base.setAttribute('cx','80');base.setAttribute('cy','151');base.setAttribute('rx','66');base.setAttribute('ry','10');base.setAttribute('class','building-ground');
    const depth=document.createElementNS('http://www.w3.org/2000/svg','path');depth.setAttribute('d',silhouettes[kind] || silhouettes.book);depth.setAttribute('transform','translate(5 5)');depth.setAttribute('class','building-depth');
    svg.append(base,depth,path);
    return svg;
  }
  window.SGTStoryUI = {modeLabel, selectReading, getContext:()=>({story:selected,index:readingChapter,chapter:selected.chapters[readingChapter],place:(window.StoryMap?.getPlaces?.(selected.id)||window.SGT_PLACES).find(p=>p.id===selected.chapters[readingChapter]?.placeId)}), icon, installContent(payload) {
    const story=payload?.story;
    if(story?.id!=='chenshou-book-history'||!Array.isArray(story.chapters)||!story.chapters.length||!Array.isArray(payload.places))return false;
    if(story.chapters.some(c=>!c.name||!payload.places.some(p=>p.id===c.placeId)))return false;
    Object.assign(window.SGT_STORIES[0],story);
    payload.places.forEach(place=>{const target=window.SGT_PLACES.find(p=>p.id===place.id);if(target)Object.assign(target,place);});
    window.SGT_PLACES.forEach((place,index)=>{const summary=$('#story-buildings').children[index]?.querySelector('p');if(summary&&place.overview?.data_status==='maintained')summary.textContent='已有论文文化介绍 · 详细史实与景区入口另行核验';});
    const card=$('#story-cards').children[0]?.children[0];
    if(card){
      const end=card.querySelector('.story-card-end');end.textContent='预览章节与地点';
      card.querySelector('.story-facts').replaceChildren(...facts(story,true).children);
      const summary=card.querySelector('.story-summary')||node('span','story-summary');
      summary.textContent=story.summary||'';card.insertBefore(summary,end);
    }
    select(selected,false);if(previewStory)preview(selected);window.SGTNavigation?.contentReady(true);return true;
  }, openStory(id, suppliedStory) {
    // 保存的行程快照不能复活已移除的故事；显式地图适配数据沿用现有入口。
    const catalog = window.SGT_STORIES.find(item => item.id === id);
    const adapted = window.StoryMap?.getContext?.()?.story;
    const story = adapted?.id === id && suppliedStory?.id === id ? adapted :
      catalog && suppliedStory?.id === id ? suppliedStory : catalog;
    if (!story) return false;
    select(story, true);window.SGTNavigation?.write(); return true;
  } };
  window.SGT_PLACES.forEach(place => {
    const article = node('article', 'building-card');
    article.append(icon(place.building), node('h3', '', place.name), node('p', '', '故事章节待确认 · 请在高德地图确认具体地点'));
    article.append(action('了解'+place.name,()=>window.CulturalNode.openPlace(place.id,{returnTo:'welcome'})));
    $('#story-buildings').append(article);
  });
  select(selected, false);
  preview(null);
  fetch('sichuan-map-geometry.json').then(response => { if (!response.ok) throw new Error('map'); return response.json(); }).then(data => {
    if (!Array.isArray(data.cities) || !data.cities.length) throw new Error('geometry');
    const svg = $('#story-preview-map');
    data.cities.forEach(city => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', city.d); path.setAttribute('class', 'preview-region'); svg.append(path);
    });
    svg.append($('#story-preview-points'));
    drawPreviewPoints(selected,window.StoryMap?.getPlaces?.(selected.id)||window.SGT_PLACES);
    $('#story-preview-status').textContent = '四川轮廓示意 · 编号对应阅读章节；县级驻地示意不是景区入口；仅绘有来源的精确景区点，未绘制道路路线。';
  }).catch(() => { $('#story-preview-status').textContent = '地理轮廓暂不可用；可切到行旅地图查看。故事路线仍待补充。'; });
})();
