/* 仅用 DOM 和 textContent 构建有限的 Markdown 格式，不执行模型返回的 HTML。 */
(function(root) {
  const labels={retrieve_culture_knowledge:'文化知识检索',answer_travel_question:'旅游问题解答',plan_cultural_route:'文化路线规划',list_scenic_spots:'景点查询',get_spot_ticket:'门票信息查询',estimate_hotel_budget:'住宿预算估算',search_hotel_poi_request:'住宿地点查询',plan_budget:'行程预算估算',get_travel_weather:'天气查询',lookup_travel_city:'城市位置查询',get_road_route:'道路路线查询',get_nanchong_travel_catalog:'南充出行资料查询',plan_nanchong_itinerary:'南充行程规划',WaitForMcpServers:'连接旅游工具'};
  labels.search_amap_places='高德地点搜索'; labels.get_amap_route='高德路线规划';
  const names=new RegExp('(?<![\\w-])(?:[\\w-]+__)?('+Object.keys(labels).join('|')+')(?![\\w])','g');
  const metric=/^(?:chunk(?:\s*(?:数|id))?|召回率|召回覆盖率?|命中数|候选数|重排分数|rerank(?:\s*最高分|_score)?|total_candidates|final_hits|coverage|passed|missing_entities)$/i;
  function present(text){
    return text.replace(/```(?:json)?\s*\n[\s\S]*?```/g,block=>/"recall_report"\s*:|"total_candidates"\s*:/.test(block)?'':block)
      .split('\n').filter(line=>!/^\s*(?:#{1,6}\s*|[-*]\s*)?(?:召回率|召回覆盖率?|检索诊断|召回报告|检索统计|total_candidates|final_hits|coverage|rerank_score|chunk\s*(?:数|id))\s*[:：]/i.test(line.replace(/\*\*/g,'')))
      .filter(line=>!/^\s*(?:[-*]\s*)?(?:本次|此次|共|已)?(?:检索)?(?:命中|召回)\s*\d+\s*(?:个|条)?\s*(?:chunks?|片段)/i.test(line)).join('\n')
      .split(/(```[\s\S]*?```|https?:\/\/[^\s)<>]+)/g).map((part,i)=>i%2?part:part.replace(names,(_,key)=>labels[key])).join('');
  }
  function clean(text) {
    return present(String(text || '').replace(/<div>\s*<markdown-custom-process\b[^>]*>[\s\S]*?<\/markdown-custom-process>\s*<\/div>/gi,'')
      .replace(/<markdown-custom-process\b[^>]*>[\s\S]*?<\/markdown-custom-process>/gi,'')).trim();
  }
  function element(tag,text) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function inline(parent,text,decorateText) {
    const pattern=/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
    let end=0;
    for(const match of text.matchAll(pattern)) {
      if(match.index>end)parent.append(decorateText?decorateText(text.slice(end,match.index)):element('span',text.slice(end,match.index)));
      const token=match[0];
      if(token.startsWith('`'))parent.append(element('code',token.slice(1,-1)));
      else if(token.startsWith('**')){const strong=element('strong');if(decorateText)strong.append(decorateText(token.slice(2,-2)));else strong.textContent=token.slice(2,-2);parent.append(strong);}
      else {const parts=/^\[([^\]]+)\]\((.+)\)$/.exec(token);const a=element('a',parts[1]);a.href=parts[2];a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
      end=match.index+token.length;
    }
    if(end<text.length)parent.append(decorateText?decorateText(text.slice(end)):element('span',text.slice(end)));
  }
  function cells(line) {return line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(s=>s.trim().replace(/\\\|/g,'|'));}
  function render(text,options={}) {
    const box=element('div');box.className='agent-prose';
    const lines=(options.preserve?String(text||''):clean(text)).split(/\r?\n/);
    const decorateText=typeof options.decorateText==='function'?options.decorateText:null;
    for(let i=0;i<lines.length;) {
      const line=lines[i];
      if(!line.trim()){i++;continue;}
      if(/^\s*```/.test(line)) {const code=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);i++;const pre=element('pre');pre.append(element('code',code.join('\n')));box.append(pre);continue;}
      if(line.includes('|')&&i+1<lines.length&&cells(lines[i+1]).every(c=>/^:?-{3,}:?$/.test(c))) {
        const wrapper=element('div');wrapper.className='agent-table-scroll';wrapper.setAttribute('tabindex','0');wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','回答数据表，可横向滚动');
        const table=element('table'),head=element('thead'),row=element('tr'),body=element('tbody');
        const headings=cells(line),visible=headings.map((c,n)=>!options.preserve&&metric.test(c.replace(/[*`]/g,'').trim())?-1:n).filter(n=>n>=0);visible.forEach(n=>{const th=element('th');th.setAttribute('scope','col');inline(th,headings[n],decorateText);row.append(th);});head.append(row);i+=2;
        while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()) {const tr=element('tr'),values=cells(lines[i++]);visible.forEach(n=>{const td=element('td');inline(td,values[n]||'',decorateText);tr.append(td);});body.append(tr);}
        if(visible.length){table.append(head,body);wrapper.append(table);box.append(wrapper);}continue;
      }
      const heading=/^(#{1,6})\s+(.+)$/.exec(line);
      if(heading){const h=element('h'+Math.min(4,Math.max(2,heading[1].length)));inline(h,heading[2],decorateText);box.append(h);i++;continue;}
      if(/^\s*([-*]|\d+\.)\s+/.test(line)) {const list=element(/^\s*\d/.test(line)?'ol':'ul');while(i<lines.length&&/^\s*([-*]|\d+\.)\s+/.test(lines[i])){const li=element('li');inline(li,lines[i++].replace(/^\s*([-*]|\d+\.)\s+/,''),decorateText);list.append(li);}box.append(list);continue;}
      const p=element('p');inline(p,line,decorateText);box.append(p);i++;
    }
    return box;
  }
  function latestCalls(calls) {const map=new Map();for(const call of calls||[])if(call&&call.name)map.set(call.name,call);return [...map.values()];}
  root.AgentAnswer={clean,render,latestCalls};
  if(typeof module!=='undefined')module.exports=root.AgentAnswer;
})(typeof window==='undefined'?globalThis:window);
