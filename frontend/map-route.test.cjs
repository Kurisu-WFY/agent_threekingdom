const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('./map-route-core.js');
const read = name => JSON.parse(fs.readFileSync(__dirname + '/' + name, 'utf8').replace(/^\uFEFF/, ''));
const counties = read('sichuan-counties.json');
const places = [...read('sichuan-cities.json'), ...counties];
assert.equal(counties.length, 183);
assert.equal(new Set(counties.map(p => p.adcode)).size, 183);
assert.ok(counties.every(p => Array.isArray(p.center) && p.center.length === 2 && p.center.every(Number.isFinite)));
assert.deepEqual(core.mentions('从南充出发，去阆中、剑阁，再到广元旅游', places).points.map(p => p.name), ['南充市', '阆中市', '剑阁县', '广元市']);
assert.deepEqual(core.mentions('去成都，不去剑阁，然后去大邑县', places).points.map(p => p.name), ['成都市', '大邑县']);
assert.deepEqual(core.mentions('去市中区', places).points, []);
assert.ok(core.mentions('去市中区', places).ambiguous.includes('市中区'));
assert.deepEqual(core.mentions('去乐山的市中区', places).points.map(p => p.name), ['乐山市', '市中区']);
const partial = core.structured({ map_route: { stops: [{ name: '南充' }, { name: '未核验景点' }, { name: '剑阁县' }] } }, places);
assert.equal(partial.points[1], null);
assert.deepEqual(partial.missing, ['未核验景点']);
assert.equal(core.structured({ map_route: { stops: [{ name: '景点', coordinates: [105, 31], coordinate_system: 'WGS84' }] } }, places).points[0], null);
assert.deepEqual(core.structured({ map_route: { stops: [{ name: '景点', coordinates: [105, 31], coordinate_system: 'GCJ-02' }] } }, places).points[0].center, [105, 31]);
assert.equal(core.structured({}, places), null);
assert.equal(core.structured({map_route:{stops:[{name:'剑门关',city:'广元',coordinates:[105.58,32.22],coordinate_system:'GCJ-02'}]}},places).points[0].city,'广元','coordinate normalization must retain source city for activity handoff');
assert.ok(core.project([105, 31]).every(Number.isFinite));
const same = [{ name: '重叠甲', center: [105, 31] }, { name: '重叠乙', center: [105, 31] }, { name: '远点', center: [107, 33] }];
const [x, y] = core.project([105, 31]);
assert.equal(core.nearby(same, x, y, .4).length, 2);
assert.equal(core.nearby(same, x + 19 / .4, y, .4).length, 2);
assert.equal(core.nearby(same, x + 21 / .4, y, .4).length, 0);
assert.equal(core.nearby(same, x + 19 / 4, y, 4).length, 2);
/* 真实联调回放：2026-09-12 实测 POST /chat「南充一天三国文化路线」的 route.stops
   —— 两个站点既没有 coordinates，名称又是景区（匹配不到县级驻地）。 */
const backendStops = { route: { stops: [
  { stop_order: 1, spot_id: 'nanchong_xishan_wanjuanlou', name: '西山风景区·万卷楼', city: '南充', address: '四川省南充市顺庆区西山风景区' },
  { stop_order: 2, spot_id: 'nanchong_hemingshan_wangpingmu', name: '鹤鸣山景区·王平墓', city: '南充', address: '四川省南充市高坪区鹤鸣山片区' }
] } };
const backendParsed = core.structured(backendStops, places);
assert.deepEqual(backendParsed.points, [null, null]);
assert.deepEqual(backendParsed.missing, ['西山风景区·万卷楼', '鹤鸣山景区·王平墓']);
const mentioned = { points: core.mentions('南充一天三国文化路线', places).points, missing: [], kind: '按你的地名提及顺序' };
assert.deepEqual(mentioned.points.map(p => p.name), ['南充市']);
// 1) 落不到位的后端站点不得清空已识别的地名路线，只补记缺口
const kept = core.resolveRoute(mentioned, backendParsed);
assert.deepEqual(kept.points.map(p => p.name), ['南充市']);
assert.equal(kept.kind, '按你的地名提及顺序');
assert.deepEqual(kept.backendStopsPending, ['西山风景区·万卷楼', '鹤鸣山景区·王平墓']);
// 2) 后端补上 GCJ-02 坐标后，后端站点顺序优先并替换本地点位
const located = core.structured({ route: { stops: [
  { name: '西山风景区·万卷楼', coordinates: [106.0842, 30.8163], coordinate_system: 'GCJ-02' },
  { name: '鹤鸣山景区·王平墓', coordinates: [106.1163, 30.7839], coordinate_system: 'GCJ-02' }
] } }, places);
const replaced = core.resolveRoute(mentioned, located);
assert.equal(replaced.kind, '后端返回的站点顺序');
assert.deepEqual(replaced.points.map(p => p.center), [[106.0842, 30.8163], [106.1163, 30.7839]]);
assert.deepEqual(replaced.backendStopsPending, []);
// 3) 双方都落不到位时保留后端顺序与缺口，不伪造点位
assert.deepEqual(core.resolveRoute(null, backendParsed).points, [null, null]);
assert.equal(core.resolveRoute(null, null), null);
console.log('PASS: backend stops without GCJ-02 coordinates keep the mention-based route instead of wiping the map');
console.log('PASS: overlapping points remain selectable; hit radius stays 20 screen pixels across zoom levels');
console.log('PASS: 183 counties, ordered names, exclusions, ambiguity, missing-stop gaps and coordinate-system validation');

// 在所有测试缩放级别下，密集标签都不应在屏幕上重叠。
const viewCore=require('./map-route-core.js');
for(const zoom of [1,2.5,5,10,15]){
 const labels=Array.from({length:30},(_,i)=>({id:i,x:450+i*.4,y:340+i*.3,name:'密集县区'+i,size:11}));
 const visible=viewCore.labelLayout(labels,[450-450/zoom,340-340/zoom,900/zoom,680/zoom],375,310);
 assert.ok(visible.length>0&&visible.length<labels.length);
 for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i].box,b=visible[j].box;
   assert.ok(!(a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]));
 }
}
const geometry=JSON.parse(require('node:fs').readFileSync(__dirname+'/sichuan-map-geometry.json','utf8'));
assert.equal(geometry.cities.length,21);assert.equal(geometry.counties.length,183);
assert.equal(new Set(geometry.counties.map(c=>c.adcode)).size,183);
for(const city of geometry.cities){
 const [x,y,w]=viewCore.fitBounds(city.bounds),h=w*680/900;
 assert.ok(x<=city.bounds[0]&&y<=city.bounds[1]&&x+w>=city.bounds[2]&&y+h>=city.bounds[3]);
 assert.ok(city.d.startsWith('M'));
}
console.log('PASS: 21/183 real boundaries, regional fit includes full bounds, collision-free screen labels at 100–1500%');

// 在较宽或较高面板中，留边显示的 SVG 会露出比标称视口更多的地理区域。
assert.deepEqual(core.visibleBounds([400,300,90,68],900,340),[355,300,535,368]);
assert.deepEqual(core.visibleBounds([400,300,90,68],450,680),[400,266,490,402]);
// 城市几何必须使用完全相同的区县路径，不能再次简化。
for(const city of geometry.cities){assert.equal(city.d,geometry.counties.filter(c=>c.parent===city.name).map(c=>c.d).join(''));assert.ok(city.outline);}
console.log('PASS: wide/tall visible bounds and shared city/county geometry');

for(const city of geometry.cities){
 const edges=new Map();for(const ring of city.d.split('M').filter(Boolean)){
 const vertices=ring.replace(/Z$/,'').split('L');for(let i=1;i<vertices.length;i++){
 if(vertices[i-1]===vertices[i])continue;const key=[vertices[i-1],vertices[i]].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
 }}
 for(const line of city.outline.split('M').filter(Boolean)){const key=line.split('L').sort().join('|');assert.equal(edges.get(key)%2,1,'city outline must not stroke shared internal county edge');}
}
console.log('PASS: shared internal county edges removed from city outline');

// 为大型文化印章预留空间，普通区县标签仍使用同一布局算法。
const markerLabels=[{id:'story',x:450,y:340,name:'剑门关',size:12,markerRadius:34},{id:'county',x:450,y:340,name:'剑阁县',size:11}];
for(const label of core.labelLayout(markerLabels,[0,0,900,680],900,680)) {
 const box=label.box;assert.ok(!(box[0]<484&&box[2]>416&&box[1]<374&&box[3]>306));
}
console.log('PASS: chapter seals reserve label clearance without changing ordinary projection');

// 地块标签必须在凹形、多片和带孔地块内；不能继续使用行政驻地点或侧向偏移。
const concave=core.polygonLabel('M0,0L60,0L60,10L10,10L10,60L0,60Z',[0,0,60,60]);
assert.ok((concave.x<10||concave.y<10)&&concave.clearance>0,'concave interior anchor');
const holed=core.polygonLabel('M0,0L100,0L100,100L0,100ZM20,20L80,20L80,80L20,80Z',[0,0,100,100]);
assert.ok(holed.x<20||holed.x>80||holed.y<20||holed.y>80,'anchor avoids the hole');
const islands=core.polygonLabel('M0,0L5,0L5,5L0,5ZM20,0L60,0L60,40L20,40Z',[0,0,60,40]);
assert.ok(islands.x>20&&islands.clearance>15,'label uses the larger usable component');
const areaItem={id:'area',name:'地块名称',size:11,x:50,y:50,area:{clearance:30}};
const areaLayout=core.labelLayout([areaItem],[0,0,100,100],100,100);
assert.equal(areaLayout.length,1);assert.equal(areaLayout[0].dx,0);assert.equal(areaLayout[0].dy,0);
assert.equal(core.labelLayout([{...areaItem,area:{clearance:5}}],[0,0,100,100],100,100).length,0,'omit unreadable small parcel text instead of moving outside');
for(const county of geometry.counties){
 const anchor=core.polygonLabel(county.d,county.bounds);
 assert.ok(anchor.clearance>0,county.name+' has an interior anchor');
 const view=[anchor.x-30,anchor.y-680/30,60,680/15];
 for(const layout of core.labelLayout([{...areaItem,name:county.name,x:anchor.x,y:anchor.y,area:anchor}],view,1920,563)){
  const scale=Math.min(1920/view[2],563/view[3]);
  const diagonal=Math.hypot((layout.box[2]-layout.box[0])/2,(layout.box[3]-layout.box[1])/2);
  assert.ok(diagonal<=anchor.clearance*scale+.001,county.name+' full label box stays within inscribed clearance');
 }
}
console.log('PASS: concave/holed/multipart interior labels, 183 county anchors, in-parcel text boxes or omission');
