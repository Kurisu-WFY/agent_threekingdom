// Offline build. Source: DataV areas_v3/bound; snapshot 2026-09-12.
// Raw city/county GeoJSON retained for reproducibility. No runtime external map requests.
const fs = require('node:fs');
const {project} = require('./map-route-core.js');
const read = name => JSON.parse(fs.readFileSync(__dirname+'/'+name,'utf8').replace(/^\uFEFF/,''));
function simplify(points, tolerance=.22) {
  if(points.length<3) return points;
  const first=points[0], last=points.at(-1), dx=last[0]-first[0],dy=last[1]-first[1];
  let best=tolerance*tolerance,index=0;
  for(let i=1;i<points.length-1;i++) {
    const p=points[i],t=dx||dy?Math.max(0,Math.min(1,((p[0]-first[0])*dx+(p[1]-first[1])*dy)/(dx*dx+dy*dy))):0;
    const d=(p[0]-first[0]-t*dx)**2+(p[1]-first[1]-t*dy)**2;
    if(d>best){best=d;index=i;}
  }
  return index?[...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)]:[first,last];
}
function feature(f) {
  const rings=(f.geometry.type==='MultiPolygon'?f.geometry.coordinates.flat():f.geometry.coordinates).map(r=>r.map(project));
  const points=rings.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {name:f.properties.name,adcode:f.properties.adcode,parent:f.prefecture||'',bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],d:rings.map(r=>'M'+simplify(r).map(p=>p.map(v=>+v.toFixed(2)).join(',')).join('L')+'Z').join('')};
}
const data={source:'https://geo.datav.aliyun.com/areas_v3/bound/',snapshot:'2026-09-12',coordinate_system:'GCJ-02',cities:read('sichuan-city-boundaries.json').features.map(feature),counties:read('sichuan-county-boundaries.json').features.map(feature)};
fs.writeFileSync(__dirname+'/sichuan-map-geometry.json',JSON.stringify(data));
const paths=data.cities.map(c=>'<path d="'+c.d+'"/>').join('');
fs.writeFileSync(__dirname+'/sichuan-map.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 680"><title>四川市州轮廓</title><g fill="#eeeade" stroke="#9c927e" stroke-width=".8">'+paths+'</g></svg>');
console.log('Generated '+data.cities.length+' city boundaries and '+data.counties.length+' county boundaries.');
