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
      signal: AbortSignal.timeout(path.startsWith('/hotels/') ? 150000 : path.startsWith('/amap/') ? 45000 : config.timeoutMs)
    });
    if (!response.ok) throw new Error('服务暂时不可用，请稍后重试。');
    const result = await response.json();
    if (!result || !['ok', 'empty', 'unavailable'].includes(result.status)) throw new Error('返回格式不符合约定，请联系维护人员。');
    if (result.status === 'ok' && (!result.data || typeof result.data !== 'object')) throw new Error('服务未返回有效数据。');
    return result;
  }
  return {
    config,
    searchHotels: query => request('/hotels/search', query),
    amapPlaces: query => request('/amap/places', query),
    amapRoute: query => request('/amap/route', query),
    nanchongPlan: preferences => request('/nanchong/plan', preferences),
    listSpots: city => request('/spots?city=' + encodeURIComponent(city), null, 'GET'),
    createPlan: preferences => request('/plans/preview', preferences),
    estimateBudget: preferences => request('/budget/estimate', preferences),
    getTravelInfo: preferences => request('/travel-info', preferences),
    lookupCity: city => request('/city-location?city=' + encodeURIComponent(city), null, 'GET'),
    roadRoute: points => request('/road-route', points)
  };
})();
