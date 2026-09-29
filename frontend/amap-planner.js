/* 高德地点确认与路线展示，所有请求通过后端，页面不接触密钥。 */
(() => {
  const $ = id => document.getElementById(id), api = window.TravelApi;
  if (!$('amap-search-form') || !api) return;
  let version = 0;
  const make = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const status = text => { $('amap-status').textContent = text; };
  const clear = () => { version++; $('amap-results').replaceChildren(); };
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
  $('amap-route-form').onsubmit = async e => {
    e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
    clear(); const current=version, button=e.currentTarget.querySelector('button'); button.disabled=true; status('正在查询高德路线…');
    try {
      const r = await api.amapRoute({origin_id:$('amap-origin-id').value,destination_id:$('amap-destination-id').value,mode:$('amap-mode').value});
      if(current!==version) return;
      if(r.status!=='ok' || !r.data?.alternatives?.length) throw Error(r.message || '当前没有可用路线。');
      status(r.message); const d=r.data, target=$('amap-results');
      target.append(make('h3', `${d.origin.name} → ${d.destination.name}`));
      d.alternatives.forEach((p,i) => {
        const details=make('details',''); details.open=i===0;
        const distance=Number.isFinite(p.distance_m)?`${(p.distance_m/1000).toFixed(1)}公里`:'距离未返回';
        const duration=Number.isFinite(p.duration_seconds)?`约${Math.ceil(p.duration_seconds/60)}分钟`:'时间未返回';
        details.append(make('summary', `方案${i+1} · ${distance} · ${duration}`));
        if(Number.isFinite(p.fare_yuan)) details.append(make('p', `预计公交费用：${p.fare_yuan}元／人，以实际票价为准。`));
        if(Number.isFinite(p.walking_distance_m)) details.append(make('p', `其中步行约${Math.round(p.walking_distance_m)}米。`));
        const list=make('ol',''); for(const step of p.steps||[]) list.append(make('li',step)); details.append(list); target.append(details);
      });
      target.append(make('p', '来源：高德地图 · 查询时间：'+new Date(d.queried_at).toLocaleString('zh-CN')));
    } catch(error) {if(current===version) status(error.message || '路线查询失败，请重试。');}
    finally {button.disabled=false;}
  };
})();
