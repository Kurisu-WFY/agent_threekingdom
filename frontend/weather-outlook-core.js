/* 显示模型返回值，不用降雨概率/PM 浓度推测天气或 AQI。 */
(function(root){
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  function datesFromToday(now=Date.now()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
    const part=key=>parts.find(p=>p.type===key).value;
    const start=Date.parse(part('year')+'-'+part('month')+'-'+part('day')+'T00:00:00Z');
    return [0,1,2].map(i=>new Date(start+i*86400000).toISOString().slice(0,10));
  }
  function temperatureRange(day){
    const min=day?.temperature_min_c,max=day?.temperature_max_c;
    return finite(min)&&finite(max)&&min<=max?Math.round(min)+'～'+Math.round(max)+'°C':'温度未取得';
  }
  // WMO 分类依据 https://open-meteo.com/en/docs#weathervariables
  function condition(code){
    if(Number.isInteger(code)){
      if([0,1].includes(code))return {icon:'sun',label:'晴'};
      if(code===2)return {icon:'cloud',label:'多云'};
      if(code===3)return {icon:'overcast',label:'阴'};
      if([45,48].includes(code))return {icon:'fog',label:'雾'};
      if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return {icon:'rain',label:'雨'};
      if([71,73,75,77,85,86].includes(code))return {icon:'snow',label:'雪'};
      if([95,96,99].includes(code))return {icon:'storm',label:'雷雨'};
    }
    return {icon:'unknown',label:'状况未取得'};
  }
  function outlook(data={},extra={},now=Date.now()){
    const days=Array.isArray(data.forecast)?data.forecast:[],daily=extra.daily||{},hourly=extra.hourly||{};
    return datesFromToday(now).map(date=>{
      const day=days.find(d=>d?.date===date),index=Array.isArray(daily.time)?daily.time.indexOf(date):-1;
      const code=index>=0?daily.weather_code?.[index]:day?.weather_code;
      const readings=Array.isArray(hourly.time)?hourly.time.flatMap((time,i)=>typeof time==='string'&&time.startsWith(date+'T')&&finite(hourly.us_aqi?.[i])&&hourly.us_aqi[i]>=0?[hourly.us_aqi[i]]:[]):[];
      return {date,temperature:temperatureRange(day),condition:condition(code),aqi:readings.length?Math.round(Math.max(...readings)):null};
    });
  }
  root.WeatherOutlook={datesFromToday,temperatureRange,condition,outlook};
  if(typeof module!=='undefined')module.exports=root.WeatherOutlook;
})(typeof window==='undefined'?globalThis:window);
