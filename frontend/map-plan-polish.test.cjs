/* 真实 Chromium。默认天气均为明确标注的协议夹具；实测另存 verify-live.cjs。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const out=path.join(__dirname,'acceptance-map-plan-polish'),results=[];
async function check(name,fn){try{results.push({name,passed:true,detail:await fn()});}catch(e){results.push({name,passed:false,error:e.message});}}
(async()=>{
fs.mkdirSync(out,{recursive:true});const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1920,height:1080},timezoneId:'Asia/Shanghai'}),errors=[];let weatherRequests=0,scenario='ok',horizon;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/api/travel/travel-info',async route=>{
 weatherRequests++;const request=route.request().postDataJSON();
 if(scenario==='failed')return route.fulfill({json:{status:'unavailable',message:'协议夹具：城市服务暂不可用',data:null}});
 if(scenario==='slow')await new Promise(r=>setTimeout(r,300));
 await route.fulfill({json:{status:'ok',data:{location:{latitude:30.79508,longitude:106.08473,coordinate_system:'WGS84'},forecast:[{date:'2000-01-01',temperature_min_c:99,temperature_max_c:100},...horizon.map((date,i)=>({date,temperature_min_c:10.4+i,temperature_max_c:20.7+i,rain_probability_percent:50}))],air_quality:{time:horizon[0]+'T09:00',pm2_5:13,pm10:17,units:{pm2_5:'μg/m³',pm10:'μg/m³'}},items:[{title:'协议渲染夹具 · '+request.city,summary:'此数据仅验证布局与交互，不是真实天气。',data_status:'forecast',fetched_at:horizon[0]+'T09:00:00+08:00',sources:[{title:'协议夹具出处',source_url:'https://example.com',source_level:'C'}]}]}}});
});
await page.route('https://api.open-meteo.com/v1/forecast?**',async route=>{if(scenario==='supplementSlow')await new Promise(r=>setTimeout(r,300));return route.fulfill({json:scenario==='weatherFailed'?{error:true}:{timezone:'Asia/Shanghai',daily:{time:horizon,weather_code:scenario==='missing'?[null,null,null]:[0,61,3]}}});});
await page.route('https://air-quality-api.open-meteo.com/v1/air-quality?**',async route=>{if(scenario==='supplementSlow')await new Promise(r=>setTimeout(r,300));return route.fulfill({json:scenario==='airFailed'?{error:true}:{timezone:'Asia/Shanghai',hourly:{time:horizon.map(d=>d+'T12:00'),us_aqi:scenario==='missing'?[null,null,null]:[48.4,70.1,33.6]}}});});
await page.goto('http://localhost:8002');await page.waitForLoadState('networkidle');
horizon=await page.evaluate(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v=k=>p.find(x=>x.type===k).value;const start=v('year')+'-'+v('month')+'-'+v('day');return [0,1,2].map(i=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));});
await page.locator('.content-switch [data-content-view="map"]').click();
await check('1 地图说明简短，来源与非导航边界保留，首屏可见大半地图',async()=>{
 const intro=await page.locator('.map-heading + .map-note').innerText();assert.ok(intro.length<=42,'首页说明长度 '+intro.length);
 const mapText=await page.locator('#map-view').innerText();assert.match(mapText,/虚线.*非道路导航|虚线.*不是道路导航/);assert.match(mapText,/轮廓与坐标来源/);
 const frame=await page.locator('#map-view').boundingBox(),svg=await page.locator('#route-map').boundingBox(),visible=Math.max(0,Math.min(svg.y+svg.height,frame.y+frame.height)-Math.max(svg.y,frame.y));assert.ok(visible/svg.height>=.85,'首屏地图可见比例 '+visible/svg.height);return {intro,visibleRatio:visible/svg.height};
});
await check('2 带入活动计划同排且颜色区分，地图选点交接保留',async()=>{
 assert.equal(await page.locator('.map-tools #map-plan').count(),1);const a=await page.locator('#map-plan').boundingBox(),b=await page.locator('#map-reset').boundingBox();assert.ok(Math.abs(a.y-b.y)<2);
 const color=await page.evaluate(()=>({plan:getComputedStyle(document.querySelector('#map-plan')).backgroundColor,reset:getComputedStyle(document.querySelector('#map-reset')).backgroundColor}));assert.notEqual(color.plan,color.reset);
 await page.locator('#map-prefecture').selectOption({label:'南充市'});await page.locator('#map-plan').click();assert.equal(await page.evaluate(()=>getContentView()),'planner');assert.match(await page.locator('[name="city"]').inputValue(),/南充/);return color;
});
await page.locator('.content-switch [data-content-view="planner"]').click();
await page.evaluate(()=>Promise.all(document.querySelector('#planner-view').getAnimations().map(a=>a.finished.catch(()=>{}))));
await check('5 紧凑两列字段、必填/选填与人数边界保留',async()=>{
 const fields=page.locator('#trip-form').locator('input,select');const boxes=[];for(let i=0;i<8;i++)boxes.push(await fields.nth(i).boundingBox());
 assert.ok(new Set(boxes.map(b=>Math.round(b.y))).size>=4);assert.ok(boxes.every(b=>b.height<=44&&b.width<=290),JSON.stringify(boxes));
 assert.match(await page.locator('#trip-form').innerText(),/目的地（必填）/);assert.match(await page.locator('#trip-form').innerText(),/出发日期（选填）/);
 await page.locator('[name="people"]').fill('0');assert.equal(await page.locator('[name="people"]').evaluate(n=>n.checkValidity()),false);await page.locator('[name="people"]').fill('51');assert.equal(await page.locator('[name="people"]').evaluate(n=>n.checkValidity()),false);await page.locator('[name="people"]').fill('2');return boxes;
});
await check('3 活动计划内查今天起三日，整数温度/状况/AQI，无跳转',async()=>{
 assert.equal(await page.locator('#planner-view #travel-weather-form').count(),1);assert.equal(weatherRequests,0,'进入活动计划不会自动请求天气');
 await page.locator('#travel-city').fill('南充');await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);
 assert.equal(await page.evaluate(()=>getContentView()),'planner');assert.equal(await page.locator('.weather-day').count(),3);
 assert.deepEqual(await page.locator('.weather-day').evaluateAll(nodes=>nodes.map(n=>n.dataset.date)),horizon);
 assert.deepEqual(await page.locator('.weather-temperature').allTextContents(),['10～21°C','11～22°C','12～23°C']);
 assert.deepEqual(await page.locator('.weather-condition').allTextContents(),['晴','雨','阴']);assert.deepEqual(await page.locator('.weather-aqi').allTextContents(),['AQI 48','AQI 70','AQI 34']);
 assert.match(await page.locator('#travel-results').innerText(),/模型预报.*非现场实测/);assert.doesNotMatch(await page.locator('.weather-days').innerText(),/2000-01-01/);return {dates:horizon};
});
await check('4 晴/雨/阴 SVG 山景图标可见',async()=>{
 assert.equal(await page.locator('.weather-day svg.weather-icon').count(),3);assert.deepEqual(await page.locator('.weather-icon use').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href').split('#')[1])),['sun','rain','overcast']);
 const resource=await page.request.get('http://localhost:8002/weather-icons.svg');assert.equal(resource.status(),200);assert.match(await resource.text(),/<symbol/);
});
if(await page.locator('#planner-view #travel-weather-form').count()){
 await page.locator('#planner-view').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(out,'planner-three-days.png')});
 await check('缺失状况与 AQI 不用 PM 或降雨概率伪造',async()=>{scenario='missing';await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);assert.deepEqual(await page.locator('.weather-condition').allTextContents(),['状况未取得','状况未取得','状况未取得']);assert.deepEqual(await page.locator('.weather-aqi').allTextContents(),['AQI 未取得','AQI 未取得','AQI 未取得']);});
 await check('补查独立失败保留成功部分与温度，并提供重试',async()=>{
  for(const s of ['airFailed','weatherFailed']){scenario=s;await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);assert.deepEqual(await page.locator('.weather-temperature').allTextContents(),['10～21°C','11～22°C','12～23°C']);assert.deepEqual(await page.locator('.weather-condition').allTextContents(),s==='weatherFailed'?['状况未取得','状况未取得','状况未取得']:['晴','雨','阴']);assert.deepEqual(await page.locator('.weather-aqi').allTextContents(),s==='airFailed'?['AQI 未取得','AQI 未取得','AQI 未取得']:['AQI 48','AQI 70','AQI 34']);assert.equal(await page.getByRole('button',{name:'重新查询天气',exact:true}).count(),1);}
 });
 await check('服务失败如实显示并可重试',async()=>{scenario='failed';await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);assert.match(await page.locator('#travel-results').innerText(),/失败.*尚未取得数据/);assert.equal(await page.locator('.weather-day').count(),0);assert.ok(await page.getByRole('button',{name:'重新查询天气',exact:true}).count());scenario='ok';await page.getByRole('button',{name:'重新查询天气',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled);assert.equal(await page.locator('.weather-day').count(),3);});
 await check('查询中改城市，旧天气不覆盖',async()=>{scenario='slow';await page.locator('#load-travel').click();await page.locator('#travel-city').fill('广元');await page.waitForTimeout(500);assert.equal(await page.locator('.weather-day').count(),0);assert.match(await page.locator('#travel-status').innerText(),/条件已改变/);scenario='ok';});
 await check('外部补查中改城市，旧补查不覆盖',async()=>{scenario='supplementSlow';const started=page.waitForRequest(r=>r.url().startsWith('https://air-quality-api.open-meteo.com/'));await page.locator('#load-travel').click();await started;await page.locator('#travel-city').fill('南充');await page.waitForTimeout(500);assert.equal(await page.locator('.weather-day').count(),0);assert.match(await page.locator('#travel-status').innerText(),/条件已改变/);scenario='ok';});
 await check('旧天气入口进入同一活动计划内联区域',async()=>{await page.evaluate(()=>{showContentView('plan');showContentView('travel');});assert.equal(await page.evaluate(()=>getContentView()),'planner');assert.equal(await page.locator('#travel-city').isVisible(),true);});
}
await check('1920×1080 各视图及聊天打开时无横向溢出/产品报错',async()=>{const layout=[];for(const view of ['map','planner']){await page.evaluate(v=>showContentView(v),view);for(const open of [false,true]){await page.evaluate(o=>toggleChat(o),open);await page.waitForTimeout(250);const x=await page.evaluate(()=>{const n=document.querySelector('[data-view-panel]:not([hidden]):not([inert])');return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,panelWidth:n.clientWidth,panelScrollWidth:n.scrollWidth};});assert.ok(x.scrollWidth<=x.width);assert.ok(x.panelScrollWidth<=x.panelWidth,JSON.stringify(x));layout.push({view,open,...x});}}assert.deepEqual(errors,[]);await page.evaluate(()=>toggleChat(false));return layout;});
await page.waitForTimeout(300);await page.evaluate(()=>showContentView('map'));await page.evaluate(()=>Promise.all(document.querySelector('#map-view').getAnimations().map(a=>a.finished.catch(()=>{}))));await page.locator('#map-view').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(out,'map-final.png')});
}finally{await browser.close();}
fs.writeFileSync(path.join(out,results.every(r=>r.passed)?'browser-green.json':'browser-red.json'),JSON.stringify({source:'真实 Chromium，天气为标注协议夹具',results},null,2));for(const r of results)console.log((r.passed?'PASS':'FAIL')+': '+r.name+(r.error?' — '+r.error:''));if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
