const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let response;const calls=[];
const context=vm.createContext({window:{},URL,URLSearchParams,AbortSignal,fetch:async(url,options)=>{calls.push({url,options});return response;}});
vm.runInContext(fs.readFileSync(__dirname+'/travel-api.js','utf8'),context);const api=context.window.TravelApi;
(async()=>{
 assert.equal(api.config.enabled,true);api.config.enabled=false;assert.equal((await api.listSpots('南充')).status,'unavailable');assert.equal(calls.length,0);api.config.enabled=true;
 response={ok:true,json:async()=>({status:'ok',data:{spots:[]}})};await api.listSpots('南充');assert.equal(calls[0].url,'/api/travel/spots?city='+encodeURIComponent('南充'));assert.equal(calls[0].options.method,'GET');
 const preferences={city:'阆中',days:2,people:3,rooms:2};await api.createPlan(preferences);assert.deepEqual(JSON.parse(calls[1].options.body),preferences);assert.ok(calls[1].options.signal instanceof AbortSignal);
 response={ok:true,json:async()=>({status:'empty',data:null})};assert.equal((await api.estimateBudget(preferences)).status,'empty');response={ok:false};await assert.rejects(api.getTravelInfo(preferences));response={ok:true,json:async()=>({status:'ok',data:null})};await assert.rejects(api.createPlan(preferences));
 assert.equal(api.getWeatherDetails,undefined,'AQI 与 Open-Meteo 天气补查移除');
 response={ok:true,json:async()=>({status:'ok',data:{forecast:[]}})};await api.getTravelInfo({city:'南充',adcode:'511300'});assert.deepEqual(JSON.parse(calls.at(-1).options.body),{city:'南充',adcode:'511300'});
 assert.ok(calls.every(c=>c.url.startsWith('/api/travel')),'天气只用同源后端，前端不直连外部天气或空气服务');
 response={ok:true,json:async()=>{throw new SyntaxError();}};await assert.rejects(api.createPlan(preferences));
 response={ok:true,json:async()=>({status:'authorization_required',message:'请先在本机完成RollingGo登录授权。',data:null})};
 assert.equal((await api.searchHotels({place:'南充',check_in:'2026-10-08'})).status,'authorization_required','真实酒店授权状态不可被通用格式检查吞掉');
 await assert.rejects(api.createPlan(preferences),'授权状态只适用于酒店服务');
 for(const status of [401,403]){response={ok:false,status};await assert.rejects(api.searchHotels({place:'南充'}),e=>e.status===status&&e.code==='authorization_required');}
 console.log('PASS: disabled no-network, encoding/payload/signal, empty/error/invalid responses, adcode passthrough, no external supplement');
})().catch(error=>{console.error(error);process.exitCode=1;});
