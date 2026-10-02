const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const FE = __dirname;
const QUESTION = '南充一天三国文化路线';

/* ---------------- 最小 DOM 桩 ---------------- */
function makeNode(tag = 'div') {
  const node = {
    tagName: tag, children: [], attributes: {}, textContent: '', value: '', hidden: false,
    disabled: false, className: '', style: {setProperty(k,v){this[k]=v;}}, dataset: {}, scrollTop: 0, innerText: '',
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    append(...kids) { kids.forEach(k => { k.parent = this; this.children.push(k); }); },
    replaceChildren(...kids) { this.children = []; this.firstElementChild = undefined; this.append(...kids); this.firstElementChild = this.children[0]; },
    listeners: {}, addEventListener(type,fn) { this.listeners[type]=fn; }, removeEventListener() {}, focus() {}, scrollIntoView() {},
    setPointerCapture() { this.captured=true; }, getBoundingClientRect() { return { top: 0, left: 0, width: 900, height: 680 }; },
    getScreenCTM() { return { a: 1, b: 0, inverse: () => ({}) }; },
    closest(selector) { const key=selector.slice(1,-1);for(let current=this;current;current=current.parent)if(current.attributes[key]!==undefined)return current;return null; },
    querySelector() { return makeNode(); }
  };
  Object.defineProperty(node, 'firstElementChild', { writable: true, value: undefined });
  return node;
}
const registry = new Map();
const ids = ['route-map', 'map-place-picker', 'map-picker-title', 'map-picker-list', 'map-picker-close',
  'map-prefecture', 'map-county', 'map-add-stop', 'map-county-points', 'county-points', 'route-lines',
  'route-points', 'map-route-list', 'map-route-status', 'map-zoom-range', 'map-zoom-value',
  'map-zoom-in', 'map-zoom-out', 'map-reset', 'map-fit', 'map-clear', 'map-view', 'messages'];
ids.forEach(id => registry.set('#' + id, makeNode()));
registry.set('.interactive-map', makeNode());

global.document = {
  querySelector: selector => registry.get(selector) || (registry.set(selector, makeNode()), registry.get(selector)),
  createElement: tag => makeNode(tag),
  createElementNS: (ns, tag) => makeNode(tag),
  addEventListener() {}
};
global.Option = class Option { constructor(text, value) { this.text = text; this.value = value; } };
global.DOMPoint = class DOMPoint { constructor(x, y) { this.x = x; this.y = y; } matrixTransform(){return this;} };
global.getComputedStyle=()=>({getPropertyValue(name){return {'--map-text-city':'15px','--map-text-county':'9px'}[name]||'';}});
global.fetch = async url => {
  const file = path.join(FE, String(url));
  return { ok: fs.existsSync(file), json: async () => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) };
};
global.window = global;
const frames=[];let clock=0;global.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
function paintAll(){let n=0;while(frames.length&&n++<1000)frames.shift()(clock+=16);}
global.showContentView = view => { global.lastView = view; };
const chat = { messages: [] };
global.chats = [chat];
global.active = 0;

/* ---------------- 加载被测前端本体 ---------------- */
global.window.MapRouteCore = require(path.join(FE, 'map-route-core.js'));
vm.runInThisContext(fs.readFileSync(path.join(FE, 'travel-map.js'), 'utf8'), { filename: 'travel-map.js' });


const assert=require('node:assert/strict');
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));paintAll();
 const svg=registry.get('#route-map'),select=registry.get('#map-prefecture');
 assert.equal(registry.get('#county-boundaries').attributes.visibility,'hidden');
 assert.equal(registry.get('#map-fit').disabled,true,'no-route fit starts disabled');
 const provinceView=svg.attributes.viewBox;
 assert.deepEqual(window.TravelMap.getPlanSelection(),{cities:[],places:[]},'empty province has no invented cities');
 for(let i=0;i<3;i++){
   select.value='南充市';select.onchange();paintAll();
   assert.equal(svg.attributes.viewBox,provinceView,'changing prefecture does not pan or zoom');
   registry.get('#map-reset').onclick();paintAll();
   assert.equal(select.value,'','province button clears prefecture filter');
   assert.equal(registry.get('#map-county').value,'','province button clears county selection');
   assert.equal(registry.get('#map-county').children.length,184,'province button restores all counties');
   assert.equal(svg.attributes.viewBox,provinceView,'province button restores province viewport');
 }
 select.value='南充市';select.onchange();paintAll();
 assert.deepEqual(window.TravelMap.getPlanSelection(),{cities:['南充'],places:[]},'prefecture filter is a real city selection');
 for(let i=0;i<5;i++)registry.get('#map-zoom-in').onclick();paintAll();
 assert.ok(Number(svg.style['--map-unit'])<1,'map-unit shrinks SVG font units as viewport zooms');
 const oldLayout=window.MapRouteCore.labelLayout;let laidOut=[];
 window.MapRouteCore.labelLayout=(items,...args)=>{laidOut=items;return oldLayout(items,...args);};
 window.TravelMap.refreshLabels();
 assert.equal(laidOut.find(item=>item.city)?.size,15,'city collision box uses CSS screen-size token');
 assert.equal(laidOut.find(item=>!item.city)?.size,9,'county collision box uses CSS screen-size token');
 window.MapRouteCore.labelLayout=oldLayout;
 assert.equal(registry.get('#county-boundaries').attributes.visibility,'visible');
 const county=registry.get('#county-boundaries').children.find(n=>n.attributes['data-county-code']==='511324');
 assert.ok(county);
 const event={preventDefault(){this.prevented=true;},button:0,pointerId:1,clientX:0,clientY:0,target:county};
 const countyLabel=registry.get('#county-points').children.find(n=>n.attributes['data-county-code']==='511324').children.find(n=>n.tagName==='text');
 registry.get('#map-place-picker').hidden=true;
 svg.listeners.click({...event,target:countyLabel});
 assert.equal(registry.get('#map-county').value,'','clicking label must not select its parent county marker');
 assert.equal(registry.get('#map-place-picker').hidden,true);
 const place=window.TravelMap.getPlaces().find(p=>String(p.adcode)==='511324');
 const [nearX,nearY]=window.MapRouteCore.project(place.center);
 svg.listeners.click({...event,target:svg,clientX:nearX,clientY:nearY});
 assert.ok(registry.get('#map-county').value==='county-511324'||!registry.get('#map-place-picker').hidden,'blank-area nearby picking remains available');
 select.onchange();paintAll();
 svg.listeners.pointerdown(event);assert.equal(svg.captured,undefined);svg.listeners.pointerup(event);svg.listeners.click(event);
 assert.equal(registry.get('#map-county').value,'county-511324');
 assert.equal(registry.get('#map-picker-title').textContent,'仪陇县 · 南充市');
 assert.deepEqual(window.TravelMap.getPlanSelection(),{cities:['南充'],places:['仪陇县']},'county handoff carries its parent and name');
 const count=registry.get('#county-points').children.length;
 for(let i=0;i<10;i++)svg.listeners.click(event);
 assert.equal(registry.get('#county-points').children.length,count);
 svg.listeners.pointerdown(event);svg.listeners.pointermove({...event,clientX:40});svg.listeners.pointerup(event);
 registry.get('#map-place-picker').hidden=true;svg.listeners.click(event);
 assert.equal(registry.get('#map-place-picker').hidden,true);
 paintAll();
 const beforeZoom=Number(registry.get('#map-zoom-range').value);
 svg.listeners.pointerdown({...event,pointerId:2,clientX:100});
 svg.listeners.pointerdown({...event,pointerId:3,clientX:200});
 svg.listeners.pointermove({...event,pointerId:3,clientX:300});paintAll();
 assert.ok(Number(registry.get('#map-zoom-range').value)>beforeZoom);
 svg.listeners.pointerup({...event,pointerId:2});svg.listeners.pointerup({...event,pointerId:3});
 const originalRoute={points:[{name:'仪陇县',center:[106.3,31.3]}],missing:[],kind:'已有路线'};
 chat.mapRoute=originalRoute;global.lastView='story';
 const zoomBeforeQuestion=registry.get('#map-zoom-range').value;
 window.TravelMap.fromMessage(chat,'我对正史里的三国感兴趣，请先询问出发地和天数。');
 await new Promise(resolve=>setImmediate(resolve));paintAll();
 assert.equal(chat.mapRoute,originalRoute);assert.equal(global.lastView,'story');assert.equal(registry.get('#map-zoom-range').value,zoomBeforeQuestion);
 window.TravelMap.fromMessage(chat,'从南充出发去阆中');
 await new Promise(resolve=>setImmediate(resolve));paintAll();
 assert.equal(global.lastView,'story','question callback must preserve reading view');assert.ok(chat.mapRoute.points.length>=2);
 window.TravelMap.fromResponse(chat,chat.mapQuestion,{route:{stops:[{name:'南充市'}]}});await new Promise(resolve=>setImmediate(resolve));assert.equal(global.lastView,'story','response callback must preserve reading view');
 const savedRoute=chat.mapRoute, savedZoom=registry.get('#map-zoom-range').value, savedSelection=registry.get('#map-county').value;
 window.TravelMap.beginStory([window.TravelMap.getPlaces().find(p=>p.name==='昭化区')]);paintAll();
 assert.equal(registry.get('#map-prefecture').value,'');assert.equal(chat.mapRoute,savedRoute);
 window.TravelMap.endStory();paintAll();
 assert.equal(registry.get('#map-prefecture').value,'南充市');assert.equal(registry.get('#map-county').value,savedSelection);assert.equal(registry.get('#map-zoom-range').value,savedZoom);assert.equal(chat.mapRoute,savedRoute);
 let chapterPicked=-1;
 window.StoryMap={isActive:()=>true,getLabels:()=>[],onViewport(){},selectChapter:index=>{chapterPicked=index;}};
 const storyTarget=makeNode('g');storyTarget.setAttribute('data-story-chapter','1');
 svg.listeners.pointerdown({...event,target:storyTarget});svg.listeners.pointerup({...event,target:storyTarget});
 svg.listeners.click({...event,target:storyTarget});assert.equal(chapterPicked,1);
 chapterPicked=-1;svg.listeners.pointerdown({...event,target:storyTarget});svg.listeners.pointermove({...event,target:storyTarget,clientX:50});svg.listeners.pointerup(event);svg.listeners.click({...event,target:storyTarget});assert.equal(chapterPicked,-1);paintAll();
 window.TravelMap.fromMessage(chat,'【故事章节讲解】从成都到剑门关的章节');await new Promise(resolve=>setImmediate(resolve));assert.equal(chat.mapRoute,savedRoute);
 const extra=window.TravelMap.getPlaces().find(p=>p.name==='昭化区');assert.equal(window.TravelMap.addStoryPlace(extra),true);assert.equal(window.TravelMap.addStoryPlace(extra),false);
 let exited=false;window.StoryMap.exit=()=>{exited=true;};window.TravelMap.fromMessage(chat,'从成都出发');await new Promise(resolve=>setImmediate(resolve));assert.equal(exited,true);assert.notEqual(chat.mapRoute,savedRoute);
 global.lastView='node';const routeBeforeFocus=chat.mapRoute;await window.TravelMap.focusMention('阆中市');assert.equal(global.lastView,'node');assert.equal(chat.mapRoute,routeBeforeFocus);assert.equal(registry.get('#map-county').value,'county-511381');await window.TravelMap.focusMention('阆中市',{reveal:true});assert.equal(global.lastView,'map');
 global.lastView='journal';const otherChat={messages:[]};window.TravelMap.fromMessage(chat,'从成都去南充');window.TravelMap.syncChat(otherChat);await new Promise(resolve=>setImmediate(resolve));assert.equal(global.lastView,'journal','late callback cannot change another chat view');assert.equal(otherChat.mapRoute,undefined);window.TravelMap.syncChat(chat);
 assert.equal(window.TravelMap.hasMentions('阆中与剑门关'),true);await window.TravelMap.showMentions('阆中与剑门关','journal');assert.equal(global.lastView,'map');assert.equal(registry.get('#map-county').value,'county-511381');assert.equal(document.querySelector('#map-back-mention').hidden,false);document.querySelector('#map-back-mention').onclick();assert.equal(global.lastView,'journal');
 const routeAfterLate=chat.mapRoute;await window.TravelMap.focusMention('南充市',{reveal:false});assert.equal(registry.get('#map-prefecture').value,'南充市');assert.equal(chat.mapRoute,routeAfterLate);assert.ok(registry.get('#map-route-status').textContent.includes('市州范围示意'));
 delete window.StoryMap;
 console.log('PASS: story overlay picking, chat isolation, filter/zoom/route restoration, explicit add deduplication');
 console.log('PASS: general story questions preserve route/view/zoom; explicit destinations still map');
 console.log('PASS: two-pointer pinch increases zoom');
 await window.TravelMap.showPlan({stops:[{name:'剑门关',address:'广元市剑阁县'},{name:'未知景区'},{name:'昭化古城',address:'广元市昭化区'}]});
 assert.equal(chat.mapRoute.points[0].level,'county');assert.equal(chat.mapRoute.points[1],null);assert.equal(chat.mapRoute.points[2].level,'county');
 assert.ok(chat.mapRoute.kind.includes('待定位'));assert.equal(registry.get('#route-lines').children.length,0);
 assert.equal(registry.get('#map-fit').disabled,false);
 select.value='南充市';select.onchange();registry.get('#map-county').value='county-511324';registry.get('#map-county').onchange();paintAll();
 const beforeClear=svg.attributes.viewBox;
 registry.get('#map-clear').onclick();paintAll();
 assert.equal(chat.mapRoute,undefined);assert.equal(registry.get('#map-route-list').children.length,0);
 assert.equal(svg.attributes.viewBox,beforeClear,'clearing route preserves the viewed county');
 assert.equal(select.value,'南充市');assert.equal(registry.get('#map-county').value,'county-511324');
 assert.equal(registry.get('#map-fit').disabled,true,'no-route fit is unavailable');
 console.log('PASS: actual map county-area click, no capture before drag, drag does not select, stable markers, boundary zoom levels');
})().catch(e=>{console.error(e);process.exitCode=1});
