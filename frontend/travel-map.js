(() => {
  const $ = selector => document.querySelector(selector);
  const core = window.MapRouteCore;
  const svg = $('#route-map');
  const ns = 'http://www.w3.org/2000/svg';
  let places = [], counties = [], activeChat = null, selected = null;
  let view = [0, 0, 900, 680];
  let loaded = false, geometry = null, cityPlaces = [], labels = [], boundaryNodes = [];
  let targetView = [...view], frame = 0, animateView = false;
  const schedule = window.requestAnimationFrame?.bind(window) || (fn => setTimeout(() => fn(Date.now()), 16));
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let lastFrame = 0;
  function updateLabels(rect = svg.getBoundingClientRect()) {
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / view[2], rect.height / view[3]);
    svg.style.setProperty?.('--map-unit', String(1 / scale));
    const extent=core.visibleBounds(view,rect.width,rect.height);
    const detailed = 900 / view[2] >= 2.5;
    for(const boundary of boundaryNodes){
      const b=boundary.bounds;
      const visible=(!boundary.county||detailed)&&b[0]<=extent[2]&&b[2]>=extent[0]&&b[1]<=extent[3]&&b[3]>=extent[1];
      if(visible!==boundary.visible){boundary.node.setAttribute('display',visible?'inline':'none');boundary.visible=visible;}
    }
    $('#county-boundaries').setAttribute('visibility', detailed ? 'visible' : 'hidden');
    $('#county-boundaries').setAttribute('display',detailed?'inline':'none');
    $('#county-points').setAttribute('visibility', detailed ? 'visible' : 'hidden');
    $('#county-points').setAttribute('display',detailed?'inline':'none');
    labels.filter(l=>l.point).forEach(l=>{const visible=l.x>=extent[0]-20/scale&&l.x<=extent[2]+20/scale&&l.y>=extent[1]-20/scale&&l.y<=extent[3]+20/scale;if(l.pointVisible!==visible){l.point.setAttribute('display',visible?'inline':'none');l.pointVisible=visible;}});
    const candidates = labels.filter(l => l.city || detailed).sort((a,b) => (b.selected?100: b.capital?90:b.city?50:0)-(a.selected?100:a.capital?90:a.city?50:0));
    const positions = new Map(core.labelLayout(candidates, view, rect.width, rect.height).map(l => [l.id,l]));
    labels.forEach(l => {
      const pos = positions.get(l.id);
      if(Boolean(pos)!==l.visible){l.node.setAttribute('visibility',pos?'visible':'hidden');l.visible=Boolean(pos);}
      if(pos){l.node.setAttribute('dx',pos.dx/scale);l.node.setAttribute('dy',pos.dy/scale);}
    });
  }
  function paint(time) {
    frame = 0;
    const dt = Math.min(32, lastFrame ? time-lastFrame : 16); lastFrame = time;
    const blend = animateView && !reducedMotion() ? 1-Math.exp(-dt/48) : 1;
    view = view.map((v,i) => v+(targetView[i]-v)*blend);
    if(Math.max(...view.map((v,i)=>Math.abs(v-targetView[i])))<.03) view=[...targetView];
    const rect=svg.getBoundingClientRect();
    svg.setAttribute('viewBox',view.join(' '));
    const percent = Math.round(900/view[2]*100);
    $('#map-zoom-range').value=String(percent);
    $('#map-zoom-range').setAttribute('aria-valuetext',percent+'%');
    $('#map-zoom-value').textContent=percent+'%';
    $('#map-zoom-out').disabled=targetView[2]>=900;
    $('#map-zoom-in').disabled=targetView[2]<=90;
    updateLabels(rect);
    if(view.some((v,i)=>v!==targetView[i])) frame=schedule(paint); else lastFrame=0;
  }
  function drawBoundaries() {
    if(!geometry) return;
    const parent=$('#map-prefecture').value;
    boundaryNodes=[];
    function path(c,county){const node=element('path',{d:c.d,class:county?'county-boundary':'city-boundary'+(c.name===parent?' boundary-selected':''),'fill-rule':'evenodd',...(county?{'data-county-code':c.adcode}: {})});boundaryNodes.push({node,bounds:c.bounds,county,adcode:c.adcode});return node;}
    $('#city-boundaries').replaceChildren(...geometry.cities.flatMap(c=>{const fill=path(c,false);fill.setAttribute('stroke','none');const outline=element('path',{d:c.outline||c.d,class:'city-outline'+(c.name===parent?' boundary-selected':'' )});boundaryNodes.push({node:outline,bounds:c.bounds,county:false});return [fill,outline];}));
    $('#county-boundaries').replaceChildren(...geometry.counties.filter(c=>!parent||c.parent===parent).map(c=>path(c,true)));
  }
  function drawCities() {
    const group=$('#city-points');group.replaceChildren();
    labels=labels.filter(l=>!l.city);
    const parent=$('#map-prefecture').value;
    cityPlaces.filter(p=>!parent||p.name===parent).forEach(p=>{
      const [x,y]=core.project(p.center),capital=p.name==='成都市';
      const name=capital?'成都':p.name.replace('藏族羌族自治州','州').replace('藏族自治州','州').replace('彝族自治州','州');
      const node=element('text',{x,y,class:'city-label'+(capital?' capital-label':'')},name);
      group.append(element('circle',{cx:x,cy:y,class:'city-dot'+(capital?' capital-dot':'')}),node);
      labels.push({id:'city-'+p.name,x,y,name,size:13,node,city:true,capital});
    });
  }
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
  function setView(next, animate = true) {
    $('#map-place-picker').hidden = true;
    const width = Math.max(90, Math.min(900, next[2]));
    const height = width * 680 / 900;
    targetView = [Math.max(0, Math.min(900-width,next[0])),Math.max(0, Math.min(680-height,next[1])),width,height];
    animateView = animate;
    if(!frame) frame=schedule(paint);
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
    labels = labels.filter(l=>l.city);
    boundaryNodes.filter(b=>b.county).forEach(b=>b.node.classList.toggle('county-area-selected',String(b.adcode)===String(selected?.adcode)));
    for (const place of counties.filter(p => !parent || p.parent === parent)) {
      const [x, y] = core.project(place.center);
      const point = element('g', { 'data-county-code':place.adcode, class: 'county-point', tabindex: '0', role: 'button', 'aria-label': `${place.name}，${place.parent}` });
      point.append(element('circle', { cx: x, cy: y, r: 5, fill: 'transparent', stroke: 'none' }));
      point.append(element('circle', { cx: x, cy: y, r: selected === place ? 3.5 : 2, class: selected === place ? 'county-selected' : 'county-dot' }));
      point.append(element('title', {}, `${place.name} · ${place.parent}`));
      const node=element('text',{x,y,class:'county-label'},place.name);
      point.append(node);
      labels.push({id:place.id,x,y,name:place.name,size:11,node,point,selected:selected===place});
      point.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPlace(place); } };
      group.append(point);
    }
    updateLabels();
  }
  function selectPlace(place) {
    selected = place; $('#map-county').value = place.id; $('#map-add-stop').disabled = false;
    drawCounties();
    $('#map-picker-title').textContent = place.name + ' · ' + place.parent;
    $('#map-picker-list').replaceChildren(button('加入当前路线', () => { $('#map-add-stop').click(); $('#map-place-picker').hidden = true; }));
    $('#map-place-picker').hidden = false;
    $('#map-place-picker').scrollIntoView({ block: 'nearest' });
    $('#map-picker-list').firstElementChild.focus({ preventScroll: true });
  }
  function pickNearby(event) {
    if (suppressMapClick) { suppressMapClick = false; return; }
    if (!loaded) return;
    const code=event.target.closest('[data-county-code]')?.getAttribute('data-county-code');
    if(code){const county=counties.find(c=>String(c.adcode)===code);if(county)return selectPlace(county);}
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const visible = counties.filter(p => !$('#map-prefecture').value || p.parent === $('#map-prefecture').value);
    const matches = core.nearby(visible, point.x, point.y, Math.hypot(matrix.a, matrix.b));
    if (!matches.length) { $('#map-place-picker').hidden = true; return; }
    if (matches.length === 1) return selectPlace(matches[0]);
    $('#map-picker-title').textContent = `附近 ${matches.length} 个地点，请选择`;
    $('#map-picker-list').replaceChildren(...matches.map(place => button(`${place.name} · ${place.parent}`, () => selectPlace(place))));
    $('#map-place-picker').hidden = false;
    $('#map-place-picker').scrollIntoView({ block: 'nearest' });
    $('#map-picker-list').firstElementChild.focus({ preventScroll: true });
  }
  $('#map-picker-close').onclick = () => { $('#map-place-picker').hidden = true; $('#map-county').focus({ preventScroll: true }); };
  $('#map-place-picker').onkeydown = event => { if (event.key === 'Escape') { event.stopPropagation(); $('#map-picker-close').click(); } };
  function populateCounties() {
    const select = $('#map-county'); select.replaceChildren(new Option('选择地点', ''));
    const filtered = counties.filter(p => !$('#map-prefecture').value || p.parent === $('#map-prefecture').value);
    filtered.forEach(p => select.append(new Option(`${p.name} · ${p.parent}`, p.id)));
    selected = null; $('#map-add-stop').disabled = true; drawBoundaries(); drawCities(); drawCounties();
    if ($('#map-prefecture').value) {
      const boundary=geometry?.cities.find(c=>c.name===$('#map-prefecture').value);
      if(boundary) setView(core.fitBounds(boundary.bounds)); else fit(filtered);
    }
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
        group.append(element('circle', { cx: x, cy: y, r: 7, class: 'route-marker' }), element('text', { x, y, class: 'route-number', 'text-anchor': 'middle' }, index + 1));
        group.append(element('title', {}, `${index + 1}. ${place.name}`));
        if (place.level !== 'city') group.append(element('text', { x, y: y + 17, 'text-anchor': 'middle', class: 'route-place-label' }, place.name));
        $('#route-points').append(group);
      }
      const item = document.createElement('li');
      const label = document.createElement('span'); label.textContent = place ? `${place.name}${place.parent ? ' · ' + place.parent : ''}` : '待定位站点（此处不连接）';
      const remove = button('移除', () => { points.splice(index, 1); route.kind = '手动调整的地点顺序'; route.missing = []; route.backendStopsPending = []; drawRoute(); });
      const up = button('上移', () => { [points[index - 1], points[index]] = [points[index], points[index - 1]]; route.kind = '手动调整的地点顺序'; drawRoute(); });
      up.disabled = index === 0;
      item.append(label, up, remove); $('#map-route-list').append(item);
    });
    const notes = [];
    if (route?.missing?.length) notes.push(`未能唯一定位：${route.missing.join('、')}。请从县级列表补充。`);
    if (route?.backendStopsPending?.length) notes.push(`后端返回的 ${route.backendStopsPending.length} 个站点（${route.backendStopsPending.join('、')}）暂无 GCJ-02 坐标，落不到景区入口；已保留按地名识别的点位，坐标接入后自动对齐。`);
    const missing = notes.length ? ' ' + notes.join('') : '';
    $('#map-route-status').textContent = points.length
      ? `${route.kind} · ${points.filter(Boolean).length} 个已定位地点。${points.filter(Boolean).length < 2 ? '至少两个地点才显示连线。' : '虚线仅作地点顺序示意，可在下方调整。'}${missing}`
      : (route ? `没有识别到可唯一定位的目的地。${missing}` : '已加载183个县级地点。发送旅游需求后自动标点；也可选择县城加入路线。');
  }
  const ready = Promise.all([
    fetch('sichuan-counties.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch('sichuan-cities.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    fetch('sichuan-map-geometry.json', { cache: 'no-store' }).then(r => { if(!r.ok) throw new Error(); return r.json(); })
  ]).then(([countyData, cityData, boundaryData]) => {
    geometry=boundaryData; cityPlaces=cityData;
    counties = countyData.map(p => ({ ...p, id: 'county-' + p.adcode, level: 'county' }));
    places = [...cityData.map(p => ({ ...p, id: 'city-' + p.name, level: 'city' })), ...counties];
    cityData.forEach(p => $('#map-prefecture').append(new Option(p.name, p.name)));
    loaded = true; populateCounties(); drawRoute();
    return true;
  }).catch(() => { $('#map-route-status').textContent = '地图边界或点位加载失败，请刷新页面重试。'; return false; });

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
        // A general story question must not clear the route or open an empty map.
        if (!parsed.points.length && !parsed.ambiguous.length) return;
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
        const next = core.resolveRoute(chat.mapRoute, parsed);
        chat.mapRoute = next;
        if (activeChat === chat) { drawRoute(); fit(next.points); }
      });
    }
  };
  window.TravelMap.syncChat(chats[active]);
  $('#map-prefecture').onchange = populateCounties;
  $('#map-county').onchange = () => {
    selected = counties.find(p => p.id === $('#map-county').value) || null;
    $('#map-add-stop').disabled = !selected;
    drawCounties(); if (selected) { const boundary=geometry?.counties.find(c=>c.adcode===selected.adcode); if(boundary)setView(core.fitBounds(boundary.bounds));else fit([selected]); }
  };
  $('#map-add-stop').onclick = () => {
    if (!selected || !activeChat) return;
    const route = activeChat.mapRoute || { points: [], missing: [] };
    route.points.push(selected); route.kind = '手动选择的地点顺序'; activeChat.mapRoute = route;
    drawRoute(); fit(route.points);
  };
  function zoomTo(percent, animate = true) {
    const width = 900 / Math.max(1, Math.min(10, percent / 100));
    setView([view[0] + (view[2] - width) / 2, view[1] + (view[3] - width * 680 / 900) / 2, width], animate);
  }
  $('#map-zoom-range').addEventListener('input', event => zoomTo(Number(event.target.value), false));
  $('#map-zoom-in').onclick = () => zoomTo(900 / targetView[2] * 125);
  $('#map-zoom-out').onclick = () => zoomTo(900 / targetView[2] * 80);
  $('#map-reset').onclick = () => setView([0, 0, 900, 680]);
  $('#map-fit').onclick = () => fit(activeChat?.mapRoute?.points || []);
  $('#map-clear').onclick = () => { if (activeChat) { delete activeChat.mapRoute; delete activeChat.mapQuestion; } drawRoute(); setView([0, 0, 900, 680]); };
  svg.addEventListener('wheel',event=>{
    event.preventDefault();
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?500:1);
    const width=Math.max(90,Math.min(900,targetView[2]*Math.exp(Math.max(-100,Math.min(100,delta))*.002)));
    const ratio=width/view[2];
    setView([point.x-(point.x-view[0])*ratio,point.y-(point.y-view[1])*ratio,width],false);
  },{passive:false});
  if(window.ResizeObserver) new ResizeObserver(()=>{if(!frame)frame=schedule(paint);}).observe(svg);
  let drag = null, pinch = null;
  const pointers = new Map();
  let suppressMapClick = false;
  svg.addEventListener('click', pickNearby);
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){
      const [a,b]=[...pointers.values()],matrix=svg.getScreenCTM();
      if(matrix){const inverse=matrix.inverse();pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),view:[...view],inverse,anchor:new DOMPoint((a.x+b.x)/2,(a.y+b.y)/2).matrixTransform(inverse)};}
      drag=null;suppressMapClick=true;return;
    }
    suppressMapClick=false;
    drag={x:event.clientX,y:event.clientY,view:[...view]};
  });
  svg.addEventListener('pointermove', event => {
    if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch&&pointers.size===2){
      const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
      const width=Math.max(90,Math.min(900,pinch.view[2]*pinch.distance/Math.max(1,distance)));
      const current=new DOMPoint((a.x+b.x)/2,(a.y+b.y)/2).matrixTransform(pinch.inverse),ratio=width/pinch.view[2];
      setView([pinch.anchor.x-(current.x-pinch.view[0])*ratio,pinch.anchor.y-(current.y-pinch.view[1])*ratio,width],false);return;
    }
    if(!drag)return;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5&&!suppressMapClick)return;
    suppressMapClick=true;svg.setPointerCapture(event.pointerId);
    const rect=svg.getBoundingClientRect(),ratio=Math.min(rect.width/drag.view[2],rect.height/drag.view[3]);
    setView([drag.view[0]-(event.clientX-drag.x)/ratio,drag.view[1]-(event.clientY-drag.y)/ratio,drag.view[2]],false);
  });
  function endPointer(event){pointers.delete(event.pointerId);drag=null;pinch=null;}
  svg.addEventListener('pointerup',endPointer);
  svg.addEventListener('pointercancel',endPointer);
  svg.addEventListener('lostpointercapture',endPointer);
})();
