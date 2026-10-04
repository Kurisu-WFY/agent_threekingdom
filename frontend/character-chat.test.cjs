const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.value='';this.textContent='';this.hidden=true;this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 querySelector(){return get('submit');} setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,f){this.handlers[k]=f;} append(...n){this.children.push(...n);} replaceChildren(...n){this.children=n;} focus(){} click(){this.handlers.click?.();} getBoundingClientRect(){return {left:0,top:0};}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},requests=[],actions=[];
const c={story:{id:'test',title:'蜀道寻踪',chapters:[{name:'第二幕',placeId:'pass'}]},chapter:{name:'第二幕'},place:{name:'剑门关'}};
const ctx=vm.createContext({document:{querySelector:get,querySelectorAll:()=>[],createElement:t=>new Element(t),createElementNS:(ns,t)=>new Element(t),body:new Element(),addEventListener(){}},window:{addEventListener(){},SGT_STORIES:[{id:'chenshou',title:'陈寿线'},{id:'zhangfei',title:'镇守阆中·寻迹张飞'}],SGT_PLACES:[{id:'jianmenguan',name:'剑门关'}],CulturalNode:{getContext:()=>c,compare:()=>actions.push('compare'),openPlace:(id,options)=>actions.push([id,options?.returnTo])},StoryMap:{isActive:()=>true,exit:()=>actions.push('exit')},SGTStoryUI:{openStory:id=>actions.push(id)},TravelMap:{syncChat(){},fromMessage:()=>actions.push('fromMessage'),fromResponse:()=>actions.push('fromResponse'),focusMention:(name,options)=>actions.push(options?.reveal===false?'预选:'+name:options?.reveal===true?'显式:'+name:name),hasMentions:text=>/阆中|剑门关/.test(text),showMentions:(text,origin)=>actions.push('地图:'+text+':'+origin)},SGTJourney:{ask:q=>actions.push(q)}},URL,AbortSignal,fetch:(url,options)=>url==='/health'?Promise.resolve({ok:true,json:async()=>({status:'ok'})}):new Promise((resolve,reject)=>requests.push({resolve,reject,body:JSON.parse(options.body)}))});
const run=s=>vm.runInContext(s,ctx),flush=()=>new Promise(r=>setImmediate(r));
require('./chat-test-double.cjs')(ctx);
for(const f of ['app.js','story-progress.js','character-chat.js'])run(fs.readFileSync(__dirname+'/'+f,'utf8'));
const all=n=>[n,...n.children.flatMap(x=>typeof x==='object'?all(x):[])],text=n=>all(n).map(x=>x.textContent).join(' ');
(async()=>{
 const baseline=JSON.stringify(c);assert.equal(ctx.window.CharacterChat.prepare({persona:'诸葛亮'},'普通问题').persona,'陈寿');assert.equal(JSON.stringify(c),baseline);assert.equal(actions.length,0);assert.equal(ctx.window.CharacterChat.selectPersona,undefined);
 const notice=get('#character-notice').textContent;run('render()');assert.equal(get('#character-notice').textContent,notice);
 ctx.window.CharacterChat.setMode('亲子故事版');assert.equal(ctx.window.StoryProgress.get(c.story).mode,'亲子故事版');
 run("send('   ')");assert.equal(requests.length,0);
 run("send('历史上的张飞真是这样吗？')");assert.equal(requests.length,1);assert.equal(requests[0].body.message,'历史上的张飞真是这样吗？');assert.equal(requests[0].body.mode,'亲子');ctx.window.StoryProgress.get(c.story).mode='学术探索版';ctx.window.StoryProgress.save(c.story);assert.equal(get('#character-mode').value,'学术探索版');assert.equal(actions.join(','),'compare');assert.ok(requests[0].body.history.at(-1).content.includes('【人物视角：陈寿】'));assert.ok(requests[0].body.history.at(-1).content.includes('第二幕'));assert.ok(requests[0].body.history.at(-1).content.includes('剑门关'));
 assert.equal(requests[0].body.story_id,'test');
 assert.equal(run('chats[0].messages.find(m=>m.role==="user").text'),'历史上的张飞真是这样吗？');
 run("send('下一问')");assert.equal(requests.length,1);assert.equal(get('#message').value,'下一问');
 requests[0].reject(new Error('offline'));await flush();run('requestReply(chats[active],chats[active].messages.at(-1))');assert.deepEqual(requests[1].body,requests[0].body);requests[1].resolve({ok:true,json:async()=>({answer:'【史料记载】不能直接认定可靠【合理推断】测试推断【演义】测试文学',intent:{intent:'culture_qa'}})});await flush();
 assert.equal(run('chats[0].messages.at(-1).persona'),'陈寿');let rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));assert.ok(text(rendered).includes('【史料记载】不能直接认定可靠【合理推断】测试推断【演义】测试文学'));assert.ok(!all(rendered).some(n=>/character-(evidence|sources|raw)/.test(n.className||'')));assert.ok(!text(rendered).includes('AI解读，非人物原话'));
 const record={type:'history',text:'测试史料',data_status:'maintained',updated_at:'2026-09-18T00:00:00Z',sources:[{title:'测试来源',source_url:'https://example.com',source_level:'A',data_status:'maintained'}]};assert.equal(ctx.window.CharacterChat.reliable(record),true);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'测试原回答',data:{evidence_segments:[record]}});assert.equal(text(rendered).trim(),'测试原回答');
 record.sources[0].source_level='C';assert.equal(ctx.window.CharacterChat.reliable(record),false);record.sources[0].source_level='A';record.sources[0].source_url='javascript:alert(1)';assert.equal(ctx.window.CharacterChat.reliable(record),false);
 rendered=ctx.window.CharacterChat.answer({persona:'张飞',text:'原回答',data:{sources:record.sources}});assert.equal(all(rendered).filter(n=>n.tag==='a').length,0);
 rendered=ctx.window.CharacterChat.answer({persona:'陈寿',text:'女娲实际正文',data:{generation:{kind:'nuwax'}}});
 assert.equal(text(rendered).trim(),'女娲实际正文');assert.ok(!all(rendered).some(n=>n.tag==='details'));
 assert.ok(!text(rendered).includes('当前资料中未找到可靠记载'));
 run("send('我想了解张飞\\n\\n请区分史实与推测')");assert.ok(!actions.includes('zhangfei'));assert.ok(!actions.includes('exit'));assert.ok(actions.includes('预选:阆中市'));assert.equal(run('chats[active].messages.at(-1).persona'),'陈寿');assert.equal(requests.at(-1).body.mode,'学术');assert.ok(requests.at(-1).body.history.at(-1).content.includes('半天/一天/两天'));assert.ok(requests.at(-1).body.history.some(m=>m.content.startsWith('【人物视角：陈寿】')));
 requests.at(-1).resolve({ok:true,json:async()=>({answer:'阆中与剑门关',intent:{intent:'budget_ticket'},route:null})});await flush();rendered=ctx.window.CharacterChat.answer(run('chats[0].messages.at(-1)'));const controls=ctx.window.CharacterChat.actions(run('chats[0].messages.at(-1)'));assert.ok(text(controls).includes('故事推荐'));assert.ok(!text(rendered).includes('故事推荐'));assert.ok(!all(rendered).some(n=>n.tag==='button'&&/^(查看地点：|为.+规划路线|地图定位：|加入路线：|定位阆中)/.test(n.textContent)));
 assert.ok(text(controls).includes('在地图查看提及地点'));
 run('currentContentView="journal"');all(controls).find(n=>n.textContent==='在地图查看提及地点').handlers.click();assert.ok(actions.includes('地图:阆中与剑门关:journal'));
 assert.ok(!text(controls).includes('切换到张飞视角'));
 all(controls).find(n=>n.textContent==='在地图中查看阆中').handlers.click();assert.ok(actions.includes('显式:阆中市'));
 const before=run('chats[active]');get('#new-chat').onclick();const fresh=run('chats[active]');run('deleteChat(chats[active])');get('#undo-delete').onclick();assert.equal(run('chats[active]'),fresh);assert.equal(before.messages.at(-1).persona,'陈寿');
 const paths=['陈寿','诸葛亮','张飞'].map(n=>ctx.window.CharacterChat.portrait(n).children.at(-1).attrs.d);assert.equal(new Set(paths).size,1);
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
 assert.ok(placeLink);run('currentContentView="story"');placeLink.handlers.click();assert.ok(actions.some(a=>Array.isArray(a)&&a[0]==='jianmenguan'&&a[1]==='story'));
 run('currentContentView="node"');placeLink.handlers.click();assert.ok(actions.some(a=>Array.isArray(a)&&a[0]==='jianmenguan'&&a[1]==='welcome'),'answer link from an open detail must return to its source, not itself');
 assert.ok(all(rendered).filter(n=>n.tag==='button'&&n.textContent==='剑门关').every(n=>n.className==='character-place-link'));
 rendered=ctx.window.CharacterChat.answer({persona:'陈寿',text:'| 名称 | 状态 |\n| --- | --- |\n| 剑门关 | 待核验 |',data:{generation:{kind:'nuwax'}}});
 assert.ok(all(rendered).some(n=>n.tag==='table'));
 assert.ok(!text(rendered).includes('当前资料中未找到可靠记载'));
 assert.ok(all(rendered).some(n=>n.tag==='td'&&all(n).some(child=>child.className==='character-place-link'&&child.textContent==='剑门关')));
 assert.ok(!all(rendered).some(n=>n.tag==='button'&&/^(查看地点：|为.+规划路线|地图定位：|加入路线：|定位阆中)/.test(n.textContent)));
 console.log('PASS: fixed Chenshou/context isolation, history prefix, pending drafts, immutable retry, direct prose without evidence wrappers, C/URL gating, verbatim inference/romance, cultural discovery vs comparison, polymorphic responses, one portrait and delete/undo');
})();


// C14：只使用明确且唯一的游客条件，原回答不变。
for(const [question,want] of [['你之前建议安排一天，我想了解张飞','你有半天、一天还是两天？'],['张飞曾用一天，我想了解张飞','你有半天、一天还是两天？'],['我有一天时间，想了解张飞','已按一天考虑，可继续调整'],['只有半天时间，想了解张飞','已按半天考虑，可继续调整'],['我有一天，想了解张飞','已按一天考虑，可继续调整'],['可用时间：半天；目的地：阆中','已按半天考虑，可继续调整'],['游玩时间：两天','已按两天考虑，可继续调整'],['我想了解张飞','你有半天、一天还是两天？'],['一天或两天都行','你有半天、一天还是两天？']]){
 const msg={text:'原回答：你有半天、一天还是两天？',originalQuestion:question,characterAction:'discover',discovered:'张飞'};
 assert.ok(text(ctx.window.CharacterChat.actions(msg)).includes(want),'C14 '+question+' => '+want);
 assert.equal(msg.text,'原回答：你有半天、一天还是两天？');
}
