/* Typed backend plan rendering; model prose is never executed or parsed as coordinates. */
(() => {
  const form=document.getElementById('itinerary-form'), result=document.getElementById('itinerary-result'), status=document.getElementById('itinerary-status');
  if(!form)return;
  let revision=0;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function link(text,url){const a=el('a',text);const u=new URL(url,location.origin);if(u.protocol!=='https:')return el('span',text);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function stale(){revision++;result.dataset.stale='true';status.textContent='条件已改变，请生成新草案；下方旧结果尚未更新。';form.querySelector('[type=submit]').disabled=false;}
  form.addEventListener('input',stale);
  function render(plan){
    result.replaceChildren();result.dataset.stale='false';const timeline=el('div'),aside=el('aside');
    for(const day of plan.days){const section=el('section');section.className='itinerary-day';section.append(el('h2',`第 ${day.day} 天 · ${day.stops.length?'按顺序游览':'自由安排'}`));
      const leg=l=>{const n=el('div');n.className='itinerary-leg';n.append(el('div',`${l.origin} → ${l.destination}`),link('在百度地图确认路线 ↗',l.url),el('small','耗时待查询 · 请核对同名地点及入口'));return n;};
      day.stops.forEach((stop,i)=>{section.append(leg(day.legs[i]));const n=el('article');n.className='itinerary-stop';n.append(el('h3',stop.name),el('p',stop.purpose),el('p',stop.address),el('small',`建议停留 ${stop.minutes} 分钟（编辑建议）`),link('查看高德地点页面 ↗',stop.url));section.append(n);});
      section.append(el('p',`另留餐饮/休息 ${day.rest_minutes} 分钟；${day.available_minutes/60} 小时时间窗口，未计交通前剩余 ${day.remaining_before_transport} 分钟。`));
      if(day.legs.length>day.stops.length)section.append(leg(day.legs.at(-1)));
      section.append(el('small',day.note));timeline.append(section);
    }
    const lodging=el('section');lodging.className='itinerary-side';lodging.append(el('h2','住在哪里'),el('p',plan.lodging.notice));
    const hotel=plan.lodging.candidate;if(hotel)lodging.append(el('h3',hotel.area),el('p',hotel.name+' · '+hotel.address),el('p',`${plan.lodging.nights} 晚 · ${plan.request.rooms} 间（待预订）`),link('查看房型与价格 ↗',hotel.url),el('small',hotel.notice));aside.append(lodging);
    const budget=el('section');budget.className='itinerary-side';budget.append(el('h2','预算怎么分 · 演示估算'));const dl=el('dl');const labels={demo_estimate:'演示预留',user_allowance:'你填写的额度',not_needed:'不安排住宿'};Object.entries(plan.budget.items).forEach(([name,v])=>dl.append(el('dt',name),el('dd',(v===null?'待确认':`¥${v}`)+' · '+(labels[plan.budget.item_status?.[name]]||'待核验'))));budget.append(dl,el('p',`方案估算合计 ¥${plan.budget.estimated_total??plan.budget.subtotal} · 非实际报价`),el('small',plan.budget.notice));if(plan.budget.over_limit)budget.append(el('strong','方案估算已超出总预算，请调整。'));aside.append(budget);
    const sources=el('details');sources.className='itinerary-side';sources.append(el('summary','资料来源与边界'),el('p',`公开页面核对日期：${plan.catalog.checked_on} · C级出行参考，非历史证据。`),el('p',plan.catalog.notice));plan.warnings.forEach(w=>sources.append(el('p',w)));aside.append(sources);result.append(timeline,aside);
  }
  form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;const fd=new FormData(form),places=fd.getAll('places');if(!places.length){status.textContent='至少选择一个想去的地方。';return;}const request={origin:fd.get('origin').trim(),days:Number(fd.get('days')),mode:fd.get('mode'),people:Number(fd.get('people')),rooms:Number(fd.get('rooms')),places,travel_date:fd.get('travel_date')||null};for(const k of ['hotel_per_room','meals_per_person_day','transport_total','budget_limit'])request[k]=fd.get(k)===''?null:Number(fd.get(k));const version=++revision;form.querySelector('[type=submit]').disabled=true;status.textContent='正在编排行程…';
    try{const r=await window.TravelApi.nanchongPlan(request);if(version!==revision)return;if(r.status!=='ok')throw Error(r.message||'规划服务不可用');render(r.data);status.textContent='草案已生成。请逐段确认地图路线；交通、开放条件未核实前，不保证时间可行。';document.getElementById('outing-city').value='南充';document.getElementById('outing-date').value=request.travel_date||'';document.getElementById('outing-city').dispatchEvent(new Event('input',{bubbles:true}));result.focus({preventScroll:true});result.scrollIntoView({block:'start'});}
    catch(e){if(version===revision){status.textContent=e.message||'生成失败，请重试';result.dataset.stale='true';}}finally{if(version===revision)form.querySelector('[type=submit]').disabled=false;}
  };
  window.NanchongPlanner={openPlace(name){const id=/万卷楼/.test(name)?'wanjuanlou':/北湖/.test(name)?'beihu':null;if(!id)return false;form.querySelectorAll('[name=places]').forEach(x=>x.checked=x.value===id);stale();window.toggleChat?.(false);window.showContentView?.('outing');form.elements.origin.focus();return true;},importDraft(d){if(d.city!=='南充'){status.textContent='带入的城市不明确或不是南充。本规划器仅支持南充，请勿把原回答视为当前方案。';return;}if(d.date)form.elements.travel_date.value=d.date;const ids=d.stops.map(s=>/万卷楼/.test(s.name)?'wanjuanlou':/北湖/.test(s.name)?'beihu':null).filter(Boolean);if(ids.length)form.querySelectorAll('[name=places]').forEach(x=>x.checked=ids.includes(x.value));stale();}};
})();
