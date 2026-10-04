/* 浏览器授权结果为显式夹具；验证真实定位按钮逻辑，不申请实际用户位置。 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class E{constructor(){this.value='';this.textContent='';this.disabled=false;this.listeners={};}addEventListener(k,fn){this.listeners[k]=fn;}dispatchEvent(e){this.listeners[e.type]?.(e);}}
function setup(provider){
 const button=new E(),origin=new E(),status=new E(),timers=new Map(),queries=[];let timer=0;
 origin.value='手填出发地';
 const nodes={'use-my-location':button,'trip-origin':origin,'origin-location-status':status};
 const context={document:{getElementById:id=>nodes[id]},navigator:provider===null?{}:{geolocation:{getCurrentPosition:provider}},Event:class{constructor(type,options){this.type=type;this.bubbles=options.bubbles;}},setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout(id){timers.delete(id);},fetch:()=>{queries.push('fetch');throw Error('定位不得请求网络');},window:{TravelApi:new Proxy({},{get:(_,name)=>()=>queries.push(name)}),SGTChat:{request:()=>queries.push('plan')},AMap:{plugin:()=>queries.push('AMap plugin')}}};
 const source=fs.existsSync(__dirname+'/browser-location.js')?fs.readFileSync(__dirname+'/browser-location.js','utf8'):'';
 vm.runInNewContext(source,context);
 assert.equal(typeof button.onclick,'function','出发地定位按钮应绑定浏览器授权行为');
 return {button,origin,status,timers,queries};
}
let pending;
const t=setup((ok,fail,options)=>{pending={ok,fail,options};});
let changed=0;t.origin.listeners.input=()=>changed++;
t.button.onclick();assert.equal(t.button.disabled,true);assert.equal(t.origin.value,'手填出发地');
assert.ok(pending.options.timeout>0&&pending.options.timeout<=15000);
// 如果读取或保存坐标，此夹具会直接报错。
pending.ok({coords:{accuracy:49.2,get latitude(){throw Error('不得读取纬度');},get longitude(){throw Error('不得读取经度');}}});
assert.equal(t.origin.value,'我的位置（近似）');assert.match(t.status.textContent,/±50 米/);assert.equal(changed,1,'值变化沿用input事件使旧活动请求失效');assert.equal(t.button.disabled,false);assert.equal(t.timers.size,0);assert.deepEqual(t.queries,[]);
t.origin.value='保存的手填地址';t.origin.dispatchEvent({type:'sgt-origin-restored'});assert.equal(t.status.textContent,'','打开保存方案后不能残留旧定位精度');assert.equal(changed,1,'恢复通知不能触发条件改变的input事件');
for(const code of [1,2,3]){
 const f=setup((ok,fail)=>fail({code}));f.button.onclick();assert.equal(f.origin.value,'手填出发地');assert.equal(f.status.textContent,'未取得定位，可手动填写出发地');assert.equal(f.button.disabled,false);assert.deepEqual(f.queries,[]);
 f.origin.value='南充站';f.origin.dispatchEvent({type:'input'});assert.equal(f.origin.value,'南充站');
}
for(const provider of [null,()=>{throw Error('定位不可用');}]){const f=setup(provider);f.button.onclick();assert.equal(f.status.textContent,'未取得定位，可手动填写出发地');assert.equal(f.button.disabled,false);assert.deepEqual(f.queries,[]);}
const timeout=setup((ok,fail)=>{pending={ok,fail};});timeout.button.onclick();[...timeout.timers.values()][0]();assert.equal(timeout.status.textContent,'未取得定位，可手动填写出发地');pending.ok({coords:{accuracy:50}});assert.equal(timeout.origin.value,'手填出发地','超时后迟到结果不得填入');assert.deepEqual(timeout.queries,[]);
const edited=setup((ok,fail)=>{pending={ok,fail};});edited.button.onclick();edited.origin.value='后来手填';edited.origin.dispatchEvent({type:'input'});pending.ok({coords:{accuracy:50}});assert.equal(edited.origin.value,'后来手填','异步定位不得覆盖后续手填');assert.equal(edited.button.disabled,false);assert.deepEqual(edited.queries,[]);
const restored=setup((ok,fail)=>{pending={ok,fail};});restored.button.onclick();restored.origin.value='保存方案的出发地';pending.ok({coords:{accuracy:50}});assert.equal(restored.origin.value,'保存方案的出发地','程序恢复方案不发input事件，迟到定位也不得覆盖');assert.equal(restored.button.disabled,false);assert.deepEqual(restored.queries,[]);
const absent=setup(ok=>ok({coords:{accuracy:NaN}}));absent.button.onclick();assert.equal(absent.origin.value,'我的位置（近似）');assert.match(absent.status.textContent,/精度未取得/);assert.deepEqual(absent.queries,[]);
console.log('PASS 浏览器定位授权/拒绝/失败/超时/手填竞态/精度缺失；不读取坐标、不调用插件或接口');
