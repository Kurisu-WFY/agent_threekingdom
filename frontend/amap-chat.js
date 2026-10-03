/* 回答与高德地图衔接：识别名称只用于搜索，不相信回答中的坐标。 */
(() => {
  const $=id=>document.getElementById(id);
  let version=0;
  const cityNames=['南充','阆中','广元','成都','广安','达州','巴中','绵阳','德阳','遂宁'];
  function mentions(text){
    const names=[...(window.SGT_PLACES||[]).map(p=>p.name),'武侯祠','剑门关','昭化古城','张飞庙','北湖公园',...cityNames].filter(Boolean);
    return [...new Set(names)].filter(name=>String(text).includes(name)).sort((a,b)=>String(text).indexOf(a)-String(text).indexOf(b));
  }
  function routeParams(raw){
    try{
      const u=new URL(raw,location.origin);
      // 只接管本项目地图链接，外部链接仍按原方式打开。
      if(u.origin!==location.origin&&!(['127.0.0.1','localhost'].includes(u.hostname)&&u.port===location.port&&u.protocol===location.protocol))return null;
      if(u.pathname!=='/'||u.hash!=='#outing')return null;
      const origin_id=u.searchParams.get('amap_origin'),destination_id=u.searchParams.get('amap_destination'),mode=u.searchParams.get('amap_mode')||'transit';
      return /^[A-Za-z0-9]{5,40}$/.test(origin_id||'')&&/^[A-Za-z0-9]{5,40}$/.test(destination_id||'')&&['transit','walking','driving'].includes(mode)?{origin_id,destination_id,mode}:null;
    }catch{return null;}
  }
  async function search(){
    const current=++version,button=$('amap-place-form').querySelector('button[type="submit"]');button.disabled=true;
    $('amap-place-results').replaceChildren();window.AmapRouteMap.clear();$('amap-place-status').textContent='正在搜索高德地点…';
    try{
      const r=await window.TravelApi.amapPlaces({city:$('amap-place-city').value.trim(),keywords:$('amap-place-query').value.trim()});
      if(current!==version)return;
      if(r.status!=='ok'||!r.data?.items?.length)throw Error(r.message||'没有匹配地点，请修改城市或地点名称。');
      const items=r.data.items;
      for(const p of items){
        const row=document.createElement('p'),name=document.createElement('strong'),address=document.createElement('span'),locate=document.createElement('button'),plan=document.createElement('button');
        name.textContent=p.name;address.textContent=' · '+(p.address||p.city)+' ';
        locate.textContent='查看此地点';locate.type='button';locate.className='module-button';locate.onclick=async()=>{await window.AmapRouteMap.drawPlaces([p]);$('amap-map-region').scrollIntoView({block:'nearest'});};
        plan.textContent='规划到这里';plan.type='button';plan.className='module-button';plan.onclick=()=>{
          window.AmapPlanner.prefill({origin:$('amap-origin-query').value,destination:p.name,city:p.city||$('amap-place-city').value});
          $('amap-origin-query').focus();$('amap-status').textContent='已带入目的地，请填写出发地，再搜索并确认起终点。';
        };
        row.append(name,address,locate,plan);$('amap-place-results').append(row);
      }
      $('amap-place-status').textContent='请核对高德返回的名称和地址，选择具体地点。';await window.AmapRouteMap.drawPlaces(items);
      if(current===version)$('amap-map-region').scrollIntoView({block:'nearest'});
    }catch(error){if(current===version)$('amap-place-status').textContent=error.message||'地点搜索失败，请重试。';}
    finally{if(current===version)button.disabled=false;}
  }
  function showMentions(text){
    const names=mentions(text);if(!names.length)return false;
    window.AmapPlanner.prefill({origin:$('amap-origin-query').value,destination:$('amap-destination-query').value,city:$('amap-city').value});
    version++;window.toggleChat?.(false);window.showContentView?.('outing');
    document.querySelector('#outing-view > details').open=true;$('amap-place-view').hidden=false;
    const city=cityNames.find(name=>String(text).includes(name));$('amap-place-city').value=city||'南充';
    $('amap-mentioned-places').replaceChildren();
    for(const name of names){const b=document.createElement('button');b.type='button';b.className='module-button';b.textContent=name;b.onclick=()=>{$('amap-place-query').value=name;search();};$('amap-mentioned-places').append(b);}
    $('amap-place-query').value=names.find(name=>!cityNames.includes(name))||names[0];search();return true;
  }
  $('amap-place-form').onsubmit=e=>{e.preventDefault();if(e.currentTarget.reportValidity())search();};
  $('amap-place-form').addEventListener('input',()=>{version++;$('amap-place-form').querySelector('button[type="submit"]').disabled=false;window.AmapRouteMap.clear();$('amap-place-results').replaceChildren();$('amap-place-status').textContent='地点条件已改变，请重新搜索。';});
  window.AmapChat={hasMentions:text=>mentions(text).length>0,showMentions,routeParams,cancel(){version++;$('amap-place-form').querySelector('button[type="submit"]').disabled=false;}};
})();
