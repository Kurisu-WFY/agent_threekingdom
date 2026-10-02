const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.value='';this.textContent='';this.hidden=true;this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 querySelector(s){return s==='svg'?this.children.find(n=>n.tag==='svg'):get('submit');} setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,f){this.handlers[k]=f;} append(...n){this.children.push(...n);} prepend(...n){this.children.unshift(...n);} replaceChildren(...n){this.children=n;} remove(){} focus(){} click(){this.handlers.click?.();} getBoundingClientRect(){return {left:0,top:0};}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},requests=[],actions=[];
const places=[{id:'wall',name:'昭化古城'},{id:'pass',name:'剑门关'},{id:'road',name:'米仓道'}], story={id:'test',title:'测试蜀道线',chapters:places.map((p,i)=>({name:'第'+(i+1)+'幕',placeId:p.id}))};
let current={story,chapter:story.chapters[0],place:places[0],index:0};
const ctx=vm.createContext({document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),body:new Element(),addEventListener(){}},window:{addEventListener(){},SGT_STORIES:[story,{id:'chenshou',title:'陈寿线'},{id:'zhangfei',title:'张飞线'},{id:'shudao-xunzong',title:'蜀道线'}],SGT_PLACES:places,CulturalNode:{getContext:()=>current,compare(){}},StoryMap:{getPlaces:()=>places,selectChapter:i=>actions.push('chapter:'+i)},SGTStoryUI:{openStory:id=>actions.push(id)},TravelMap:{syncChat(){},fromMessage(){},fromResponse(){},focusMention:(n,o)=>actions.push(n+':'+o?.reveal)},SGTJourney:{ask:q=>actions.push(q)}},setTimeout:()=>1,clearTimeout(){},URL,AbortSignal,fetch:(url,options)=>url==='/health'?Promise.resolve({ok:true,json:async()=>({status:'ok'})}):new Promise((resolve,reject)=>requests.push({resolve,reject,body:JSON.parse(options.body)}))});
const run=s=>vm.runInContext(s,ctx),flush=()=>new Promise(r=>setImmediate(r)),all=n=>[n,...n.children.flatMap(x=>typeof x==='object'?all(x):[])],text=n=>all(n).map(x=>x.textContent).join(' ');
require('./chat-test-double.cjs')(ctx);
for(const f of ['app.js','story-progress.js','character-chat.js'])run(fs.readFileSync(__dirname+'/'+f,'utf8'));
run('toggleChat = open => {panel.hidden=!open;}');
run(fs.readFileSync(__dirname+'/chenshou-guide.js','utf8'));
const guide=ctx.window.ChenshouGuide,progress=ctx.window.StoryProgress;
(async()=>{
 assert.equal(get('#chat-panel').hidden,true);assert.equal(get('#chat-panel').dataset.guideState,'idle');assert.equal(requests.length,0);
 assert.ok(text(get('#guide-context')).includes('测试蜀道线'));assert.ok(text(get('#guide-context')).includes('昭化古城'));
 assert.ok(all(guide.portrait()).some(n=>n.attrs.class==='historian-book'));assert.ok(all(guide.portrait()).some(n=>n.attrs.class==='historian-map'));
 guide.enter(current);assert.equal(get('#chat-panel').hidden,false);assert.equal(requests.length,0);assert.match(text(get('#guide-narration')),/当前资料中未找到可靠记载/);
 const mark=get('#guide-actions').children.find(n=>n.textContent==='标记本章已寻迹');mark.click();assert.equal(progress.get(story).completed.has(0),true);assert.equal(get('#chat-panel').dataset.guideState,'complete');assert.match(text(get('#guide-narration')),/接下来可以读“第2幕”/);assert.match(text(get('#guide-context')),/已寻迹.*昭化古城/);
 get('#guide-actions').children.find(n=>n.textContent==='撤销本章已寻迹').click();assert.equal(progress.get(story).completed.size,0);
 current={story,chapter:story.chapters[1],place:places[1],index:1};guide.enter(current);assert.match(text(get('#guide-narration')),/上章“第1幕”之后/);assert.match(text(get('#guide-transition')),/第 2 幕/);
 const baseline=JSON.stringify(current);ctx.window.CharacterChat.selectPersona('诸葛亮');ctx.window.CharacterChat.setMode('学术探索版');assert.equal(JSON.stringify(current),baseline);assert.match(text(get('#guide-context')),/学术探索版/);
 progress.get(story).completed.add(0);progress.save(story);
 run("send('我只有半天')");assert.equal(requests.length,1);assert.equal(get('#chat-panel').dataset.guideState,'planning');assert.match(text(run('bubbleNode(chats[active].messages.at(-1))')),/正在整理回答/);
 assert.match(requests[0].body.history.at(-1).content,/已寻迹节点.*昭化古城/);assert.match(requests[0].body.history.at(-1).content,/核心章节由游客选择/);assert.equal(requests[0].body.mode,'学术');
 const snapshot=JSON.stringify(requests[0].body);current={story,chapter:story.chapters[2],place:places[2],index:2};guide.enter(current);run("send('新的问题')");assert.equal(requests.length,1);assert.match(get('#message').value,/新的问题/);assert.equal(JSON.stringify(requests[0].body),snapshot);
 requests[0].reject(Object.assign(new Error('timeout'),{name:'TimeoutError'}));await flush();assert.match(run('chats[active].messages.at(-1).text'),/超时/);run('requestReply(chats[active],chats[active].messages.at(-1))');assert.equal(JSON.stringify(requests[1].body),snapshot);
 requests[1].resolve({ok:true,json:async()=>({answer:'半天路线须核验',intent:{intent:'culture_qa'}})});await flush();assert.ok(text(ctx.window.CharacterChat.actions(run('chats[active].messages.at(-1)'))).includes('选好保留章节，重新画路线'));
 run("send('史料问题')");assert.equal(get('#chat-panel').dataset.guideState,'research');assert.match(text(run('bubbleNode(chats[active].messages.at(-1))')),/正在整理回答/);
 get('#new-chat').onclick();assert.notEqual(get('#chat-panel').dataset.guideState,'research');requests.at(-1).resolve({ok:true,json:async()=>({answer:'预算待核验',intent:{intent:'budget_ticket'},route:null})});await flush();assert.equal(run('chats[active].messages.length'),1);
 for(const name of ['陈寿','诸葛亮','张飞']){const prepared=ctx.window.CharacterChat.prepare(run('chats[active]'),'我想了解'+name);assert.equal(prepared.discovered,name);assert.equal(prepared.preserveMap,true);assert.equal(JSON.stringify(current),JSON.stringify({story,chapter:story.chapters[2],place:places[2],index:2}));}
 const linked=ctx.window.CharacterChat.answer({persona:'陈寿',text:'南充',data:{}});const location=all(linked).find(n=>n.className==='character-place-name');assert.ok(location);assert.equal(location.textContent,'南充');assert.ok(!all(linked).some(n=>n.className==='character-place-link'&&n.textContent==='南充'));
 current={story:{id:'other',title:'其他线',chapters:[]}};guide.refresh();assert.equal(get('#guide-note').hidden,true);
 const css=fs.readFileSync(__dirname+'/styles.css','utf8');assert.match(css,/prefers-reduced-motion:reduce[\s\S]*historian-svg/);
 console.log('PASS: scholar SVG/four states, default collapsed, honest chapter handoff, completion/undo, context/mode, compression snapshot, drafts/retry/session isolation, three person themes and stale note removal');
})().catch(e=>{console.error(e);process.exitCode=1;});
