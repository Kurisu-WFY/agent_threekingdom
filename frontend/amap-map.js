/* 网页Key可公开加载SDK；安全密钥仅由后端代理注入。 */
(() => {
  let loading, map, observer, generation=0;
  async function sdk() {
    if(window.AMap) return window.AMap;
    if(!loading) loading=(async()=>{
      const response=await fetch('/api/travel/amap/map-config');
      if(!response.ok) throw Error('地图配置读取失败');
      const config=await response.json();
      if(!config.enabled) throw Error('网页地图尚未配置，请联系管理员');
      window._AMapSecurityConfig={serviceHost:location.origin+config.serviceHost};
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        const timer=setTimeout(()=>{script.remove();reject(Error('地图加载超时，请重试'));},20000);
        script.onload=()=>{clearTimeout(timer);resolve();};
        script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('地图加载失败，请检查网络'));};
        script.src='https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(config.key);
        document.head.append(script);
      });
      if(!window.AMap) throw Error('地图初始化失败');
      return window.AMap;
    })().catch(error=>{loading=null;throw error;});
    return loading;
  }
  function clear(){generation++;observer?.disconnect();if(map){map.destroy();map=null;}document.getElementById('amap-map-region').hidden=true;}
  async function draw(data,index=0){
    clear();const current=generation,region=document.getElementById('amap-map-region'),note=document.getElementById('amap-map-note');
    region.hidden=false;note.textContent='正在加载高德地图…';
    try {
      const A=await sdk();if(current!==generation)return;
      const points=[data.origin,data.destination].map(p=>p.location.split(',').map(Number));
      map=new A.Map('amap-map',{zoom:13,center:points[0],viewMode:'2D'});
      const overlays=points.map((p,i)=>new A.Marker({position:p,title:i?'终点':'起点',label:{content:i?'终点':'起点',direction:'top'}}));
      const lines=data.alternatives[index].lines||[];
      const color=getComputedStyle(document.documentElement).getPropertyValue('--jade-deep').trim();
      for(const path of lines) overlays.push(new A.Polyline({path,strokeColor:color,strokeWeight:6,strokeOpacity:.9}));
      map.add(overlays);map.setFitView(overlays,false,[35,35,35,35]);
      observer=new ResizeObserver(()=>{if(current===generation)map.setFitView(overlays,false,[35,35,35,35]);});observer.observe(document.getElementById('amap-map'));
      note.textContent=lines.length?'高德实际返回路段 · 可拖动、缩放；未返回的路段不补画。':'仅显示起终点：本方案未返回道路轨迹，不用直线代替路线。';
    }catch(error){if(current===generation)note.textContent=error.message+'。文字路线仍可查看。';}
  }
  window.AmapRouteMap={draw,clear};
})();
