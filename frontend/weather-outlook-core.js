/* 显示模型返回值，不用降雨概率/PM 浓度推测天气或 AQI。 */
(function(root){
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  function datesFromToday(now=Date.now(),count=1){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
    const part=key=>parts.find(p=>p.type===key).value;
    const start=Date.parse(part('year')+'-'+part('month')+'-'+part('day')+'T00:00:00Z');
    return Array.from({length:Number.isInteger(count)&&count>0?count:0},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
  }
  function temperatureRange(day){
    if(day && (Object.hasOwn(day,'daytemp')||Object.hasOwn(day,'nighttemp'))){
      const value=v=>finite(v)?v:typeof v==='string'&&/^-?\d+(?:\.\d+)?$/.test(v.trim())?Number(v):null;
      const label=(v,name)=>finite(value(v))?name+' '+Math.round(value(v))+'°C':name+'未取得';
      return label(day.daytemp,'白天')+' / '+label(day.nighttemp,'夜间');
    }
    const min=day?.temperature_min_c,max=day?.temperature_max_c;
    return finite(min)&&finite(max)&&min<=max?'最低 '+Math.round(min)+'°C / 最高 '+Math.round(max)+'°C':'温度未取得';
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
  function textCondition(day){
    const label=v=>typeof v==='string'&&v.trim()?v.trim():'状况未取得';
    const weather=label(day.dayweather),night=label(day.nightweather);
    const icon=/雷/.test(weather)?'storm':/雪/.test(weather)?'snow':/雨/.test(weather)?'rain':/雾|霾/.test(weather)?'fog':weather==='晴'?'sun':/多云/.test(weather)?'cloud':weather==='阴'?'overcast':'unknown';
    return {icon,label:'白天 '+weather+' / 夜间 '+night};
  }
  function outlook(data={},now=Date.now()){
    const days=Array.isArray(data.forecast)?data.forecast:[],today=datesFromToday(now)[0],seen=new Set();
    return days.filter(day=>{
      const date=day?.date;
      if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<today||seen.has(date))return false;
      seen.add(date);return true;
    }).sort((a,b)=>a.date.localeCompare(b.date)).map(day=>{
      return {date:day.date,temperature:temperatureRange(day),condition:Object.hasOwn(day,'dayweather')||Object.hasOwn(day,'nightweather')?textCondition(day):condition(day.weather_code)};
    });
  }
  root.WeatherOutlook={datesFromToday,temperatureRange,condition,outlook};
  if(typeof module!=='undefined')module.exports=root.WeatherOutlook;
})(typeof window==='undefined'?globalThis:window);
