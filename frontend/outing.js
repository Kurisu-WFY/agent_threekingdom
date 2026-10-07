/* 同页视图，离开时不销毁原有聊天。 */
(() => {
  const $=id=>document.getElementById(id), core=window.OutingCore, api=window.TravelApi;
  if (!$('outing-view') || !core || !api) return;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  let routeVersion=0,back=null,chatHandoff=false;
  const time=v=>{const d=new Date(v);return Number.isFinite(+d)?d.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）':'未提供';};
  function source(target, record) {
    target.replaceChildren();
    target.append(node('p','查询时间：'+time(record?.fetched_at)+'；可能为缓存结果。'));
    (record?.sources||[]).forEach(s=>{
      try {const u=new URL(s.source_url);if(u.protocol!=='https:')return;const a=node('a',s.title||'查看来源');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}catch{}
    });
  }
  function clearRoute(){routeVersion++;$('outing-route-form').querySelector('button').disabled=false;$('outing-route-preview').replaceChildren(node('p','请先确认起终点，查询成功后会显示返回的道路形状。'));$('outing-route-metrics').replaceChildren();$('outing-route-source').replaceChildren();$('outing-route-status').textContent='条件已改变，请重新查询。';}
  function coordinateFields(){for(const side of ['start','end']){const manual=$('outing-'+side).value==='manual';$('outing-'+side+'-coords').hidden=!manual;for(const axis of ['lon','lat']){$('outing-'+side+'-'+axis).required=manual;$('outing-'+side+'-'+axis).disabled=!manual;}}const manual=['start','end'].some(s=>$('outing-'+s).value==='manual');$('outing-confirm-row').hidden=!manual;$('outing-confirm').required=manual;if(!manual)$('outing-confirm').checked=false;}
  $('outing-route-form').addEventListener('input',()=>{clearRoute();coordinateFields();});coordinateFields();
  async function point(side){
    const selected=$('outing-'+side).value;
    if(selected==='manual')return {longitude:Number($('outing-'+side+'-lon').value),latitude:Number($('outing-'+side+'-lat').value)};
    const r=await api.lookupCity(selected);if(r.status!=='ok')throw Error(r.message||'城市定位失败。');
    if(r.data.coordinate_system!=='WGS84'||!Number.isFinite(r.data.longitude)||!Number.isFinite(r.data.latitude))throw Error('坐标格式无法确认。');return r.data;
  }
  function svgRoute(points){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 260');svg.setAttribute('role','img');svg.setAttribute('aria-label','服务返回的道路路线形状示意，无底图，不供逐向导航');
    const path=document.createElementNS(ns,'polyline');path.setAttribute('points',points.map(p=>p.join(',')).join(' '));svg.append(path);
    for(const [i,p] of [[0,points[0]],[1,points.at(-1)]]){const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r','6');svg.append(c);const text=document.createElementNS(ns,'text');text.setAttribute('x',p[0]);text.setAttribute('y',p[1]-12);text.setAttribute('text-anchor','middle');text.setAttribute('fill','currentColor');text.textContent=i?'终':'起';svg.append(text);}return svg;
  }
  $('outing-route-form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
    const querySnapshot={city:['start','end'].map(s=>$('outing-'+s).value).join(' → '),origin:$('outing-start').value,destination:$('outing-end').value,date:document.querySelector('#trip-form').elements.namedItem('date').value||'',linked:false};
    const version=++routeVersion,button=form.querySelector('button'),mode=form.querySelector('input[name="outing-mode"]:checked').value;
    button.disabled=true;$('outing-route-status').textContent='正在定位并查询公共道路服务…';
    try{
      const origin=await point('start');if(version!==routeVersion)return;
      const end=await point('end');if(version!==routeVersion)return;
      if(origin.longitude===end.longitude&&origin.latitude===end.latitude)throw Error('起点与终点相同，请选择不同位置。');
      const r=await api.roadRoute({origin_longitude:origin.longitude,origin_latitude:origin.latitude,destination_longitude:end.longitude,destination_latitude:end.latitude,coordinate_system:'WGS84',mode});if(version!==routeVersion)return;
      if(r.status!=='ok')throw Error(r.message||'没有可用路线。');
      const d=r.data,points=core.routePoints(d.geometry);if(!points||!Number.isFinite(d.distance_m)||d.distance_m<0||!Number.isFinite(d.duration_seconds)||d.duration_seconds<0)throw Error('路线几何或距离数据不完整，未绘制示意。');
      $('outing-route-preview').replaceChildren(svgRoute(points),node('small','服务返回的道路形状 · 无底图 · 非逐向导航'));
      $('outing-route-metrics').replaceChildren(node('strong',`距离 ${(d.distance_m/1000).toFixed(2)} km`),node('strong',`预计 ${Math.ceil(d.duration_seconds/60)} 分钟`));
      const snaps=(d.snapped_waypoints||[]).map(w=>w.distance_from_input_m).filter(Number.isFinite);
      $('outing-route-status').textContent=r.message+(snaps.length?' 起终点吸附道路偏移：'+snaps.map(m=>m.toFixed(0)+'米').join(' / ')+'。':'');
      window.ActivityQueries?.record('osrm',{...querySnapshot,queried_at:d.fetched_at||new Date().toISOString()});source($('outing-route-source'),d);const fix=node('a','在 OpenStreetMap 查看／修正地图');fix.href='https://www.openstreetmap.org/';fix.target='_blank';fix.rel='noopener noreferrer';$('outing-route-source').append(node('br'),fix);
    }catch(e){if(version===routeVersion){$('outing-route-status').textContent=e.message||'查询失败，请重试。';$('outing-route-preview').replaceChildren(node('p','本次没有可确认的道路路线，可调整起终点后重试。'));$('outing-route-metrics').replaceChildren();$('outing-route-source').replaceChildren();}}
    finally{if(version===routeVersion)button.disabled=false;}
  };
  function prefillPlan(draft){
    window.AmapPlanner?.prefill(draft);routeVersion++;
    for(const side of ['start','end']){$('outing-'+side).value='';for(const axis of ['lon','lat'])$('outing-'+side+'-'+axis).value='';}
    coordinateFields();$('outing-confirm').checked=false;$('outing-back').hidden=true;
    $('outing-origin').textContent='来自本次活动计划 · 地点文字已带入，请搜索并确认候选';
  }
  window.TravelAssistant={canOpen:core.canOpen,prefillPlan,onEnter(source){if(!chatHandoff&&['plan','planner'].includes(source))prefillPlan(window.TravelModules.getRoadDraft(source));},open(message,returnToChat){
    const d=core.draft(message);clearRoute();
    window.TravelModules?.prefillTravel?.(d.city,d.date);back=returnToChat;
    for(const side of ['start','end']){$('outing-'+side).value='';for(const axis of ['lon','lat'])$('outing-'+side+'-'+axis).value='';}coordinateFields();$('outing-confirm').checked=false;
    $('outing-origin').textContent='来自陈寿对话的行程草案 · 请确认目的地与日期';$('outing-back').hidden=false;
    $('outing-original').hidden=false;$('outing-original-text').textContent=d.answer;
    $('outing-stops').replaceChildren(...d.stops.map(s=>node('li',s.name+' · 位置待确认')));
    $('outing-draft-note').textContent=d.stops.length?'已带入站点名称；坐标和可行性仍未确认。':'回答原文已保留。当前回答没有可直接使用的站点资料，不会把文字猜成可导航路线。';
    window.AmapPlanner?.prefill({origin:message.activityPlan?.preferences?.origin||'',destination:d.stops.at(-1)?.name||d.city,city:d.city});
    toggleChat(false);chatHandoff=true;showContentView('outing');chatHandoff=false;$('outing-title').focus({preventScroll:true});
  }};
  $('outing-back').onclick=()=>{if(!back?.())$('outing-origin').textContent='原对话已被删除，可从聊天入口新建对话。';};
  $('outing-use-activity').onclick=()=>prefillPlan(window.TravelModules.getRoadDraft('planner'));
  if(window.location.hash==='#outing')showContentView('outing');
})();
