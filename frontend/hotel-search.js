/* 酒店卡片只显示供应商的报价，不用预算样例冒充房价。 */
(() => {
  const button=document.querySelector('#load-hotels'),target=document.querySelector('#hotel-results');
  const node=(tag,text)=>{const element=document.createElement(tag);element.textContent=text;return element;};
  button.textContent='查询住宿参考价';
  target.replaceChildren(node('p','使用活动计划中的城市和日期查询：默认住一晚、每房两位成人。结果为参考报价，不代订。'));
  button.onclick=async()=>{
    const form=Object.fromEntries(new FormData(document.querySelector('#trip-form')));
    if(!form.city||!form.date){target.replaceChildren(node('p','请先填写目的地和入住日期。'));return;}
    button.disabled=true;target.replaceChildren(node('p','正在查询住宿，请稍候…'));
    try{
      const result=await window.TravelApi.searchHotels({place:form.city,place_type:'城市',check_in:form.date,stay_nights:1,adults:2,size:3});
      target.replaceChildren(node('p',result.message));
      if(form.hotel_tier)target.append(node('p','已记录住宿偏好：'+form.hotel_tier+'；本次返回城市住宿候选，尚未按该档位筛选。'));
      (result.data?.items||[]).forEach(hotel=>{
        const card=node('article','');card.className='result-card';
        card.append(node('h4',hotel.name||'酒店'),node('p',hotel.address||'地址未提供'),node('p',hotel.price==null?'暂未返回房价':'参考报价 '+(hotel.currency||'')+' '+hotel.price),node('p',hotel.price_note||'入住一晚；最终金额以供应商确认为准。'));
        if(hotel.star_rating)card.append(node('p','参考星级：'+hotel.star_rating));
        target.append(card);
      });
      if(result.status==='empty')target.append(node('p','当前条件没有酒店结果，请调整城市或日期。'));
    }catch(_){target.replaceChildren(node('p','酒店查询暂不可用，请稍后重试。'));}
    finally{button.disabled=false;}
  };
})();
