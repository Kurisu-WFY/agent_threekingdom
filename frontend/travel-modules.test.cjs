const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.dataset={};}
 addEventListener(type,fn){this['on'+type]=fn;}
 append(...ns){this.children.push(...ns);}replaceChildren(...ns){this.children=ns;}setAttribute(){}focus(){}
}
const removed=new Set(['#budget-results','#load-budget','#replan-remaining','#remaining-time']);
const copyCity=new Element('button');copyCity.dataset.city='巴中';
const nodes=new Map(),get=k=>{if(removed.has(k))return null;if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k);};
const values={city:'广元',origin:'南充',date:'',days:'0.5',people:'2',group:'家庭',transport:'自驾',explanation:'亲子故事版',hotel_tier:'舒适型',notes:'少走路'};
const fields=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Object.assign(new Element(),{value:v})]));
const form=get('#trip-form'),button=new Element('button');form.elements={...fields,namedItem:k=>fields[k]};form.querySelector=()=>button;form.reportValidity=()=>true;form.requestSubmit=()=>form.onsubmit({preventDefault(){},currentTarget:form});
const requests=[],views=[],mapCalls=[],saved={},states=new Map();
const story={id:'story',title:'测试故事',areas:['广元'],chapters:[{name:'第一幕',placeId:'a',role:'寻源'},{name:'第二幕',placeId:'b'},{name:'第三幕',placeId:'c'}]};
const state={mode:'亲子故事版',completed:new Set([0]),skipped:new Set([2])};states.set('story',state);
const apiCalls=[];const unavailable=async p=>{apiCalls.push(p);return {status:'unavailable',message:'资料服务待接入'};};
const window={TravelApi:{listSpots:unavailable,createPlan:()=>{throw Error('must not use preview');},estimateBudget:unavailable,getTravelInfo:unavailable},
 StoryProgress:{get:s=>states.get(s.id)||{mode:'大众体验版',completed:new Set(),skipped:new Set()},save(){}},
 StoryMap:{getPlaces:()=>[{id:'a',name:'昭化古城'},{id:'b',name:'剑门关'},{id:'c',name:'米仓道'}]},
 SGTStoryUI:{openStory(){}},TravelMap:{showPlan:async r=>{mapCalls.push(r);return true;}},
 SGTChat:{request:(q,preferences)=>new Promise((resolve,reject)=>requests.push({q,preferences,resolve,reject}))}};
const context={window,URL,crypto:{randomUUID:()=>String(Math.random())},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},
 document:{querySelector:get,querySelectorAll:s=>s==='[data-plan-map]'?[get('#map-plan')]:s==='[data-city]'?[copyCity]:[],createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},
 FormData:class{constructor(){return Object.entries(fields).map(([k,v])=>[k,v.value]);}},showContentView:v=>views.push(v),toggleChat(){}};
vm.runInNewContext(fs.readFileSync(__dirname+'/weather-outlook-core.js','utf8'),context);
vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);
const confirm=()=>{if(!get('#activity-conflict').hidden){if(!get('#conflict-city').value)get('#conflict-city').value='广元';get('#conflict-adopt').onclick();}};
const openCity=(...args)=>{window.TravelModules.openCity(...args);confirm();};
const openStory=(...args)=>{window.TravelModules.openStory(...args);confirm();};
const text=n=>n.textContent+n.children.map(text).join(' '),flush=()=>new Promise(r=>setImmediate(r));
assert.ok(fs.existsSync(__dirname+'/cities.js'),'one shared city source is loaded before destination and weather modules');
const cityWindow={};vm.runInNewContext(fs.readFileSync(__dirname+'/cities.js','utf8'),{window:cityWindow,document:{querySelector:get,createElement:t=>new Element(t)}});
const cityNames=['南充','阆中','广元','成都','绵阳','德阳','巴中','达州'];
assert.deepEqual([...cityWindow.SGTCities],cityNames);
assert.deepEqual(get('#destination-cities').children.map(x=>x.dataset.city),cityNames);
assert.deepEqual(get('#itinerary-cities').children.map(x=>x.value),cityNames);
for(const id of ['#outing-start','#outing-end'])assert.deepEqual(get(id).children.map(x=>x.value),['',...cityNames,'manual']);
const weatherForm=get('#travel-weather-form');weatherForm.reportValidity=()=>Boolean(get('#travel-city').value);
const activityPlanFixture={title:'结构化活动测试夹具',days:[{day:1,stops:[{name:'本章阅读',stay_minutes:90}]}],data_status:'sample'};
const response={answer:'示例活动：先参观剑门关，停留90分钟，文化讲解关隘主题。',intent:{intent:'route_planning'},route:{found:true,route:{name:'路线',duration_hours:8,transport_mode:'公共交通',risk_note:'需确认路况',updated_at:'2026-09-17T10:00:00+08:00'},selection_reason:'优先保留第二幕',stops:[{stop_order:1,name:'剑门关',spot_id:'b',reason:'了解关隘主题',stay_minutes:90,recommended_duration_min:120,open_time:'待确认',address:'广元市剑阁县'}]}};
(async()=>{
 const ninthFailures=[],ninthCheck=(c,fn)=>{try{fn();}catch(e){ninthFailures.push(c+': '+e.message);}};
 const ninthSpots=window.TravelApi.listSpots,ninthWeather=window.TravelApi.getTravelInfo;
 window.TravelApi.listSpots=async()=>({status:'ok',data:{spots:[{name:'测试景区',sources:['A','B','C'].map(source_level=>({title:'测试出处',source_url:'https://example.org',source_level}))}]}});
 await copyCity.onclick();ninthCheck('C12 历史',()=>{const out=text(get('#destination-results'));for(const v of ['A=权威资料','B=较可靠资料','C=文学/传说','不能支撑史实结论'])assert.ok(out.includes(v),v);});
 get('#travel-city').value='南充';
 for(const units of [{pm2_5:'μg/m³',pm10:'μg/m³'},undefined,{pm2_5:'',pm10:42}]){
 window.TravelApi.getTravelInfo=async()=>({status:'ok',data:{air_quality:{time:'2026-10-03T01:00',pm2_5:13,pm10:20,units},items:[{title:'天气',data_status:'forecast',updated_at:'2026-10-03T01:00:00+08:00',sources:[{title:'Open-Meteo',source_level:'C',source_url:'https://open-meteo.com'}]}]}});
 await weatherForm.onsubmit({preventDefault(){}});
 ninthCheck('C12 实时',()=>{const out=text(get('#travel-results'));assert.match(out,/模型预报、非现场实测/);assert.doesNotMatch(out,/来源等级|文学\/传说|史实结论/);assert.match(out,/Open-Meteo/);});
 ninthCheck('移除 AQI',()=>assert.doesNotMatch(text(get('#travel-results')),/PM2.5|PM10|AQI|当前空气质量/));
 }
 window.TravelApi.listSpots=ninthSpots;window.TravelApi.getTravelInfo=ninthWeather;
 assert.equal(ninthFailures.join('\n'),'','C12/C15');

 const copyFailures=[],copyCheck=(name,fn)=>{try{fn();}catch(e){copyFailures.push(name+': '+e.message);}};
 const originalSpots=window.TravelApi.listSpots,copyWeather=window.TravelApi.getTravelInfo;
 for(const status of ['empty','ok']){
  window.TravelApi.listSpots=async()=>({status,message:'景区演示资料；开放时间及票价须核验。',data:{spots:[]}});
  await copyCity.onclick();copyCheck('C06 '+status,()=>assert.match(text(get('#destination-results')),/当前资料库暂无该目的地景区资料，不代表当地没有景点/));
 }
 window.TravelApi.listSpots=async()=>{throw TypeError('Failed to fetch');};await copyCity.onclick();
 copyCheck('C02 景区',()=>{assert.match(get('#destination-results').children[0].textContent,/景区查询失败.*检查网络.*重试/);const d=get('#destination-results').children.find(n=>n.tag==='details');assert.ok(d&&!d.open);assert.match(text(d),/Failed to fetch/);assert.ok(get('#destination-results').children.some(n=>n.tag==='button'));});
 get('#travel-city').value='南充';window.TravelApi.getTravelInfo=async()=>{throw TypeError('Failed to fetch');};await weatherForm.onsubmit({preventDefault(){}});
 copyCheck('C02 天气',()=>{assert.match(get('#travel-status').textContent,/天气查询失败.*检查网络.*重试/);assert.doesNotMatch(get('#travel-status').textContent,/Failed to fetch/);assert.match(text(get('#travel-results').children.find(n=>n.tag==='details')),/Failed to fetch/);assert.equal(get('#load-travel').disabled,false);});
 window.TravelApi.getTravelInfo=async()=>({status:'ok',data:{fetched_at:'2026-10-02T17:05:03.852032+00:00',air_quality:{time:'2026-10-03T01:00',pm2_5:13,pm10:13},items:[{title:'模型',summary:'数据时刻 2026-10-03T01:00（北京时间）；原说明。',fetched_at:'2026-10-02T17:05:03.852032+00:00',data_status:'model'}]}});await weatherForm.onsubmit({preventDefault(){}});
 copyCheck('C05',()=>{const out=text(get('#travel-results'));assert.doesNotMatch(out,/当前空气质量|PM2.5|AQI/);assert.match(out,/查询时间（可能为缓存）：2026年10月03日 01:05（北京时间）/);const findOriginal=n=>n.tag==='details'&&n.children[0]?.textContent==='原始服务说明（保留原文）'?n:n.children.map(findOriginal).find(Boolean);const original=findOriginal(get('#travel-results'));assert.match(text(original),/数据时刻 2026-10-03T01:00/);});
 window.TravelApi.listSpots=originalSpots;window.TravelApi.getTravelInfo=copyWeather;
 for(const time of ['2026-99-99','2026-02-30T01:00:00Z','2026-04-31T01:00']){
  window.TravelApi.getTravelInfo=async()=>({status:'ok',data:{air_quality:{time},items:[{title:'非法时间',fetched_at:time,data_status:'model'}]}});
  await weatherForm.onsubmit({preventDefault(){}});assert.match(text(get('#travel-results')),/查询时间（可能为缓存）：待确认/,'C05 非法日历日期不冒充有效时刻');
 }
 window.TravelApi.getTravelInfo=copyWeather;
 assert.equal(copyFailures.join('\n'),'','C02/C05/C06');

 const directQuestions=[];window.SGTJourney={ask:q=>directQuestions.push(q)};
 openCity('成都','武侯祠');assert.equal(fields.city.value,'成都');assert.equal(fields.notes.value,'少走路');assert.match(get('#planner-auto-places').textContent,/武侯祠/);assert.equal(views.at(-1),'planner');assert.equal(directQuestions.length,0,'destination action prefills the shared form instead of sending chat');
 const today=new Date(),localToday=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 assert.equal(fields.date.value,localToday,'empty date receives local today on destination handoff');
 fields.origin.value='';fields.date.value='2026-10-07';
 openCity('阆中');
 assert.equal(fields.origin.value,'','handoff must not invent an origin');assert.equal(fields.date.value,'2026-10-07','user date stays intact');
 assert.match(get('#planner-status').textContent,/目的地：阆中.*保留：出发地/);
 const beforeEmptyMap=views.length;window.TravelMap.getPlanSelection=()=>({cities:[],places:[]});get('#map-plan').onclick();
 assert.equal(views.length,beforeEmptyMap,'empty map selection must not open a fixed-city plan');assert.match(get('#map-plan-status').textContent,/请先在地图选择地点/);
 window.TravelMap.getPlanSelection=()=>({cities:['南充'],places:['仪陇县']});get('#map-plan').onclick();confirm();
 assert.equal(fields.city.value,'南充');assert.match(get('#planner-auto-places').textContent,/仪陇县/);assert.match(get('#planner-status').textContent,/目的地：南充/);
 window.TravelMap.getPlanSelection=()=>({cities:['南充','广元'],places:['仪陇县','剑阁县']});get('#map-plan').onclick();
 get('#conflict-city').value='南充';get('#conflict-cross-confirm').checked=true;get('#conflict-cross').onclick();assert.equal(fields.city.value,'南充、广元');assert.match(get('#planner-auto-places').textContent,/仪陇县.*剑阁县/);
 window.TravelMap.getPlanSelection=()=>({cities:[],places:['已定位景点']});get('#map-plan').onclick();
 assert.equal(fields.city.value,'南充、广元','unknown region stays pending instead of being guessed');assert.equal(get('#conflict-city').value,'');assert.match(get('#conflict-differences').textContent,/地区尚未提供/);get('#conflict-cancel').onclick();
 fields.origin.value='南充';fields.date.value='';
 fields.city.value='广元';fields.city.onchange();confirm();fields.notes.value='少走路';
 delete window.SGTJourney;
 const initialCalls=apiCalls.length;window.TravelModules.onEnterTravel();assert.equal(apiCalls.length,initialCalls,'entering weather view must not request');
 window.TravelModules.prefillTravel('阆中','2026-10-04');assert.equal(get('#travel-city').value,'阆中');assert.equal(apiCalls.length,initialCalls,'handoff only prefills weather');
 get('#travel-city').value='南充';
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.equal(apiCalls.at(-1).city,'南充');assert.match(get('#travel-status').textContent,/待接入|重试/);
 const originalWeather=window.TravelApi.getTravelInfo;
 window.TravelApi.getTravelInfo=async()=>({status:'ok',data:{forecast:[{date:window.WeatherOutlook.datesFromToday()[0],temperature_min_c:10,temperature_max_c:20,rain_probability_percent:30}],air_quality:{time:'2026-10-01T08:00:00+08:00',pm2_5:12,pm10:28},items:[{title:'模型天气',summary:'仅供参考',data_status:'forecast',fetched_at:'2026-10-01T08:05:00+08:00',sources:[{title:'公开天气来源',source_url:'https://example.org/weather',source_level:'A'}]}]}});
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.ok(text(get('#travel-results')).includes(window.WeatherOutlook.datesFromToday()[0]));assert.match(text(get('#travel-results')),/公开天气来源/);assert.match(text(get('#travel-results')),/查询时间.*2026年10月01日 08:05（北京时间）/);
 window.TravelApi.getTravelInfo=originalWeather;
 let finishOldWeather;
 window.TravelApi.getTravelInfo=()=>new Promise(resolve=>finishOldWeather=resolve);
 const oldWeather=weatherForm.onsubmit({preventDefault(){}});
 window.TravelModules.prefillTravel('成都','2026-10-05');
 assert.equal(get('#load-travel').disabled,false,'prefill must release an obsolete weather request');
 finishOldWeather({status:'ok',data:{items:[{title:'旧南充天气',summary:'迟到结果'}]}});await oldWeather;
 assert.doesNotMatch(text(get('#travel-results')),/旧南充天气/,'previous city weather must not overwrite prefilled destination');
 window.TravelApi.getTravelInfo=originalWeather;
 openStory(story);assert.equal(views.at(-1),'planner');
 assert.equal(window.TravelModules.getParentView('planner'),'planner');
 window.TravelModules.onEnterTravel('plan');assert.equal(window.TravelModules.getParentView('travel'),'planner','weather now belongs to the inline activity planner');
 window.TravelModules.onEnterTravel('destinations');assert.equal(window.TravelModules.getParentView('travel'),'planner');
 fields.origin.value='   ';await form.requestSubmit();assert.equal(requests.length,0);
 fields.origin.value='南充';fields.people.value='0';await form.requestSubmit();assert.equal(requests.length,0);fields.people.value='2';
 const pending=form.requestSubmit();assert.equal(button.disabled,true);form.requestSubmit();assert.equal(requests.length,1);
 assert.equal(requests[0].preferences,undefined,'活动生成不附带强制路线模板参数');
 assert.match(requests[0].q,/活动顺序/);assert.match(requests[0].q,/住宿.*舒适型.*3.0,3.5/);assert.doesNotMatch(requests[0].q,/房间数|预算|交通方式|规划旅游路线/);assert.match(requests[0].q,/半天/);assert.match(requests[0].q,/第一幕.*已完成/);assert.match(requests[0].q,/第三幕.*本次跳过/);assert.match(requests[0].q,/只调整未完成/);
 requests[0].resolve({...response,intent:{intent:'culture_qa'},route:null,plan:activityPlanFixture});await pending;assert.equal(views.at(-1),'plan');
 const output=text(get('#plan-results'));assert.match(output,/示例活动.*文化讲解/);assert.doesNotMatch(output,/间房|总预算/);
 assert.equal(state.completed.size,1);assert.ok(state.completed.has(0));assert.equal(button.disabled,false);
 assert.equal(get('#plan-map').disabled,true,'无结构化地点时不猜测导航');
 get('#save-plan').onclick();assert.ok(saved['sanguo.travel-plans.v1']);
 for(const data of [{answer:''},{answer:null},{route:{found:true,stops:[null]}}]) {
   const p=form.requestSubmit();requests.at(-1).resolve(data);await p;assert.equal(text(get('#plan-results')),output);assert.equal(get('#planner-retry').hidden,false);
 }
 const culture=form.requestSubmit();requests.at(-1).resolve({answer:'文化活动：读《三国志》，20分钟，讲解史家写作。',intent:{intent:'culture_qa'},plan:activityPlanFixture});await culture;assert.match(text(get('#plan-results')),/文化活动/);assert.match(text(get('#plan-results')),/来源.*文献引用/,'C01 方案继承缺出处提示');
 const p=form.requestSubmit();requests.at(-1).reject(Object.assign(Error('timeout'),{name:'TimeoutError'}));await p;assert.match(get('#planner-status').textContent,/超时/);
 const question=requests.at(-1).q,retry=get('#planner-retry').onclick();assert.equal(requests.at(-1).q,question);requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null,plan:activityPlanFixture});await retry;
 const changed=form.requestSubmit();form.oninput();requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null,answer:'旧条件结果'});await changed;assert.ok(!text(get('#plan-results')).includes('旧条件结果'));
 const late=form.requestSubmit();openStory({id:'other',title:'另一个故事',chapters:[]});requests.at(-1).resolve({...response,intent:{intent:'culture_qa'},route:null,answer:'迟到错误覆盖'});await late;assert.ok(!text(get('#plan-results')).includes('迟到错误覆盖'));assert.equal(views.at(-1),'planner');
 const beforePrefill=apiCalls.length;window.TravelModules.onEnterTravel();assert.equal(get('#travel-city').value,'广元');assert.equal(apiCalls.length,beforePrefill,'prefill must not request');
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 assert.doesNotMatch(html,/查看上一份方案/,'U03 entry describes the current result');
 const planHtml=html.match(/<section[^>]*id="plan-view"[\s\S]*?<\/section>/)[0];
 for(const id of ['save-plan','copy-plan'])assert.ok(planHtml.indexOf('id="'+id+'"')<planHtml.indexOf('id="plan-results"'),'U04 '+id+' comes before long plan prose');
 const nodeHtml=html.match(/<section[^>]*id="node-view"[\s\S]*?<\/section>/)[0];
 assert.ok(nodeHtml.indexOf('id="node-ask"')>=0 && nodeHtml.indexOf('id="node-ask"')<nodeHtml.indexOf('id="node-reading"'),'U04 ask exists before node prose');
 for(const name of ['city','people'])assert.match(html,new RegExp('<label>[^<]*必填[^<]*<input name="'+name+'"[^>]*required'),'U09 required field '+name+' is labelled before submit');
 assert.match(html,/<label for="trip-origin">出发地（必填）<\/label>/,'U09 origin has an explicit required label beside the location control');
 assert.match(html,/<input id="trip-origin" name="origin"[^>]*required/,'U09 origin label remains associated with its required input');
 assert.match(html,/<label>出发日期（选填）/);
 const road=window.TravelModules.getRoadDraft('plan');assert.equal(road.origin,'南充');assert.equal(road.city,'广元');
 for(const name of ['destinations','planner','plan'])assert.ok(html.includes('data-view-panel="'+name+'"'));
 assert.match(html,/name="hotel_tier"/);
 assert.doesNotMatch(html,/房间数|预算明细|重绘剩余路线|预算与住宿设置|name="(?:rooms|budget_min|budget_max|budget_limit|hotel_per_room|meals_per_person_day|transport_total)"/);
 assert.ok(html.includes('带入活动计划')&&html.includes('生成活动方案'));
 assert.ok(html.includes('id="amap-map"')&&html.includes('id="travel-weather-form"')&&!html.includes('id="outing-weather-form"'));
 const journeyCalls=[];window.SGTJourney={ask:(q,o)=>journeyCalls.push({q,o})};
 await form.requestSubmit();const activity=journeyCalls.at(-1);
 assert.match(activity.o.displayText,/广元|测试故事/,'U01 activity has visitor summary');
 assert.doesNotMatch(activity.o.displayText,/只输出|只调整|不要编造|必须|合计上限/);
 assert.match(activity.q,/无依据标待确认.*不要编造实时/,'U01 constraints remain in request');
 assert.equal(views.at(-1),'planner','U03 generation does not jump away from editable form');
 assert.match(activity.q,/住宿.*舒适型.*3.0,3.5.*酒店查询工具/);
 assert.match(activity.o.displayText,/舒适型/);
 assert.doesNotMatch(activity.q,/房间数|预算|交通方式|规划旅游路线/);
 assert.ok(activity.o.activityPlan);
 window.TravelModules.receiveActivity({text:'活动方案：先读史，停留90分钟，讲解陈寿。',data:{plan:activityPlanFixture},activityPlan:activity.o.activityPlan});
 assert.equal(get('#view-current-plan').hidden,false,'U03 result provides direct current-plan entry');
 assert.match(get('#planner-status').textContent,/本次方案/);
 assert.match(text(get('#plan-results')),/先读史.*90分钟/);assert.equal(get('#save-plan').disabled,false);assert.equal(get('#copy-plan').disabled,false);
 get('#save-plan').onclick();assert.match(saved['sanguo.travel-plans.v1'],/先读史/);assert.match(get('#plan-status').textContent,/已保存/);
 let copied;context.navigator={clipboard:{writeText:async t=>copied=t}};get('#plan-results').innerText=text(get('#plan-results'));
 await get('#copy-plan').onclick();assert.match(copied,/先读史/);assert.match(get('#plan-status').textContent,/已复制/);
 await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 openCity('南充');fields.days.value='1';fields.people.value='2';fields.date.value='2026-10-02';await form.requestSubmit();const simple=journeyCalls.at(-1).o.activityPlan;assert.equal(simple.preferences.days,1);assert.equal(simple.preferences.people,2);assert.equal(simple.preferences.date,'2026-10-02');
 window.TravelModules.receiveActivity({text:'活动方案：先读史，停留90分钟，讲解陈寿。',data:{plan:activityPlanFixture},activityPlan:simple});
 assert.equal(window.TravelModules.getParentView('plan'),'planner','ordinary activity remains in activity domain');
 const beforePlanPrefill=apiCalls.length;window.TravelModules.onEnterTravel('plan');assert.equal(get('#travel-city').value,'南充');assert.equal(fields.date.value,'2026-10-02','weather horizon does not change the activity date');assert.equal(apiCalls.length,beforePlanPrefill,'plan prefill must not call weather API');
 get('#save-plan').onclick();const storedActivity=JSON.parse(saved['sanguo.travel-plans.v1'])[0];assert.equal(storedActivity.preferences.days,1);
 const oldOutput=text(get('#plan-results'));
 window.TravelModules.receiveActivity({text:'推荐路线与预算',data:{intent:{intent:'route_planning'},route:{found:true}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 window.TravelModules.receiveActivity({text:'资料摘录不是活动方案',data:{generation:{kind:'retrieval_fallback'}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 window.TravelModules.receiveActivity({text:'住宿预算800元',data:{intent:{intent:'budget_ticket'}},activityPlan:simple});assert.equal(text(get('#plan-results')),oldOutput);assert.match(get('#planner-status').textContent,/尚未收到活动方案/);
 await form.requestSubmit();form.oninput();assert.match(get('#planner-status').textContent,/条件已修改.*旧请求不会覆盖.*重新/,'chat activity request changes need visible guidance');const changedPrimary=journeyCalls.at(-1).o.activityPlan;window.TravelModules.receiveActivity({text:'输入变化后不覆盖',activityPlan:changedPrimary});assert.equal(text(get('#plan-results')),oldOutput);window.TravelModules.receiveActivity({text:'旧活动不得覆盖',activityPlan:activity.o.activityPlan});assert.equal(text(get('#plan-results')),oldOutput);
 vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);
 assert.equal(get('#view-current-plan').hidden,false,'saved plans remain reachable after reload');
 assert.match(get('#view-current-plan').textContent,/本机保存/);
 get('#saved-plans').children[0].children[1].onclick();assert.match(text(get('#plan-results')),/先读史/);assert.equal(get('#save-plan').disabled,false);await weatherForm.onsubmit({preventDefault(){},currentTarget:weatherForm});assert.match(get('#travel-status').textContent,/待接入|重试/);
 openCity('成都');assert.equal(get('#planner-view').dataset.activityState,'stale','changing the destination leaves the saved answer visible but marks it as old conditions');
 const copyEvidence={sources:[{title:'原出处',source_url:'https://example.org/source',source_level:'B'}],data_status:'maintained',updated_at:'2026-10-03T01:00:00+08:00'};
 const copyCalls=[];window.SGTAnswerTrust={render:r=>{copyCalls.push(r);const el=new Element('p');el.textContent=r.sources?.[0]?.title||'来源待确认；文献出处尚未确认';return el;}};
 await form.requestSubmit();const copyAttempt=journeyCalls.at(-1).o.activityPlan;
 window.TravelModules.receiveActivity({text:'原活动正文，PDF第3页。',data:{...copyEvidence,plan:activityPlanFixture},activityPlan:copyAttempt});
 assert.equal(copyCalls.at(-1).sources[0].source_url,'https://example.org/source','C01 继承真实结构化来源，不猜PDF链接');
 assert.match(text(get('#plan-results')),/原出处.*原活动正文，PDF第3页/);
 get('#save-plan').onclick();const copySaved=JSON.parse(saved['sanguo.travel-plans.v1'])[0];assert.equal(copySaved.activityAnswer,'原活动正文，PDF第3页。');assert.equal(copySaved.activityEvidence.sources[0].title,'原出处');
 const beforeHotels=apiCalls.length;get('#load-hotels').onclick();assert.equal(apiCalls.length,beforeHotels,'未接入住宿不发假查询');assert.match(text(get('#hotel-results')),/舒适型.*3.0,3.5.*未接入/);
 const legacyPlans=JSON.parse(saved['sanguo.travel-plans.v1']);delete legacyPlans[0].preferences.hotel_tier;saved['sanguo.travel-plans.v1']=JSON.stringify(legacyPlans);fields.hotel_tier.value='豪华型';
 vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);get('#saved-plans').children[0].children[1].onclick();assert.equal(fields.hotel_tier.value,'','旧方案没有住宿需求，不能继承表单残留档位');
 // Explicit retired saved-plan fixture: no catalog revival or orphan chapter controls.
 const orphan={...copySaved,id:'orphan-plan',story:{id:'shudao-xunzong',title:'旧故事快照夹具',chapters:[{name:'旧夹具章'}]},choices:[{name:'旧夹具章'}]};
 saved['sanguo.travel-plans.v1']=JSON.stringify([orphan]);window.SGT_STORIES=[{id:'chenshou-book-history',title:'陈寿编书史',chapters:[]}];
 vm.runInNewContext(fs.readFileSync(__dirname+'/travel-modules.js','utf8'),context);get('#saved-plans').children[0].children[1].onclick();
 assert.doesNotMatch(text(get('#planner-story')),/旧故事|旧夹具章/);assert.equal(get('#planner-back-story').textContent,'返回目的地');
 assert.match(text(get('#plan-results')),/原活动正文/,'existing saved activity answer stays readable');
 get('#save-plan').onclick();assert.equal(JSON.parse(saved['sanguo.travel-plans.v1'])[0].story,null);assert.deepEqual(JSON.parse(saved['sanguo.travel-plans.v1'])[0].choices,[]);
 console.log('PASS: existing trip form/chat bridge, validation, polymorphic results, missing fields, retry, stale request isolation, retired DOM null safety, activity replies, save/copy/weather, stale reply isolation and preserved maps/panels');
})().catch(e=>{console.error(e);process.exitCode=1;});
