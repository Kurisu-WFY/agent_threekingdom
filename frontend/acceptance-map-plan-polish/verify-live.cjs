// 无拦截、无夹具：记录真实浏览器与三座城市的真实服务响应。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),evidence={kind:'真实浏览器，无天气夹具',time:new Date().toISOString(),cities:[],responses:[],errors:[],checks:[]};
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},timezoneId:'Asia/Shanghai'}),pending=[];
  page.on('pageerror',e=>evidence.errors.push({type:'pageerror',text:e.message}));page.on('console',m=>{if(m.type()==='error')evidence.errors.push({type:'console',text:m.text()});});
  page.on('response',r=>{if(/travel-info|api\.open-meteo|air-quality-api/.test(r.url()))pending.push((async()=>{let data;try{data=await r.json();}catch{data='非 JSON 响应';}evidence.responses.push({url:r.url(),status:r.status(),data});})());});
  await page.goto('http://localhost:8002');await page.waitForLoadState('networkidle');await page.locator('.content-switch [data-content-view="planner"]').click();
  const expected=await page.evaluate(()=>WeatherOutlook.datesFromToday());
  for(const city of ['南充','广元','绵阳']){
   await page.locator('#travel-city').fill(city);await page.locator('#load-travel').click();await page.waitForFunction(()=>!document.querySelector('#load-travel').disabled,{},{timeout:40000});
   const item={city,view:await page.evaluate(()=>getContentView()),status:await page.locator('#travel-status').innerText(),text:await page.locator('#travel-results').innerText(),cards:await page.locator('.weather-day').evaluateAll(ns=>ns.map(n=>({date:n.dataset.date,temperature:n.querySelector('.weather-temperature').textContent,condition:n.querySelector('.weather-condition').textContent,aqi:n.querySelector('.weather-aqi').textContent}))),retry:await page.getByRole('button',{name:'重新查询天气',exact:true}).count()};evidence.cities.push(item);
   assert.equal(item.view,'planner');
   if(city==='绵阳'){assert.equal(item.cards.length,0);assert.match(item.text,/查询失败.*尚未取得数据/);assert.equal(item.retry,1);await page.locator('#travel-results details').evaluate(n=>n.open=true);assert.match(await page.locator('#travel-results').innerText(),/当前支持南充、阆中、广元/);}
   else {assert.deepEqual(item.cards.map(c=>c.date),expected);assert.ok(item.cards.every(c=>/^-?\d+～-?\d+°C$/.test(c.temperature)));assert.match(item.text,/US 标准.*模型预报/);if(item.cards.some(c=>/未取得/.test(c.condition+c.aqi)))assert.equal(item.retry,1);}
   await page.locator('#planner-view').evaluate(n=>n.scrollTop=0);await page.screenshot({path:path.join(__dirname,'live-'+city+'.png')});
  }
  // 旧服务正常成功，前端改为内联后不要求重新生成活动方案。
  evidence.checks.push({name:'南充/广元真实三日温度；绵阳真实失败、原原因、重试；均留在活动计划',passed:true});
  await Promise.all(pending);assert.deepEqual(evidence.errors,[]);evidence.checks.push({name:'Console 与 pageerror 无错误',passed:true});
 }catch(e){evidence.checks.push({name:'真实服务验收',passed:false,error:e.message});process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'live-weather.json'),JSON.stringify(evidence,null,2));}
 for(const city of evidence.cities)console.log(city.city+': '+city.status+' | '+JSON.stringify(city.cards));console.log(JSON.stringify(evidence.checks));
})().catch(e=>{console.error(e);process.exitCode=1;});
