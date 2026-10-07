const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./map-route-core.js');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this.textContent='';this.hidden=true;this.value='';this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c)};}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(k,fn){this.handlers[k]=fn;}focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}getBoundingClientRect(){return {top:0};}click(){this.handlers.click?.();}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(ready=Promise.resolve(true)){
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
 const questionOptions=[],questions=[],views=[],fits=[],added=[],opened=[];
 // Explicit multi-chapter fixture; not 陈寿编书史 content.
 const story={id:'fixture-map',title:'故事地图多章节测试夹具',chapters:[{placeId:'a',name:'第一幕｜昭化古城',dataStatus:'pending',sources:[]},{placeId:'b',name:'第二幕｜剑门天险',dataStatus:'pending',sources:[]},{placeId:'c',name:'第三幕｜米仓道',dataStatus:'pending',sources:[]}]};
 const places=[{id:'a',name:'昭化古城',building:'wall',fallbackName:'昭化区',fallbackParent:'广元市'},{id:'b',name:'剑门关',building:'pass',fallbackName:'剑阁县',fallbackParent:'广元市'},{id:'c',name:'米仓道',building:'road'}];
 const counties=JSON.parse(fs.readFileSync(__dirname+'/sichuan-counties.json','utf8')).map(p=>({...p,level:'county'}));
 const window={MapRouteCore:core,SGT_STORIES:[story,{id:'empty',title:'空模板',chapters:[]}],SGT_PLACES:places,
  SGTStoryUI:{modeLabel:m=>({'大众体验版':'大众线','亲子故事版':'亲子线','学术探索版':'学术线'}[m]),icon:kind=>{const icon=new Element('svg');icon.dataset.kind=kind;return icon;},openStory:id=>opened.push(id)},
  SGTJourney:{ask:(q,o)=>{questions.push(q);questionOptions.push(o);}},TravelMap:{ready,getPlaces:()=>counties,textSize:()=>14,refreshLabels(){window.StoryMap.onViewport([0,0,900,680],{width:900,height:680});},beginStory:p=>fits.push(p),fitStory:p=>fits.push(p),endStory(){fits.push('restored');},addStoryPlace:p=>{added.push(p);return true;}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/story-progress.js','utf8'),{window});
 vm.runInNewContext(fs.readFileSync(__dirname+'/story-map.js','utf8'),{window,URL,document:{querySelector:get,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},showContentView:v=>views.push(v)});
 return {window,get,questionOptions,questions,views,fits,added,opened,story,places};
}
function allText(node){return node.textContent+node.children.map(allText).join(' ');}
(async()=>{
 const t=setup(),api=t.window.StoryMap;
 assert.equal(await api.open('missing'),false);assert.equal(await api.open('fixture-map'),true);
 assert.equal(api.getLabels()[0].size,14,'story collision box follows the CSS screen-size token');
 assert.equal(t.get('#map-view').dataset.storyId,'fixture-map');assert.equal(t.get('#story-map-badge').hidden,false);assert.equal(t.get('#story-map-badge').textContent,t.get('#story-map-progress').textContent);assert.equal(t.get('#story-map-nodes').children.length,2);assert.equal(t.get('#story-chapter-list').children.length,3);
 assert.equal(t.get('#story-order-lines').children.length,1);assert.equal(t.get('#story-ink-lines').children.length,1);
 assert.ok(t.get('#story-map-status').textContent.includes('1 个待定位'));
 const first=t.get('#story-map-nodes').children[0];assert.ok(first.attrs['aria-label'].includes('昭化区驻地示意'));
 assert.equal(t.questions.length,0);t.get('#map-place-picker').hidden=false;api.selectChapter(1);assert.equal(t.get('#map-place-picker').hidden,true);assert.equal(t.questions.length,1);assert.ok(t.questions[0].includes('上一章'));assert.ok(t.questions[0].includes('第一幕｜昭化古城'));assert.ok(t.questions[0].includes('第二幕｜剑门天险'));
 assert.ok(t.questionOptions[0]?.displayText,'U01 chapter question has visitor summary');assert.ok(!t.questionOptions[0].displayText.includes('当前章节资料'));
 api.selectChapter(1);assert.equal(t.questions.length,1);assert.equal(t.get('#story-building-visual').children[0].dataset.kind,'pass');assert.equal(t.get('#chapter-navigate').disabled,true);
 t.get('#chapter-complete').click();assert.ok(t.get('#story-map-progress').textContent.includes('已寻迹 1 / 3'));assert.ok(allText(t.get('#story-map-nodes')).includes('已寻迹'));
 api.selectChapter(2);assert.equal(t.get('#chapter-add').disabled,true);assert.equal(t.get('#chapter-next').disabled,true);assert.equal(t.get('#story-building-visual').children[0].dataset.kind,'road');assert.ok(t.get('#story-node-location').textContent.includes('待定位'));
 t.get('#chapter-add').click();assert.equal(t.added.length,0);t.get('#chapter-compare').click();assert.ok(t.questions.at(-1).includes('对照正史'));
 api.selectChapter(0);t.get('#chapter-add').click();assert.equal(t.added[0].name,'昭化区');t.get('#chapter-enter').click();assert.equal(t.opened[0],'fixture-map');
 api.exit();assert.equal(api.isActive(),false);assert.equal(t.get('#story-map-nodes').children.length,0);assert.equal(t.fits.at(-1),'restored');
 await api.open('fixture-map');assert.ok(t.get('#story-map-progress').textContent.includes('已寻迹 1 / 3'));
 assert.equal(await api.open('empty'),false);assert.equal(api.getContext().story.id,'fixture-map');assert.equal(t.get('#map-view').dataset.storyId,'fixture-map');
 await api.open('fixture-map');
 const progress=t.window.StoryProgress, state=progress.get(t.story);
 progress.choose(t.story,[0,2]);api.selectChapter(0);t.get('#chapter-next').click();assert.equal(state.current,2);
 assert.ok(allText(t.get('#story-chapter-list')).includes('本次跳过'));
 state.mode='学术探索版';progress.save(t.story);t.get('#chapter-ask').click();assert.ok(t.questions.at(-1).includes('学术探索版'));assert.equal(state.current,2);
 state.completed=new Set([0,2]);progress.save(t.story);assert.equal(progress.status(t.story),'探索中');
 progress.choose(t.story,[0,1,2]);state.completed.add(1);progress.save(t.story);assert.equal(progress.status(t.story),'已寻迹');
 let detail; t.window.CulturalNode={open:payload=>detail=payload};
 await api.open('fixture-map');api.selectChapter(1);assert.equal(detail.index,1);assert.equal(detail.place.id,'b');assert.equal(detail.story.id,'fixture-map');delete t.window.CulturalNode;
 // 后续后端数据必须明确证明坐标可信；缺失来源或 C 级来源均不符合条件。
 const payload={story:{id:'fixture-map',title:'后端主题',chapters:[{placeId:'a',name:'一',dataStatus:'live',sources:[{source_url:'javascript:alert(1)',source_level:'C',title:'不可信链接'}]}]},places:[{id:'a',name:'测试坐标',building:'pass',coordinates:[105.8,32.2],coordinate_system:'WGS84',dataStatus:'live',updatedAt:'2026-09-17T10:00:00+08:00',sources:[{source_url:'https://example.org/source',source_level:'A'}]}]};
 await api.setData(payload);await api.open('fixture-map');assert.equal(t.get('#story-map-nodes').children.length,0);
 payload.places[0].coordinate_system='GCJ-02';payload.places[0].sources[0].source_level='C';await api.setData(payload);assert.equal(t.get('#story-map-nodes').children.length,0);
 payload.places[0].sources[0].source_level='A';await api.setData(payload);assert.equal(t.get('#story-map-nodes').children.length,1);api.selectChapter(0);assert.equal(t.get('#chapter-add').disabled,false);
 assert.ok(allText(t.get('#story-node-content')).includes('C 级仅作线索'));assert.ok(allText(t.get('#story-node-content')).includes('史料待确认'));
 const links=[];const walk=n=>{if(n.tag==='a')links.push(n);n.children.forEach(walk);};walk(t.get('#story-node-content'));assert.equal(links.length,0);
 payload.places[0].coordinates=[200,10];await api.setData(payload);assert.equal(t.get('#story-map-nodes').children.length,0);
 assert.equal(await api.setData({story:{id:'fixture-map'}}),false);assert.equal(t.get('#story-map-nodes').children.length,2);assert.equal(api.getContext().story.title,'故事地图多章节测试夹具');
 assert.equal(await api.setData({story:{id:'fixture-map',title:'坏数据',chapters:[{name:'缺引用',placeId:'unknown'}]},places:payload.places}),false);assert.equal(t.get('#story-map-nodes').children.length,2);
 assert.equal(await api.setData({...payload,story:{...payload.story,sources:'invalid'}}),false);assert.equal(t.get('#story-map-nodes').children.length,2);
 assert.equal(await api.setData({story:{id:'x'}}),false);assert.equal(t.get('#story-map-nodes').children.length,2);

 // Explicit adapter fixture over an empty catalog: rejected data must clear active chapters.
 const empty=setup(),emptyMap=empty.window.StoryMap;empty.story.chapters=[];
 const adaptedFixture={story:{id:empty.story.id,title:'空目录适配回退测试夹具',chapters:[{name:'适配测试章',placeId:'a'}]},places:empty.places};
 assert.equal(await emptyMap.setData(adaptedFixture),true);assert.equal(await emptyMap.open(empty.story.id),true);
 assert.equal(await emptyMap.setData({story:{id:empty.story.id}}),false);
 assert.equal(emptyMap.isActive(),false,'empty static fallback must exit obsolete adapter chapters');
 assert.equal(emptyMap.getContext(),null);assert.equal(empty.get('#story-map-nodes').children.length,0);assert.equal(empty.get('#story-chapter-list').children.length,0);
 assert.equal(empty.get('#story-map-toolbar').hidden,true);empty.get('#chapter-complete').click();assert.equal(empty.window.StoryProgress.get(empty.story).completed.size,0);
 assert.match(empty.get('#map-route-status').textContent,/章节待补充/);

 const failed=setup(Promise.resolve(false));assert.equal(await failed.window.StoryMap.open('fixture-map'),false);assert.ok(failed.get('#map-route-status').textContent.includes('暂不可用'));
 let release;const delayed=setup(new Promise(resolve=>release=resolve));const pending=delayed.window.StoryMap.open('fixture-map');delayed.window.StoryMap.exit();release(true);await pending;assert.equal(delayed.window.StoryMap.isActive(),false);
 assert.equal(t.get('#chapter-navigate').textContent,'直接导航暂未提供','C03');assert.equal(t.get('#chapter-navigate').disabled,true);assert.doesNotMatch(allText(t.get('#story-map-status')),/前端章节|后端|GCJ-02|自动对齐/,'C09');
 console.log('PASS: story IDs, county fallback, missing-node gaps, three states, progress isolation, contextual ask, explicit route add, safe sources, verified coordinates, backend adapter and async cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
