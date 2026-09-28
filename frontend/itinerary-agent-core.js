/* These are user requirements, not verified travel facts. */
(function(root){
  function question(p){
    const city=String(p.city||'').trim(),origin=String(p.origin||'').trim();
    if(!city||!origin)throw Error('请填写目的地和出发地。');
    const days=Number(p.days),people=Number(p.people),rooms=Number(p.rooms);
    if(![.5,1,2].includes(days)||![people,rooms].every(n=>Number.isInteger(n)&&n>=1&&n<=50))throw Error('请检查时间、人数与房间数。');
    const cost=[];for(const [k,label] of [['hotel_per_room','每间每晚住宿额度'],['meals_per_person_day','每人每日餐饮额度'],['transport_total','全员全程交通额度'],['budget_limit','全员总预算上限']]){
      if(p[k]!==''&&p[k]!=null){const v=Number(p[k]);if(!Number.isFinite(v)||v<0)throw Error('预算必须是非负数字。');cost.push(label+'：'+v+'元');}
    }
    return '请由智能体为我规划三国文化旅游行程，不要直接套用南充固定路线。\n'+
      '出发地：'+origin+'；目的地：'+city+'；想去的景点：'+(String(p.place_names||'').trim()||'请结合知识库推荐有依据的三国文化景点')+'。\n'+
      '出行日期：'+(p.travel_date||'待确认')+'；游玩时间：'+({'0.5':'半日','1':'一日','2':'两日'}[days])+'；交通方式：'+({transit:'公共交通',walking:'步行',driving:'驾车'}[p.mode]||'待确认')+'；人数：'+people+'；房间数：'+rooms+'。\n'+
      (cost.length?cost.join('；')+'。\n':'')+
      '先检索文化资料和可用工具，再按天安排景点、历史联系、停留与交通、住宿候选和预算。必要条件不明确先简短追问（例如学校校区、具体景区入口）。四川目的地不限南充；成都不属于川东北，应准确区分。不要对其他城市调用仅支持南充的规划工具，也不要用其他城市天气替代。\n'+
      '未提供费用可用演示预留：住宿200元/间夜、餐饮60元/人天、市内交通30元/人天、门票30元/人/地点；明确非报价，人数天数合理换算，半日按1日额度。用户额度优先，不含城际往返等缺项。不要编造实时交通、入口坐标、开放时段或空房。';
  }
  root.ItineraryAgentCore={question};if(typeof module!=='undefined')module.exports=root.ItineraryAgentCore;
})(typeof window!=='undefined'?window:globalThis);
