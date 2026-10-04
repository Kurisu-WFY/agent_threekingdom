/* 真实页面 + 显式浏览器定位授权夹具；不申请实际设备位置。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const playwright=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),report={checks:[],errors:[],resources:[]};
const privacy='定位由浏览器在本机完成，不会向服务器发送你的位置；生成方案时仅将“我的位置（近似）”作为出发地文字随需求发送。';
(async()=>{
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 const check=async(name,fn)=>{try{report.checks.push({name,passed:true,detail:await fn()});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+' '+e.message);}};
 try{
 for(const scenario of ['authorized','denied','failed','timeout','edited','restored','restored-success','unsupported'])await check('定位 '+scenario+'，点击后零网络（显式夹具）',async()=>{
  const context=await browser.newContext({baseURL:'http://localhost:8002',viewport:{width:1920,height:1080},timezoneId:'Asia/Shanghai',...(scenario==='authorized'?{geolocation:{longitude:106.08473,latitude:30.79508,accuracy:50},permissions:['geolocation']}:{})});
  if(scenario!=='authorized')await context.addInitScript(s=>{
   const mock=s==='unsupported'?undefined:{getCurrentPosition(ok,fail){window.__geoCallbacks={ok,fail};if(s==='denied'||s==='failed')fail({code:s==='denied'?1:2});}};
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:mock});
   if(s.startsWith('restored'))localStorage.setItem('sanguo.travel-plans.v1',JSON.stringify([{id:'location-restored-fixture',preferences:{city:'南充',origin:'保存方案出发地',days:1,people:2,group:'家庭',transport:'公共交通',explanation:'大众体验版',date:'',notes:'保存方案测试夹具'},plan:{title:'保存方案定位竞态夹具',days:[]},activityAnswer:'待核验：保存方案定位竞态夹具，非真实活动回答。'}]));
  },scenario);
  const page=await context.newPage(),network=[];page.on('request',r=>network.push(new URL(r.url()).pathname));page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  try{
   await page.goto('/');await page.waitForLoadState('networkidle');
   // 此处单独隔离定位副作用：抑制进入planner的既有底图初始化。真实底图在layout脚本实测。
   await page.evaluate(()=>{window.AmapRouteMap.enter=()=>{};showContentView('planner');});await page.waitForTimeout(450);await page.locator('#trip-origin').fill('手填出发地');
   assert.equal(await page.locator('#origin-location-notice').textContent(),privacy);
   const before=network.length;await page.locator('#use-my-location').click();
   if(scenario==='authorized'){
    await page.waitForFunction(()=>document.querySelector('#trip-origin').value==='我的位置（近似）');assert.match(await page.locator('#origin-location-status').innerText(),/±50 米/);
   }else if(scenario==='timeout'){
    await page.waitForFunction(()=>document.querySelector('#origin-location-status').textContent==='未取得定位，可手动填写出发地',null,{timeout:15000});
    await page.evaluate(()=>window.__geoCallbacks.ok({coords:{accuracy:50}}));assert.equal(await page.locator('#trip-origin').inputValue(),'手填出发地');
   }else if(scenario==='edited'){
    await page.locator('#trip-origin').fill('后来手填');await page.evaluate(()=>window.__geoCallbacks.ok({coords:{accuracy:50}}));assert.equal(await page.locator('#trip-origin').inputValue(),'后来手填');
   }else if(scenario.startsWith('restored')){
    if(scenario==='restored-success'){await page.evaluate(()=>window.__geoCallbacks.ok({coords:{accuracy:50}}));assert.match(await page.locator('#origin-location-status').innerText(),/±50 米/);}
    await page.evaluate(()=>showContentView('plan'));await page.locator('#saved-plans button').filter({hasText:'打开'}).click();assert.equal(await page.locator('#trip-origin').inputValue(),'保存方案出发地');
    await page.evaluate(()=>window.__geoCallbacks.ok({coords:{accuracy:50}}));assert.equal(await page.locator('#trip-origin').inputValue(),'保存方案出发地');assert.equal(await page.locator('#origin-location-status').innerText(),'');await page.evaluate(()=>showContentView('planner'));
   }else{
    assert.equal(await page.locator('#origin-location-status').innerText(),'未取得定位，可手动填写出发地');assert.equal(await page.locator('#trip-origin').inputValue(),'手填出发地');
   }
   await page.waitForTimeout(250);assert.equal(await page.locator('#use-my-location').isEnabled(),true);assert.deepEqual(network.slice(before),[],'不自动发起任何网络请求/方案/天气/道路/酒店');
   if(!scenario.startsWith('restored'))assert.equal(await page.locator('#planner-view').getAttribute('data-activity-state'),'idle');
   for(const open of [false,true]){
    await page.evaluate(o=>toggleChat(o),open);await page.waitForTimeout(400);const x=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,panel:document.querySelector('#planner-view').clientWidth,scroll:document.querySelector('#planner-view').scrollWidth}));assert.ok(x.document<=x.width);assert.ok(x.scroll<=x.panel+1,JSON.stringify(x));
    if(scenario==='authorized'||scenario==='denied')await page.screenshot({path:path.join(__dirname,scenario+(open?'-chat':'')+'.png')});
   }
   if(['denied','failed','unsupported'].includes(scenario)){await page.locator('#trip-origin').fill('南充站');assert.equal(await page.locator('#trip-origin').inputValue(),'南充站');}
   if(scenario==='authorized'){
    await page.locator('[name=city]').fill('南充');await page.evaluate(()=>{window.SGTJourney.ask=(question,options)=>{window.__submitted={question,preferences:options.activityPlan.preferences};};});
    await page.locator('#trip-form [type=submit]').click();const submitted=await page.evaluate(()=>window.__submitted);assert.equal(submitted.preferences.origin,'我的位置（近似）');assert.match(submitted.question,/出发地：我的位置（近似）/);assert.doesNotMatch(JSON.stringify(submitted),/106\.08473|30\.79508|latitude|longitude|accuracy/);
   }
   return {provider:scenario==='authorized'?'原生API + Playwright授权/位置夹具（非实际设备位置）':'授权错误回调夹具',requestsAfterClick:0,manualSubmission:scenario==='authorized'?'仅origin文字，受控接口捕获':'未提交'};
  }finally{await context.close();}
 });
 await check('改动资源本地/HTTP SHA256一致',async()=>{
  const context=await browser.newContext({baseURL:'http://localhost:8002'});
  try{for(const file of ['index.html','styles.css','browser-location.js','travel-modules.js']){const r=await context.request.get('/'+file);assert.equal(r.status(),200);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');const row={file,local:hash(fs.readFileSync(path.join(root,file))),http:hash(await r.body())};assert.equal(row.local,row.http,file);report.resources.push(row);}return report.resources;}finally{await context.close();}
 });
 await check('Console/Page零产品报错',async()=>{assert.deepEqual(report.errors,[]);return 0;});
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'browser-evidence.json'),JSON.stringify(report,null,2));}
 if(report.checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
