/* 仅做解析：智能体回答是草案，不能作为权威坐标来源。 */
(function(root) {
  function draft(message) {
    const answer = String(message?.text || message?.data?.answer || '').slice(0,24000);
    const question = String(message?.originalQuestion || message?.question || '').slice(0,2000);
    const catalog=root.SGTCities||(typeof module!=='undefined'?require('./cities.js'):[]);
    const cities=catalog.filter(city=>(question+'\n'+answer).includes(city));
    const dates = [...new Set((question + '\n' + answer).match(/\b20\d{2}-\d{2}-\d{2}\b/g) || [])].filter(v => {
      const d = new Date(v+'T00:00:00Z'); return Number.isFinite(+d) && d.toISOString().slice(0,10) === v;
    });
    // 不从正文推导路线；推荐地点列表不一定是有序行程。
    const stops = (Array.isArray(message?.data?.route?.stops) ? message.data.route.stops : []).slice(0,30).map(s => ({name:String(s?.name || '').slice(0,120)})).filter(s=>s.name);
    return {answer, city:cities.length===1?cities[0]:'', date:dates.length===1?dates[0]:'', stops};
  }
  function canOpen(m) {return m?.role==='assistant' && !m.pending && !m.error && !!m.data && (m.data.generation?.kind==='nuwax' || m.data.intent?.intent==='route_planning');}
  function routePoints(geometry) {
    const coords=geometry?.type==='LineString' && geometry.coordinates;
    if (!Array.isArray(coords) || coords.length<2 || coords.length>20000) return null;
    if (!coords.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85)) return null;
    const lat=coords.reduce((s,p)=>s+p[1],0)/coords.length;
    const xy=coords.map(p=>[p[0]*Math.cos(lat*Math.PI/180),p[1]]);
    const xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const scale=Math.min(550/Math.max(maxX-minX,.000001),210/Math.max(maxY-minY,.000001));
    return xy.map(p=>[300+(p[0]-(minX+maxX)/2)*scale,130-(p[1]-(minY+maxY)/2)*scale]);
  }
  const api={draft,canOpen,routePoints};root.OutingCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
