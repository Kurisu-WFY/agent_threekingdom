(() => {
  const $ = selector => document.querySelector(selector);
  const core = window.MapRouteCore;
  const svg = $('#route-map');
  const ns = 'http://www.w3.org/2000/svg';
  let places = [], counties = [], activeChat = null, selected = null;
  let view = [0, 0, 900, 680];
  let loaded = false;
  function element(tag, attributes = {}, text) {
    const result = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => result.setAttribute(key, value));
    if (text != null) result.textContent = text;
    return result;
  }
  function button(text, handler) {
    const result = document.createElement('button');
    result.type = 'button'; result.className = 'module-button'; result.textContent = text; result.onclick = handler;
    return result;
  }
  function setView(next) {
    const width = Math.max(90, Math.min(900, next[2]));
    const height = width * 680 / 900;
    view = [Math.max(0, Math.min(900 - width, next[0])), Math.max(0, Math.min(680 - height, next[1])), width, height];
    svg.setAttribute('viewBox', view.join(' '));
    const percent = Math.round(900 / width * 100);
    $('#map-zoom-range').value = String(percent);
    $('#map-zoom-range').setAttribute('aria-valuetext', percent + '%');
    $('#map-zoom-value').textContent = percent + '%';
    $('#map-zoom-out').disabled = width >= 900;
    $('#map-zoom-in').disabled = width <= 90;
  }
  function fit(points) {
    const projected = points.filter(Boolean).map(p => core.project(p.center));
    if (!projected.length) return setView([0, 0, 900, 680]);
    const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = Math.max(220, maxX - minX + 100, (maxY - minY + 100) * 900 / 680);
    setView([(minX + maxX - width) / 2, (minY + maxY - width * 680 / 900) / 2, width]);
  }
  function drawCounties() {
    const group = $('#county-points'); group.replaceChildren();
    const parent = $('#map-prefecture').value;
    for (const place of counties.filter(p => !parent || p.parent === parent)) {
      const [x, y] = core.project(place.center);
      const point = element('g', { class: 'county-point', tabindex: '0', role: 'button', 'aria-label': `${place.name}，${place.parent}` });
      point.append(element('circle', { cx: x, cy: y, r: 5, fill: 'transparent', stroke: 'none' }));
      point.append(element('circle', { cx: x, cy: y, r: selected === place ? 3.5 : 2, class: selected === place ? 'county-selected' : 'county-dot' }));
      point.append(element('title', {}, `${place.name} · ${place.parent}`));
      if (parent || selected === place) point.append(element('text', { x: x + 5, y: y - 5, class: 'county-label' }, place.name));
      const select = () => { selected = place; $('#map-county').value = place.id; $('#map-add-stop').disabled = false; drawCounties(); };
      point.onclick = select;
      point.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
      group.append(point);
    }
  }
  function populateCounties() {
    const select = $('#map-county'); select.replaceChildren(new Option('选择地点', ''));
    const filtered = counties.filter(p => !$('#map-prefecture').value || p.parent === $('#map-prefecture').value);
    filtered.forEach(p => select.append(new Option(`${p.name} · ${p.parent}`, p.id)));
    selected = null; $('#map-add-stop').disabled = true; drawCounties();
    if ($('#map-prefecture').value) fit(filtered);
    else setView([0, 0, 900, 680]);
  }
  function drawRoute() {
    if (!loaded) return;
    const route = activeChat?.mapRoute;
    const points = route?.points || [];
    $('#route-lines').replaceChildren(); $('#route-points').replaceChildren(); $('#map-route-list').replaceChildren();
    points.forEach((place, index) => {
      if (place) {
        const [x, y] = core.project(place.center);
        if (index > 0 && points[index - 1]) {
          const [px, py] = core.project(points[index - 1].center);
          $('#route-lines').append(element('path', { d: `M${px},${py}L${x},${y}`, class: 'route-segment' }));
        }
        const group = element('g');
        group.append(element('circle', { cx: x, cy: y, r: 7, class: 'route-marker' }), element('text', { x, y: y + 3, class: 'route-number', 'text-anchor': 'middle' }, index + 1));
        group.append(element('title', {}, `${index + 1}. ${place.name}`));
        if (place.level !== 'city') group.append(element('text', { x, y: y + 17, 'text-anchor': 'middle', class: 'route-place-label' }, place.name));
        $('#route-points').append(group);
      }
      const item = document.createElement('li');
      const label = document.createElement('span'); label.textContent = place ? `${place.name}${place.parent ? ' · ' + place.parent : ''}` : '待定位站点（此处不连接）';
      const remove = button('移除', () => { points.splice(index, 1); route.kind = '手动调整的地点顺序'; route.missing = []; drawRoute(); });
      const up = button('上移', () => { [points[index - 1], points[index]] = [points[index], points[index - 1]]; route.kind = '手动调整的地点顺序'; drawRoute(); });
      up.disabled = index === 0;
      item.append(label, up, remove); $('#map-route-list').append(item);
    });
    const missing = route?.missing?.length ? ` 未能定位：${route.missing.join('、')}。请从县级列表补充，景区入口坐标待接入。` : '';
    $('#map-route-status').textContent = points.length
      ? `${route.kind} · ${points.filter(Boolean).length} 个已定位地点。${points.filter(Boolean).length < 2 ? '至少两个地点才显示连线。' : '虚线仅作地点顺序示意，可在下方调整。'}${missing}`
      : (route ? `没有识别到可唯一定位的目的地。${missing}` : '已加载183个县级地点。发送旅游需求后自动标点；也可选择县城加入路线。');
  }
  const ready = Promise.all([
    fetch('sichuan-counties.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch('sichuan-cities.json').then(r => { if (!r.ok) throw new Error(); return r.json(); })
  ]).then(([countyData, cityData]) => {
    counties = countyData.map(p => ({ ...p, id: 'county-' + p.adcode, level: 'county' }));
    places = [...cityData.map(p => ({ ...p, id: 'city-' + p.name, level: 'city' })), ...counties];
    cityData.forEach(p => $('#map-prefecture').append(new Option(p.name, p.name)));
    loaded = true; populateCounties(); drawRoute();
    return true;
  }).catch(() => { $('#map-route-status').textContent = '县城点位加载失败，请刷新页面重试。'; return false; });

  window.TravelMap = {
    syncChat(chat) {
      if (activeChat === chat) return;
      activeChat = chat; drawRoute();
      if (loaded) fit(chat.mapRoute?.points || []);
    },
    fromMessage(chat, text) {
      if (!/(旅游|旅行|路线|行程|出发|去|到|游玩|途经|经过|逛)/.test(text)) return;
      chat.mapQuestion = text;
      ready.then(ok => {
        if (!ok || chat.mapQuestion !== text) return;
        const parsed = core.mentions(text, places);
        chat.mapRoute = { points: parsed.points, missing: parsed.ambiguous, kind: '按你的地名提及顺序' };
        if (activeChat === chat) {
          drawRoute(); fit(parsed.points); showContentView('map');
          const panel = $('#map-view');
          panel.scrollTop += $('.interactive-map').getBoundingClientRect().top - panel.getBoundingClientRect().top;
        }
      });
    },
    fromResponse(chat, question, data) {
      ready.then(ok => {
        if (!ok || chat.mapQuestion !== question) return;
        const parsed = core.structured(data, places);
        if (!parsed) return;
        chat.mapRoute = { ...parsed, kind: '后端返回的站点顺序' };
        if (activeChat === chat) { drawRoute(); fit(parsed.points); }
      });
    }
  };
  window.TravelMap.syncChat(chats[active]);
  $('#map-prefecture').onchange = populateCounties;
  $('#map-county').onchange = () => {
    selected = counties.find(p => p.id === $('#map-county').value) || null;
    $('#map-add-stop').disabled = !selected;
    drawCounties(); if (selected) fit([selected]);
  };
  $('#map-add-stop').onclick = () => {
    if (!selected || !activeChat) return;
    const route = activeChat.mapRoute || { points: [], missing: [] };
    route.points.push(selected); route.kind = '手动选择的地点顺序'; activeChat.mapRoute = route;
    drawRoute(); fit(route.points);
  };
  function zoomTo(percent) {
    const width = 900 / Math.max(1, Math.min(10, percent / 100));
    setView([view[0] + (view[2] - width) / 2, view[1] + (view[3] - width * 680 / 900) / 2, width]);
  }
  $('#map-zoom-range').addEventListener('input', event => zoomTo(Number(event.target.value)));
  $('#map-zoom-in').onclick = () => zoomTo(900 / view[2] * 125);
  $('#map-zoom-out').onclick = () => zoomTo(900 / view[2] * 80);
  $('#map-reset').onclick = () => setView([0, 0, 900, 680]);
  $('#map-fit').onclick = () => fit(activeChat?.mapRoute?.points || []);
  $('#map-clear').onclick = () => { if (activeChat) { delete activeChat.mapRoute; delete activeChat.mapQuestion; } drawRoute(); setView([0, 0, 900, 680]); };
  let drag = null;
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.county-point')) return;
    drag = { x: event.clientX, y: event.clientY, view: [...view] }; svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(rect.width / drag.view[2], rect.height / drag.view[3]);
    setView([drag.view[0] - (event.clientX - drag.x) / ratio, drag.view[1] - (event.clientY - drag.y) / ratio, drag.view[2]]);
  });
  svg.addEventListener('pointerup', () => { drag = null; });
  svg.addEventListener('pointercancel', () => { drag = null; });
})();
