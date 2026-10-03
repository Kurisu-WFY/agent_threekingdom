/* 地图链接边界与异步地点查询回归。 */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class E{constructor(){this.children=[];this.value='';this.hidden=false;this.textContent='';}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}querySelector(){return this.button||(this.button=new E());}addEventListener(){}focus(){}scrollIntoView(){}}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new E());return elements.get(id);};
const calls=[],pending=[];let drawn=[];
const ctx={URL,location:{origin:'http://127.0.0.1:8010',port:'8010',protocol:'http:'},document:{getElementById:get,querySelector:()=>get('details'),createElement:()=>new E()},window:{SGT_PLACES:[{name:'万卷楼'}],AmapPlanner:{prefill:p=>calls.push(p)},TravelApi:{amapPlaces:p=>new Promise(resolve=>pending.push({p,resolve}))},AmapRouteMap:{clear(){},drawPlaces:p=>{drawn.push(p);}},toggleChat(){},showContentView:v=>calls.push(v)}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/amap-chat.js','utf8'),ctx);const api=ctx.window.AmapChat;
assert.ok(api.routeParams('http://127.0.0.1:8010/?amap_origin=B01234&amap_destination=B05678#outing'));
for(const url of ['https://evil.test/?amap_origin=B01234&amap_destination=B05678#outing','http://127.0.0.1:9999/?amap_origin=B01234&amap_destination=B05678#outing','http://127.0.0.1:8010/?amap_origin=x&amap_destination=B05678#outing'])assert.equal(api.routeParams(url),null);
assert.ok(api.hasMentions('成都武侯祠'));assert.equal(api.hasMentions('你好'),false);
(async()=>{
api.showMentions('南充万卷楼');assert.equal(pending[0].p.keywords,'万卷楼');assert.equal(pending[0].p.city,'南充');
api.showMentions('成都武侯祠');pending[0].resolve({status:'ok',data:{items:[{name:'旧结果'}]}});await new Promise(r=>setImmediate(r));assert.equal(drawn.length,0);
pending[1].resolve({status:'ok',data:{items:[{name:'武侯祠',address:'成都',city:'成都市'}]}});await new Promise(r=>setImmediate(r));assert.equal(drawn[0][0].name,'武侯祠');
const row=get('amap-place-results').children[0];row.children.at(-1).onclick();assert.equal(calls.at(-1).destination,'武侯祠');
console.log('PASS: 本机路线链接校验、地点识别、过期响应隔离与目的地带入');
})();
