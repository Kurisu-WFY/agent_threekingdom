/* 地名识别与坐标投影，无 DOM，供地图与回归测试共用。 */
(() => {
  function project([lon, lat]) { return [100 + (lon - 97.3) * 60, 620 - (lat - 26) * 60 / Math.cos(Math.PI / 6)]; }
  function aliases(place) {
    const names = [place.name];
    const short = place.name.replace(/(自治县|县|市|区)$/, '');
    if (short.length >= 2) names.push(short);
    if (place.name.startsWith('阿坝藏族')) names.push('阿坝州');
    if (place.name.startsWith('甘孜藏族')) names.push('甘孜州');
    if (place.name.startsWith('凉山彝族')) names.push('凉山州');
    return [...new Set(names)];
  }
  function mentions(text, places) {
    const hits = [];
    for (const place of places) for (const alias of aliases(place)) {
      let start = text.indexOf(alias);
      while (start >= 0) {
        if (!/(?:不去|不要去|不经过|不途经|不含|排除)\s*$/.test(text.slice(Math.max(0, start - 8), start))) hits.push({ start, end: start + alias.length, place });
        start = text.indexOf(alias, start + alias.length);
      }
    }
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const points = [], ambiguous = [];
    let end = -1;
    for (const hit of hits) {
      if (hit.start < end) continue;
      let candidates = hits.filter(item => item.start === hit.start && item.end === hit.end);
      if (candidates.length > 1) {
        const contextual = candidates.filter(item => item.place.parent && text.includes(item.place.parent.replace(/市$/, '')));
        if (contextual.length === 1) candidates = contextual;
      }
      if (candidates.length === 1) points.push(candidates[0].place);
      else ambiguous.push(text.slice(hit.start, hit.end));
      end = hit.end;
    }
    return { points, ambiguous: [...new Set(ambiguous)] };
  }
  function structured(data, places) {
    const stops = data?.map_route?.stops || data?.route?.stops;
    if (!Array.isArray(stops) || !stops.length) return null;
    const missing = [];
    const points = stops.map(stop => {
      if (!stop || typeof stop.name !== 'string') { missing.push('未命名站点'); return null; }
      // 与底图一致的 GCJ-02 坐标；坐标系缺失时不能假定兼容。
      if (stop.coordinate_system === 'GCJ-02' && Array.isArray(stop.coordinates) && stop.coordinates.length === 2 && stop.coordinates.every(Number.isFinite) && stop.coordinates[0] >= 97 && stop.coordinates[0] <= 109 && stop.coordinates[1] >= 26 && stop.coordinates[1] <= 35) return { name: stop.name, center: stop.coordinates, level: 'spot', ...(typeof stop.city==='string'&&stop.city.trim()?{city:stop.city.trim()}:{}) };
      const matches = places.filter(place => aliases(place).includes(stop.name) && (!stop.parent || stop.parent === place.parent));
      if (matches.length === 1) return matches[0];
      missing.push(stop.name);
      return null;
    });
    return { points, missing };
  }
  function nearby(places, x, y, scale, radius = 20) {
    return places.map(place => {
      const [px, py] = project(place.center);
      return { place, distance: Math.hypot(px - x, py - y) * scale };
    }).filter(item => item.distance <= radius).sort((a, b) => a.distance - b.distance).map(item => item.place);
  }
  function located(route) { return (route?.points || []).filter(Boolean).length; }
  /* 后端站点顺序优先，但只有「能落到位」的后端站点才允许替换已识别点位。
     当前后端 stops 既没有 coordinates、名称又是景区，全都匹配不上驻地，
     无条件替换会把用户已经看到的地名路线清空（真实联调缺陷）。 */
  function resolveRoute(existing, parsed) {
    if (!parsed) return existing || null;
    const known = existing?.missing || [];
    const backendStopsPending = [...new Set(parsed.missing || [])].filter(name => !known.includes(name));
    if (located(parsed)) return { points: parsed.points, missing: known, kind: '服务返回的站点顺序', backendStopsPending };
    if (located(existing)) return { points: existing.points, missing: known, kind: existing.kind, backendStopsPending };
    return { points: parsed.points, missing: known, kind: '服务返回的站点顺序', backendStopsPending };
  }
  // 视口辅助函数使用地图投影单位，文字碰撞检测使用屏幕像素。
  function fitBounds(bounds, aspect = 900 / 680) {
    const [left,top,right,bottom] = bounds;
    const width = Math.min(900,Math.max(110,(right-left)*1.3,(bottom-top)*1.3*aspect));
    return [(left+right-width)/2,(top+bottom-width/aspect)/2,width];
  }
  // 底图只有 M/L/Z 直线环。奇偶填充兼容孔洞与多片地块；以离边界最远的内点放标签。
  function polygonLabel(path, bounds) {
    const rings=path.split('M').filter(Boolean).map(r=>r.replace(/Z$/,'').split('L').map(p=>p.split(',').map(Number)));
    function distance(x,y) {
      let inside=false,min=Infinity;
      for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i];
        if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
        const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;
        min=Math.min(min,(x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2);
      }
      return (inside?1:-1)*Math.sqrt(min);
    }
    const [left,top,right,bottom]=bounds,step=Math.min(right-left,bottom-top);
    if(!(step>0))return null;
    function cell(x,y,h){const d=distance(x,y);return {x,y,h,d,max:d+h*Math.SQRT2};}
    // 最大堆让搜索只细分仍可能优于当前内点的格子，结果在首轮渲染后缓存。
    const queue=[];
    function push(c){let i=queue.length;queue.push(c);while(i){const p=(i-1)>>1;if(queue[p].max>=c.max)break;queue[i]=queue[p];i=p;}queue[i]=c;}
    function pop(){const result=queue[0],tail=queue.pop();if(queue.length){let i=0;while(i*2+1<queue.length){let c=i*2+1;if(c+1<queue.length&&queue[c+1].max>queue[c].max)c++;if(queue[c].max<=tail.max)break;queue[i]=queue[c];i=c;}queue[i]=tail;}return result;}
    let best=cell((left+right)/2,(top+bottom)/2,0);
    for(let x=left;x<right;x+=step)for(let y=top;y<bottom;y+=step)push(cell(x+step/2,y+step/2,step/2));
    const precision=Math.max(.01,step/100);
    while(queue.length){const c=pop();if(c.d>best.d)best=c;if(c.max-best.d<=precision)continue;const h=c.h/2;for(const dx of [-h,h])for(const dy of [-h,h])push(cell(c.x+dx,c.y+dy,h));}
    return best.d>0?{x:best.x,y:best.y,clearance:best.d}:null;
  }
  function labelLayout(items, view, width, height) {
    const scale = Math.min(width/view[2],height/view[3]);
    const ox=(width-view[2]*scale)/2,oy=(height-view[3]*scale)/2;
    const occupied=[],visible=[];
    // 可为较大的故事印章预留标记间距，普通标签保持原有布局。
    for (const item of items.filter(item=>item.markerRadius>0)) {
      const x=(item.x-view[0])*scale+ox,y=(item.y-view[1])*scale+oy,r=item.markerRadius;
      if(x+r>=0&&x-r<=width&&y+r>=0&&y-r<=height) occupied.push([x-r,y-r,x+r,y+r]);
    }
    for(const item of items) {
      const x=(item.x-view[0])*scale+ox,y=(item.y-view[1])*scale+oy;
      if(item.area){
        // 把文字及描边包络完整放进内切圆，不进行地块外的侧向避让。
        const size=Math.min(item.size,(item.area.clearance*scale-3)/Math.hypot(item.name.length/2,.6));
        if(size<8)continue;
        const halfW=item.name.length*size/2+2,halfH=size*.6+2;
        const box=[x-halfW,y-halfH,x+halfW,y+halfH];
        if(box[0]<0||box[1]<0||box[2]>width||box[3]>height)continue;
        if(occupied.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))continue;
        occupied.push(box);visible.push({id:item.id,dx:0,dy:0,box,fontSize:size});continue;
      }
      const w=item.name.length*item.size;
      if(x<0||x>width||y<0||y>height) continue;
      const gap=8+(item.markerRadius||0);
      for(const [dx,dy] of [[gap,-8],[-w-gap,-8],[gap,18],[-w-gap,18]]) {
        const box=[x+dx-3,y+dy-item.size-3,x+dx+w+3,y+dy+3];
        if(box[0]<0||box[1]<0||box[2]>width||box[3]>height) continue;
        if(occupied.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])) continue;
        occupied.push(box);visible.push({id:item.id,dx,dy,box});break;
      }
    }
    return visible;
  }
  function visibleBounds(view, width, height) {
    const scale=Math.min(width/view[2],height/view[3]);
    const extraX=(width/scale-view[2])/2,extraY=(height/scale-view[3])/2;
    return [view[0]-extraX,view[1]-extraY,view[0]+view[2]+extraX,view[1]+view[3]+extraY];
  }
  const api = { polygonLabel, visibleBounds, fitBounds, labelLayout, project, aliases, mentions, structured, resolveRoute, nearby };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MapRouteCore = api;
})();
