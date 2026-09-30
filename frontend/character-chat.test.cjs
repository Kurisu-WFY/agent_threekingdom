const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.value='';this.textContent='';this.hidden=true;this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 querySelector(){return get('submit');} setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,f){this.handlers[k]=f;} append(...n){this.children.push(...n);} replaceChildren(...n){this.children=n;} focus(){} click(){this.handlers.click?.();} getBoundingClientRect(){return {left:0,top:0};}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},requests=[],actions=[];
const c={story:{id:'test',title:'蜀道寻踪',chapters:[{name:'第二幕',placeId:'pass'}]},chapter:{name:'第二幕'},place:{name:'剑门关'}};
const ctx=vm.createContext({document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),body:new Element(),addEventListener(){}},window:{addEventListener(){},SGT_STORIES:[{id:'chenshou',title:'陈寿线'},{id:'zhangfei',title:'镇守阆中·寻迹张飞'}],SGT_PLACES:[{id:'jianmenguan',name:'剑门关'}],CulturalNode:{getContext:()=>c,compare:()=>actions.push('compare'),openPlace:id=>actions.push(id)},StoryMap:{isActive:()=>true,exit:()=>actions.push('exit')},SGTStoryUI:{openStory:id=>actions.push(id)},TravelMap:{syncChat(){},fromMessage:()=>actions.push('fromMessage'),fromResponse:()=>actions.push('fromResponse'),focusMention:(name,options)=>actions.push(options?.reveal===false?'预选:'+name:name)},SGTJourney:{ask:q=>actions.push(q)}},URL,AbortSignal,fetch:(url,options)=>url==='/health'?Promise.resolve({ok:true,json:async()=>({status:'ok'})}):new Promise((resolve,reject)=>requests.push({resolve,reject,body:JSON.parse(options.body)}))});
const run=s=>vm.runInContext(s,ctx),flush=()=>new Promise(r=>setImmediate(r));
require('./chat-test-double.cjs')(ctx);
for(const f of ['app.js','story-progress.js','character-chat.js'])run(fs.readFileSync(__dirname+'/'+f,'utf8'));
const all=n=>[n,...n.children.flatMap(x=>typeof x==='object'?all(x):[])],text=n=>all(n).map(x=>x.textContent).join(' ');
(async()=>{
 const baseline=JSON.stringify(c);get('#character-select').value='诸葛亮';get('#character-select').handlers.change();assert.equal(JSON.stringify(c),baseline);assert.equal(actions.length,0);
 const notice=get('#character-notice').textContent;run('render()');assert.equal(get('#character-notice').textContent,notice);
 ctx.window.CharacterChat.setMode('亲子故事版');assert.equal(ctx.window.StoryProgress.get(c.story).mode,'亲子故事版');
 run("send('   ')");assert.equal(requests.length,0);
 run("send('历史上的张飞真是这样吗？')");assert.equal(requests.length,1);assert.equal(requests[0].body.message,'历史上的张飞真是这样吗？');assert.equal(requests[0].body.mode,'亲子');ctx.window.StoryProgress.get(c.story).mode='学术探索版';ctx.window.StoryProgress.save(c.story);assert.equal(get('#character-mode').value,'学术探索版');assert.equal(actions.join(','),'compare');assert.ok(requests[0].body.history.at(-1).content.includes('诸葛亮'));assert.ok(requests[0].body.history.at(-1).content.includes('第二幕'));assert.ok(requests[0].body.history.at(-1).content.includes('剑门关'));
 assert.equal(requests[0].body.story_id,'test');
 assert.equal(run('chats[0].messages.find(m=>m.role==="user").text'),'历史上的张飞真是这样吗？');
 get('#character-select').value='张飞';get('#character-select').handlers.change();run("send('下一问')");assert.equal(requests.length,1);assert.equal(get('#message').value,'下一问');
 requests[0].reject(new Error('offline'));await flush();run('requestReply(chats[active],chats[active].messages.at(-1))');assert.deepEqual(requests[1].body,requests[0].body);requests[1].resolve({ok:true,json:async()=>({answer:'【史料记载】不能直接认定可靠【合理推断】测试推断【演义】测试文学',intent:{intent:'culture_qa'}})});await flush();
 assert.equal(run('chats[0].messages.at(-1).persona'),'诸葛亮');let rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));assert.ok(text(rendered).includes('【史料记载】不能直接认定可靠【合理推断】测试推断【演义】测试文学'));assert.ok(!all(rendered).some(n=>/character-(evidence|sources|raw)/.test(n.className||'')));assert.ok(!text(rendered).includes('AI解读，非人物原话'));
 const record={type:'history',text:'测试史料',data_status:'maintained',updated_at:'2026-09-18T00:00:00Z',sources:[{title:'测试来源',source_url:'https://example.com',source_level:'A',data_status:'maintained'}]};assert.equal(ctx.window.CharacterChat.reliable(record),true);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'测试原回答',data:{evidence_segments:[record]}});assert.equal(text(rendered).trim(),'测试原回答');
 record.sources[0].source_level='C';assert.equal(ctx.window.CharacterChat.reliable(record),false);record.sources[0].source_level='A';record.sources[0].source_url='javascript:alert(1)';assert.equal(ctx.window.CharacterChat.reliable(record),false);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'原回答',data:{sources:record.sources}});assert.equal(all(rendered).filter(n=>n.tag==='a').length,0);
 rendered=ctx.window.CharacterChat.answer({persona:'陈寿',text:'女娲实际正文',data:{generation:{kind:'nuwax'}}});
 assert.equal(text(rendered).trim(),'女娲实际正文');assert.ok(!all(rendered).some(n=>n.tag==='details'));
 assert.ok(!text(rendered).includes('当前资料中未找到可靠记载'));
 ctx.window.CharacterChat.selectPersona('诸葛亮');
 run("send('我想了解张飞\\n\\n请区分史实与推测')");assert.ok(!actions.includes('zhangfei'));assert.ok(!actions.includes('exit'));assert.ok(actions.includes('预选:阆中市'));assert.equal(run('chats[active].persona'),'诸葛亮');assert.equal(requests.at(-1).body.mode,'学术');assert.ok(requests.at(-1).body.history.at(-1).content.includes('半天/一天/两天'));assert.ok(requests.at(-1).body.history.some(m=>m.content.startsWith('【人物视角：诸葛亮】')));
 requests.at(-1).resolve({ok:true,json:async()=>({answer:'阆中与剑门关',intent:{intent:'budget_ticket'},route:null})});await flush();rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));const controls=ctx.window.CharacterChat.actions(run('chats[0].messages.at(-1)'));assert.ok(text(controls).includes('故事线推荐'));assert.ok(!text(rendered).includes('故事线推荐'));assert.ok(!all(rendered).some(n=>n.tag==='button'&&/^(查看地点：|为.+规划路线|地图定位：|加入路线：|定位阆中)/.test(n.textContent)));
 assert.ok(text(controls).includes('切换到张飞视角'));all(controls).find(n=>n.textContent==='切换到张飞视角').handlers.click();assert.equal(run('chats[active].persona'),'张飞');
 const before=run('chats[active]');get('#new-chat').onclick();get('#character-select').value='陈寿';get('#character-select').handlers.change();run('deleteChat(chats[active])');get('#undo-delete').onclick();assert.equal(run('chats[active].persona'),'陈寿');assert.equal(before.persona,'张飞');
 const paths=['陈寿','诸葛亮','张飞'].map(n=>ctx.window.CharacterChat.portrait(n).children.at(-1).attrs.d);assert.equal(new Set(paths).size,3);
 assert.equal(JSON.stringify(c),baseline);
 run(fs.readFileSync(__dirname+'/answer-format.js','utf8'));
 rendered=ctx.window.CharacterChat.answer({persona:'陈寿',text:'## 剑门关史学风格\n**剑门关**与文质辨洽\n- 资料待核验\n<img src=x onerror=alert(1)>\ncoverage: 1.0',data:{generation:{kind:'llm'}}});
 assert.ok(all(rendered).some(n=>n.className==='agent-prose'));
 assert.ok(all(rendered).some(n=>n.tag==='h2'&&all(n).some(child=>child.className==='character-place-link'&&child.textContent==='剑门关')));
 assert.ok(all(rendered).some(n=>n.tag==='strong'&&text(n).includes('剑门关')));
 assert.ok(all(rendered).some(n=>n.tag==='ul'));
 assert.ok(!all(rendered).some(n=>n.tag==='img'));
 assert.ok(!text(rendered).includes('coverage: 1.0'));
 const placeLink=all(rendered).find(n=>n.className==='character-place-link'&&n.textContent==='剑门关');
 assert.ok(placeLink);placeLink.handlers.click();assert.ok(actions.includes('jianmenguan'));
 assert.ok(all(rendered).filter(n=>n.tag==='button'&&n.textContent==='剑门关').every(n=>n.className==='character-place-link'));
 rendered=ctx.window.CharacterChat.answer({persona:'陈寿',text:'| 名称 | 状态 |\n| --- | --- |\n| 剑门关 | 待核验 |',data:{generation:{kind:'nuwax'}}});
 assert.ok(all(rendered).some(n=>n.tag==='table'));
 assert.ok(!text(rendered).includes('当前资料中未找到可靠记载'));
 assert.ok(all(rendered).some(n=>n.tag==='td'&&all(n).some(child=>child.className==='character-place-link'&&child.textContent==='剑门关')));
 assert.ok(!all(rendered).some(n=>n.tag==='button'&&/^(查看地点：|为.+规划路线|地图定位：|加入路线：|定位阆中)/.test(n.textContent)));
 console.log('PASS: persona/context isolation, history prefix, pending drafts, immutable retry, evidence and C/URL gating, explicit inference/romance, discovery vs comparison, polymorphic responses, portrait differences and delete/undo');
})();
