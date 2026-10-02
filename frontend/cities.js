/* 可选目的地一处维护；未知城市仍可在自由文本中填写。 */
((root) => {
  const cities=Object.freeze(['南充','阆中','广元','成都','绵阳','德阳','巴中','达州']);
  root.SGTCities=cities;
  if(typeof module!=='undefined')module.exports=cities;
  if(typeof document==='undefined')return;
  const directory=document.querySelector('#destination-cities');
  const choices=document.querySelector('#itinerary-cities');
  if(directory){
    directory.replaceChildren(...cities.map((city,index)=>{
      const button=document.createElement('button');
      button.type='button';button.className='module-button';button.dataset.city=city;
      button.setAttribute('aria-pressed',String(index===0));button.textContent=city;
      return button;
    }));
  }
  if(choices)choices.replaceChildren(...cities.map(city=>{const option=document.createElement('option');option.value=city;return option;}));
  for(const id of ['#outing-start','#outing-end']){
    const select=document.querySelector(id);if(!select)continue;
    const first=document.createElement('option');first.value='';first.textContent='请选择已知位置';
    const manual=document.createElement('option');manual.value='manual';manual.textContent='手动 WGS84 坐标';
    select.replaceChildren(first,...cities.map(city=>{const option=document.createElement('option');option.value=city;option.textContent=city+' · 城市中心';return option;}),manual);
  }
})(typeof window!=='undefined'?window:globalThis);
