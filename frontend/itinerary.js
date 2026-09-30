/* 规划使用现有智能体会话和 /chat 接口，不使用本地固定模板。 */
(() => {
  const form=document.getElementById('itinerary-form'),status=document.getElementById('itinerary-status');
  if(!form)return;
  form.onsubmit=event=>{
    event.preventDefault();if(!form.reportValidity())return;
    try{
      const preferences=Object.fromEntries(new FormData(form));
      const question=window.ItineraryAgentCore.question(preferences);
      if(!window.SGTJourney?.ask)throw Error('智能体入口尚未加载，请刷新页面重试。');
      if(window.TravelModules?.askActivity)window.TravelModules.askActivity(question,preferences);
      else window.SGTJourney.ask(question, {preserveMap:true});
      status.textContent='已打开智能体对话并带入条件；若正在回答，本次需求已保留在对话草稿中。';
    }catch(e){status.textContent=e.message||'无法打开智能体，请刷新重试。';}
  };
  window.NanchongPlanner={
    openPlace(name){if(!window.SGTJourney?.ask)return false;window.SGTJourney.ask('请生成到'+name+'的三国文化活动方案；先确认出发地、时间和人数。检索资料后只说明景点与活动顺序、每项时长、文化讲解要点；资料不足请说明，不要编造实时交通、开放时段或空位。',{preserveMap:true});return true;},
    importDraft(d){
      if(d.city)form.elements.city.value=d.city;
      if(d.date)form.elements.travel_date.value=d.date;
      form.elements.place_names.value=d.stops.map(s=>s.name).join('、');
      status.textContent='原回答已保留在下方。可调整条件交给智能体继续规划；未将回答认定为已核验导航。';
    }
  };
})();
