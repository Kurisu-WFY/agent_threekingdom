/* Editorial templates only. Missing content is never synthesized into a route. */
(() => {
  'use strict';
  window.SGT_STORIES = [
    { id: 'chenshou', title: '从南充少年到三国史家' },
    { id: 'zhangfei', title: '镇守阆中·寻迹张飞' },
    { id: 'shudao-xunzong', title: '蜀汉北境·蜀道寻踪', chapters: [
      { order: 1, name: '第一幕｜昭化古城', placeId: 'zhaohua' },
      { order: 2, name: '第二幕｜剑门天险', placeId: 'jianmenguan' },
      { order: 3, name: '第三幕｜米仓道', placeId: 'micangdao' }
    ].map(chapter => Object.assign({ people: [], events: [], story: '', dataStatus: 'pending', sources: [], updatedAt: null }, chapter)) },
    { id: 'history-to-place', title: '从史书到现场' },
    { id: 'official-history', title: '正史里的三国' }
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
    detail.replaceChildren(node('p', 'story-disclosure', '主题模板 · 内容待补充 / 史料待核验'), facts(story));
    for (const [heading, value] of [['核心问题', story.coreQuestion], ['故事简介', story.summary]]) {
      detail.append(node('h3', '', heading), node('p', '', text(value)));
    }
    detail.append(node('h3', '', '章节与地点'), node('p', 'story-empty', story.chapters.length ? '以下为指定章节顺序。史料、景区落点与出行条件待确认，暂不生成历史讲解或路线。' : '章节、地点与推荐理由待补充。当前模板尚未提供可核验的史料，暂不生成历史讲解或路线。'), node('h3', '', '史料与出行依据'), node('p', '', '来源、更新时间待补充；交通、开放时间、时长与预算待核验。'));
    if (story.chapters.length) {
      const chapters = node('ol', 'story-detail-chapters');
      story.chapters.forEach(chapter => chapters.append(node('li', '', chapter.name + ' · 史料待补充 / 位置待核验')));
      detail.append(node('h3', '', '本轮指定的章节顺序'), chapters);
    }
    $('#story-action-status').textContent = '当前为主题模板，尚未形成可执行行程。';
    if (open) showContentView('story');
  }
  const cards = $('#story-cards');
  window.SGT_STORIES.forEach((story, index) => {
    const card = node('button', 'story-card'); card.type = 'button';
    card.dataset.contentView = 'story'; card.setAttribute('aria-controls', 'story-view'); card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', '查看故事线：' + story.title);
    card.append(node('span', 'story-number', ['壹', '贰', '叁', '肆', '伍'][index]), node('strong', 'story-card-title', story.title), facts(story, true), node('span', 'story-summary', '故事简介：' + text(story.summary)), node('span', 'story-card-end', '待补充 / 待核验　↗'));
    card.addEventListener('click', () => select(story, true));
    const shell = node('article', 'story-card-shell');
    const mapButton = node('button', 'story-map-entry', '在故事地图中探索 →'); mapButton.type = 'button';
    mapButton.setAttribute('aria-label', '在故事地图中探索：' + story.title); mapButton.setAttribute('aria-controls', 'map-view');
    mapButton.addEventListener('click', () => window.StoryMap.open(story.id));
    shell.append(card, mapButton); cards.append(shell);
  });
  $('#story-map-open').addEventListener('click', () => window.StoryMap.open(selected.id));
  $('#preview-story-open').addEventListener('click', () => window.StoryMap.open(selected.id));
  $('#story-ask').addEventListener('click', () => {
    window.SGTJourney.ask('我对“' + selected.title + '”这个故事线主题感兴趣。模板的章节、地点和时长尚未确认，请先询问我的兴趣、出发地和可用天数，再基于现有资料讨论；不要假定已有完整故事线，区分史实与推测并说明来源。');
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
    path.setAttribute('d', silhouettes[kind] || silhouettes.book); svg.append(path);
    return svg;
  }
  window.SGTStoryUI = { icon, openStory(id, suppliedStory) { const story = suppliedStory || window.SGT_STORIES.find(item => item.id === id); if (story) select(story, true); } };
  window.SGT_PLACES.forEach(place => {
    const article = node('article', 'building-card');
    article.append(icon(place.building), node('h3', '', place.name), node('p', '', '故事章节待核验 · 坐标待核验'));
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
