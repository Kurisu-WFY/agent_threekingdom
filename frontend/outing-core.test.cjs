const assert=require('node:assert/strict');
const {draft,canOpen,routePoints}=require('./outing-core.js');
const m={role:'assistant',text:'南充 2026-09-28 一日行程。<script>alert(1)</script>',data:{generation:{kind:'nuwax'}}};
assert.equal(canOpen(m),true);assert.equal(canOpen({...m,pending:true}),false);assert.equal(canOpen({...m,error:true}),false);
assert.equal(draft(m).city,'南充');assert.equal(draft(m).date,'2026-09-28');assert.deepEqual(draft(m).stops,[]);
assert.equal(draft({...m,text:'南充出发到广元'}).city,'');
const fs=require('node:fs'),vm=require('node:vm');
const cityContext={window:{SGTCities:['测试新增城市']}};
vm.runInNewContext(fs.readFileSync(__dirname+'/outing-core.js','utf8'),cityContext);
assert.equal(cityContext.window.OutingCore.draft({...m,text:'测试新增城市一日行程'}).city,'测试新增城市','draft recognition consumes the shared city source');
assert.equal(draft({...m,text:'2026-02-30 南充'}).date,'');
const d=draft({...m,data:{route:{stops:[{name:'万卷楼',latitude:1,longitude:1}]}}});
assert.deepEqual(d.stops,[{name:'万卷楼'}]);
assert.equal(routePoints(null),null);assert.equal(routePoints({type:'LineString',coordinates:[[190,30],[106,30]]}),null);
const pts=routePoints({type:'LineString',coordinates:[[106,30],[106.2,30.1],[106.3,30.2]]});assert.equal(pts.length,3);assert.ok(pts.every(p=>p.every(Number.isFinite)));
console.log('PASS: conservative draft handoff, no guessed stops/coordinates, invalid and ambiguous dates, safe route projection');

// U11: real outing + AMAP planner prefill invalidates old confirmations and requests nothing.
const nodes=new Map(),calls=[];
class Field{constructor(){this.value='';this.children=[];this.handlers={};this.hidden=false;this.checked=false;this.disabled=false;}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}addEventListener(k,f){this.handlers[k]=f;}querySelector(){return get('submit');}focus(){}setAttribute(){}}
const get=id=>{if(!nodes.has(id))nodes.set(id,new Field());return nodes.get(id);};
const outingContext={window:{location:{hash:""},OutingCore:{draft,canOpen,routePoints},TravelApi:{amapPlaces:()=>calls.push('search'),amapRoute:()=>calls.push('route')},AmapRouteMap:{clear:()=>calls.push('clear')},TravelModules:{prefillTravel(){}}},document:{getElementById:get,createElement:()=>new Field()},URL,URLSearchParams,location:{search:''},showContentView(){},toggleChat(){}};
vm.runInNewContext(fs.readFileSync(__dirname+'/amap-planner.js','utf8'),outingContext);
vm.runInNewContext(fs.readFileSync(__dirname+'/outing.js','utf8'),outingContext);
assert.equal(typeof outingContext.window.TravelAssistant.prefillPlan,'function','U11 plan can pass endpoint words to road verification');
get('amap-origin-id').value='old-origin';get('amap-destination-id').value='old-end';get('amap-route-form').hidden=false;
outingContext.window.TravelAssistant.prefillPlan({origin:'南充站',destination:'万卷楼',city:'南充'});
assert.equal(get('amap-origin-query').value,'南充站');assert.equal(get('amap-destination-query').value,'万卷楼');
assert.equal(get('amap-origin-id').value,'');assert.equal(get('amap-destination-id').value,'');assert.equal(get('amap-route-form').hidden,true);
assert.ok(!calls.includes('search')&&!calls.includes('route'),'U11 no automatic search, candidate selection or coordinates');
assert.equal(get('outing-start-lon').value,'');
assert.equal(typeof get('outing-use-activity').onclick,'function','内联道路支持显式带入当前活动条件');
outingContext.window.TravelModules.getRoadDraft=()=>({origin:'南充站',destination:'剑门关',city:'广元'});get('outing-use-activity').onclick();
assert.equal(get('amap-origin-query').value,'南充站');assert.equal(get('amap-destination-query').value,'剑门关');assert.equal(get('amap-city').value,'广元');
assert.ok(!calls.includes('search')&&!calls.includes('route'),'带入仅复制文字，不自动搜索或选候选');
console.log('PASS: U11 plan endpoint text, stale candidate invalidation, no automatic lookup or invented coordinates');
