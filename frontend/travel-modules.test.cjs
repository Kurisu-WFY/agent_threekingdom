const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.dataset={};}
 addEventListener(type,fn){this['on'+type]=fn;}
 append(...ns){this.children.push(...ns);}replaceChildren(...ns){this.children=ns;}setAttribute(){}focus(){}
}
const nodes=new Map(),get=k=>{if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k);};
const values={city:'广元',origin:'南充',date:'',days:'0.5',people:'2',rooms:'1',group:'家庭',transport:'自驾',explanation:'亲子故事版',hotel_tier:'舒适型',budget_min:'100',budget_max:'1000',notes:'少走路'};
const fields=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Object.assign(new Element(),{value:v})]));
const form=get('#trip-form'),button=new Element('button');form.elements={...fields,namedItem:k=>fields[k]};form.querySelector=()=>button;form.reportValidity=()=>true;form.requestSubmit=()=>form.onsubmit({preventDefault(){},currentTarget:form});
const requests=[],views=[],mapCalls=[],saved={},states=new Map();
const story={id:'story',title:'测试故事',chapters:[{name:'第一幕',placeId:'a',role:'寻源'},{name:'第二幕',placeId:'b'},{name:'第三幕',placeId:'c'}]};
const state={mode:'亲子故事版',completed:new Set([0]),skipped:new Set([2])};states.set('story',state);
const apiCalls=[];const unavailable=async p=>{apiCalls.push(p);return {status:'unavailable',message:'资料服务待接入'};};
const window={TravelApi:{listSpots:unavailable,createPlan:()=>{throw Error('must not use preview');},estimateBudget:unavailable,getTravelInfo:unavailable},
 StoryProgress:{get:s=>states.get(s.id)||{mode:'大众体验版',completed:new Set(),skipped:new Set()},save(){}},
 StoryMap:{getPlaces:()=>[{id:'a',name:'昭化古城'},{id:'b',name:'剑门关'},{id:'c',name:'米仓道'}]},
 SGTStoryUI:{openStory(){}},TravelMap:{showPlan:async r=>{mapCalls.push(r);return true;}},
 SGTChat:{request:q=>new Promise((resolve,reject)=>requests.push({q,resolve,reject}))}};
const context={window,URL,crypto:{randomUUID:()=>String(Math.random())},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},
 document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t)},
 FormData:class{constructor(){return Object.entries(fields).map(([k,v])=>[k,v.value]);}},showContentView:v=>views.push(v),toggleChat(){}};
vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);
const text=n=>n.textContent+n.children.map(text).join(' '),flush=()=>new Promise(r=>setImmediate(r));
const response={answer:'示例路线',intent:{intent:'route_planning'},route:{found:true,route:{name:'路线',duration_hours:8,transport_mode:'公共交通',risk_note:'需核验路况',updated_at:'2026-09-17T10:00:00+08:00'},selection_reason:'优先保留第二幕',stops:[{stop_order:1,name:'剑门关',spot_id:'b',reason:'了解关隘主题',stay_minutes:90,recommended_duration_min:120,open_time:'待核验',address:'广元市剑阁县'}]}};
(async()=>{
 window.TravelModules.openStory(story);assert.equal(views.at(-1),'planner');
 fields.origin.value='   ';await form.requestSubmit();assert.equal(requests.length,0);
 fields.origin.value='南充';fields.budget_min.value='2000';await form.requestSubmit();assert.equal(requests.length,0);fields.budget_min.value='100';
 const pending=form.requestSubmit();assert.equal(button.disabled,true);form.requestSubmit();assert.equal(requests.length,1);
 assert.match(requests[0].q,/半天/);assert.match(requests[0].q,/第一幕.*已完成/);assert.match(requests[0].q,/第三幕.*本次跳过/);assert.match(requests[0].q,/只调整未完成/);
 requests[0].resolve(response);await pending;assert.equal(views.at(-1),'plan');
 const output=text(get('#plan-results'));for(const value of ['了解关隘主题','90 分钟','120 分钟','需核验路况','2026-09-17','优先保留第二幕','本次跳过','待定位','不一致'])assert.ok(output.includes(value),value);
 assert.equal(state.completed.size,1);assert.ok(state.completed.has(0));assert.equal(button.disabled,false);
 await get('#plan-map').onclick();assert.equal(mapCalls.length,1);
 get('#save-plan').onclick();assert.ok(saved['sanguo.travel-plans.v1']);
 for(const data of [{answer:'文化答复',intent:{intent:'culture_qa'}},{answer:'预算答复',intent:{intent:'budget_ticket'},route:null},{answer:'暂无',intent:{intent:'route_planning'},route:{found:false,selection_reason:'没有匹配'}},{answer:'坏数据',intent:{intent:'route_planning'},route:{found:true,route:{},stops:[null]}}]) {
   const p=form.requestSubmit();requests.at(-1).resolve(data);await p;assert.equal(text(get('#plan-results')),output);assert.equal(get('#planner-retry').hidden,false);
 }
 const p=form.requestSubmit();requests.at(-1).reject(Object.assign(Error('timeout'),{name:'TimeoutError'}));await p;assert.match(get('#planner-status').textContent,/超时/);
 const question=requests.at(-1).q,retry=get('#planner-retry').onclick();assert.equal(requests.at(-1).q,question);requests.at(-1).resolve(response);await retry;
 get('#remaining-time').value='1';get('#replan-remaining').onclick();assert.match(requests.at(-1).q,/一天/);requests.at(-1).resolve(response);await flush();assert.equal(state.completed.size,1);
 const changed=form.requestSubmit();form.oninput();requests.at(-1).resolve({...response,route:{...response.route,route:{name:'旧条件结果'}}});await changed;assert.ok(!text(get('#plan-results')).includes('旧条件结果'));
 const late=form.requestSubmit();window.TravelModules.openStory({id:'other',title:'另一个故事',chapters:[]});requests.at(-1).resolve({...response,route:{...response.route,route:{name:'迟到错误覆盖'}}});await late;assert.ok(!text(get('#plan-results')).includes('迟到错误覆盖'));assert.equal(views.at(-1),'planner');
 await get('#load-budget').onclick({currentTarget:get('#load-budget')});assert.match(text(get('#budget-results')),/待接入/);
 await get('#load-travel').onclick({currentTarget:get('#load-travel')});assert.match(text(get('#travel-results')),/待接入/);
 window.TravelApi.estimateBudget=async()=>({status:'ok',data:{items:[{label:'门票',amount:0,sources:[null]}]}});
 await get('#load-budget').onclick({currentTarget:get('#load-budget')});assert.match(text(get('#budget-results')),/门票：待核验/);assert.ok(!text(get('#budget-results')).includes('门票：0 元'));
 for(const name of ['destinations','planner','plan','budget','travel'])assert.ok(fs.readFileSync(__dirname+'/index.html','utf8').includes('data-view-panel="'+name+'"'));
 console.log('PASS: existing trip form/chat bridge, validation, polymorphic results, missing fields, retry, stale request isolation, local replan, progress retained, disabled services and preserved panels');
})().catch(e=>{console.error(e);process.exitCode=1;});
