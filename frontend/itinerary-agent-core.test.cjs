const assert=require('node:assert/strict');
const {question}=require('./itinerary-agent-core.js');
const base={city:'成都',origin:'成都东站',days:1,people:2,rooms:1,mode:'transit',place_names:'武侯祠',travel_date:'2026-10-02',hotel_per_room:0,budget_limit:800};
const q=question(base);
for(const s of ['目的地：成都','出发地：成都东站','武侯祠','2026-10-02','人数：2','住宿额度：0元','总预算上限：800元','演示预留','不要对其他城市调用仅支持南充'])assert.ok(q.includes(s),s);
assert.match(question({...base,city:'南充、阆中',place_names:''}),/请结合知识库推荐/);
for(const p of [{city:''},{origin:' '},{people:0},{days:7},{transport_total:-1}])assert.throws(()=>question({...base,...p}));
console.log('PASS: agent planning prompt preserves city/place/date/count/budget and rejects invalid inputs');
