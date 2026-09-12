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
  const api = { project, aliases, mentions, structured, nearby };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MapRouteCore = api;
})();
