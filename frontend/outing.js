/* Same-page view: leaving it never destroys the original chat. */
(() => {
  const $=id=>document.getElementById(id), core=window.OutingCore, api=window.TravelApi;
  if (!$('outing-view') || !core || !api) return;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  let weatherVersion=0,routeVersion=0,back=null;
  const value=v=>typeof v==='number' && Number.isFinite(v)?v:'—';
  const time=v=>{const d=new Date(v);return Number.isFinite(+d)?d.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）':'未提供';};
  function source(target, record) {
    target.replaceChildren();
    target.append(node('p','查询时间：'+time(record?.fetched_at)+'；可能为缓存结果。'));
    (record?.sources||[]).forEach(s=>{
      try {const u=new URL(s.source_url);if(u.protocol!=='https:')return;const a=node('a',s.title||'查看来源');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';target.append(a);}catch{}
    });
  }
  function clearWeather() {
    weatherVersion++;$('outing-weather-form').querySelector('button').disabled=false;
    $('outing-forecast').replaceChildren();$('outing-air').textContent='查询后显示当前模型估计，非监测站实测。';$('outing-weather-source').replaceChildren();
    $('outing-weather-status').textContent='条件已改变，请重新查询。';$('outing-forecast').removeAttribute('aria-busy');
  }
  $('outing-weather-form').addEventListener('input',clearWeather);
  $('outing-weather-form').onsubmit=async event=>{
    event.preventDefault(); const form=event.currentTarget;if(!form.reportValidity())return;
    const version=++weatherVersion,city=$('outing-city').value,date=$('outing-date').value,button=form.querySelector('button');
    button.disabled=true;$('outing-weather-status').textContent='正在查询天气和空气质量…';$('outing-forecast').setAttribute('aria-busy','true');
    try {
      const r=await api.getTravelInfo({city});if(version!==weatherVersion)return;
      if(r.status!=='ok')throw Error(r.message||'天气服务暂不可用，请重试。');
      const d=r.data,days=Array.isArray(d.forecast)?d.forecast:[];
      $('outing-forecast').replaceChildren();
      for(const day of days){
        const row=node('div');row.className='outing-day';row.dataset.selected=String(day.date===date);
        row.title=day.date;row.append(node('span',day.date.slice(5)),node('strong',`${value(day.temperature_min_c)}～${value(day.temperature_max_c)}°`),node('small',`降雨 ${value(day.rain_probability_percent)}%`),node('small',`紫外线 ${value(day.uv_index_max)}`));$('outing-forecast').append(row);
      }
      const warnings=[...(d.warnings||[])];
      if(date&&!days.some(x=>x.date===date))warnings.push('出行日期不在返回预报范围内；下方仅为可查询日期，不代表出行日天气。');
      $('outing-weather-status').textContent=warnings.join(' ')||`${city} · ${days.length}日模型预报${date?'，已标出所选日期':''}。不是景区实测。`;
      const air=d.air_quality;$('outing-air').replaceChildren();
      if(air){const readings=node('div');readings.className='outing-air-values';for(const [k,label] of [['pm2_5','PM2.5'],['pm10','PM10']]){const block=node('div');block.append(node('span',label),node('strong',`${value(air[k])} ${air.units?.[k]||''}`));readings.append(block);}$('outing-air').append(readings,node('p',`模型数据时刻：${air.time}（北京时间）。当前模型估计，非未来出行日实测。`));}
      else $('outing-air').textContent='空气质量暂无有效结果；天气结果可继续查看。';
      const items=d.items||[];
      source($('outing-weather-source'),items.find(x=>x.data_status==='forecast')||items.find(x=>x.data_status==='model'));
      const a=node('a','空气质量来源：Open-Meteo / CAMS');a.href='https://open-meteo.com/en/docs/air-quality-api';a.target='_blank';a.rel='noopener noreferrer';$('outing-weather-source').append(node('br'),a,node('p','公共接口仅用于非商业 Demo；预报出行前请再核验。'));
    }catch(e){if(version===weatherVersion){$('outing-weather-status').textContent=e.message||'查询失败，请重试。';$('outing-forecast').replaceChildren();$('outing-air').textContent='暂无可确认的数据。';$('outing-weather-source').replaceChildren();}}
    finally {if(version===weatherVersion){button.disabled=false;$('outing-forecast').removeAttribute('aria-busy');}}
  };
  function clearRoute(){routeVersion++;$('outing-route-form').querySelector('button').disabled=false;$('outing-route-preview').replaceChildren(node('p','请先确认起终点；查询成功后显示真实道路几何。'));$('outing-route-metrics').replaceChildren();$('outing-route-source').replaceChildren();$('outing-route-status').textContent='条件已改变，请重新查询。';}
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
      source($('outing-route-source'),d);const fix=node('a','在 OpenStreetMap 查看／修正地图');fix.href='https://www.openstreetmap.org/';fix.target='_blank';fix.rel='noopener noreferrer';$('outing-route-source').append(node('br'),fix);
    }catch(e){if(version===routeVersion){$('outing-route-status').textContent=e.message||'查询失败，请重试。';$('outing-route-preview').replaceChildren(node('p','本次没有可确认的道路路线，可调整起终点后重试。'));$('outing-route-metrics').replaceChildren();$('outing-route-source').replaceChildren();}}
    finally{if(version===routeVersion)button.disabled=false;}
  };
  window.TravelAssistant={canOpen:core.canOpen,open(message,returnToChat){
    const d=core.draft(message);clearWeather();clearRoute();
    $('outing-city').value=d.city;$('outing-date').value=d.date;back=returnToChat;
    for(const side of ['start','end']){$('outing-'+side).value='';for(const axis of ['lon','lat'])$('outing-'+side+'-'+axis).value='';}coordinateFields();$('outing-confirm').checked=false;
    $('outing-origin').textContent='来自陈寿对话的行程草案 · 请确认目的地与日期';$('outing-back').hidden=false;
    $('outing-original').hidden=false;$('outing-original-text').textContent=window.AgentAnswer?.clean(d.answer)||d.answer;
    $('outing-stops').replaceChildren(...d.stops.map(s=>node('li',s.name+' · 位置待核验')));
    $('outing-draft-note').textContent=d.stops.length?'已带入结构化站点名称；未将坐标或可行性视为已核验。':'已保留回答原文。当前回答未提供结构化站点，未把文字猜测为可导航路线。';
    $('outing-weather-status').textContent=d.city?'请确认日期后查询；未自动发送外部请求。':'原文中目的地不明确或包含多座城市，请手动选择。';
    toggleChat(false);showContentView('outing');$('outing-title').focus({preventScroll:true});
  }};
  $('outing-back').onclick=()=>{if(!back?.())$('outing-origin').textContent='原对话已被删除，可从聊天入口新建对话。';};
  if(window.location.hash==='#outing')showContentView('outing');
})();
