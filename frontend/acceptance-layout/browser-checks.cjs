const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const playwright=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),report={checks:[],errors:[],resources:[],network:[]};
(async()=>{
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({baseURL:'http://localhost:8002',viewport:{width:1920,height:1080},timezoneId:'Asia/Shanghai'});
 const check=async(name,fn)=>{try{report.checks.push({name,passed:true,detail:await fn()});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+' '+e.message);}};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('request',r=>report.network.push(new URL(r.url()).hostname+new URL(r.url()).pathname));
 report.mapResponses=[];page.on('response',r=>{const u=new URL(r.url());if(/amap.com$/.test(u.hostname)&&/tile\//.test(u.pathname))report.mapResponses.push({host:u.hostname,path:u.pathname,status:r.status()});});
 try{
 await page.goto('/');await page.waitForLoadState('networkidle');
 await check('全部原HTML id 保留且唯一；原诚实文案保持',async()=>{
  const old=cp.execFileSync('C:/Program Files/Git/cmd/git.exe',['show','41ffaa3:frontend/index.html'],{cwd:path.dirname(root),encoding:'utf8'});
  const ids=[...old.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);for(const id of ids)assert.equal(await page.locator('[id="'+id+'"]').count(),1,id);
  const current=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const honest=[...old.matchAll(/<p\b[^>]*>([^<]*(?:待核验|待补充|未接入|非锁价|不代表|演示资料|非历史肖像)[\s\S]*?)<\/p>/g)].map(m=>m[1]);for(const text of honest)assert.ok(current.includes(text),text);
  return {ids:ids.length,honest:honest.length};
 });
 await check('L1/L2 故事整宽，推荐60/地点40，建筑2列90px，线索默认折叠',async()=>{
  assert.equal(await page.locator('.culture-entry-grid > #culture-places').count(),1);
  assert.equal(await page.locator('details.culture-shelf:not([open])').count(),1);
  const story=await page.locator('#story-discovery').boundingBox(),desk=await page.locator('#journey-desk').boundingBox(),places=await page.locator('#culture-places').boundingBox();
  assert.ok(Math.abs(desk.y-places.y)<2);assert.ok(Math.abs(desk.width/places.width-1.5)<.02);assert.ok(Math.abs(story.width-(desk.width+places.width+24))<2);
  const cards=await page.locator('#story-buildings .building-card').evaluateAll(ns=>ns.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,svg:n.querySelector('svg').getBoundingClientRect().height})));
  assert.equal(cards.length,5);assert.equal(new Set(cards.map(c=>Math.round(c.x))).size,2);assert.equal(new Set(cards.map(c=>Math.round(c.y))).size,3);assert.ok(cards.every(c=>c.svg===90));
  await page.screenshot({path:path.join(__dirname,'L2-home.png')});
  await page.locator('#culture-places').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'L1-buildings.png')});
  return {story,desk,places,cards};
 });
 await check('L3 活动表单/道路并列，天气/住宿横条，真实底图及单次 SDK',async()=>{
  const before=report.network.length;await page.locator('.content-switch [data-content-view="planner"]').click();
  await page.waitForFunction(()=>!!document.querySelector('#amap-map .amap-layer'),{timeout:30000});
  assert.equal(await page.locator('.planner-layout > .planner-inputs').count(),1);assert.equal(await page.locator('.planner-layout > #outing-view').count(),1);
  assert.equal(await page.locator('.planner-layout > .inline-weather').count(),1);assert.equal(await page.locator('.planner-layout > .inline-hotels').count(),1);
  assert.ok(!report.network.slice(before).some(u=>/travel-info|road-route|amap\/places|amap\/route|hotel/.test(u)));
  const fields=await page.locator('.planner-inputs').boundingBox(),roads=await page.locator('#outing-view').boundingBox(),weather=await page.locator('.inline-weather').boundingBox(),hotels=await page.locator('.inline-hotels').boundingBox();
  assert.ok(Math.abs(fields.y-roads.y)<2);assert.equal(fields.width,540);assert.ok(weather.y>=roads.y+roads.height);assert.ok(hotels.y>=weather.y+weather.height);assert.ok(Math.abs(weather.width-(fields.width+roads.width+20))<2);
  assert.equal((await page.locator('#amap-map').boundingBox()).height,360);
  await page.locator('#outing-view > details').evaluate(n=>n.open=false);assert.equal(await page.locator('#amap-map-region').isVisible(),true);await page.locator('#outing-view > details').evaluate(n=>n.open=true);
  await page.evaluate(()=>{showContentView('welcome');showContentView('planner');});await page.waitForTimeout(500);
  assert.equal(report.network.filter(u=>u==='webapi.amap.com/maps').length,1);assert.equal(report.network.filter(u=>u.endsWith('/amap/map-config')).length,1);
  await page.locator('#planner-view').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(__dirname,'L3-planner.png')});
  await page.locator('#amap-map-region').scrollIntoViewIfNeeded();await page.waitForTimeout(7000);await page.screenshot({path:path.join(__dirname,'L3-map.png')});
  return {fields,roads,weather,hotels};
 });
 await check('L5 探索志55/45并列，记录整宽，原空态与折叠',async()=>{
  await page.evaluate(()=>showContentView('journal'));await page.waitForTimeout(500);
  const reading=await page.locator('.journal-reading').boundingBox(),map=await page.locator('.journal-map').boundingBox(),records=await page.locator('.journal-records').boundingBox();
  assert.ok(Math.abs(reading.y-map.y)<2,JSON.stringify({reading,map,records}));assert.ok(Math.abs(reading.width/map.width-11/9)<.02);assert.ok(records.y>=Math.max(reading.y+reading.height,map.y+map.height));assert.ok(Math.abs(records.width-(reading.width+map.width+24))<2);
  assert.equal(await page.locator('#journal-questions').evaluate(n=>n.open),false);assert.match(await page.locator('#journal-view').innerText(),/章节待补充.*待核验/);
  await page.screenshot({path:path.join(__dirname,'L5-journal.png')});return {reading,map,records};
 });
 await check('L3 天气卡横排及住宿未接入态（显式协议夹具）',async()=>{
  await page.route('**/api/travel/travel-info',r=>r.fulfill({json:{status:'ok',data:{forecast:['2026-10-05','2026-10-06','2026-10-07','2026-10-08'].map((date,i)=>({date,daytemp:String(20+i),nighttemp:'10',dayweather:'晴',nightweather:'多云'})),items:[{title:'布局协议夹具，非实测天气',sources:[{title:'协议夹具',source_url:'https://example.com',source_level:'C'}]}]}}}));
  await page.evaluate(()=>showContentView('planner'));await page.locator('#travel-city').fill('南充');await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);
  const cards=await page.locator('.weather-day').evaluateAll(ns=>ns.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));assert.equal(cards.length,4);assert.equal(new Set(cards.map(c=>Math.round(c.y))).size,1);
  await page.locator('[name=hotel_tier]').selectOption('高档型');await page.locator('#load-hotels').click();assert.match(await page.locator('#hotel-results').innerText(),/未接入.*未取得真实酒店与房价/);
  await page.locator('.inline-hotels').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'L3-weather-hotels-fixture.png')});await page.unroute('**/api/travel/travel-info');return {cards,source:'协议夹具，非实测天气/酒店'};
 });
 await check('1920×1080 八视图聊天开/关无横向溢出',async()=>{
  const rows=[];for(const view of ['welcome','story','destinations','map','planner','plan','journal','node']){
   if(view==='node')await page.evaluate(()=>CulturalNode.openPlace('wanjuanlou',{returnTo:'welcome'}));else await page.evaluate(v=>showContentView(v),view);
   for(const open of [false,true]){await page.evaluate(o=>toggleChat(o),open);await page.waitForTimeout(400);
    const x=await page.evaluate(()=>{const p=document.querySelector('[data-view-panel]:not([hidden]):not([inert])');return {width:innerWidth,document:document.documentElement.scrollWidth,panel:p.clientWidth,scroll:p.scrollWidth};});assert.ok(x.document<=x.width,JSON.stringify(x));assert.ok(x.scroll<=x.panel+1,JSON.stringify(x));rows.push({view,open,...x});
    if(open&&['welcome','planner','journal'].includes(view))await page.screenshot({path:path.join(__dirname,view+'-chat.png')});
   }
  }await page.evaluate(()=>{toggleChat(false);showContentView('welcome');});return rows;
 });
 await check('n8-n9 / n10-n17 浏览器回归',async()=>{
  await page.addScriptTag({path:path.join(root,'n8-n9.browser-test.js')});await page.addScriptTag({path:path.join(root,'n10-n17.browser-test.js')});
  const first=await page.evaluate(()=>N8N9BrowserTest.dom());await page.evaluate(()=>N8N9BrowserTest.open());await page.waitForTimeout(500);await page.evaluate(()=>N8N9BrowserTest.close('close'));await page.waitForTimeout(650);await page.evaluate(()=>N8N9BrowserTest.settled());const second=await page.evaluate(()=>runRound4Acceptance());return {first,second};
 });
 await check('定位补充裁决：仅表单一处，固定说明，未调用高德定位插件',async()=>{
  assert.equal(await page.locator('#trip-form #use-my-location').count(),1);assert.equal(await page.locator('#outing-view #use-my-location').count(),0);
  assert.equal(await page.locator('#origin-location-notice').textContent(),'定位由浏览器在本机完成，不会向服务器发送你的位置；生成方案时仅将“我的位置（近似）”作为出发地文字随需求发送。');
  assert.ok(!report.network.some(u=>/geolocation|location\/ip/i.test(u)));return {button:1,provider:'navigator.geolocation，授权/拒绝行为见acceptance-location'};
 });
 await check('本地/HTTP SHA256一致',async()=>{
  const files=cp.execFileSync('C:/Program Files/Git/cmd/git.exe',['diff','--name-only','41ffaa3','--','frontend'],{cwd:path.dirname(root),encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>/\.(js|css|html)$/.test(p));
  for(const rel of files){const local=fs.readFileSync(path.join(path.dirname(root),rel)),r=await page.request.get('/'+rel.replace(/^frontend\//,''));assert.equal(r.status(),200);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');const row={file:rel,local:hash(local),http:hash(await r.body())};report.resources.push(row);assert.equal(row.local,row.http);}
  return report.resources.length;
 });
 await check('Console/Page零产品报错',async()=>{assert.deepEqual(report.errors,[]);return 0;});
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'browser-evidence.json'),JSON.stringify(report,null,2));}
 if(report.checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
