/* 常驻地图生命周期夹具：不调用高德网络，不冒充真实SDK验收。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const instances=[],scripts=[],nodes=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:''});return nodes.get(id);};
let configCalls=0;
const A={Map:class{constructor(id,options){this.options=options;this.overlays=[];instances.push(this);}add(xs){this.overlays.push(...xs);}clearMap(){this.overlays=[];}setZoomAndCenter(z,c){this.options={zoom:z,center:c};}setFitView(){}resize(){}destroy(){this.destroyed=true;}},Marker:class{constructor(p){this.p=p;}},Polyline:class{constructor(p){this.p=p;}}};
const ctx={window:{},location:{origin:'http://localhost:8002'},document:{getElementById:get,documentElement:{},createElement:()=>({remove(){}}),head:{append(s){scripts.push(s);ctx.window.AMap=A;queueMicrotask(()=>s.onload());}}},fetch:async()=>{configCalls++;return {ok:true,json:async()=>({enabled:true,key:'fixture',serviceHost:'/fixture'})};},setTimeout,clearTimeout,ResizeObserver:class{observe(){}disconnect(){}},getComputedStyle:()=>({getPropertyValue:()=> '#285d47'})};
vm.runInNewContext(fs.readFileSync(__dirname+'/amap-map.js','utf8'),ctx);
(async()=>{
 const api=ctx.window.AmapRouteMap;
 assert.equal(typeof api.enter,'function','进入活动计划应提供常驻底图初始化');
 await Promise.all([api.enter(),api.enter()]);await api.enter();
 assert.equal(configCalls,1);assert.equal(scripts.length,1);assert.equal(instances.length,1);
 assert.equal(instances[0].options.zoom,8);assert.deepEqual(Array.from(instances[0].options.center),[105.9,31.65]);
 const fixture={origin:{location:'105,31'},destination:{location:'106,32'},alternatives:[{lines:[[[105,31],[106,32]]]}]};
 await api.draw(fixture);assert.equal(instances.length,1);assert.equal(instances[0].overlays.length,3);
 api.clear();assert.equal(get('amap-map-region').hidden,false);assert.equal(instances[0].overlays.length,0);assert.equal(instances[0].destroyed,undefined);
 await api.enter();assert.equal(configCalls,1);assert.equal(instances.length,1);
 await api.drawPlaces([{name:'夹具点',coordinate_system:'GCJ02',location:'105,31'}]);assert.equal(instances[0].overlays.length,1);
 const hashContext={...ctx,window:{AMap:A,getContentView:()=> 'planner'}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/amap-map.js','utf8'),hashContext);
 await new Promise(r=>setImmediate(r));
 assert.equal(instances.length,2,'旧 #outing 深链先进入活动计划，地图模块加载后也应补初始化');
 console.log('PASS 常驻底图、单次 SDK/Map 初始化、路线/地点覆盖物与清空后地图保留');
})().catch(e=>{console.error(e);process.exitCode=1;});
