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
 SGTStoryUI:{modeLabel:m=>({'大众体验版':'大众线','亲子故事版':'亲子线','学术探索版':'学术线'}[m]),icon:kind=>Object.assign(new Element('svg'),{textContent:kind}),openStory:id=>views.push(id)},
 StoryProgress:{get:()=>state,save(){listeners.forEach(fn=>fn(story));},subscribe:fn=>listeners.push(fn)},SGTJourney:{ask:(q,o)=>asks.push({q,o})},TravelMap:{addStoryPlace:p=>{adds.push(p);return true;}},
 StoryMap:{describePlace:(p,c)=>({place:p,chapter:c,exact:false,point:null})}};
vm.runInNewContext(fs.readFileSync(__dirname+'/cultural-node.js','utf8'),{window,URL,document:{querySelector:get,createElement:t=>new Element(t)},showContentView:v=>views.push(v)});
const api=window.CulturalNode,text=n=>n.textContent+n.children.map(text).join(' '),click=id=>get(id).handlers.click();
api.open({place,chapter,story,index:1,back:'map',exact:false,point:null});
assert.equal(views.at(-1),'node');assert.match(get('#node-context').textContent,/第二幕/);assert.match(get('#node-coordinate').textContent,/高德地图.*具体地点/);
assert.doesNotMatch(text(get('#node-reading-content')),/资料待补充|未经核验的文字/);assert.equal(get('#node-reading').hidden,true);
assert.match(text(get('#node-metadata')),/C 级可信度不足/);assert.equal(get('#node-add-route').disabled,true);
get('#node-view').scrollTop=260;api.changeMode('亲子故事版');assert.equal(get('#node-view').scrollTop,260);assert.equal(scrolls.at(-1),270);assert.equal(state.current,1);assert.equal(state.completed.size,1);assert.equal(state.mode,'亲子故事版');assert.match(text(get('#node-reading-content')),/可以和孩子聊聊/);
api.changeMode('学术探索版');assert.doesNotMatch(text(get('#node-reading-content')),/编纂背景|资料待补充/);assert.equal(get('#node-view').scrollTop,260);assert.equal(get('#node-reading-content').style.minHeight,'');
state.mode='亲子故事版';window.StoryProgress.save(story);assert.equal(api.getMode(),'亲子故事版');assert.equal(get('#node-view').scrollTop,260);api.changeMode('学术探索版');
click('#node-ask');assert.match(asks.at(-1).q,/测试关楼/);assert.match(asks.at(-1).q,/合理推断/);assert.match(asks.at(-1).q,/学术探索版/);assert.equal(state.current,1);assert.match(asks.at(-1).o.displayText,/测试关楼/);assert.ok(!asks.at(-1).o.displayText.includes('必须分段'));
click('#node-compare');assert.equal(get('#node-comparison-title').hidden,true);assert.ok(!get('#node-comparison-title').focused);
const record=t=>({text:t,data_status:'maintained',updated_at:'2026-09-18T09:00:00+08:00',sources:[{title:'测试用来源',source_level:'A',source_url:'https://example.org/reference',data_status:'maintained'}]});
const research={...chapter,...record(''),narrative_type:'research',story:'作者对写作方法的研究',compilation:{...record('编纂研究正文'),narrative_type:'research'},relationships:{...record('师承关系研究'),narrative_type:'research'},disputes:[{...record('作者甲的判断'),narrative_type:'research'},{...record('作者乙的判断'),narrative_type:'research'}]};
api.open({place,chapter:research,story,index:1});
api.changeMode('学术探索版');
assert.match(text(get('#node-reading-content')),/现代研究解读.*编纂研究正文/);
assert.match(text(get('#node-reading-content')),/师承关系研究/);
assert.match(text(get('#node-disputes')),/现代研究解读.*作者甲的判断/);
assert.ok(!text(get('#node-comparison')).includes('作者对写作方法的研究'),'论文正文不自动填入正史栏目');
const enriched={...chapter,narrative_type:'record',story:'受支持正文',...record(''),history:record('史料侧测试文本'),romance:record('文学侧测试文本'),differences:record('差异测试文本'),disputes:[record('观点甲'),record('观点乙')],inferences:[record('推断测试文本')]};
api.open({place:{...place,travel:{ticket:{...record(''),data_status:'live',tool_source:'测试工具',amount:0}}},chapter:enriched,story,index:1,exact:false,point:{name:'县级驻地'}});
assert.match(text(get('#node-comparison')),/史料侧测试文本/);assert.match(text(get('#node-comparison')),/文学侧测试文本/);assert.match(text(get('#node-differences')),/差异测试文本/);assert.match(text(get('#node-disputes')),/存在不同说法/);
assert.match(text(get('#node-reading-content')),/合理推断 · 非史料原文/);assert.match(text(get('#node-reading-content')),/推断测试文本/);assert.match(text(get('#node-tourism')),/查询开放时间/);assert.ok(!text(get('#node-tourism')).includes('0 元'));
const pendingRecord=record('不该显示的史料');pendingRecord.sources[0].data_status='pending';api.open({place,chapter:{...chapter,history:pendingRecord},story,index:1,exact:false,point:{name:'县级驻地'}});assert.ok(!text(get('#node-comparison')).includes('不该显示的史料'));
const descendants=n=>[n,...n.children.flatMap(descendants)];
const emptyMaterials=descendants(get('#node-comparison')).filter(n=>n.tag==='details'&&n.className?.includes('node-empty'));
assert.equal(emptyMaterials.length,0,'没有资料的正史与文学栏目不显示空占位');
assert.ok(emptyMaterials.every(n=>!n.open),'U24 empty materials start collapsed');
assert.match(text(get('#node-metadata')),/文化介绍与相关史料/);
assert.match(text(get('#node-metadata')),/历史记载.*现代研究.*文学/);
api.open({place,chapter:enriched,story,index:1});
assert.ok(get('#node-comparison').children.every(n=>n.tag==='section'),'U24 reliable narrative stays visible');
assert.equal(descendants(get('#node-reading-content')).find(n=>n.className?.split(' ').includes('node-evidence')).tag,'section','U24 supported story stays visible');
api.open({place,chapter:{...chapter,history:pendingRecord},story,index:1,exact:false,point:{name:'县级驻地'}});
assert.ok(!text(get('#node-metadata')).includes('pending'),'U08 raw status not rendered');assert.ok(!text(get('#node-comparison')).includes('pending'));
click('#node-add-route');assert.equal(adds[0].name,'县级驻地');assert.equal(get('#node-enter-story').handlers.click,undefined,'已删除节点进入故事入口');assert.equal(get('#node-modes').children.length,0,'已删除节点三档入口');assert.doesNotMatch(text(get('#node-reading-content')),/先读懂这里/);
const links=[];function walk(n){if(n.tag==='a')links.push(n);n.children.forEach(walk);}nodes.forEach(walk);assert.ok(links.every(a=>/^https?:/.test(a.href)));
api.open({place:{id:'tower',name:'无关联楼阁',building:'tower'},back:'welcome'});assert.equal(get('#node-enter-story').handlers.click,undefined);assert.match(get('#node-context').textContent,/地点文化阅读/);
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

assert.match(text(get('#node-tourism')),/查询天气与交通/);assert.doesNotMatch(text(get('#node-tourism')),/待核验|工具来源：待确认|更新时间：待确认/);


const ninthNodeFailures=[];
for(const [code,fn] of [
 ['C17',()=>{api.open({place,chapter,story,index:1,exact:false,note:'县级驻地示意'});assert.match(get('#node-coordinate').textContent,/高德地图.*具体地点/);assert.doesNotMatch(text(get('#node-metadata')),/更新时间：未提供|待核验/);} ],
 ['C18',()=>{api.open({place,chapter,story,index:1});assert.equal(get('#node-comparison').children.length,0);assert.equal(get('#node-comparison-title').hidden,true);assert.equal(get('#node-differences').hidden,true);assert.equal(get('#node-disputes').hidden,true);}]
]){try{fn();}catch(e){ninthNodeFailures.push(code+': '+e.message);}}
assert.equal(ninthNodeFailures.join('\n'),'','C17/C18');

api.open({place:{...place,history:record('地点关联的张飞史料')},returnTo:'welcome'});
assert.match(text(get('#node-comparison')),/地点关联的张飞史料/);
assert.equal(get('#node-comparison-title').textContent,'史籍中的人物与事件');
assert.equal(get('#node-compare').hidden,false);
click('#node-compare');assert.ok(get('#node-comparison-title').focused);
assert.equal(get('#node-differences').children.length,0);
assert.equal(get('#node-disputes').children.length,0);
assert.doesNotMatch(text(get('#node-view'))+text(get('#node-reading-content'))+text(get('#node-comparison')),/资料待补充|暂无有依据的推断/);

const ticketReference={data_status:'reference',is_realtime:false,price_min:5,price_max:5,unit:'元/人',updated_at:'2026-10-07',price_note:'参考公开页面，不含讲解',scope:'普通参观',sources:[{title:'票务参考页面',source_url:'https://example.org/ticket'}]};
api.open({place:{...place,travel:{ticket:ticketReference}}});
assert.match(text(get('#node-tourism')),/参考票价：5 元\/人/);
assert.match(text(get('#node-tourism')),/普通参观/);
assert.match(text(get('#node-tourism')),/票务参考页面/);
assert.doesNotMatch(text(get('#node-tourism')),/待核验|待确认|0 条|工具来源/);
api.open({place:{...place,travel:{ticket:{...ticketReference,price_max:4}}}});
assert.doesNotMatch(text(get('#node-tourism')),/参考票价/);
