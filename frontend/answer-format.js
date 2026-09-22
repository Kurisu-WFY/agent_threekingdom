/* Small Markdown subset, built with DOM/textContent only: no model HTML executes. */
(function(root) {
  function clean(text) {
    return String(text || '').replace(/<div>\s*<markdown-custom-process\b[^>]*>[\s\S]*?<\/markdown-custom-process>\s*<\/div>/gi,'')
      .replace(/<markdown-custom-process\b[^>]*>[\s\S]*?<\/markdown-custom-process>/gi,'').trim();
  }
  function element(tag,text) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function inline(parent,text) {
    const pattern=/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
    let end=0;
    for(const match of text.matchAll(pattern)) {
      if(match.index>end)parent.append(element('span',text.slice(end,match.index)));
      const token=match[0];
      if(token.startsWith('`'))parent.append(element('code',token.slice(1,-1)));
      else if(token.startsWith('**'))parent.append(element('strong',token.slice(2,-2)));
      else {const parts=/^\[([^\]]+)\]\((.+)\)$/.exec(token);const a=element('a',parts[1]);a.href=parts[2];a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
      end=match.index+token.length;
    }
    if(end<text.length)parent.append(element('span',text.slice(end)));
  }
  function cells(line) {return line.trim().replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/).map(s=>s.trim().replace(/\\\|/g,'|'));}
  function render(text) {
    const box=element('div');box.className='agent-prose';
    const lines=clean(text).split(/\r?\n/);
    for(let i=0;i<lines.length;) {
      const line=lines[i];
      if(!line.trim()){i++;continue;}
      if(/^\s*```/.test(line)) {const code=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);i++;const pre=element('pre');pre.append(element('code',code.join('\n')));box.append(pre);continue;}
      if(line.includes('|')&&i+1<lines.length&&cells(lines[i+1]).every(c=>/^:?-{3,}:?$/.test(c))) {
        const wrapper=element('div');wrapper.className='agent-table-scroll';wrapper.setAttribute('tabindex','0');wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','回答数据表，可横向滚动');
        const table=element('table'),head=element('thead'),row=element('tr'),body=element('tbody');
        const headings=cells(line);headings.forEach(c=>{const th=element('th');th.setAttribute('scope','col');inline(th,c);row.append(th);});head.append(row);i+=2;
        while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()) {const tr=element('tr'),values=cells(lines[i++]);headings.forEach((_,n)=>{const td=element('td');inline(td,values[n]||'');tr.append(td);});body.append(tr);}
        table.append(head,body);wrapper.append(table);box.append(wrapper);continue;
      }
      const heading=/^#{1,6}\s+(.+)$/.exec(line);
      if(heading){const h=element('h4');inline(h,heading[1]);box.append(h);i++;continue;}
      if(/^\s*([-*]|\d+\.)\s+/.test(line)) {const list=element(/^\s*\d/.test(line)?'ol':'ul');while(i<lines.length&&/^\s*([-*]|\d+\.)\s+/.test(lines[i])){const li=element('li');inline(li,lines[i++].replace(/^\s*([-*]|\d+\.)\s+/,''));list.append(li);}box.append(list);continue;}
      const p=element('p');inline(p,line);box.append(p);i++;
    }
    return box;
  }
  function latestCalls(calls) {const map=new Map();for(const call of calls||[])if(call&&call.name)map.set(call.name,call);return [...map.values()];}
  root.AgentAnswer={clean,render,latestCalls};
  if(typeof module!=='undefined')module.exports=root.AgentAnswer;
})(typeof window==='undefined'?globalThis:window);
