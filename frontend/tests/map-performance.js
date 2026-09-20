// Isolated browser benchmark; never loaded by the production homepage.
const benchButton=document.createElement('button');benchButton.textContent='运行缩放基准';
benchButton.style.cssText='position:fixed;top:40px;right:12px;z-index:9999;padding:10px;background:white';document.body.append(benchButton);
const result=document.createElement('output');result.id='map-benchmark-result';result.style.cssText='position:fixed;top:85px;right:12px;z-index:9999;background:white;max-width:400px';document.body.append(result);
benchButton.onclick=()=>{
 document.querySelector('[data-content-view="map"]').click();
 const slider=document.querySelector('#map-zoom-range'),svg=document.querySelector('#route-map');
 svg.scrollIntoView({block:'center'});
 const visibility=document.visibilityState;
 const before=svg.querySelectorAll('*').length,intervals=[];let previous=0,start=0,frames=0;
 benchButton.disabled=true;result.textContent='测试中：连续缩放 5 秒';
 function tick(now){
  if(!start)start=now;
  if(previous)intervals.push(now-previous);previous=now;frames++;
  slider.value=String(Math.round(100+900*(.5-.5*Math.cos((now-start)/600))));slider.dispatchEvent(new Event('input',{bubbles:true}));
  if(now-start<5000)return requestAnimationFrame(tick);
  const sorted=[...intervals].sort((a,b)=>a-b);
  result.textContent=JSON.stringify({visibility,frames,p95_ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),max_ms:+Math.max(...sorted).toFixed(2),over50ms:intervals.filter(v=>v>50).length,stableNodes:before===svg.querySelectorAll('*').length});benchButton.disabled=false;
 }
 requestAnimationFrame(tick);
};
