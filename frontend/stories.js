/* Editorial templates only. Missing content is never synthesized into a route. */
(() => {
  'use strict';
  window.SGT_STORIES = [
    { id: 'chenshou', title: '从南充少年到三国史家', phase: '寻源' },
    { id: 'zhangfei', title: '镇守阆中·寻迹张飞', phase: '探秘' },
    { id: 'shudao-xunzong', title: '蜀汉北境·蜀道寻踪', phase: '探秘', chapters: [
      { order: 1, name: '第一幕｜昭化古城', placeId: 'zhaohua' },
      { order: 2, name: '第二幕｜剑门天险', placeId: 'jianmenguan' },
      { order: 3, name: '第三幕｜米仓道', placeId: 'micangdao' }
    ].map(chapter => Object.assign({ people: [], events: [], story: '', dataStatus: 'pending', sources: [], updatedAt: null }, chapter)) },
    { id: 'history-to-place', title: '从史书到现场', phase: '探秘' },
    { id: 'official-history', title: '正史里的三国', phase: '读史' }
  ].map(story => Object.assign({ coreQuestion: '', summary: '', people: [], events: [], durationHours: null, areas: [], chapters: [], dataStatus: 'pending', updatedAt: null, sources: [] }, story));
  // Fallback county names come from the repository's scenic_spots_northeast_sichuan.sample.json addresses.
  // Its unverified lat/lng values are deliberately not copied. Chapters above are user-specified editorial order.
  window.SGT_PLACES = [
    { id: 'wanjuanlou', name: '万卷楼', building: 'tower' },
    { id: 'hanhuanhouci', name: '汉桓侯祠', building: 'shrine' },
    { id: 'jianmenguan', name: '剑门关', building: 'pass', fallbackName: '剑阁县', fallbackParent: '广元市' },
    { id: 'zhaohua', name: '昭化古城', building: 'wall', fallbackName: '昭化区', fallbackParent: '广元市' },
    { id: 'micangdao', name: '米仓道', building: 'road' }
  ].map(place => Object.assign({ coordinates: null, dataStatus: 'pending', sources: [] }, place));
  const progress = window.StoryProgress;
  const phases = ['寻源', '读史', '探秘', '传承'];
  const matchesPhase = (story, phase) => phase === '全部' || phases.includes(story.phase) && story.phase === phase;
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
    [['核心人物', list(story.people)], ['预计时长', Number.isFinite(story.durationHours) && story.durationHours > 0 ? story.durationHours + ' 小时 · 待核验' : '待补充'], ['涉及地区', list(story.areas)], ['章节数量', Array.isArray(story.chapters) && story.chapters.length ? story.chapters.length + ' 章' : '待补充']].forEach(([key, value]) => {
      if (value === '待补充') return;
      const row = node(compact ? 'span' : 'div'); row.append(node(compact ? 'span' : 'dt', 'fact-label', key), node(compact ? 'span' : 'dd', 'fact-value', value)); dl.append(row);
    });
    return dl;
  }
  let selected = window.SGT_STORIES[0];
  function select(story, open) {
    selected = story;
    $('#story-title').textContent = text(story.title);
    $('#preview-selection').textContent = text(story.title) + (story.chapters.length ? ' · 章节顺序已设定，位置待核验' : ' · 空间走向待补充');
    const detail = $('#story-detail-content');
    detail.replaceChildren(node('p', 'story-disclosure', '文化探索主题 · 向陈寿了解故事与出处'), facts(story));
    for (const [heading, value] of [['核心问题', story.coreQuestion], ['故事简介', story.summary]]) {
      if (value) detail.append(node('h3', '', heading), node('p', '', text(value)));
    }
    detail.append(node('p', 'story-empty', '史料、景区落点与出行条件待确认，暂不生成历史讲解或路线。'));
    $('#story-action-status').textContent = '当前为主题模板，尚未形成可执行行程。';
    renderSystem(story, detail);
    if (open) showContentView('story');
    window.CharacterChat?.refresh();
  }
  function action(label, fn) {
    const b=node('button','module-button',label); b.type='button'; b.addEventListener('click',fn); return b;
  }
  function provenance(record) {
    const d=node('details','chapter-sources');
    d.append(node('summary','', '史料依据 · 资料状态：' + text(record.dataStatus) + ' · 待核验'));
    d.append(node('p','', '更新时间：' + (record.updatedAt || '待核验')));
    if (!record.sources?.length) d.append(node('p','', '来源待补充；当前资料中未找到可靠记载。'));
    (record.sources || []).filter(s=>s && typeof s==='object').forEach(s=>{
      const row=node('p','',text(s.title)+' · 来源等级：'+(['A','B','C'].includes(s.source_level)?s.source_level:'待核验'));
      try { const url=new URL(s.source_url); if(['http:','https:'].includes(url.protocol)) { const a=node('a','','查看来源'); a.href=url.href; a.target='_blank'; a.rel='noopener noreferrer'; row.append(a); } } catch (_) {}
      if(s.source_level==='C') row.append(node('small','','C 级仅作线索，不能支撑史实结论。'));
      d.append(row);
    }); return d;
  }
  function renderSystem(story, detail) {
    const s=progress.get(story), chapters=story.chapters || [];
    const places=window.StoryMap?.getPlaces ? window.StoryMap.getPlaces(story.id) : window.SGT_PLACES;
    detail.append(node('p','story-local-notice',progress.notice()),node('p','story-progress-seal',chapters.length?progress.status(story)+' · 已寻迹 '+s.completed.size+' / '+chapters.length:'尚未开始 · 可先向陈寿了解主题'));
    detail.append(node('h3','','讲解模式'));
    const modes=node('div','story-controls');
    ['大众体验版','亲子故事版','学术探索版'].forEach(mode=>{
      const b=action(mode,()=>{s.mode=mode;progress.save(story);}); b.setAttribute('aria-pressed',String(s.mode===mode)); modes.append(b);
    }); detail.append(action('按现实条件规划路线',()=>window.TravelModules.openStory(story)));
    detail.append(modes,node('p','map-note','仅改变同一章节的讲解表达；不会切换故事或地点。由现有陈寿对话服务讲解，资料不足时说明待确认。'));
    if(story.people?.length || story.events?.length)detail.append(node('h3','','相关人物与关键事件'),node('p','',[story.people?.length?'人物：'+list(story.people):'',story.events?.length?'事件：'+list(story.events):''].filter(Boolean).join('；')));
    const constraints=[['交通',story.constraints?.transport],['开放时间',story.constraints?.openTime],['游览时长',story.constraints?.duration],['预算',story.constraints?.budget]].filter(([,v])=>v);
    if(constraints.length)detail.append(node('h3','','现实约束'),node('p','',constraints.map(([k,v])=>k+'：'+v).join('；')+' · 待核验'));
    detail.append(provenance(story));
    const axis=node('ol','story-chapter-axis');
    chapters.forEach((c,i)=>{
      const place=places.find(p=>p.id===c.placeId), li=node('li','');
      const status=s.skipped.has(i)?'本次跳过':s.completed.has(i)?'已完成 · 已寻迹':s.started&&s.current===i?'当前':'待探索';
      li.dataset.state=status; li.append(node('h4','',c.name+' · '+status),node('p','','地点 / 建筑：'+(place?place.name+' / '+({wall:'城楼',pass:'关楼',road:'古道',tower:'楼阁',shrine:'祠庙'}[place.building]||'形制待补充'):'待补充')),
        node('p','story-disclosure','向陈寿了解本章故事与出处'));
      [['为什么推荐',c.reason],['在故事中的作用',c.role],['本章故事',c.story]].filter(([,v])=>v).forEach(([k,v])=>li.append(node('p','',k+'：'+v)));li.append(provenance(c));
      if(s.skipped.size) li.append(node('p','map-note',s.skipped.has(i)?'本次跳过：你选择将有限时间留给其他章节；未从故事中删除。':'本次保留：你选择的核心章节；是否能在半天走完仍待核验。'));
      if(!s.skipped.has(i)) li.append(action('进入这一章',async()=>{if(await window.StoryMap.open(story.id))window.StoryMap.selectChapter(i);}));
      axis.append(li);
    }); if(chapters.length)detail.append(node('h3','','章节轴 · 逐幕寻迹'),axis);
    if(chapters.length) {
      const box=node('fieldset','story-compression');box.append(node('legend','','我只有半天 · 选择本次保留的核心章节'));
      const inputs=chapters.map((c,i)=>{const label=node('label',''),input=node('input');input.type='checkbox';input.checked=!s.skipped.has(i);label.append(input,node('span','',c.name));box.append(label);return input;});
      const feedback=node('p','map-note','核心章节尚待编辑确认，由你选择；交通和游览时长待核验，不保证半天可完成。');feedback.setAttribute('role','status');
      box.append(action('压缩后重绘路线',()=>{if(!progress.choose(story,inputs.map((v,i)=>v.checked?i:-1)))feedback.textContent='请至少保留一章。';else window.TravelModules.openStory(story);}),action('应用本次选取',()=>{if(!progress.choose(story,inputs.map((v,i)=>v.checked?i:-1)))feedback.textContent='请至少保留一章。';}),action('恢复全部章节',()=>{progress.choose(story,chapters.map((_,i)=>i));}),feedback);detail.append(box);
    }
    if(progress.status(story)==='已寻迹') {
      const visitedPlaces=chapters.map(c=>places.find(p=>p.id===c.placeId)?.name || '地点待补充');
      detail.append(node('h3','','一卷读罢，山河有迹'),node('p','','你已手动完成本故事全部章节，回顾了：'+visitedPlaces.join('、')+'。相关人物：'+list(story.people)+'。史料仍需核验，探索记录不代表实际到访。'));
      const next=window.SGT_STORIES.find(item=>item.id!==story.id&&progress.status(item)!=='已寻迹');
      if(next)detail.append(action('接着探索：'+next.title,()=>select(next,true)));
    } else if(s.skipped.size && chapters.every((_,i)=>s.skipped.has(i)||s.completed.has(i))) detail.append(node('p','','本次所选章节已完成；仍有跳过章节，整条故事保持探索中。'));
    $('#story-map-open').disabled=!chapters.length;
    $('#story-map-open').textContent=chapters.length?'开始探索 →':'开始探索（章节待补充）';
  }
  const filters=$('#story-phase-filters');
  ['全部','寻源','读史','探秘','传承'].forEach(phase=>{
    const b=action(phase,()=>{Array.from($('#story-cards').children).forEach(shell=>{const story=window.SGT_STORIES.find(item=>item.id===shell.dataset.storyId);shell.hidden=!story||!matchesPhase(story,phase);});Array.from(filters.children).forEach(button=>button.setAttribute('aria-pressed',String(button===b)));$('#story-filter-status').textContent=Array.from($('#story-cards').children).some(shell=>!shell.hidden)?'':'可先浏览其他阶段，或向陈寿询问这个主题。';});
    b.setAttribute('aria-pressed',String(phase==='全部'));filters.append(b);
  });
  progress.subscribe(()=>{if(selected)select(selected,false);});
  const cards = $('#story-cards');
  window.SGT_STORIES.forEach((story, index) => {
    const card = node('button', 'story-card'); card.type = 'button';
    card.dataset.contentView = 'story'; card.setAttribute('aria-controls', 'story-view'); card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', '查看故事线：' + story.title);
    if(story.coreQuestion)card.append(node('span', 'story-core-question', '核心问题：' + story.coreQuestion));
    card.append(node('span', 'story-number', ['壹', '贰', '叁', '肆', '伍'][index]), node('strong', 'story-card-title', story.title), facts(story, true), node('span', 'story-card-end', '查看文化主题与故事线　↗'));
    if(story.summary)card.append(node('span','story-summary',story.summary));
    card.addEventListener('click', () => select(story, true));
    const shell = node('article', 'story-card-shell'); shell.dataset.storyId = story.id; shell.dataset.phase = story.phase || "";
    shell.dataset.phase = story.phase;
    const badge = node('span', 'story-progress-seal', progress.status(story));
    card.append(badge);
    shell.dataset.progress = progress.status(story);
    progress.subscribe(() => { badge.textContent = progress.status(story); shell.dataset.progress = progress.status(story); });
    const mapButton = node('button', 'story-map-entry', '在故事地图中探索 →'); mapButton.type = 'button';
    mapButton.setAttribute('aria-label', '在故事地图中探索：' + story.title); mapButton.setAttribute('aria-controls', 'map-view');
    mapButton.addEventListener('click', () => window.StoryMap.open(story.id));
    shell.append(card, mapButton); cards.append(shell);
  });
  $('#story-map-open').addEventListener('click', () => window.StoryMap.open(selected.id));
  $('#preview-story-open').addEventListener('click', () => window.StoryMap.open(selected.id));
  $('#story-ask').addEventListener('click', () => {
    window.SGTJourney.ask('请介绍“' + selected.title + '”这条故事线，适合怎么游览？');
    $('#story-action-status').textContent = '已交给向导；如正在回答，问题会保留在对话草稿中。';
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
  window.SGTStoryUI = { matchesPhase, getContext:()=>({story:selected}), icon, openStory(id, suppliedStory) { const story = suppliedStory || window.SGT_STORIES.find(item => item.id === id); if (story) select(story, true); } };
  window.SGT_PLACES.forEach(place => {
    const article = node('article', 'building-card');
    article.append(icon(place.building), node('h3', '', place.name), node('p', '', '故事章节待核验 · 坐标待核验'));
    article.append(action('读懂'+place.name,()=>window.CulturalNode.openPlace(place.id)));
    $('#story-buildings').append(article);
  });
  select(selected, false);
  fetch('sichuan-map-geometry.json').then(response => { if (!response.ok) throw new Error('map'); return response.json(); }).then(data => {
    if (!Array.isArray(data.cities) || !data.cities.length) throw new Error('geometry');
    const svg = $('#story-preview-map');
    data.cities.forEach(city => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', city.d); path.setAttribute('class', 'preview-region'); svg.append(path);
    });
    $('#story-preview-status').textContent = '四川轮廓示意 · 故事章节地点待确认，未绘制路线。';
  }).catch(() => { $('#story-preview-status').textContent = '地理轮廓暂不可用；可切到行旅地图查看。故事路线仍待补充。'; });
})();
