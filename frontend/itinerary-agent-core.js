/* 这些是用户需求，不是已经核验的出行事实。 */
(function(root){
  function question(p){
    const city=String(p.city||'').trim(),origin=String(p.origin||'').trim();
    if(!city||!origin)throw Error('请填写目的地和出发地。');
    const days=Number(p.days),people=Number(p.people);
    if(![.5,1,2].includes(days)||!Number.isInteger(people)||people<1||people>50)throw Error('请检查时间与人数。');
    return '请由智能体为我生成三国文化活动方案，只输出活动安排。\n'+
      '出发地：'+origin+'；目的地：'+city+'；想去的景点：'+(String(p.place_names||'').trim()||'请结合知识库推荐有依据的三国文化景点')+'。\n'+
      '出行日期：'+(p.travel_date||'待确认')+'；游玩时间：'+({'0.5':'半日','1':'一日','2':'两日'}[days])+'；人数：'+people+'。\n'+
      '先检索文化资料和可用工具，再按天说明景点与活动顺序、每项时长、文化讲解要点。必要条件不明确先简短追问（例如学校校区、具体景区入口）。四川目的地不限南充；成都不属于川东北，应准确区分。不要对其他城市调用仅支持南充的规划工具，也不要用其他城市天气替代。\n'+
      '资料不足请说明；不要编造实时交通、入口坐标、开放时段或空位。';
  }
  root.ItineraryAgentCore={question};if(typeof module!=='undefined')module.exports=root.ItineraryAgentCore;
})(typeof window!=='undefined'?window:globalThis);
