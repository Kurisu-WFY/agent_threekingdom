const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let response;
const calls = [];
const context = vm.createContext({ window: {}, URL, URLSearchParams, AbortSignal, fetch: async (url, options) => { calls.push({ url, options }); return response; } });
vm.runInContext(fs.readFileSync(__dirname + '/travel-api.js', 'utf8'), context);
const api = context.window.TravelApi;
(async () => {
  assert.equal(api.config.enabled, true);
  api.config.enabled = false;
  assert.equal((await api.listSpots('南充')).status, 'unavailable');
  assert.equal(calls.length, 0);
  api.config.enabled = true;
  response = { ok: true, json: async () => ({ status: 'ok', data: { spots: [] } }) };
  await api.listSpots('南充');
  assert.equal(calls[0].url, '/api/travel/spots?city=' + encodeURIComponent('南充'));
  assert.equal(calls[0].options.method, 'GET');
  const preferences = { city: '阆中', days: 2, people: 3, rooms: 2 };
  await api.createPlan(preferences);
  assert.deepEqual(JSON.parse(calls[1].options.body), preferences);
  assert.ok(calls[1].options.signal instanceof AbortSignal);
  response = { ok: true, json: async () => ({ status: 'empty', data: null }) };
  assert.equal((await api.estimateBudget(preferences)).status, 'empty');
  response = { ok: false };
  await assert.rejects(api.getTravelInfo(preferences));
  response = { ok: true, json: async () => ({ status: 'ok', data: null }) };
  await assert.rejects(api.createPlan(preferences));
  assert.equal(typeof api.getWeatherDetails,'function','补查天气状况与三日 AQI 的接口缺失');
  const beforeExtra=calls.length;
  for(const point of [{latitude:NaN,longitude:106,coordinate_system:'WGS84'},{latitude:30,longitude:181,coordinate_system:'WGS84'},{latitude:30,longitude:106,coordinate_system:'GCJ02'}]){
    assert.ok((await api.getWeatherDetails(point)).warnings.length);assert.equal(calls.length,beforeExtra,'无有效 WGS84 城市坐标不发补查');
  }
  context.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('air-quality')?{timezone:'Asia/Shanghai',hourly:{time:['2026-10-03T12:00'],us_aqi:[48]}}:{timezone:'Asia/Shanghai',daily:{time:['2026-10-03'],weather_code:[0]}}};};
  const extra=await api.getWeatherDetails({latitude:30.79508,longitude:106.08473,coordinate_system:'WGS84'});
  assert.equal(extra.daily.weather_code[0],0);assert.equal(extra.hourly.us_aqi[0],48);assert.equal(extra.sources.length,2);
  for(const call of calls.slice(beforeExtra)){const query=new URL(call.url);assert.equal(query.searchParams.get('timezone'),'Asia/Shanghai');assert.equal(query.searchParams.get('forecast_days'),'3');assert.ok(call.options.signal instanceof AbortSignal);}
  assert.equal(new URL(calls.at(-2).url).searchParams.get('daily'),'weather_code');assert.equal(new URL(calls.at(-1).url).searchParams.get('hourly'),'us_aqi');
  context.fetch=async url=>{if(url.includes('air-quality'))throw new Error('offline');return {ok:true,json:async()=>({timezone:'Asia/Shanghai',daily:{time:['2026-10-03'],weather_code:[61]}})};};
  const partial=await api.getWeatherDetails({latitude:30,longitude:106,coordinate_system:'WGS84'});assert.equal(partial.daily.weather_code[0],61);assert.equal(partial.hourly,undefined);assert.ok(partial.warnings.length,'独立失败保留已取得的状况，不伪造 AQI');
  response = { ok: true, json: async () => { throw new SyntaxError(); } };
  await assert.rejects(api.createPlan(preferences));
  console.log('PASS: disabled no-network mode, URL encoding, request body, timeout signal, empty/error/invalid responses');
})().catch(error => { console.error(error); process.exitCode = 1; });
