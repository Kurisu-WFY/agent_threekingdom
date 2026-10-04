/* 网页Key可公开加载SDK；安全密钥仅由后端代理注入。 */
(() => {
  let loading, initializing, map, observer, generation=0;
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
  const note=()=>document.getElementById('amap-map-note');
  async function baseMap(){
    if(map)return map;
    if(!initializing)initializing=(async()=>{
      const A=await sdk();
      map=new A.Map('amap-map',{zoom:8,center:[105.9,31.65],viewMode:'2D'});
      return map;
    })().finally(()=>{initializing=null;});
    return initializing;
  }
  async function enter(){
    document.getElementById('amap-map-region').hidden=false;
    if(map){map.resize?.();return;}
    note().textContent='正在加载高德地图…';
    try{await baseMap();if(!note().textContent||note().textContent==='正在加载高德地图…')note().textContent='南充—广元—阆中区域底图 · 可拖动、缩放；请主动查询道路路线。';}
    catch(error){note().textContent=error.message+'。可继续填写条件，重新进入活动计划可重试。';}
  }
  function clear(){
    generation++;observer?.disconnect();
    if(map){map.clearMap();map.setZoomAndCenter(8,[105.9,31.65]);}
    document.getElementById('amap-map-region').hidden=false;
    note().textContent='南充—广元—阆中区域底图 · 可拖动、缩放；请主动查询道路路线。';
  }
  async function draw(data,index=0){
    clear();const current=generation,region=document.getElementById('amap-map-region'),note=document.getElementById('amap-map-note');
    region.hidden=false;note.textContent='正在加载高德地图…';
    try {
      const A=await sdk();await baseMap();if(current!==generation)return;
      const points=[data.origin,data.destination].map(p=>p.location.split(',').map(Number));
      const overlays=points.map((p,i)=>new A.Marker({position:p,title:i?'终点':'起点',label:{content:i?'终点':'起点',direction:'top'}}));
      const lines=data.alternatives[index].lines||[];
      const color=getComputedStyle(document.documentElement).getPropertyValue('--jade-deep').trim();
      for(const path of lines) overlays.push(new A.Polyline({path,strokeColor:color,strokeWeight:6,strokeOpacity:.9}));
      map.add(overlays);map.setFitView(overlays,false,[35,35,35,35]);
      observer=new ResizeObserver(()=>{if(current===generation)map.setFitView(overlays,false,[35,35,35,35]);});observer.observe(document.getElementById('amap-map'));
      note.textContent=lines.length?'高德返回的路段 · 可拖动、缩放；未返回的路段不补画。':'仅显示起终点：本方案未返回道路轨迹，不用直线代替路线。';
    }catch(error){if(current===generation)note.textContent=error.message+'。文字路线仍可查看。';}
  }
  async function drawPlaces(items){
    clear();const current=generation,region=document.getElementById('amap-map-region'),note=document.getElementById('amap-map-note');
    region.hidden=false;note.textContent='正在加载高德地点地图…';
    try{
      const A=await sdk();await baseMap();if(current!==generation)return;
      const places=items.filter(p=>p.coordinate_system==='GCJ02'&&typeof p.location==='string'&&p.location.split(',').length===2&&p.location.split(',').map(Number).every(Number.isFinite));
      if(!places.length)throw Error('没有可定位的高德地点');
      // 标签使用DOM文本，不能将外部地点名称作为HTML插入。
      const markers=places.map(p=>{const label=document.createElement('span');label.textContent=p.name;return new A.Marker({position:p.location.split(',').map(Number),title:p.name,label:{content:label,direction:'top'}});});
      map.add(markers);map.setFitView(markers,false,[35,35,35,35]);
      observer=new ResizeObserver(()=>{if(current===generation)map.setFitView(markers,false,[35,35,35,35]);});observer.observe(document.getElementById('amap-map'));
      note.textContent='高德搜索候选地点 · 请核对名称和地址；地点标记不是已规划的道路路线。';
    }catch(error){if(current===generation)note.textContent=error.message+'。可查看地点文字资料并重试。';}
  }
  window.AmapRouteMap={draw,drawPlaces,clear,enter,sdk};
  if(window.getContentView?.()==='planner')enter();
})();
