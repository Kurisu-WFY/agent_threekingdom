/* 酒店卡片只显示供应商的报价，不用预算样例冒充房价。 */
(() => {
  const button=document.querySelector('#load-hotels'),target=document.querySelector('#hotel-results');
  const node=(tag,text)=>{const element=document.createElement(tag);element.textContent=text;return element;};
  function editConditions(){const field=document.querySelector('#trip-form [name=hotel_tier]');field.focus({preventScroll:true});field.scrollIntoView({block:'center',behavior:'instant'});}
  function recovery(kind,message){
    const copy={authorization:'酒店查询尚未授权，本次未取得真实酒店与房价。可以先记录住宿需求。',timeout:'酒店查询超时，本次未取得酒店与房价。请稍后重试，或调整城市和日期。',network:'网络连接失败，本次未取得酒店与房价。请检查网络后重试。',service:'酒店服务暂不可用，本次未取得酒店与房价。可重试，持续失败请联系项目维护人员。'};
    const notice=node('p',copy[kind]);notice.className='data-banner';target.replaceChildren(notice);
    if(kind==='authorization'){
      const guide=node('details','');guide.append(node('summary','查看授权指引'),node('p','请联系项目维护人员，在运行此服务的本机完成 RollingGo 登录授权。本页没有登录授权入口；授权完成后再重新查询。住宿需求可保留，参考价需确认，不代订。'));target.append(guide);
    }else if(message)target.append(node('p',message));
    const actions=node('div','');actions.className='module-actions';
    const retry=node('button',kind==='authorization'?'授权完成后重新查询':'重试酒店查询');retry.type='button';retry.className='module-button';retry.id='hotel-retry';retry.onclick=()=>button.click();
    const edit=node('button','调整住宿需求');edit.type='button';edit.className='module-button';edit.id='hotel-edit-conditions';edit.onclick=editConditions;
    actions.append(retry,edit);target.append(actions);
  }
  function failureKind(error){
    const message=error?.message||'';
    if(error?.code==='authorization_required'||/未授权|未登录|登录授权/.test(message))return 'authorization';
    if(['TimeoutError','AbortError'].includes(error?.name)||/超时|timeout/i.test(message))return 'timeout';
    return error instanceof TypeError || /network|failed to fetch|网络/i.test(message)?'network':'service';
  }
  button.textContent='查询住宿参考价';
  target.replaceChildren(node('p','使用活动计划中的城市和日期查询：默认住一晚、每房两位成人。结果为参考报价，不代订。'));
  button.onclick=async()=>{
    const form=Object.fromEntries(new FormData(document.querySelector('#trip-form')));
    if(!form.city||!form.date){target.replaceChildren(node('p','请先填写目的地和入住日期。'));const field=document.querySelector('#trip-form [name='+(form.city?'date':'city')+']');field.focus();return;}
    button.disabled=true;target.replaceChildren(node('p','正在查询住宿，请稍候…'));
    try{
      const result=await window.TravelApi.searchHotels({place:form.city,place_type:'城市',check_in:form.date,stay_nights:1,adults:2,size:3});
      if(result.status==='authorization_required'||result.status==='unavailable'){recovery(result.status==='authorization_required'?'authorization':failureKind({message:result.message}),result.message);return;}
      target.replaceChildren(node('p',result.message));
      if(form.hotel_tier)target.append(node('p','已记录住宿偏好：'+form.hotel_tier+'；本次返回城市住宿候选，尚未按该档位筛选。'));
      (result.data?.items||[]).forEach(hotel=>{
        const card=node('article','');card.className='result-card';
        card.append(node('h3',hotel.name||'酒店'),node('p',hotel.address||'地址未提供'),node('p',hotel.price==null?'暂未返回房价':'参考报价 '+(hotel.currency||'')+' '+hotel.price),node('p',hotel.price_note||'入住一晚；最终金额以供应商确认为准。'));
        if(hotel.star_rating)card.append(node('p','参考星级：'+hotel.star_rating));
        target.append(card);
      });
      if(result.status==='empty')target.append(node('p','当前条件没有酒店结果，请调整城市或日期。'));
    }catch(error){recovery(failureKind(error));}
    finally{button.disabled=false;}
  };
})();
