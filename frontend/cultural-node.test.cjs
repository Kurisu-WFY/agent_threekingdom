const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.textContent='';this.attrs={};this.handlers={};this.style={};this.scrollTop=0;this.scrollHeight=1500;this.disabled=false;}
 append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.handlers[k]=fn;}focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}
}
const nodes=new Map(),get=k=>{if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k);};
const state={current:1,mode:'大众体验版',completed:new Set([0]),skipped:new Set()};
const views=[],asks=[],adds=[],scrolls=[],listeners=[];
const place={id:'pass',name:'测试关楼',building:'pass'},chapter={name:'第二幕',placeId:'pass',people:[],events:[],story:'未经核验的文字',sources:[{title:'不可靠资料',source_level:'C',source_url:'javascript:alert(1)'}]},story={id:'test',title:'测试故事',chapters:[{},chapter]};
const window={scrollY:270,scrollTo:o=>scrolls.push(o.top),SGT_STORIES:[story],SGT_PLACES:[place],
 SGTStoryUI:{icon:kind=>Object.assign(new Element('svg'),{textContent:kind}),openStory:id=>views.push(id)},
 StoryProgress:{get:()=>state,save(){listeners.forEach(fn=>fn(story));},subscribe:fn=>listeners.push(fn)},SGTJourney:{ask:(q,o)=>asks.push({q,o})},TravelMap:{addStoryPlace:p=>{adds.push(p);return true;}},
 StoryMap:{describePlace:(p,c)=>({place:p,chapter:c,exact:false,point:null})}};
vm.runInNewContext(fs.readFileSync(__dirname+'/cultural-node.js','utf8'),{window,URL,document:{querySelector:get,createElement:t=>new Element(t)},showContentView:v=>views.push(v)});
const api=window.CulturalNode,text=n=>n.textContent+n.children.map(text).join(' '),click=id=>get(id).handlers.click();
api.open({place,chapter,story,index:1,back:'map',exact:false,point:null});
assert.equal(views.at(-1),'node');assert.match(get('#node-context').textContent,/第二幕/);assert.match(get('#node-coordinate').textContent,/坐标待核验/);
assert.match(text(get('#node-reading-content')),/当前资料中未找到可靠记载/);assert.ok(!text(get('#node-reading-content')).includes('未经核验的文字'));
assert.match(text(get('#node-metadata')),/C 级可信度不足/);assert.equal(get('#node-add-route').disabled,true);
get('#node-reading').scrollTop=260;api.changeMode('亲子故事版');assert.equal(get('#node-reading').scrollTop,260);assert.equal(scrolls.at(-1),270);assert.equal(state.current,1);assert.equal(state.completed.size,1);assert.equal(state.mode,'亲子故事版');assert.match(text(get('#node-reading-content')),/亲子共读/);
api.changeMode('学术探索版');assert.match(text(get('#node-reading-content')),/编纂背景/);assert.equal(get('#node-reading').scrollTop,260);assert.equal(get('#node-reading-content').style.minHeight,'1500px');
state.mode='亲子故事版';window.StoryProgress.save(story);assert.equal(api.getMode(),'亲子故事版');assert.equal(get('#node-reading').scrollTop,260);api.changeMode('学术探索版');
click('#node-ask');assert.match(asks.at(-1).q,/测试关楼/);assert.match(asks.at(-1).q,/合理推断/);assert.match(asks.at(-1).q,/学术探索版/);assert.equal(state.current,1);assert.match(asks.at(-1).o.displayText,/测试关楼/);assert.ok(!asks.at(-1).o.displayText.includes('必须分段'));
click('#node-compare');assert.ok(get('#node-comparison-title').focused);assert.ok(get('#node-comparison-title').scrolled);
const record=t=>({text:t,data_status:'maintained',updated_at:'2026-09-18T09:00:00+08:00',sources:[{title:'测试用来源',source_level:'A',source_url:'https://example.org/reference',data_status:'maintained'}]});
const enriched={...chapter,narrative_type:'record',story:'受支持正文',...record(''),history:record('史料侧测试文本'),romance:record('文学侧测试文本'),differences:record('差异测试文本'),disputes:[record('观点甲'),record('观点乙')],inferences:[record('推断测试文本')]};
api.open({place:{...place,travel:{ticket:{...record(''),data_status:'live',tool_source:'测试工具',amount:0}}},chapter:enriched,story,index:1,exact:false,point:{name:'县级驻地'}});
assert.match(text(get('#node-comparison')),/史料侧测试文本/);assert.match(text(get('#node-comparison')),/文学侧测试文本/);assert.match(text(get('#node-differences')),/差异测试文本/);assert.match(text(get('#node-disputes')),/存在不同说法/);
assert.match(text(get('#node-reading-content')),/合理推断 · 非史料原文/);assert.match(text(get('#node-reading-content')),/推断测试文本/);assert.match(text(get('#node-tourism')),/工具来源：测试工具/);assert.ok(!text(get('#node-tourism')).includes('0 元'));
const pendingRecord=record('不该显示的史料');pendingRecord.sources[0].data_status='pending';api.open({place,chapter:{...chapter,history:pendingRecord},story,index:1,exact:false,point:{name:'县级驻地'}});assert.ok(!text(get('#node-comparison')).includes('不该显示的史料'));
const descendants=n=>[n,...n.children.flatMap(descendants)];
const emptyMaterials=descendants(get('#node-comparison')).filter(n=>n.tag==='details'&&n.className?.includes('node-empty'));
assert.equal(emptyMaterials.length,2,'U24 unverified history and literature are collapsed separately');
assert.ok(emptyMaterials.every(n=>!n.open),'U24 empty materials start collapsed');
assert.match(text(get('#node-metadata')),/资料概况/,'U24 shared missing status is summarized once near the heading');
assert.match(text(get('#node-metadata')),/正史.*文学.*实时/,'U24 evidence boundaries remain explicit');
api.open({place,chapter:enriched,story,index:1});
assert.ok(get('#node-comparison').children.every(n=>n.tag==='section'),'U24 reliable narrative stays visible');
assert.equal(descendants(get('#node-reading-content')).find(n=>n.className?.split(' ').includes('node-evidence')).tag,'section','U24 supported story stays visible');
api.open({place,chapter:{...chapter,history:pendingRecord},story,index:1,exact:false,point:{name:'县级驻地'}});
assert.ok(!text(get('#node-metadata')).includes('pending'),'U08 raw status not rendered');assert.ok(!text(get('#node-comparison')).includes('pending'));
click('#node-add-route');assert.equal(adds[0].name,'县级驻地');click('#node-enter-story');assert.equal(views.at(-1),'test');
const links=[];function walk(n){if(n.tag==='a')links.push(n);n.children.forEach(walk);}nodes.forEach(walk);assert.ok(links.every(a=>/^https?:/.test(a.href)));
api.open({place:{id:'tower',name:'无关联楼阁',building:'tower'},back:'welcome'});assert.equal(get('#node-enter-story').disabled,true);assert.match(get('#node-context').textContent,/待关联/);
click('#node-back');assert.equal(views.at(-1),'welcome');
for(const source of ['journal','map','story','welcome']){
  assert.equal(api.openPlace('pass',{returnTo:source}),true);
  assert.match(get('#node-back').textContent,/返回上一视图/);
  assert.ok(get('#node-origin').textContent.includes({journal:'探索志',map:'行旅地图',story:'文化探索',welcome:'文化探索'}[source]));
  click('#node-back');assert.equal(views.at(-1),source,`node should return to ${source}`);
}
assert.equal(api.openPlace('pass'),true);
assert.match(get('#node-back').textContent,/来源未知/);
click('#node-back');assert.equal(views.at(-1),'welcome');
console.log('PASS: evidence gating, C-level rejection, safe sources, dual narrative, disputes, inference styling, mode/scroll/context preservation, unknown ticket and unlinked building');

assert.match(text(get('#node-tourism')),/尚未查询所在地天气，可查询预报；景区开放另查公告/,'C08 天气缺数据不套用景区公告');


const ninthNodeFailures=[];
for(const [code,fn] of [
 ['C17',()=>{api.open({place,chapter,story,index:1,exact:false,note:'坐标待核验 / 景区待定位 · 剑阁县驻地示意（关联待确认）'});const out=get('#node-coordinate').textContent;assert.match(out,/当前显示：.*剑阁县驻地示意/);assert.match(out,/待确认项：/);assert.match(out,/更新时间：/);assert.ok((out.match(/待核验/g)||[]).length<=1);const details=get('#node-metadata').children.find(n=>n.tag==='details');assert.equal((details.children[1].textContent.match(/待核验/g)||[]).length,1,'C17 one record status; distinct source states retained');} ],
 ['C18',()=>{api.open({place,chapter,story,index:1});const literary=get('#node-comparison').children[1];assert.match(text(literary),/尚未补充可核对的文学文本\/版本出处/);assert.match(text(literary),/文学文本来源/);assert.match(text(literary),/不等于历史事实/);assert.doesNotMatch(text(literary),/未找到可靠记载|史料来源/);}]
]){try{fn();}catch(e){ninthNodeFailures.push(code+': '+e.message);}}
assert.equal(ninthNodeFailures.join('\n'),'','C17/C18');
