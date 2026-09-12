// Offline boundary build: retain shared county vertices; never simplify each polygon independently.
// City fills and outlines are derived from these same county rings to avoid mixed-resolution seams.
const fs=require('node:fs');
const {project}=require('./map-route-core.js');
const read=name=>JSON.parse(fs.readFileSync(__dirname+'/'+name,'utf8').replace(/^\uFEFF/,''));
const raw=read('sichuan-county-boundaries.json').features;
const point=p=>project(p).map(v=>+v.toFixed(3)).join(',');
const rawRings=f=>(f.geometry.type==='MultiPolygon'?f.geometry.coordinates.flat():f.geometry.coordinates).map(r=>r.map(point));
// Shared arcs are simplified once, in canonical direction, with every junction locked.
const projected=new Map(raw.map(f=>[f,rawRings(f)])),adjacency=new Map();
for(const rs of projected.values())for(const r of rs)for(let i=1;i<r.length;i++){
 const a=r[i-1],b=r[i];if(a===b)continue;
 if(!adjacency.has(a))adjacency.set(a,new Set());if(!adjacency.has(b))adjacency.set(b,new Set());
 adjacency.get(a).add(b);adjacency.get(b).add(a);
}
function reduce(points){
 if(points.length<3)return points;
 const first=points[0].split(',').map(Number),last=points.at(-1).split(',').map(Number),dx=last[0]-first[0],dy=last[1]-first[1];let max=.22**2,index=0;
 for(let i=1;i<points.length-1;i++){const p=points[i].split(',').map(Number),t=dx||dy?Math.max(0,Math.min(1,((p[0]-first[0])*dx+(p[1]-first[1])*dy)/(dx*dx+dy*dy))):0;
 const d=(p[0]-first[0]-t*dx)**2+(p[1]-first[1]-t*dy)**2;if(d>max){max=d;index=i;}}
 return index?[...reduce(points.slice(0,index+1)).slice(0,-1),...reduce(points.slice(index))]:[points[0],points.at(-1)];
}
const arcs=new Map();
function simplifyRing(ring){
 const r=ring.slice(0,-1),junctions=r.map((p,i)=>adjacency.get(p)?.size!==2?i:-1).filter(i=>i>=0);
 if(junctions.length<2)return ring;
 const out=[];
 for(let k=0;k<junctions.length;k++){
  const start=junctions[k],end=junctions[(k+1)%junctions.length],arc=[r[start]];
  for(let i=(start+1)%r.length;;i=(i+1)%r.length){arc.push(r[i]);if(i===end)break;}
  const forward=arc.join(';'),backward=[...arc].reverse().join(';'),reverse=backward<forward,key=reverse?backward:forward;
  if(!arcs.has(key))arcs.set(key,reduce(reverse?[...arc].reverse():arc));
  const result=reverse?[...arcs.get(key)].reverse():arcs.get(key);out.push(...result.slice(0,-1));
 }
 return [...out,out[0]];
}
const simplified=new Map([...projected].map(([f,rs])=>[f,rs.map(simplifyRing)]));
const rings=f=>simplified.get(f);
const path=rs=>rs.map(r=>'M'+r.join('L')+'Z').join('');
const bounds=rs=>{const p=rs.flat().map(v=>v.split(',').map(Number));return [Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1]))];};
const counties=raw.map(f=>{const rs=rings(f);return {name:f.properties.name,adcode:f.properties.adcode,parent:f.prefecture,bounds:bounds(rs),d:path(rs)};});
const cities=read('sichuan-city-boundaries.json').features.map(f=>{
 const rs=raw.filter(c=>c.prefecture===f.properties.name).flatMap(rings),edges=new Map();
 for(const ring of rs)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];if(a===b)continue;
  const key=a<b?a+'|'+b:b+'|'+a;
  if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);
 }
 return {name:f.properties.name,adcode:f.properties.adcode,parent:'',bounds:bounds(rs),d:path(rs),outline:[...edges.values()].map(([a,b])=>'M'+a+'L'+b).join('')};
});
const data={source:'https://geo.datav.aliyun.com/areas_v3/bound/',snapshot:'2026-09-12',coordinate_system:'GCJ-02',topology:'shared county vertices; city outlines cancel internal edges',cities,counties};
fs.writeFileSync(__dirname+'/sichuan-map-geometry.json',JSON.stringify(data));
fs.writeFileSync(__dirname+'/sichuan-map.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 680"><title>四川市州轮廓</title>'+cities.map(c=>'<path fill="#eeeade" fill-rule="evenodd" d="'+c.d+'"/><path fill="none" stroke="#9c927e" stroke-width=".8" d="'+c.outline+'"/>').join('')+'</svg>');
console.log('Built shared boundaries: '+cities.length+' cities / '+counties.length+' counties');
