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
 console.log('PASS: disabled no-network, encoding/payload/signal, empty/error/invalid responses, adcode passthrough, no external supplement');
})().catch(error=>{console.error(error);process.exitCode=1;});
