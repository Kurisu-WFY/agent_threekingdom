/* 真实 /chat/stream 验收，不拦截接口，不重写模型原文。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
(async()=>{
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 const report={source:'真实 localhost:8002 /chat/stream，无接口拦截',startedAt:new Date().toISOString(),question:'请用三到五段介绍陈寿与《三国志》的关系。没有可靠出处的内容请明确标注待核验，不编造引文。'},errors=[];
 try{
   const page=await browser.newPage({viewport:{width:1920,height:1080}});
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto('http://localhost:8002');await page.waitForLoadState('networkidle');await page.locator('#launcher').click();
   await page.waitForFunction(()=>Math.abs(document.querySelector('#chat-panel').getBoundingClientRect().right-innerWidth)<1);
   await page.evaluate(()=>{
     // 只复制真实响应作证，不更改请求、响应或产品通信逻辑。
     const nativeFetch=window.fetch;
     window.fetch=async(...args)=>{
       const response=await nativeFetch(...args);
       if(String(args[0])==='/chat/stream')response.clone().text().then(text=>{
         window.__liveEvents=text.split(/\r?\n\r?\n/).flatMap(block=>{
           const data=block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');return data?[JSON.parse(data)]:[];
         });
       });
       return response;
     };
     window.__lineEvidence=[];
     const observer=new MutationObserver(()=>{
       const lines=[...document.querySelectorAll('.answer-line')];
       if(lines.length){window.__lineEvidence.push({at:performance.now(),lines:lines.map(n=>({line:n.dataset.line,text:n.textContent,opacity:parseFloat(getComputedStyle(n).opacity),delay:parseFloat(getComputedStyle(n).animationDelay)}))});observer.disconnect();}
     });observer.observe(document.querySelector('#messages'),{subtree:true,childList:true});
   });
   await page.locator('#message').fill(report.question);
   const responsePromise=page.waitForResponse(r=>r.url().endsWith('/chat/stream')&&r.request().method()==='POST',{timeout:310000});
   await page.locator('.composer-send').click();
   const response=await responsePromise;
   report.httpStatus=response.status();
   await page.waitForFunction(()=>Array.isArray(window.__liveEvents),{},{timeout:310000});
   const events=await page.evaluate(()=>window.__liveEvents);
   const result=events.findLast(e=>e.type==='result')?.data;
   assert.ok(result&&typeof result.answer==='string','未取得真实完整回答');
   report.answer=result.answer;report.generation=result.generation;report.eventTypes=events.map(e=>e.type);
   await page.waitForFunction(()=>!chats[active].pending,{},{timeout:310000});
   assert.equal(await page.evaluate(()=>chats[active].messages.at(-1).text),result.answer,'模型原文完整保留');
   await page.waitForFunction(()=>window.__lineEvidence.length>0,{},{timeout:3000});report.firstFrame=await page.evaluate(()=>window.__lineEvidence[0]);
   assert.ok(new Set(report.firstFrame.lines.map(n=>n.line)).size>2,'真实回答拆成屏幕行');
   assert.ok(report.firstFrame.lines.some(n=>n.opacity<.05),'真实回答尚未整坨出现');
   await page.waitForFunction(()=>{const lines=[...document.querySelectorAll('.answer-line')];return lines.some(n=>parseFloat(getComputedStyle(n).opacity)>.7)&&lines.some(n=>parseFloat(getComputedStyle(n).opacity)<.05);},{},{timeout:3000});
   report.progressFrame=await page.evaluate(()=>[...document.querySelectorAll('.answer-line')].map(n=>({line:n.dataset.line,opacity:parseFloat(getComputedStyle(n).opacity)})));
   await page.screenshot({path:path.join(__dirname,'live-lines-progress.png')});
   await page.waitForFunction(()=>[...document.querySelectorAll('.answer-line')].every(n=>getComputedStyle(n).opacity==='1'),{},{timeout:30000});
   const displayed=await page.locator('.character-answer .agent-prose').textContent();
   await page.evaluate(()=>render());assert.equal(await page.locator('.character-answer .agent-prose').textContent(),displayed,'淡入后正文与正常重绘一致');assert.equal(await page.locator('.answer-line').count(),0,'历史不重播');
   report.rawUnchanged=true;report.renderedTextUnchanged=true;report.historyDoesNotReplay=true;
   report.layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}));assert.equal(report.layout.width,1920);assert.ok(report.layout.scrollWidth<=1920);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(__dirname,'live-answer-complete.png')});report.passed=true;
 }catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
 finally{report.errors=errors;report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'live-answer.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({passed:report.passed,httpStatus:report.httpStatus,generation:report.generation,lineCount:report.firstFrame?.lines.length,error:report.error}));
})();
