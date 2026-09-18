const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.value='';this.textContent='';this.hidden=true;this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 querySelector(){return get('submit');} setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,f){this.handlers[k]=f;} append(...n){this.children.push(...n);} replaceChildren(...n){this.children=n;} focus(){} click(){this.handlers.click?.();} getBoundingClientRect(){return {left:0,top:0};}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},requests=[],actions=[];
const c={story:{title:'蜀道寻踪'},chapter:{name:'第二幕'},place:{name:'剑门关'}};
const ctx=vm.createContext({document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),body:new Element(),addEventListener(){}},window:{addEventListener(){},SGT_STORIES:[{id:'chenshou',title:'陈寿线'},{id:'zhangfei',title:'镇守阆中·寻迹张飞'}],SGT_PLACES:[{id:'jianmenguan',name:'剑门关'}],CulturalNode:{getContext:()=>c,compare:()=>actions.push('compare'),openPlace:id=>actions.push(id)},StoryMap:{isActive:()=>true,exit:()=>actions.push('exit')},SGTStoryUI:{openStory:id=>actions.push(id)},TravelMap:{syncChat(){},fromMessage:()=>actions.push('fromMessage'),fromResponse:()=>actions.push('fromResponse'),focusMention:name=>actions.push(name)},SGTJourney:{ask:q=>actions.push(q)}},URL,AbortSignal,fetch:(url,options)=>url==='/health'?Promise.resolve({ok:true,json:async()=>({status:'ok'})}):new Promise((resolve,reject)=>requests.push({resolve,reject,body:JSON.parse(options.body)}))});
const run=s=>vm.runInContext(s,ctx),flush=()=>new Promise(r=>setImmediate(r));
for(const f of ['app.js','character-chat.js'])run(fs.readFileSync(__dirname+'/'+f,'utf8'));
const all=n=>[n,...n.children.flatMap(x=>typeof x==='object'?all(x):[])],text=n=>all(n).map(x=>x.textContent).join(' ');
(async()=>{
 const baseline=JSON.stringify(c);get('#character-select').value='诸葛亮';get('#character-select').handlers.change();assert.equal(JSON.stringify(c),baseline);assert.equal(actions.length,0);
 run("send('   ')");assert.equal(requests.length,0);
 run("send('历史上的张飞真是这样吗？')");assert.equal(requests.length,1);assert.equal(requests[0].body.message,'历史上的张飞真是这样吗？');assert.equal(actions.join(','),'compare');assert.ok(requests[0].body.history.at(-1).content.includes('诸葛亮'));assert.ok(requests[0].body.history.at(-1).content.includes('第二幕'));assert.ok(requests[0].body.history.at(-1).content.includes('剑门关'));
 get('#character-select').value='张飞';get('#character-select').handlers.change();run("send('下一问')");assert.equal(requests.length,1);assert.equal(get('#message').value,'下一问');
 requests[0].reject(new Error('offline'));await flush();run('requestReply(chats[active],chats[active].messages.at(-1))');assert.deepEqual(requests[1].body,requests[0].body);requests[1].resolve({ok:true,json:async()=>({answer:'【史料记载】不能直接认定可靠【合理推断】测试推断【演义】测试文学',intent:{intent:'culture_qa'}})});await flush();
 assert.equal(run('chats[0].messages.at(-1).persona'),'诸葛亮');let rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));assert.ok(text(rendered).includes('当前资料中未找到可靠记载'));assert.ok(all(rendered).some(n=>n.className==='character-evidence inference'&&text(n).includes('测试推断')));assert.ok(all(rendered).some(n=>n.className==='character-evidence romance'&&text(n).includes('测试文学')));
 const record={type:'history',text:'测试史料',data_status:'maintained',updated_at:'2026-09-18T00:00:00Z',sources:[{title:'测试来源',source_url:'https://example.com',source_level:'A',data_status:'maintained'}]};assert.equal(ctx.window.CharacterChat.reliable(record),true);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'测试原回答',data:{evidence_segments:[record]}});assert.ok(all(rendered).some(n=>n.className==='character-evidence history'));
 record.sources[0].source_level='C';assert.equal(ctx.window.CharacterChat.reliable(record),false);record.sources[0].source_level='A';record.sources[0].source_url='javascript:alert(1)';assert.equal(ctx.window.CharacterChat.reliable(record),false);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'原回答',data:{sources:record.sources}});assert.equal(all(rendered).filter(n=>n.tag==='a').length,0);
 run("send('我想了解张飞\\n\\n请区分史实与推测')");assert.ok(actions.includes('zhangfei'));assert.ok(actions.includes('阆中市'));assert.ok(requests.at(-1).body.history.at(-1).content.includes('半天/一天/两天'));assert.ok(requests.at(-1).body.history.some(m=>m.content.startsWith('【人物视角：诸葛亮】')));
 requests.at(-1).resolve({ok:true,json:async()=>({answer:'阆中与剑门关',intent:{intent:'budget_ticket'},route:null})});await flush();rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));assert.ok(text(rendered).includes('故事线推荐'));assert.ok(text(rendered).includes('定位阆中'));assert.ok(text(rendered).includes('为剑门关规划路线'));
 const before=run('chats[active]');get('#new-chat').onclick();get('#character-select').value='陈寿';get('#character-select').handlers.change();run('deleteChat(chats[active])');get('#undo-delete').onclick();assert.equal(run('chats[active].persona'),'陈寿');assert.equal(before.persona,'张飞');
 const paths=['陈寿','诸葛亮','张飞'].map(n=>ctx.window.CharacterChat.portrait(n).children.at(-1).attrs.d);assert.equal(new Set(paths).size,3);
 assert.equal(JSON.stringify(c),baseline);
 console.log('PASS: persona/context isolation, history prefix, pending drafts, immutable retry, evidence and C/URL gating, explicit inference/romance, discovery vs comparison, polymorphic responses, portrait differences and delete/undo');
})();
