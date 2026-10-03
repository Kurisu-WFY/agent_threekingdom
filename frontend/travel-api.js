/* 仅本文件负责旅游模块网络请求。与现有 /chat 独立。 */
window.TravelApi = (() => {
  const config = {
    enabled: true,
    baseUrl: '/api/travel',
    timeoutMs: 15000
  };
  async function request(path, payload, method = 'POST') {
    if (!config.enabled) return { status: 'unavailable', message: '资料查询当前已关闭，可以问向导。', data: null };
    const response = await fetch(config.baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(path.startsWith('/amap/') ? 45000 : config.timeoutMs)
    });
    if (!response.ok) throw new Error('服务暂时不可用，请稍后重试。');
    const result = await response.json();
    if (!result || !['ok', 'empty', 'unavailable'].includes(result.status)) throw new Error('返回格式不符合约定，请联系维护人员。');
    if (result.status === 'ok' && (!result.data || typeof result.data !== 'object')) throw new Error('服务未返回有效数据。');
    return result;
  }
  async function getWeatherDetails(point){
    if(!config.enabled)return {sources:[],warnings:['补充天气查询已关闭。']};
    if(point?.coordinate_system!=='WGS84'||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180)return {sources:[],warnings:['未取得有效城市坐标，天气状况与 AQI 暂未取得。']};
    const queries=[
      {key:'daily',host:'https://api.open-meteo.com/v1/forecast',params:{daily:'weather_code'},title:'Open-Meteo 天气状况',docs:'https://open-meteo.com/en/docs'},
      {key:'hourly',host:'https://air-quality-api.open-meteo.com/v1/air-quality',params:{hourly:'us_aqi'},title:'Open-Meteo / CAMS 空气质量预报',docs:'https://open-meteo.com/en/docs/air-quality-api'}
    ];
    const results=await Promise.allSettled(queries.map(async query=>{
      const params=new URLSearchParams({latitude:point.latitude,longitude:point.longitude,timezone:'Asia/Shanghai',forecast_days:'3',...query.params});
      const response=await fetch(query.host+'?'+params,{cache:'no-store',signal:AbortSignal.timeout(config.timeoutMs)});
      if(!response.ok)throw Error('外部服务 HTTP '+response.status);
      const data=await response.json();
      if(data?.error||data?.timezone!=='Asia/Shanghai'||!Array.isArray(data[query.key]?.time))throw Error('未取得北京时间的有效预报。');
      return data[query.key];
    }));
    const output={sources:[],warnings:[],fetched_at:new Date().toISOString()};
    results.forEach((result,index)=>{
      const query=queries[index];
      if(result.status==='fulfilled'){output[query.key]=result.value;output.sources.push({title:query.title,source_url:query.docs});}
      else output.warnings.push(query.title+'暂未取得，可重新查询。'+String(result.reason?.message||''));
    });
    return output;
  }
  return {
    config,
    amapPlaces: query => request('/amap/places', query),
    amapRoute: query => request('/amap/route', query),
    nanchongPlan: preferences => request('/nanchong/plan', preferences),
    listSpots: city => request('/spots?city=' + encodeURIComponent(city), null, 'GET'),
    createPlan: preferences => request('/plans/preview', preferences),
    estimateBudget: preferences => request('/budget/estimate', preferences),
    getTravelInfo: preferences => request('/travel-info', preferences),
    getWeatherDetails,
    lookupCity: city => request('/city-location?city=' + encodeURIComponent(city), null, 'GET'),
    roadRoute: points => request('/road-route', points)
  };
})();
