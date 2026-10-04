/* 只使用浏览器定位结果的精度；不读取、存储或发送坐标，不发起查询。 */
(() => {
  'use strict';
  const button=document.getElementById('use-my-location');
  const origin=document.getElementById('trip-origin');
  const status=document.getElementById('origin-location-status');
  if(!button||!origin||!status)return;
  const label='我的位置（近似）',failure='未取得定位，可手动填写出发地';
  let version=0,timer;
  function finish(message){
    version++;clearTimeout(timer);timer=null;button.disabled=false;status.textContent=message;
  }
  origin.addEventListener('input',()=>{
    if(button.disabled)finish('出发地已修改，可手动填写或重新定位。');
    else if(origin.value!==label)status.textContent='';
  });
  origin.addEventListener('sgt-origin-restored',()=>finish(''));
  button.onclick=()=>{
    if(button.disabled)return;
    const current=++version,initial=origin.value;button.disabled=true;status.textContent='正在请求浏览器定位授权…';
    function unchanged(){
      if(current!==version)return false;
      if(origin.value!==initial){finish('出发地已修改，可手动填写或重新定位。');return false;}
      return true;
    }
    const fail=()=>{if(unchanged())finish(failure);};
    timer=setTimeout(fail,12000);
    try{
      if(!navigator.geolocation){fail();return;}
      navigator.geolocation.getCurrentPosition(position=>{
        if(!unchanged())return;
        const accuracy=position?.coords?.accuracy;
        finish(Number.isFinite(accuracy)&&accuracy>=0?'定位精度：±'+Math.ceil(accuracy)+' 米（近似）':'定位精度未取得（近似位置）');
        origin.value=label;
        // 沿用表单条件改变机制，隔离旧方案请求；input不会自动提交。
        origin.dispatchEvent(new Event('input',{bubbles:true}));
      },fail,{enableHighAccuracy:true,maximumAge:0,timeout:10000});
    }catch{fail();}
  };
})();
