/* 可选浏览器回归：通过本地页面 Console 加载；不在产品页自动执行。
 * await import('/n8-n9.browser-test.js'); N8N9BrowserTest.dom();
 * 打开章节卡片并返回地图后：open(); close('launcher'|'close'|'Escape'); settled();
 * 视口由测试工具设置。活动回答样本与真实后端结果须分开记录。
 */
(() => {
  const $=s=>document.querySelector(s);
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  let before,openWidth,samples=[],sampling=null;
  const state=()=>({scrollY:window.scrollY,open:document.body.classList.contains('chat-open'),left:$('#launcher').style.left,focus:document.activeElement.id,width:$('.content').getBoundingClientRect().width});
  function dom(){
    assert(!document.querySelectorAll('[name="hotel_tier"],[name="rooms"],[name="hotel_per_room"],[name="meals_per_person_day"],[name="transport_total"],[name="budget_limit"],[name="budget_min"],[name="budget_max"],#budget-view,[data-content-view="budget"],.route-replan').length,'N8 退休入口残留');
    assert(!/住宿档位|房间数|预算明细|重绘剩余路线|预算与住宿设置/.test(document.body.innerText),'N8 页面旧文案残留');
    assert($('#travel-view')&&$('#load-travel')&&$('#amap-map')&&$('#outing-weather-form')&&$('#amap-route-form'),'N8 查询工具必须保留');
    assert(document.documentElement.scrollWidth<=window.innerWidth,'页面横向溢出');
    return {pass:true,viewport:[innerWidth,innerHeight]};
  }
  function open(){
    assert($('#chat-panel').hidden,'必须从已关闭的面板开始');
    before=state();$('#launcher').click();
    if(innerWidth>760)assert(getComputedStyle($('#launcher')).visibility==='visible','N9 非全屏入口必须可见');
    assert(!$('#chat-panel').hidden,'N9 点击未打开');
    if(innerWidth<=760)assert($('#chat-panel').offsetWidth>=innerWidth-2,'N9 移动面板必须覆盖完整视口');return {before,after:state()};
  }
  function close(method){
    openWidth=$('.content').getBoundingClientRect().width;samples=[];clearTimeout(sampling);
    if(method==='launcher')$('#launcher').click();else if(method==='close')$('#close-chat').click();else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
    assert($('#chat-panel').hidden&&!document.body.classList.contains('chat-open'),'N9 收起状态错误');
    assert(document.activeElement===$('#launcher'),'N9 焦点未还原');
    assert(Math.abs(scrollY-before.scrollY)<=2,'N9 滚动被覆盖');
    const sample=()=>{samples.push(state());if(samples.length<70)sampling=setTimeout(sample,8);};sample();return state();
  }
  function settled(){
    assert(Math.abs(scrollY-before.scrollY)<=2,'N9 过渡结束后滚动漂移');
    const middle=samples.some(s=>s.width>Math.min(openWidth,state().width)+1&&s.width<Math.max(openWidth,state().width)-1);
    if(innerWidth>1050&&openWidth!==state().width&&!matchMedia('(prefers-reduced-motion: reduce)').matches)assert(middle,'N9 未采样到内容宽度过渡');
    return {before,after:state(),middle,samples};
  }
  window.N8N9BrowserTest={dom,open,close,settled};
})();
