// 运行命令：node frontend/app.test.cjs，无需额外依赖。
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
class Element {
  constructor(tag) { this.tag = tag; this.value = ''; this.children = []; this.dataset = {}; this.style = {}; this.hidden = true; this.events = {}; const classes = new Set(); this.classList = { toggle(c,on) { if(on) classes.add(c); else classes.delete(c); }, add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); } }; }
  querySelector() { return get('submit'); }
  setAttribute(k,v) { (this.attrs ||= {})[k]=v; }
  addEventListener(type,fn) { this.events[type]=fn; }
  setPointerCapture() {}
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
  focus() { this.focused = true; context.document.activeElement = this; }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
}
const nodes = new Map();
function get(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); }
const requests = [];
const context = vm.createContext({
  document: { querySelector: get, querySelectorAll: () => [], createElement: tag => new Element(tag), body: new Element(), events: {}, addEventListener(type,fn) { this.events[type]=fn; } },
  window: { events: {}, confirm:()=>true, addEventListener(type, fn) { this.events[type] = fn; } }, AbortSignal, URL, setTimeout, clearTimeout,
  fetch: (url, options) => url === '/health' ? Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) }) : new Promise((resolve, reject) => requests.push({ resolve, reject, body: JSON.parse(options.body) }))
});
// 应用状态测试使用通信替身；SSE 字节级解析另行测试。
context.window.SGTChatTransport = {request: (payload, onEvent = () => {}) =>
  context.fetch('/chat/stream', {body:JSON.stringify(payload)}).then(async response => {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data.session_id) onEvent({type:'session',session_id:data.session_id});
    return data;
  })};
vm.runInContext(fs.readFileSync(__dirname + '/app.js', 'utf8'), context);
const run = code => vm.runInContext(code, context);
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const flatten = n => [n,...n.children.flatMap(x=>typeof x==='object'?flatten(x):[])];
  for (const [role,persona,name] of [['assistant',undefined,'陈寿'],['assistant','诸葛亮','陈寿'],['assistant','张飞','陈寿'],['user','陈寿','你']]) {
    context.messageFixture={role,persona,text:'正文'};
    const row=run('messageNode(messageFixture)');
    assert.equal(row.className,'message '+role);
    assert.equal(flatten(row).find(n=>n.className==='message-name')?.textContent,name);
    assert.equal(row.children[1].className,'body');
  }
  assert.equal(get('#chat-panel').hidden, true);
  assert.equal(get('submit').disabled, true);
  get('#chat-panel').clientHeight = 900;
  get('#message').value = '草稿';
  get('#message').scrollHeight = 80;
  run('updateComposer()');
  assert.equal(get('#message').style.height, '80px');
  assert.equal(get('#message').style.overflowY, 'hidden');
  get('#message').scrollHeight = 400;
  run('updateComposer()');
  assert.equal(get('#message').style.height, '300px');
  assert.equal(get('#message').style.overflowY, 'auto');
  get('#chat-panel').clientHeight = 600;
  context.window.events.resize();
  assert.equal(get('#message').style.height, '200px');
  get('#message').value = '';
  run('updateComposer()');
  assert.equal(get('#message').style.height, '44px');
  assert.equal(get('#message').style.overflowY, 'hidden');
  get('#message').scrollHeight = 0;
  const firstChat=run('chats[0]');
  const renameButton=()=>get('#history-list').children[0].children.find(n=>n.className==='rename-chat');
  assert.ok(renameButton(),'U21 history has an optional rename entry');
  renameButton().onclick();
  let renameForm=get('#history-list').children[0].children.find(n=>n.className==='history-rename');
  let renameInput=flatten(renameForm).find(n=>n.tag==='input');
  renameInput.value='  ';renameForm.events.submit({preventDefault(){}});
  assert.equal(firstChat.title,'新对话','U21 rejects whitespace without changing the title');
  renameInput.value='  蜀道文化专题  ';renameInput.events.input();
  const retainedEditor=renameForm;
  renameInput.focus(); renameInput.selectionStart=2; renameInput.selectionEnd=5;
  run('render()');
  renameForm=get('#history-list').children[0].children.find(n=>n.className==='history-rename');
  assert.equal(renameForm,retainedEditor,'U21 answer redraw keeps the live editor DOM for focus, selection and IME');
  assert.equal(context.document.activeElement,renameInput,'U21 answer redraw retains the exact focused input');
  assert.equal(renameInput.selectionStart,2);assert.equal(renameInput.selectionEnd,5);
  assert.equal(flatten(renameForm).find(n=>n.tag==='input').value,'  蜀道文化专题  ','U21 stream redraw preserves the edit draft');
  renameForm.events.submit({preventDefault(){}});
  assert.equal(firstChat.title,'蜀道文化专题');
  assert.equal(get('#conversation-title').textContent,'蜀道文化专题');
  renameButton().onclick();
  renameForm=get('#history-list').children[0].children.find(n=>n.className==='history-rename');
  flatten(renameForm).find(n=>n.textContent==='取消').onclick();
  assert.equal(firstChat.title,'蜀道文化专题','U21 cancel preserves the name');
  renameButton().onclick();
  renameForm=get('#history-list').children[0].children.find(n=>n.className==='history-rename');
  let stoppedEscape=false;
  flatten(renameForm).find(n=>n.tag==='input').events.keydown({key:'Escape',preventDefault(){},stopPropagation(){stoppedEscape=true;}});
  assert.equal(stoppedEscape,true,'U21 local Escape must not reach the global chat close handler');
  assert.equal(get('#history-list').children[0].children.length, 2);
  run('deleteChat(chats[0])');
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 1);
  get('#new-chat').onclick();
  get('#new-chat').onclick();
  assert.equal(run('chats.length'), 1);
  run("send('南充一天路线')");
  assert.equal(firstChat.title,'蜀道文化专题','U21 manual title before the first question is not overwritten');
  assert.equal(requests.length, 1);
  run("send('重复提交')");
  assert.equal(requests.length, 1);
  get('#message').value = '保留的草稿';
  get('#new-chat').onclick();
  run("send('文化问题')");
  assert.equal(run('chats[0].title'),'文化问题','U21 untouched conversations keep default first-question naming');
  assert.equal(requests.length, 2);
  requests[0].resolve({ ok: true, json: async () => ({ answer: '南充路线', session_id:'session-a' }) });
  await flush();
  assert.equal(run('chats[1].messages[2].text'), '南充路线');
  assert.equal(run('chats[1].sessionId'), 'session-a');
  assert.equal(requests[1].body.session_id, null);
  assert.equal(run('chats[0].pending'), true);
  const historyOrder=run('chats.slice()');
  const activeBeforeRename=run('active');
  const currentDraft=get('#message').value;
  get('#history-list').children[1].children.find(n=>n.className==='rename-chat').onclick();
  const otherEditor=get('#history-list').children[1].children.find(n=>n.className==='history-rename');
  flatten(otherEditor).find(n=>n.tag==='input').value='南充活动与文化';
  otherEditor.events.submit({preventDefault(){}});
  assert.equal(run('active'),activeBeforeRename,'U21 naming a history entry does not switch the active conversation');
  assert.equal(get('#message').value,currentDraft,'U21 naming does not replace the composer draft');
  assert.deepEqual(run('chats.slice()'),historyOrder,'U21 rename preserves list order');
  assert.equal(firstChat.title,'南充活动与文化');
  get('#history-list').children[1].children[0].onclick();
  assert.equal(get('#message').value, '保留的草稿');
  requests[1].reject(new Error('offline'));
  await flush();
  assert.equal(run('chats[0].messages[2].error'), true);
  run('requestReply(chats[0], chats[0].messages[2])');
  assert.deepEqual(requests[2].body, requests[1].body);
  requests[2].resolve({ ok: true, json: async () => ({ answer: '文化回答' }) });
  await flush();
  assert.equal(run('chats[0].messages.length'), 3);
  assert.equal(run('chats[0].messages[2].error'), false);
  assert.equal(run('chats[0].pending'), false);
  context.window.confirm=()=>false;
  const beforeCancel=run('chats[0]');
  run('deleteChat(chats[0])');
  assert.equal(run('chats.length'),2);
  assert.equal(run('chats[0]'),beforeCancel,'取消删除保留原会话');
  context.window.confirm=()=>true;
  run('deleteChat(chats[0])');
  assert.equal(run('chats.length'), 1);
  assert.equal(get('#message').value, '保留的草稿');
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  assert.equal(run('active'), 0);
  run('deleteChat(chats[active])');
  const remaining = run('chats[0]');
  run('deleteChat(chats[active])');
  assert.equal(run('chats.length'), 1);
  assert.equal(run('chats[0]'), remaining);
  assert.equal(get('#history-list').children[0].children.length, 2);
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  get('#undo-delete').onclick();
  assert.equal(run('chats.length'), 2);
  get('#new-chat').onclick();
  run("send('等待中删除')");
  run('deleteChat(chats[active])');
  const messageCount = run('chats[active].messages.length');
  requests[3].resolve({ ok: true, json: async () => ({ answer: '迟到的回答' }) });
  await flush();
  assert.equal(run('chats[active].messages.length'), messageCount);
  get('#undo-delete').onclick();
  assert.equal(run('chats[active].messages[2].text'), '迟到的回答');
  assert.equal(run('chats.length'), 3);
  for (const failure of [
    {ok:false,status:422,json:async()=>({detail:'missing message'})},
    {ok:true,json:async()=>{throw new SyntaxError('invalid JSON')}},
    {ok:true,json:async()=>({route:null})},
    Object.assign(new Error('timeout'),{name:'TimeoutError'})
  ]) {
    run("send('错误态回归')");
    const request = requests[requests.length-1];
    if(failure instanceof Error) request.reject(failure); else request.resolve(failure);
    await flush();
    assert.equal(run('chats[active].messages.at(-1).error'),true);
    assert.equal(run('chats[active].pending'),false);
    const errorMessage = run('chats[active].messages.at(-1)');
    assert.match(textTree(run('messageNode(chats[active].messages.at(-1))')),/重试，请陈寿再回答一次/);
    run('requestReply(chats[active],chats[active].messages.at(-1))');
    requests.at(-1).resolve({ok:true,json:async()=>({answer:'重试成功',intent:{intent:'culture_qa'}})});
    await flush();
    assert.equal(errorMessage.error,false);
  }
  context.fullVisitorRequest='请生成活动，保留核验约束，不编造实时信息。';
  context.visitorSummary='南充一日文化活动，南充站出发，2人';
  run('send(fullVisitorRequest,{displayText:visitorSummary,preserveMap:true})');
  assert.equal(run('chats[active].messages.at(-2).text'),context.visitorSummary,'U01 visitor sees summary');
  assert.equal(requests.at(-1).body.message,context.fullVisitorRequest,'U01 request keeps constraints');
  requests.at(-1).resolve({ok:true,json:async()=>({answer:'摘要对应回答'})});await flush();
  run("send('后续追问')");
  assert.equal(requests.at(-1).body.history.find(x=>x.content===context.fullVisitorRequest)?.role,'user','full context remains request-only');
  requests.at(-1).reject(TypeError('Failed to fetch'));await flush();
  assert.match(run('chats[active].messages.at(-1).text'),/网络连接失败.*重试/,'U07 native fetch error is Chinese');
  assert.doesNotMatch(textTree(run('bubbleNode(chats[active].messages.at(-1))')),/Failed to fetch/);
  assert.match(textTree(run('messageNode(chats[active].messages.at(-1))')),/Failed to fetch/,'raw error stays in details');
  run('requestReply(chats[active],chats[active].messages.at(-1))');requests.at(-1).resolve({ok:true,json:async()=>({answer:'重试恢复'})});await flush();
  context.queuedActivity={version:99};
  run("chats[active].draftRequests=[{summary:'游客活动摘要',question:'完整活动约束，不编造坐标',options:{activityPlan:queuedActivity}}];send('补充偏好\\n\\n游客活动摘要')");
  assert.equal(requests.at(-1).body.message,'补充偏好\n\n完整活动约束，不编造坐标','U01 pending summary expands only in request');
  assert.equal(run('chats[active].messages.at(-2).text'),'补充偏好\n\n游客活动摘要');
  assert.equal(run('chats[active].messages.at(-1).activityPlan'),context.queuedActivity);
  requests.at(-1).resolve({ok:true,json:async()=>({answer:'等待草稿活动回答'})});await flush();
  await assert.rejects(context.window.SGTChat.request('   '),/填写/);
  for(const failure of [{ok:false,status:503},{ok:true,json:async()=>{throw new SyntaxError('bad JSON');}},Object.assign(Error('timeout'),{name:'TimeoutError'})]) {
    const p=context.window.SGTChat.request('请规划路线');const assertion=assert.rejects(p);const req=requests.at(-1);
    assert.equal(req.body.message,'请规划路线');if(failure instanceof Error)req.reject(failure);else req.resolve(failure);await assertion;
  }
  context.window.CharacterChat={backendMode:()=> '学术'};
  const modeRequest=run("window.SGTChat.request('文化模式校验')");assert.equal(requests.at(-1).body.mode,'学术');requests.at(-1).resolve({ok:true,json:async()=>({answer:'模式回答',intent:{intent:'culture_qa'}})});await modeRequest;delete context.window.CharacterChat;
  let capturedActivity;
  context.activityTest={preferences:{city:'南充',people:2},version:7};
  context.window.TravelModules={receiveActivity:reply=>capturedActivity=reply};
  run("send('测试活动方案', {preserveMap:true,activityPlan:activityTest})");
  requests.at(-1).resolve({ok:true,json:async()=>({answer:'活动顺序：读史，30分钟。',intent:{intent:'culture_qa'}})});await flush();
  assert.equal(capturedActivity.activityPlan,context.activityTest);assert.equal(capturedActivity.preserveMap,true);assert.match(capturedActivity.text,/活动顺序/);
  run("chats[active].draftActivityPlan={question:'草稿活动方案',activityPlan:activityTest};send('草稿活动方案')");requests.at(-1).resolve({ok:true,json:async()=>({answer:'草稿活动回答'})});await flush();assert.equal(capturedActivity.activityPlan,context.activityTest);assert.equal(capturedActivity.preserveMap,true,'等待活动草稿发送仍保护地图');assert.equal(run('chats[active].draftActivityPlan'),undefined);
  let crossChatUpdates=0;context.window.TravelModules={receiveActivity:()=>crossChatUpdates++};run("send('会话A待返回活动', {activityPlan:activityTest,preserveMap:true})");const requestA=requests.at(-1);get('#new-chat').onclick();requestA.resolve({ok:true,json:async()=>({answer:'A迟到活动'})});await flush();assert.equal(crossChatUpdates,0,'A迟到回答不能覆盖会话B的全局活动方案');delete context.window.TravelModules;
  let backToChat;const visited=[];const originalView=context.showContentView,originalToggle=context.toggleChat;
  context.window.TravelAssistant={canOpen:()=>true,open:(_message,back)=>{backToChat=back;}};
  context.showContentView=view=>visited.push(view);context.toggleChat=()=>{};
  run('currentContentView="story"');context.messageFixture={role:'assistant',text:'南充活动'};context.sourceChat=run('chats[active]');
  flatten(run('messageNode(messageFixture)')).find(n=>n.textContent==='查看出行方案').onclick();
  run('currentContentView="outing"');assert.equal(backToChat(),true);assert.equal(visited.at(-1),'story','return restores source view');
  run('chats.splice(chats.indexOf(sourceChat),1)');const visitedCount=visited.length;assert.equal(backToChat(),false,'deleted source chat cannot be reopened');assert.equal(visited.length,visitedCount);
  context.showContentView=originalView;context.toggleChat=originalToggle;delete context.window.TravelAssistant;
  console.log('PASS: HTTP 422, invalid JSON, missing answer and timeout render retry and recover');
  console.log('PASS: single-chat delete guard, no phantom chat on undo, empty-chat reuse, pending response isolation');
  console.log('PASS: initial state, duplicate guard, independent requests, drafts, retry payload and recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });

function textTree(node) { return (node.textContent || '') + (node.children || []).map(textTree).join(' '); }
function allNodes(node) { return [node,...(node.children||[]).flatMap(allNodes)]; }
assert.match(textTree(run('metaNode({intent:{intent:"culture_qa"}})')), /待核验/);

assert.doesNotMatch(textTree(run('metaNode({intent:{intent:"unknown"},retrieval:{coverage:2}})')), /意图 ·|召回覆盖/);
assert.match(textTree(run('metaNode({intent:{intent:"budget_ticket"},route:null})')), /不能认定为免费/);
assert.match(textTree(run('trustNode({data_status:"live",updated_at:"2026-09-12T10:00:00+08:00",sources:[{title:"来源",source_url:"https://example.com",source_level:"C"}]})')), /不能支撑史实结论/);
assert.match(textTree(run('trustNode({updated_at:"2026-09-12",sources:[{title:"不安全",source_url:"javascript:alert(1)",source_level:"A"}]})')), /来源链接待核验/);
assert.doesNotThrow(() => run('routeCard({name:"路线"},[null,{}, {name:"站点"}])'));
console.log('PASS: polymorphic responses, trust metadata, missing timestamps, unsafe sources, malformed stops');

run(fs.readFileSync(__dirname + '/answer-format.js', 'utf8'));
context.testUserMessage={role:'user',text:'**粗体** 和 `代码`\n- 第一项\ncoverage: 0.5\n| coverage | 内容 |\n| --- | --- |\n| 50% | 原文 |\n<img src=x onerror=alert(1)>'};
const userBubble=run('bubbleNode(testUserMessage)');
const userNodes=allNodes(userBubble);
assert.ok(userNodes.some(n=>n.tag==='strong'&&n.textContent==='粗体'));
assert.ok(userNodes.some(n=>n.tag==='code'&&n.textContent==='代码'));
assert.ok(userNodes.some(n=>n.tag==='ul'));
assert.ok(textTree(userBubble).includes('coverage: 0.5'));
assert.ok(userNodes.some(n=>n.tag==='th'&&textTree(n).includes('coverage')));
assert.ok(!userNodes.some(n=>n.tag==='img'));
context.testAssistantMessage={role:'assistant',text:'## 标题\n- 第一项'};
assert.ok(allNodes(run('bubbleNode(testAssistantMessage)')).some(n=>n.tag==='h2'));

const trusted = run('trustNode({data_status:"maintained",updated_at:"2026-09-12T10:00:00Z",sources:[{title:"官方",source_url:"https://example.com/info",source_level:"A"}]})');
assert.match(textTree(trusted), /维护数据/);
assert.match(textTree(trusted), /2026-09-12T10:00:00Z/);
assert.equal(trusted.children[2].children[0].href, 'https://example.com/info');
assert.equal(trusted.children[2].children[0].rel, 'noopener noreferrer');
assert.match(textTree(run('trustNode({data_status:"constructor"})')), /待核验/);

// N9：故事卡片不能覆盖关面板后的滚动恢复；三个关闭入口必须等价。
context.window.innerWidth=1920; context.window.innerHeight=1080;
context.window.scrollY=320;
context.window.scrollTo=({top,behavior})=>{assert.equal(behavior,'instant');context.window.scrollY=top;};
context.window.StoryMap={revealCard(){context.window.scrollY=940;}};
get('#chat-panel').offsetWidth=680;get('#launcher').offsetWidth=120;
get('#launcher').getBoundingClientRect=()=>({left:1600,top:760});
const closeResults=[];
for(const close of [()=>get('#launcher').events.click({detail:1}),()=>get('#close-chat').onclick(),()=>context.document.events.keydown({key:'Escape'})]){
 const viewPanel=get('[data-view-panel="welcome"]');viewPanel.scrollTop=240;
 context.window.scrollY=320;get('#launcher').events.click({detail:1});
 assert.equal(get('#chat-panel').hidden,false);
 context.window.scrollY=500;viewPanel.scrollTop=640;close();
 assert.equal(viewPanel.scrollTop,240,'N10 内部滚动同步保留 N9 关闭恢复');
 assert.equal(context.window.scrollY,320,'章节卡片已展开时恢复打开前位置');
 assert.equal(get('#chat-panel').hidden,true);
 assert.equal(context.document.body.classList.contains('chat-open'),false);
 assert.equal(context.document.activeElement,get('#launcher'));
 closeResults.push([context.window.scrollY,get('#launcher').style.left,context.document.activeElement]);
}
const internalWelcome=get('[data-view-panel="welcome"]');internalWelcome.scrollTop=240;
run('toggleChat(true)');internalWelcome.scrollTop=640;run('currentContentView="map";toggleChat(false)');
assert.equal(internalWelcome.scrollTop,640,'closing a different view does not restore a stale panel');
run('currentContentView="welcome"');
assert.deepEqual(closeResults[0],closeResults[1]);assert.deepEqual(closeResults[1],closeResults[2]);
delete context.window.StoryMap;
context.window.scrollY=180;run('toggleChat(true)');context.window.scrollY=400;run('toggleChat(false)');assert.equal(context.window.scrollY,180);
const launcherN9=get('#launcher');
launcherN9.events.pointerdown({button:0,clientX:1600,clientY:760,pointerId:1});
launcherN9.events.pointermove({clientX:1500,clientY:700});launcherN9.events.pointerup();
// 没有派发拖动合成的 click 时，下一次按下也必须清除旧手势抑制。
launcherN9.events.pointerdown({button:0,clientX:1500,clientY:700,pointerId:2});launcherN9.events.pointerup();launcherN9.events.click({detail:1});
assert.equal(get('#chat-panel').hidden,false);launcherN9.events.click({detail:1});assert.equal(get('#chat-panel').hidden,true);
launcherN9.events.pointercancel();launcherN9.events.click({detail:1});assert.equal(get('#chat-panel').hidden,false,'取消拖动不吞掉下次点击');run('toggleChat(false)');
console.log('PASS: N9 story-card scroll restoration, equivalent close controls, body state, focus and drag/cancel recovery');

context.routeFixture={role:'assistant',text:'路线正文',data:{intent:{intent:'route_planning'},route:{found:true,route:{name:'路线详情'},stops:[{name:'剑门关'}]}}};
const routeRow=run('messageNode(routeFixture)'), routeBody=routeRow.children[1];
assert.ok(routeBody.children.some(n=>n.className==='route-card'),'route details remain readable below metadata');
assert.ok(!allNodes(routeBody.children.find(n=>n.className==='meta')).some(n=>n.className==='route-card'));

// N11: a burst of scroll events schedules one frame and updates once.
assert.equal(run('typeof initTopbarScroll'),'function');
const frames=[],scrollOptions={};
context.window.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
const oldAdd=context.window.addEventListener;
context.window.addEventListener=(event,fn,options)=>{oldAdd.call(context.window,event,fn);scrollOptions[event]=options;};
let innerTop=0,toggles=0;
get('.content').querySelector=()=>({scrollTop:innerTop});
const oldToggle=get('.topbar').classList.toggle;
get('.topbar').classList.toggle=(...args)=>{toggles++;oldToggle(...args);};
context.window.scrollY=0;run('initTopbarScroll()');assert.equal(toggles,1);
assert.equal(scrollOptions.scroll.passive,true);
for(let i=0;i<100;i++)context.window.events.scroll();
assert.equal(frames.length,1);assert.equal(toggles,1);
context.window.scrollY=80;frames.shift()();assert.equal(get('.topbar').classList.contains('is-scrolled'),true);assert.equal(toggles,2);
context.window.events.scroll();frames.shift()();assert.equal(toggles,2,'unchanged state causes no class churn');
context.window.scrollY=0;context.window.events.scroll();frames.shift()();assert.equal(get('.topbar').classList.contains('is-scrolled'),false);
innerTop=100;get('.content').events.scroll();frames.shift()();assert.equal(get('.topbar').classList.contains('is-scrolled'),true);
innerTop=0;get('.content').events.scroll();frames.shift()();assert.equal(get('.topbar').classList.contains('is-scrolled'),false);
console.log('PASS: N11 passive scroll, 100-event coalescing, stable state, internal scroll and top recovery');

// 第八批：原文、结构化出处与预算范围互不混淆。
const copyFailures=[];
const copyCheck=(name,fn)=>{try{fn();}catch(e){copyFailures.push(name+': '+e.message);}};
copyCheck('C01',()=>{
 assert.match(textTree(run('trustNode({})')),/文献出处尚未核验/);
 assert.match(textTree(run('metaNode({generation:{kind:"nuwax"}})')),/来源.*待核验/);
 const source={sources:[{title:'真实出处',source_url:'https://example.org/paper',source_level:'B'}]};context.copySource=source;
 assert.doesNotMatch(textTree(run('trustNode(copySource)')),/文献出处尚未核验/);
 const unsafe=run('trustNode({sources:[{title:"PDF",source_url:"javascript:alert(1)"}]})');
 assert.match(textTree(unsafe),/文献出处尚未核验/);assert.equal(allNodes(unsafe).filter(n=>n.tag==='a').length,0);
});
copyCheck('C04',()=>{
 assert.match(textTree(run('metaNode({retrieval:{coverage:1}})')),/检索到相关资料，回答仍需核对出处/);
 assert.doesNotMatch(textTree(run('metaNode({retrieval:{coverage:1}})')),/100%|召回覆盖/);
 assert.equal(allNodes(run('metaNode({retrieval:{coverage:0}})')).filter(n=>n.textContent==='检索到相关资料，回答仍需核对出处').length,0);
});
copyCheck('C10',()=>{
 const hotel={intent:{intent:'budget_ticket'},answer:'南充舒适型酒店预算：200.0 - 380.0 CNY/晚/间。\n说明：景区票价为维护数据；酒店和交通价格波动较大，正式服务应接入 OTA、地图和 12306 等实时工具。'};context.copyHotel=hotel;
 assert.match(run('budgetScope(copyHotel)'),/本次未取得可核对的门票费用，以下仅为住宿预算.*请提供具体景区/);
 const rendered=run('messageNode({role:"assistant",text:copyHotel.answer,data:copyHotel})');
 const body=allNodes(rendered).find(n=>n.className==='body');
 assert.match(textTree(body.children[0]),/以下仅为住宿预算/);assert.equal(body.children[1].className,'bubble','范围提示在原回答前');
 const withTicket={...hotel,answer:hotel.answer+'\n景区票价：剑门关：50 - 50 CNY'};context.copyTicket=withTicket;
 assert.equal(run('budgetScope(copyTicket)'),'');
 for(const answer of ['南充门票：50元；'+hotel.answer,hotel.answer.replace('说明：','说明：门票50元；'),hotel.answer.replace('南充舒适型','未知格式')]){
  context.copyAmbiguous={...hotel,answer};assert.equal(run('budgetScope(copyAmbiguous)'),'','已有门票或未知格式不能误标住宿范围');
 }
 context.copyUnknown={intent:{intent:'budget_ticket'},answer:'文化参观费用需核验。'};
 assert.equal(run('budgetScope(copyUnknown)'),'');
 assert.equal(hotel.answer,context.copyHotel.answer,'原回答不改写');
});
assert.equal(copyFailures.join('\n'),'','第八批文案断言');

const batch9Failures=[];
function batch9Check(code,fn){try{fn();}catch(e){batch9Failures.push(code+': '+e.message);}}
batch9Check('C11',()=>{
 const raw=context.copyHotel.answer, row=run('messageNode({role:"assistant",text:copyHotel.answer,data:copyHotel})');
 assert.match(textTree(row),/住宿价格仅供估算，请以预订平台当天报价为准/);
 assert.match(textTree(row),/每间每晚约 200—380 元.*尚非报价.*需核验/);
 const originalBubble=textTree(allNodes(row).find(n=>n.className==='bubble'));
 assert.doesNotMatch(originalBubble,/正式服务应接入|OTA|12306/,'游客正文移除开发待办');
 assert.equal(context.copyHotel.answer,raw);
 const routeRaw='以陈寿和地方蜀汉遗迹为主线，适合展示文化解释、路线推荐和预算估算能力。';context.ninthRouteRaw=routeRaw;
 const routeRow=run('messageNode({role:"assistant",text:ninthRouteRaw,data:{intent:{intent:"route_planning"}}})');assert.match(textTree(routeRow),/当前内容为文化游览参考/);assert.ok(textTree(routeRow).includes(routeRaw),'C11 演示原文保留');
 context.batch9Foreign={...context.copyHotel,answer:raw.replace('CNY','USD')};
 assert.doesNotMatch(textTree(run('messageNode({role:"assistant",text:batch9Foreign.answer,data:batch9Foreign})')),/元\/晚\/间/);
});
batch9Check('C12',()=>{
 for(const [level,label] of [['A','权威资料'],['B','较可靠资料'],['C','文学/传说']]){
  context.batch9Level={sources:[{title:'出处',source_url:'https://example.org',source_level:level}]};
  assert.match(textTree(run('trustNode(batch9Level)')),new RegExp(level+'.*'+label));
 }
 context.batch9Realtime={data_status:'forecast',sources:[{title:'天气模型',source_url:'https://example.org',source_level:'C'}]};
 const out=textTree(run('trustNode(batch9Realtime)'));assert.match(out,/模型预报、非现场实测/);assert.doesNotMatch(out,/文学|来源等级|史实结论/);
});
batch9Check('C16',()=>{
 const out=textTree(run('routeCard({name:"参考路线"},[{name:"万卷楼",stay_minutes:120,recommended_duration_min:90}])'));
 assert.match(out,/本次安排：120 分钟/);assert.match(out,/资料中的一般游览参考：90 分钟（仍需核验）/);
 assert.match(textTree(run('routeCard({name:"参考路线"},[{name:"未知",stay_minutes:null,recommended_duration_min:null}])')),/时长含义待确认/);
});
batch9Check('C21',()=>{const out=run('bubbleNode({pending:true})');assert.equal(out.textContent,'陈寿正在整理回答，请稍候');assert.equal(out.attrs['aria-label'],out.textContent);});
assert.equal(batch9Failures.join('\n'),'','第九批app断言');
