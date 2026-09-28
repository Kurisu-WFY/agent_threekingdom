/* Planning uses the existing agent conversation and /chat, not a local template. */
(() => {
  const form=document.getElementById('itinerary-form'),status=document.getElementById('itinerary-status');
  if(!form)return;
  form.onsubmit=event=>{
    event.preventDefault();if(!form.reportValidity())return;
    try{
      const question=window.ItineraryAgentCore.question(Object.fromEntries(new FormData(form)));
      if(!window.SGTJourney?.ask)throw Error('智能体入口尚未加载，请刷新页面重试。');
      window.SGTJourney.ask(question, {preserveMap:true});
      status.textContent='已打开智能体对话并带入条件；若正在回答，本次需求已保留在对话草稿中。';
    }catch(e){status.textContent=e.message||'无法打开智能体，请刷新重试。';}
  };
  window.NanchongPlanner={
    openPlace(name){if(!window.SGTJourney?.ask)return false;window.SGTJourney.ask('请规划到'+name+'的三国文化旅游路线；先确认出发地、时间、交通方式和人数。检索资料后安排交通、游览、住宿及预算，缺少来源请说明。',{preserveMap:true});return true;},
    importDraft(d){
      if(d.city)form.elements.city.value=d.city;
      if(d.date)form.elements.travel_date.value=d.date;
      form.elements.place_names.value=d.stops.map(s=>s.name).join('、');
      status.textContent='原回答已保留在下方。可调整条件交给智能体继续规划；未将回答认定为已核验导航。';
    }
  };
})();
