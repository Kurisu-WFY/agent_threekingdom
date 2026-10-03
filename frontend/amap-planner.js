/* 高德地点确认与路线展示，所有请求通过后端，页面不接触密钥。 */
(() => {
  const $ = id => document.getElementById(id), api = window.TravelApi;
  if (!$('amap-search-form') || !api) return;
  let version = 0;
  const make = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const status = text => { $('amap-status').textContent = text; };
  const clear = () => { version++; window.AmapChat?.cancel(); $('amap-results').replaceChildren(); window.AmapRouteMap?.clear(); };
  window.AmapPlanner={openRoute(params){
    if(!/^[A-Za-z0-9]{5,40}$/.test(params.origin_id||'')||!/^[A-Za-z0-9]{5,40}$/.test(params.destination_id||'')||!['transit','walking','driving'].includes(params.mode))return false;
    window.toggleChat?.(false);window.showContentView?.('outing');
    document.querySelector('#outing-view > details').open=true;
    queryRoute(params);return true;
  },prefill({origin='',destination='',city=''}){
    window.AmapChat?.cancel();
    clear();$('amap-route-form').hidden=true;
    $('amap-origin-query').value=origin;$('amap-destination-query').value=destination;$('amap-city').value=city;
    for(const side of ['origin','destination']){$('amap-'+side+'-id').replaceChildren();$('amap-'+side+'-id').value='';}
    $('amap-search-form').querySelector('button').disabled=false;
    status('本次计划的地点文字已带入。请搜索并确认具体起终点；候选地点尚未选择，坐标也未核验。');
  }};
  $('amap-search-form').addEventListener('input', () => {clear(); $('amap-route-form').hidden = true; status('地点已改变，请重新搜索并确认。');});
  $('amap-route-form').addEventListener('change', () => {clear(); status('条件已改变，请重新查询路线。');});
  $('amap-search-form').onsubmit = async e => {
    e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
    clear(); const current = version, button = e.currentTarget.querySelector('button');
    button.disabled = true; $('amap-route-form').hidden = true; status('正在搜索高德地点…');
    try {
      const city = $('amap-city').value.trim();
      const results = await Promise.all(['origin', 'destination'].map(side => api.amapPlaces({city, keywords: $('amap-'+side+'-query').value.trim()})));
      if (current !== version) return;
      for (let i=0; i<2; i++) {
        const r = results[i], side = ['origin', 'destination'][i];
        if (r.status !== 'ok' || !r.data?.items?.length) throw Error(r.message || '没有匹配地点，请换关键词。');
        const select = $('amap-'+side+'-id'); select.replaceChildren();
        const placeholder = make('option', '请选择并确认具体地点'); placeholder.value=''; select.append(placeholder);
        for (const p of r.data.items) {const o=make('option', `${p.name} · ${p.address || p.city}`); o.value=p.id; select.append(o);}
      }
      $('amap-route-form').hidden=false; status('请核对校区、景区或入口，分别选择起终点。');
    } catch(error) {if(current===version) status(error.message || '地点搜索失败，请重试。');}
    finally {button.disabled=false;}
  };
  async function queryRoute(params) {
    window.AmapChat?.cancel();
    clear(); const current=version, button=$('amap-route-form').querySelector('button'); button.disabled=true; status('正在查询高德路线…');
    try {
      const r = await api.amapRoute(params);
      if(current!==version) return;
      if(r.status!=='ok' || !r.data?.alternatives?.length) throw Error(r.message || '当前没有可用路线。');
      status(r.message); const d=r.data, target=$('amap-results');
      $('amap-place-view').hidden=true;
      target.append(make('h3', `${d.origin.name} → ${d.destination.name}`));
      d.alternatives.forEach((p,i) => {
        const details=make('details',''); details.open=i===0;
        const distance=Number.isFinite(p.distance_m)?`${(p.distance_m/1000).toFixed(1)}公里`:'距离未返回';
        const duration=Number.isFinite(p.duration_seconds)?`约${Math.ceil(p.duration_seconds/60)}分钟`:'时间未返回';
        details.append(make('summary', `方案${i+1} · ${distance} · ${duration}`));
        const show=make('button','在地图查看此方案');show.type='button';show.onclick=()=>window.AmapRouteMap?.draw(d,i);details.append(show);
        if(Number.isFinite(p.fare_yuan)) details.append(make('p', `预计公交费用：${p.fare_yuan}元／人，以实际票价为准。`));
        if(Number.isFinite(p.walking_distance_m)) details.append(make('p', `其中步行约${Math.round(p.walking_distance_m)}米。`));
        const list=make('ol',''); for(const step of p.steps||[]) list.append(make('li',step)); details.append(list); target.append(details);
      });
      target.append(make('p', '来源：高德地图 · 查询时间：'+new Date(d.queried_at).toLocaleString('zh-CN')));
      await window.AmapRouteMap?.draw(d,0);
      if(current===version)$('amap-map-region').scrollIntoView({block:'nearest'});
    } catch(error) {if(current===version) status(error.message || '路线查询失败，请重试。');}
    finally {button.disabled=false;}
  }
  $('amap-route-form').onsubmit = e => {
    e.preventDefault(); if(!e.currentTarget.reportValidity())return;
    queryRoute({origin_id:$('amap-origin-id').value,destination_id:$('amap-destination-id').value,mode:$('amap-mode').value});
  };
  // 智能体仅传入地点ID；坐标和轨迹仍从后端重新核验，不信任回答里的坐标。
  const incoming=new URLSearchParams(location.search),origin=incoming.get('amap_origin'),destination=incoming.get('amap_destination'),mode=incoming.get('amap_mode')||'transit';
  if(origin||destination){
    if(/^[A-Za-z0-9]{5,40}$/.test(origin||'')&&/^[A-Za-z0-9]{5,40}$/.test(destination||'')&&['transit','walking','driving'].includes(mode)){
      const open=make('button','加载向导规划的路线地图');open.type='button';
      open.onclick=()=>{open.disabled=true;queryRoute({origin_id:origin,destination_id:destination,mode}).finally(()=>{open.disabled=false;});};
      $('amap-planner').prepend(open);status('向导给出的起终点已收到，点击加载后会向高德重新核验路线。');
      requestAnimationFrame(()=>open.scrollIntoView({block:'center'}));
    }else status('路线链接参数无效，请手动搜索地点。');
  }
})();
