/* 第十一批：真实 Chromium 回归。聊天服务使用标注夹具；真实回答另由 acceptance-chat-polish/verify-live.cjs 验证。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const out = path.join(__dirname, 'acceptance-chat-polish');
const fixture = '## 陈寿与史料\n'+ '这是渲染验收夹具，来源待确认。陈寿与南充的关系仍需核验，C 级文学资料不能支撑史实结论。'.repeat(24) + '\n- **资料待核验**\n- 不代表实际到访\n| 地点 | 状态 |\n| --- | --- |\n| 剑门关 | 待核验 |\n[渲染夹具链接](https://example.com) 🙂𠮷\n```text\n第一行代码\n第二行代码\n```';
const results=[];
async function check(name, fn) { try {const detail=await fn(); results.push({name,passed:true,detail});} catch(e){results.push({name,passed:false,error:e.message});} }
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/chat/stream',route=>route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({type:'result',data:{answer:fixture,intent:{intent:'culture_qa'},data_status:'sample',sources:[]}})+'\n\n'}));
 await page.goto('http://localhost:8002');await page.waitForLoadState('networkidle');
 await page.locator('#launcher').click();
 await page.waitForFunction(()=>Math.abs(document.querySelector('#chat-panel').getBoundingClientRect().right-innerWidth)<1);
 await check('1 陈寿唯一向导、无切换入口、旧身份不回流',async()=>{
   assert.equal(await page.locator('#character-select').count(),0);
   const detail=await page.evaluate(()=>{
     const prepared=CharacterChat.prepare({persona:'诸葛亮'},'我想了解张飞');
     const row=messageNode({role:'assistant',persona:'张飞',text:'资料待核验'});
     return {persona:prepared.persona,context:prepared.context,name:row.querySelector('.message-name').textContent,actions:CharacterChat.actions({characterAction:'discover',discovered:'张飞',text:'阆中'}).textContent,hasSwitch:typeof CharacterChat.selectPersona==='function'};
   });
   assert.equal(detail.persona,'陈寿');assert.equal(detail.name,'陈寿');assert.equal(detail.hasSwitch,false);assert.doesNotMatch(detail.actions,/切换.*视角/);assert.match(detail.context,/人物视角：陈寿/);return detail;
 });
 await check('2 无冗余大标题、状态位于右下角',async()=>{
   assert.doesNotMatch(await page.locator('.chat-heading').innerText(),/万卷史官|模型已配置/);
   const bounds=await page.evaluate(()=>{const p=document.querySelector('#chat-panel').getBoundingClientRect(),s=document.querySelector('#chat-panel [data-service-status]').getBoundingClientRect();return {panel:{right:p.right,bottom:p.bottom},status:{right:s.right,bottom:s.bottom,width:s.width,height:s.height}};});
   assert.ok(bounds.status.height<=24);assert.ok(bounds.status.right<=1920);assert.ok(bounds.panel.right-bounds.status.right<24);assert.ok(bounds.panel.bottom-bounds.status.bottom<28);return bounds;
 });
 await check('4 设置保留讲解模式与上下文',async()=>{
   await page.locator('.chat-options > summary').click();assert.equal(await page.locator('.chat-options select').count(),1);
   assert.equal(await page.locator('#character-mode option').count(),3);
   await page.locator('#character-mode').selectOption({label:'亲子线'});
   assert.equal(await page.evaluate(()=>CharacterChat.backendMode()),'亲子');
   await page.locator('.chat-options > summary').click();
 });
 await check('6 单行/多行输入的发送按钮垂直居中',async()=>{
   const details=[];for(const value of ['','第一行\n第二行\n第三行\n第四行']){
     await page.locator('#message').fill(value);
     const field=await page.locator('.composer-field').boundingBox(),button=await page.locator('.composer-send').boundingBox();
     const offset=Math.abs(field.y+field.height/2-button.y-button.height/2);assert.ok(offset<=1,'中心偏差 '+offset);details.push({height:field.height,offset});
   }await page.locator('#message').fill('');return details;
 });
 await page.locator('#message').fill('夹具验收：陈寿与南充');await page.locator('.composer-send').click();
 await page.waitForFunction(()=>!chats[active].pending);
 await check('5 屏幕行逐行淡入、正文保真、历史不重播',async()=>{
   await page.waitForFunction(()=>document.querySelectorAll('.answer-line').length>3,{},{timeout:2000});
   const initial=await page.evaluate(()=>[...document.querySelectorAll('.answer-line')].map(n=>({text:n.textContent,line:n.dataset.line,delay:parseFloat(getComputedStyle(n).animationDelay),opacity:parseFloat(getComputedStyle(n).opacity)})));
   const first=await page.locator('.answer-line').first().boundingBox(),viewport=await page.locator('#messages').boundingBox();
   assert.ok(first.y>=viewport.y&&first.y+first.height<=viewport.y+viewport.height,'长回答淡入时首行必须在消息视口内');
   assert.ok(new Set(initial.map(n=>n.line)).size>6);assert.ok(Math.max(...initial.map(n=>n.delay))>Math.min(...initial.map(n=>n.delay)));
   assert.ok(initial.some(n=>n.opacity<0.05),'后续行尚未出现');assert.ok(!await page.locator('.message.user .answer-line').count());
   await page.waitForFunction(()=>{const nodes=[...document.querySelectorAll('.answer-line')];return nodes.some(n=>parseFloat(getComputedStyle(n).opacity)>.7)&&nodes.some(n=>parseFloat(getComputedStyle(n).opacity)<.05);});
   await page.screenshot({path:path.join(out,'fixture-lines-progress.png')});
   await page.waitForFunction(()=>[...document.querySelectorAll('.answer-line')].every(n=>getComputedStyle(n).opacity==='1'),{},{timeout:15000});
   assert.equal(await page.evaluate(()=>chats[active].messages.at(-1).text),fixture);
   assert.equal(await page.locator('.character-answer .agent-prose p').first().textContent(),fixture.split('\n')[1]);
   assert.ok(await page.locator('.character-answer strong').count());assert.ok(await page.locator('.character-place-link').count());assert.ok(await page.locator('.character-answer table').count());
   assert.equal(await page.locator('.character-answer pre code').textContent(),'第一行代码\n第二行代码');
   assert.ok((await page.locator('.character-answer').textContent()).includes('🙂𠮷'));
   assert.equal(await page.locator('.character-answer a').getAttribute('href'),'https://example.com');
   await page.screenshot({path:path.join(out,'fixture-lines-complete.png')});
   await page.evaluate(()=>render());assert.equal(await page.locator('.answer-line').count(),0);return {lines:initial,rawUnchanged:true};
 });
 await check('3 删除前确认、取消完整保留、轻量撤销',async()=>{
   await page.locator('#new-chat').click();await page.locator('#message').fill('保留草稿');
   const count=await page.locator('.history-row').count();
   page.once('dialog',d=>{assert.match(d.message(),/确认删除/);d.dismiss();});await page.locator('.delete-chat').first().click();
   assert.equal(await page.locator('.history-row').count(),count);assert.equal(await page.locator('#message').inputValue(),'保留草稿');
   page.once('dialog',d=>d.accept());await page.locator('.delete-chat').first().click();assert.equal(await page.locator('.history-row').count(),count-1);
   const notice=await page.locator('#delete-notice').boundingBox(),messages=await page.locator('#messages').boundingBox();
   assert.ok(notice.height<=32,'提示高度 '+notice.height);assert.ok(notice.y>=messages.y+messages.height-1,'不得覆盖消息');
   await page.screenshot({path:path.join(out,'delete-undo.png')});await page.locator('#undo-delete').click();
   assert.equal(await page.locator('.history-row').count(),count);assert.equal(await page.locator('#message').inputValue(),'保留草稿');return {noticeHeight:notice.height,overlap:false};
 });
 await check('减少动态偏好直接展示完整回答',async()=>{
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#message').fill('减少动态');await page.locator('.composer-send').click();await page.waitForFunction(()=>!chats[active].pending);
   assert.equal(await page.locator('.answer-line').count(),0);assert.equal(await page.evaluate(()=>chats[active].messages.at(-1).text),fixture);
 });
 await check('旧失败消息重试统一陈寿，保留原讲解模式与章节快照',async()=>{
   const pending=page.waitForRequest(r=>r.url().endsWith('/chat/stream'));
   await page.evaluate(()=>{
     const old={role:'assistant',persona:'诸葛亮',error:true,text:'失败',question:'旧消息重试',mode:'学术',storyId:'fixture-legacy-request',history:[{role:'user',content:'【人物视角：诸葛亮】我想了解剑门关'},{role:'user',content:'【人物视角：诸葛亮】筹划者视角：讨论选择。 讲解模式：学术探索版；当前章节：剑门天险。这是AI人物解读，不是本人原话。'}]};
     chats[active].messages.push(old);requestReply(chats[active],old);
   });
   const body=(await pending).postDataJSON();await page.waitForFunction(()=>!chats[active].pending);
   assert.ok(body.history.every(e=>!e.content.startsWith('【人物视角：诸葛亮】')));
   assert.match(body.history.at(-1).content,/【人物视角：陈寿】史官视角/);assert.match(body.history.at(-1).content,/当前章节：剑门天险/);
   assert.equal(body.mode,'学术');assert.equal(body.story_id,'fixture-legacy-request');return body;
 });
 await check('探索志不再提示切换向导',async()=>{
   await page.evaluate(()=>showContentView('journal'));
   await page.locator('#journal-questions summary').click();
   assert.doesNotMatch(await page.locator('#journal-book').innerText(),/切换人物|问过陈寿、诸葛亮或张飞/);
   await page.evaluate(()=>showContentView('welcome'));
 });
 await check('1920×1080 无横向溢出、Console 零报错',async()=>{
   const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}));assert.ok(layout.scrollWidth<=1920);assert.deepEqual(errors,[]);return {layout,errors};
 });
 await page.screenshot({path:path.join(out,'chat-final.png')});
 } finally {await browser.close();}
 fs.writeFileSync(path.join(out,results.every(r=>r.passed)?'browser-green.json':'browser-red.json'),JSON.stringify({source:'真实 Chromium，聊天正文为标注渲染夹具',results},null,2));
 for(const r of results)console.log((r.passed?'PASS':'FAIL')+': '+r.name+(r.error?' — '+r.error:''));
 if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
