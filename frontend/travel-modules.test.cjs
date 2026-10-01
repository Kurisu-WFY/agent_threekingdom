const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.dataset={};}
 addEventListener(type,fn){this['on'+type]=fn;}
 append(...ns){this.children.push(...ns);}replaceChildren(...ns){this.children=ns;}setAttribute(){}focus(){}
}
const removed=new Set(['#budget-results','#load-budget','#replan-remaining','#remaining-time']);
const nodes=new Map(),get=k=>{if(removed.has(k))return null;if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k);};
const values={city:'广元',origin:'南充',date:'',days:'0.5',people:'2',group:'家庭',transport:'自驾',explanation:'亲子故事版',notes:'少走路'};
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
 SGTChat:{request:(q,preferences)=>new Promise((resolve,reject)=>requests.push({q,preferences,resolve,reject}))}};
const context={window,URL,crypto:{randomUUID:()=>String(Math.random())},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},
 document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t)},
 FormData:class{constructor(){return Object.entries(fields).map(([k,v])=>[k,v.value]);}},showContentView:v=>views.push(v),toggleChat(){}};
vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);
const text=n=>n.textContent+n.children.map(text).join(' '),flush=()=>new Promise(r=>setImmediate(r));
assert.ok(fs.existsSync(__dirname+'/cities.js'),'one shared city source is loaded before destination and weather modules');
const cityWindow={};vm.runInNewContext(fs.readFileSync(__dirname+'/cities.js','utf8'),{window:cityWindow,document:{querySelector:get,createElement:t=>new Element(t)}});
const cityNames=['南充','阆中','广元','成都','绵阳','德阳','巴中','达州'];
assert.deepEqual([...cityWindow.SGTCities],cityNames);
assert.deepEqual(get('#destination-cities').children.map(x=>x.dataset.city),cityNames);
assert.deepEqual(get('#itinerary-cities').children.map(x=>x.value),cityNames);
for(const id of ['#outing-start','#outing-end'])assert.deepEqual(get(id).children.map(x=>x.value),['',...cityNames,'manual']);
const weatherForm=get('#travel-weather-form');weatherForm.reportValidity=()=>Boolean(get('#travel-city').value);
const response={answer:'示例活动：先参观剑门关，停留90分钟，文化讲解关隘主题。',intent:{intent:'route_planning'},route:{found:true,route:{name:'路线',duration_hours:8,transport_mode:'公共交通',risk_note:'需核验路况',updated_at:'2026-09-17T10:00:00+08:00'},selection_reason:'优先保留第二幕',stops:[{stop_order:1,name:'剑门关',spot_id:'b',reason:'了解关隘主题',stay_minutes:90,recommended_duration_min:120,open_time:'待核验',address:'广元市剑阁县'}]}};
(async()=>{
 const directQuestions=[];window.SGTJourney={ask:q=>directQuestions.push(q)};
 window.TravelModules.openCity('成都','武侯祠');assert.equal(fields.city.value,'成都');assert.match(fields.notes.value,/武侯祠/);assert.equal(views.at(-1),'planner');assert.equal(directQuestions.length,0,'destination action prefills the shared form instead of sending chat');
 fields.city.value='广元';fields.notes.value='少走路';
 delete window.SGTJourney;
 const initialCalls=apiCalls.length;window.TravelModules.onEnterTravel();assert.equal(apiCalls.length,initialCalls,'entering weather view must not request');
 window.TravelModules.prefillTravel('阆中','2026-10-04');assert.equal(get('#travel-city').value,'阆中');assert.equal(get('#travel-date').value,'2026-10-04');assert.equal(apiCalls.length,initialCalls,'handoff only prefills weather');
 get('#travel-city').value='南充';get('#travel-date').value='2026-10-03';
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.equal(apiCalls.at(-1).city,'南充');assert.match(get('#travel-status').textContent,/待接入|重试/);
 const originalWeather=window.TravelApi.getTravelInfo;
 window.TravelApi.getTravelInfo=async()=>({status:'ok',data:{forecast:[{date:'2026-10-03',temperature_min_c:10,temperature_max_c:20,rain_probability_percent:30}],air_quality:{time:'2026-10-01T08:00:00+08:00',pm2_5:12,pm10:28},items:[{title:'模型天气',summary:'仅供参考',data_status:'forecast',fetched_at:'2026-10-01T08:05:00+08:00',sources:[{title:'公开天气来源',source_url:'https://example.org/weather',source_level:'A'}]}]}});
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(text(get('#travel-results')),/2026-10-03（所选日期）/);assert.match(text(get('#travel-results')),/公开天气来源/);assert.match(text(get('#travel-results')),/查询时间.*2026-10-01T08:05:00/);
 window.TravelApi.getTravelInfo=originalWeather;
 window.TravelModules.openStory(story);assert.equal(views.at(-1),'planner');
 assert.equal(window.TravelModules.getParentView('planner'),'planner');
 window.TravelModules.onEnterTravel('plan');assert.equal(window.TravelModules.getParentView('travel'),'planner');assert.equal(get('#travel-back').dataset.contentView||'planner','planner');
 window.TravelModules.onEnterTravel('destinations');assert.equal(window.TravelModules.getParentView('travel'),'planner');assert.equal(get('#travel-back').dataset.contentView||'planner','planner');
 fields.origin.value='   ';await form.requestSubmit();assert.equal(requests.length,0);
 fields.origin.value='南充';fields.people.value='0';await form.requestSubmit();assert.equal(requests.length,0);fields.people.value='2';
 const pending=form.requestSubmit();assert.equal(button.disabled,true);form.requestSubmit();assert.equal(requests.length,1);
 assert.equal(requests[0].preferences,undefined,'活动生成不附带强制路线模板参数');
 assert.match(requests[0].q,/活动顺序/);assert.doesNotMatch(requests[0].q,/住宿|房间数|预算|交通方式|交通可行性|规划旅游路线/);assert.match(requests[0].q,/半天/);assert.match(requests[0].q,/第一幕.*已完成/);assert.match(requests[0].q,/第三幕.*本次跳过/);assert.match(requests[0].q,/只调整未完成/);
 requests[0].resolve({...response,intent:{intent:'culture_qa'},route:null});await pending;assert.equal(views.at(-1),'plan');
 const output=text(get('#plan-results'));assert.match(output,/示例活动.*文化讲解/);assert.doesNotMatch(output,/舒适型|间房|总预算/);
 assert.equal(state.completed.size,1);assert.ok(state.completed.has(0));assert.equal(button.disabled,false);
 assert.equal(get('#plan-map').disabled,true,'无结构化地点时不猜测导航');
 get('#save-plan').onclick();assert.ok(saved['sanguo.travel-plans.v1']);
 for(const data of [{answer:''},{answer:null},{route:{found:true,stops:[null]}}]) {
   const p=form.requestSubmit();requests.at(-1).resolve(data);await p;assert.equal(text(get('#plan-results')),output);assert.equal(get('#planner-retry').hidden,false);
 }
 const culture=form.requestSubmit();requests.at(-1).resolve({answer:'文化活动：读《三国志》，20分钟，讲解史家写作。',intent:{intent:'culture_qa'}});await culture;assert.match(text(get('#plan-results')),/文化活动/);
 const p=form.requestSubmit();requests.at(-1).reject(Object.assign(Error('timeout'),{name:'TimeoutError'}));await p;assert.match(get('#planner-status').textContent,/超时/);
 const question=requests.at(-1).q,retry=get('#planner-retry').onclick();assert.equal(requests.at(-1).q,question);requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null});await retry;
 const changed=form.requestSubmit();form.oninput();requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null,answer:'旧条件结果'});await changed;assert.ok(!text(get('#plan-results')).includes('旧条件结果'));
 const late=form.requestSubmit();window.TravelModules.openStory({id:'other',title:'另一个故事',chapters:[]});requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null,answer:'迟到错误覆盖'});await late;assert.ok(!text(get('#plan-results')).includes('迟到错误覆盖'));assert.equal(views.at(-1),'planner');
 const beforePrefill=apiCalls.length;window.TravelModules.onEnterTravel();assert.equal(get('#travel-city').value,'广元');assert.equal(get('#travel-date').value,'');assert.equal(apiCalls.length,beforePrefill,'prefill must not request');
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const name of ['destinations','planner','plan','travel'])assert.ok(html.includes('data-view-panel="'+name+'"'));
 assert.doesNotMatch(html,/住宿档位|房间数|预算明细|重绘剩余路线|预算与住宿设置|name="(?:rooms|hotel_tier|budget_min|budget_max|budget_limit|hotel_per_room|meals_per_person_day|transport_total)"/);
 assert.ok(html.includes('带入活动计划')&&html.includes('生成活动方案'));
 assert.ok(html.includes('id="amap-map"')&&html.includes('id="travel-weather-form"')&&!html.includes('id="outing-weather-form"'));
 const journeyCalls=[];window.SGTJourney={ask:(q,o)=>journeyCalls.push({q,o})};
 await form.requestSubmit();const activity=journeyCalls.at(-1);
 assert.doesNotMatch(activity.q,/住宿|房间数|预算|交通方式|规划旅游路线/);
 assert.ok(activity.o.activityPlan);
 window.TravelModules.receiveActivity({text:'活动方案：先读史，停留90分钟，讲解陈寿。',activityPlan:activity.o.activityPlan});
 assert.match(text(get('#plan-results')),/先读史.*90分钟/);assert.equal(get('#save-plan').disabled,false);assert.equal(get('#copy-plan').disabled,false);
 get('#save-plan').onclick();assert.match(saved['sanguo.travel-plans.v1'],/先读史/);assert.match(get('#plan-status').textContent,/已保存/);
 let copied;context.navigator={clipboard:{writeText:async t=>copied=t}};get('#plan-results').innerText=text(get('#plan-results'));
 await get('#copy-plan').onclick();assert.match(copied,/先读史/);assert.match(get('#plan-status').textContent,/已复制/);
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 window.TravelModules.openCity('南充');fields.days.value='1';fields.people.value='2';fields.date.value='2026-10-02';await form.requestSubmit();const simple=journeyCalls.at(-1).o.activityPlan;assert.equal(simple.preferences.days,1);assert.equal(simple.preferences.people,2);assert.equal(simple.preferences.date,'2026-10-02');
 window.TravelModules.receiveActivity({text:'活动方案：先读史，停留90分钟，讲解陈寿。',activityPlan:simple});
 assert.equal(window.TravelModules.getParentView('plan'),'planner','ordinary activity remains in activity domain');
 const beforePlanPrefill=apiCalls.length;window.TravelModules.onEnterTravel('plan');assert.equal(get('#travel-city').value,'南充');assert.equal(get('#travel-date').value,'2026-10-02');assert.equal(apiCalls.length,beforePlanPrefill,'plan prefill must not call weather API');
 get('#save-plan').onclick();const storedActivity=JSON.parse(saved['sanguo.travel-plans.v1'])[0];assert.equal(storedActivity.preferences.days,1);
 const oldOutput=text(get('#plan-results'));
 window.TravelModules.receiveActivity({text:'推荐路线与预算',data:{intent:{intent:'route_planning'},route:{found:true}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 window.TravelModules.receiveActivity({text:'资料摘录不是活动方案',data:{generation:{kind:'retrieval_fallback'}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 window.TravelModules.receiveActivity({text:'住宿预算800元',data:{intent:{intent:'budget_ticket'}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 await form.requestSubmit();form.oninput();const changedPrimary=journeyCalls.at(-1).o.activityPlan;window.TravelModules.receiveActivity({text:'输入变化后不覆盖',activityPlan:changedPrimary});assert.equal(text(get('#plan-results')),oldOutput);window.TravelModules.receiveActivity({text:'旧活动不得覆盖',activityPlan:activity.o.activityPlan});assert.equal(text(get('#plan-results')),oldOutput);
 vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);
 get('#saved-plans').children[0].children[1].onclick();assert.match(text(get('#plan-results')),/先读史/);assert.equal(get('#save-plan').disabled,false);await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 window.TravelModules.openCity('成都');assert.equal(get('#planner-view').dataset.activityState,'stale','changing the destination leaves the saved answer visible but marks it as old conditions');
 console.log('PASS: existing trip form/chat bridge, validation, polymorphic results, missing fields, retry, stale request isolation, retired DOM null safety, activity replies, save/copy/weather, stale reply isolation and preserved maps/panels');
})().catch(e=>{console.error(e);process.exitCode=1;});
