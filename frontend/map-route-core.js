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
      if (stop.coordinate_system === 'GCJ-02' && Array.isArray(stop.coordinates) && stop.coordinates.length === 2 && stop.coordinates.every(Number.isFinite) && stop.coordinates[0] >= 97 && stop.coordinates[0] <= 109 && stop.coordinates[1] >= 26 && stop.coordinates[1] <= 35) return { name: stop.name, center: stop.coordinates, level: 'spot' };
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
    if (located(parsed)) return { points: parsed.points, missing: known, kind: '后端返回的站点顺序', backendStopsPending };
    if (located(existing)) return { points: existing.points, missing: known, kind: existing.kind, backendStopsPending };
    return { points: parsed.points, missing: known, kind: '后端返回的站点顺序', backendStopsPending };
  }
  // 视口辅助函数使用地图投影单位，文字碰撞检测使用屏幕像素。
  function fitBounds(bounds, aspect = 900 / 680) {
    const [left,top,right,bottom] = bounds;
    const width = Math.min(900,Math.max(110,(right-left)*1.3,(bottom-top)*1.3*aspect));
    return [(left+right-width)/2,(top+bottom-width/aspect)/2,width];
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
  const api = { visibleBounds, fitBounds, labelLayout, project, aliases, mentions, structured, resolveRoute, nearby };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MapRouteCore = api;
})();
