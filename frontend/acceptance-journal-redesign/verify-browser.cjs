/* 真实 localhost:8002 Chromium。混合进度和提问为明确标注的本地渲染夹具。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=__dirname;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const report={source:'真实 localhost:8002 / Edge Chromium，1920×1080；本地进度与提问使用标注夹具，无接口拦截',time:new Date().toISOString(),checks:[],errors:[],resources:[]};
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 const check=async(name,fn)=>{try{const detail=await fn();report.checks.push({name,passed:true,detail});}catch(e){report.checks.push({name,passed:false,error:e.message});throw e;}};
 const settled=()=>page.waitForFunction(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).every(a=>a.playState!=='running'));
 const journal=async()=>{await page.locator('.content-switch [data-content-view="journal"]').click();await settled();};
 const screenshot=async(name)=>{await settled();await page.screenshot({path:path.join(out,name)});};
 const layout=()=>page.evaluate(()=>{const view=document.querySelector('#journal-view');return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,viewWidth:view.clientWidth,viewScrollWidth:view.scrollWidth};});
 try{
  await page.goto('http://localhost:8002');await page.waitForLoadState('networkidle');await windowReady();await journal();
  await check('空态总览、开始引导、三记录默认收起、无三卷翻页',async()=>{
   assert.match(await page.locator('.journal-heading h1').innerText(),/陈寿/);
   assert.equal(await page.locator('#journal-overview').innerText(),'已寻迹 0 幕 · 读完 0 条 · 还有 5 条待探索');
   assert.match(await page.locator('#journal-empty').innerText(),/去读一条故事线、问陈寿一个问题，这里就会记下来/);
   assert.equal(await page.locator('.journal-records details').count(),3);assert.equal(await page.locator('.journal-records details[open]').count(),0);
   assert.equal(await page.locator('#journal-prev,#journal-next,#journal-pages,.journal-pagination').count(),0);
   assert.equal(await page.locator('.journal-story').count(),5);return await layout();
  });
  await screenshot('empty-overview.png');
  await page.getByRole('button',{name:'开始探索故事线',exact:true}).click();await page.locator('#story-view').waitFor({state:'visible'});await journal();
  await check('真实故事进度、首卡排序、足迹 SVG 与节点列表保留',async()=>{
   await page.evaluate(()=>{
    const story=window.SGT_STORIES.find(s=>s.id==='shudao-xunzong'),s=window.StoryProgress.get(story);s.started=true;s.current=1;s.completed.add(0);s.completed.add(1);window.StoryProgress.save(story);
    chats[0].messages.push({role:'user',text:'陈寿与三国志的编纂有什么关系？',persona:'陈寿'},{role:'user',text:'请介绍诸葛亮与蜀道的关系，区分正史和演义。',persona:'陈寿'});window.ExplorationJournal.sync(chats);
   });
   assert.equal(await page.locator('#journal-overview').innerText(),'已寻迹 2 幕 · 读完 0 条 · 还有 5 条待探索');
   assert.equal(await page.locator('.journal-story h3').first().innerText(),'蜀汉北境·蜀道寻踪');
   assert.match(await page.locator('.journal-story').first().innerText(),/第 2 \/ 3 幕 · 已寻迹 2 \/ 3 幕/);
   assert.equal(await page.locator('.journal-place').count(),2);assert.equal(await page.locator('.journal-footprints circle').count(),2);
   assert.match(await page.locator('.journal-map').innerText(),/驻地示意/);
   assert.match(await page.locator('#journal-local-notice').innerText(),/本地.*不代表实际到访/);
   assert.match(await page.locator('#journal-local-notice').innerText(),/200条/);
   assert.match(await page.locator('.journal-map').innerText(),/非景区入口/);
   return {titles:await page.locator('.journal-story h3').allTextContents(),layout:await layout()};
  });
  await screenshot('progress-overview.png');
  await page.locator('.journal-map').evaluate(n=>n.scrollIntoView({block:'start'}));await screenshot('footprints.png');
  await page.locator('.journal-records').evaluate(n=>n.scrollIntoView({block:'start'}));await screenshot('records-collapsed.png');
  await check('记录可展开、数量与详情、同步保留展开',async()=>{
   for(const id of ['journal-questions','journal-interests','journal-unlocked']){await page.locator('#'+id+' summary').click();assert.equal(await page.locator('#'+id).getAttribute('open'),'');}
   assert.equal(await page.locator('#journal-questions summary').innerText(),'我问过的问题 (2)');
   assert.equal(await page.locator('#journal-questions .journal-question').count(),2);
   assert.equal(await page.locator('#journal-unlocked summary').innerText(),'解锁的人物与事件 (0)');
   assert.match(await page.locator('#journal-unlocked').innerText(),/提问不会自动记为完成/);
   await page.evaluate(()=>window.ExplorationJournal.render());assert.equal(await page.locator('.journal-records details[open]').count(),3);
   await screenshot('records-expanded.png');return await page.locator('.journal-records summary').allTextContents();
  });
  await page.locator('#journal-questions').evaluate(n=>n.scrollIntoView({block:'start'}));await screenshot('questions-expanded.png');
  await check('继续阅读、重读节点和在地图查看跳转',async()=>{
   await page.locator('.journal-story').first().getByRole('button',{name:'继续阅读',exact:true}).click();await page.locator('#story-view').waitFor({state:'visible'});assert.match(await page.locator('#story-title').innerText(),/蜀汉北境/);await journal();
   await page.locator('.journal-place').first().getByRole('button',{name:'重读这个节点',exact:true}).click();await page.locator('#node-view').waitFor({state:'visible'});await page.locator('#node-back').click();await page.locator('#journal-view').waitFor({state:'visible'});
   await page.locator('.journal-place').first().getByRole('button',{name:'在地图中查看',exact:true}).click();await page.locator('#map-view').waitFor({state:'visible'});await journal();
  });
  await check('已完成单独折叠、展开可重读、推荐保留',async()=>{
   await page.evaluate(()=>{const story=window.SGT_STORIES.find(s=>s.id==='shudao-xunzong');window.StoryProgress.get(story).completed.add(2);window.StoryProgress.save(story);});
   assert.equal(await page.locator('#journal-overview').innerText(),'已寻迹 3 幕 · 读完 1 条 · 还有 4 条待探索');
   assert.equal(await page.locator('#journal-completed[open]').count(),0);assert.equal(await page.locator('#journal-completed summary').innerText(),'已完成的故事线 (1)');
   assert.equal(await page.locator('.journal-reading > .journal-story-grid .journal-story').count(),4);
   await page.locator('#journal-completed summary').click();assert.equal(await page.locator('#journal-completed .journal-story').count(),1);await screenshot('completed-expanded.png');
   await page.locator('#journal-completed summary').click();
   assert.match(await page.locator('#journal-recommendation').innerText(),/陈寿|史书编纂/);
   await page.locator('#journal-recommendation').getByRole('button',{name:'看看下一条故事线',exact:true}).click();await page.locator('#story-view').waitFor({state:'visible'});await journal();
  });
  await check('刷新保留本地进度与提问、重新进入默认收起',async()=>{
   await page.reload();await page.waitForLoadState('networkidle');await windowReady();await journal();
   assert.equal(await page.locator('#journal-overview').innerText(),'已寻迹 3 幕 · 读完 1 条 · 还有 4 条待探索');
   assert.equal(await page.locator('#journal-questions summary').innerText(),'我问过的问题 (2)');
   assert.equal(await page.locator('#journal-book details[open]').count(),0);
  });
  await check('关闭/打开陈寿栏均无横向溢出',async()=>{
   const closed=await layout();assert.ok(closed.scrollWidth<=closed.width);assert.ok(closed.viewScrollWidth<=closed.viewWidth);
   await page.locator('#launcher').click();await settled();
   await page.waitForFunction(()=>Math.abs(document.querySelector('#chat-panel').getBoundingClientRect().right-innerWidth)<1);
   await page.locator('#journal-view').evaluate(n=>n.scrollTop=0);await screenshot('chat-open-overview.png');
   const open=await layout();assert.ok(open.scrollWidth<=open.width);assert.ok(open.viewScrollWidth<=open.viewWidth);return {closed,open};
  });
  await check('改动资源 SHA256 与 8002 一致',async()=>{
   for(const file of ['index.html','journal.js','styles.css']){const response=await page.request.get('http://localhost:8002/'+file+'?verify=journal13'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),local=hash(fs.readFileSync(path.join(out,'..',file))),served=hash(await response.body());const result={file,status:response.status(),local,served,match:response.status()===200&&local===served};report.resources.push(result);assert.ok(result.match);}
   return report.resources;
  });
  await check('Console 零报错',async()=>{assert.deepEqual(report.errors,[]);return report.errors;});
 } finally {await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));}
 async function windowReady(){await page.waitForFunction(()=>window.ExplorationJournal&&window.TravelMap);await page.evaluate(()=>window.TravelMap.ready);}
 console.log('PASS: '+report.checks.length+' browser checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
