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

// Dense labels must never overlap in screen space at any tested map zoom.
const viewCore=require('./map-route-core.js');
for(const zoom of [1,2.5,5,10]){
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
console.log('PASS: 21/183 real boundaries, regional fit includes full bounds, collision-free screen labels at 100–1000%');
