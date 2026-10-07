/* 文化阅读以证据为依据，不把缺失的数据编造成历史叙述。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const modes=['大众体验版','亲子故事版','学术探索版'], readings=new Map();
  let context=null, mode=modes[0], readingKey='';
  const text=v=>typeof v==='string'&&v.trim()?v.trim():'待确认';
  const list=v=>Array.isArray(v)&&v.length?v.map(text).join('、'):'待确认';
  const status=r=>r?.data_status || r?.dataStatus;
  const statusLabel=r=>({pending:'待确认',maintained:'维护资料',live:'实时查询',sample:'示例资料',stale:'已过期',forecast:'天气预报',model:'模型估计'}[status(r)] || '待确认');
  const updated=r=>r?.updated_at || r?.updatedAt;
  const sources=r=>Array.isArray(r?.sources)?r.sources.filter(s=>s&&typeof s==='object'):[];
  function node(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;if(typeof content==='string'&&/待确认|待接入|未找到可靠记载|存在不同说法|无可靠依据/.test(content))n.setAttribute('data-trust-state','unverified');return n;}
  function safeUrl(raw){try{const u=new URL(raw,window.location?.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function dated(r){return typeof updated(r)==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(updated(r))&&Number.isFinite(Date.parse(updated(r)));}
  function evidence(r){return ['maintained','live'].includes(status(r))&&dated(r)&&sources(r).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(status(s))&&safeUrl(s.source_url));}
  const usableRecord=r=>evidence(r)&&typeof r?.text==='string'&&!!r.text.trim();
  function emptyBlock(title,content){
    const block=node('details','node-empty');block.append(node('summary','',title),node('p','',content));return block;
  }
  function provenance(r,label='史料来源'){
    const d=node('details','node-sources');d.append(node('summary','',label+' · '+sources(r).length+' 条'));
    if(dated(r))d.append(node('p','','资料整理：'+updated(r)));
    sources(r).forEach(s=>{
      const row=node('p',''),url=safeUrl(s.source_url), title=text(s.title)+' · 来源等级 '+(['A','B','C'].includes(s.source_level)?s.source_level:'待确认');
      if(url){const a=node('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}else row.append(node('span','',title+' · 链接待确认'));
      row.append(node('span','',' · 资料状态：'+statusLabel(s)));
      if(s.source_level==='C')row.append(node('strong','node-unverified',' C 级可信度不足，不能作为史实依据。'));
      d.append(row);
    });return d;
  }
  function recordBlock(title,record,kind){
    const usable=usableRecord(record);
    if(!usable)return null;
    const block=node('section','node-evidence '+kind);
    block.append(node('h4','',title));
    block.append(node('p','node-evidence-label',kind==='node-research'?'现代研究解读 · 观点归属论文作者':kind==='node-inference'?'合理推断 · 非史料原文':kind==='node-literature'?'文学表达 · 不等于历史事实':'史料记载'));
    block.append(node('p','',record.text));
    block.append(provenance(record,kind==='node-literature'?'文学文本来源':'史料来源'));return block;
  }
  function renderReading(){
    const chapter=context.chapter || {}, box=$('#node-reading-content');
    box.replaceChildren(node('h3','','建筑与历史资料'));
    const overview=context.place?.overview;
    if(overview?.text&&['maintained','live'].includes(status(overview))&&dated(overview)&&sources(overview).some(s=>safeUrl(s.source_url))){
      const clue=node('section','node-evidence node-clue');
      clue.append(node('h4','','地点文化线索'),node('p','node-evidence-label','旅游研究线索 · 不独立证明史实'),node('p','',overview.text),provenance(overview,'旅游研究来源'));box.append(clue);
    }
    const narrative={...chapter,text:['record','inference','literature','research'].includes(chapter.narrative_type)?chapter.story:''};
    const storyBlock=recordBlock('本章故事',narrative,chapter.narrative_type==='research'?'node-research':chapter.narrative_type==='inference'?'node-inference':chapter.narrative_type==='literature'?'node-literature':'node-history');
    if(storyBlock)box.append(storyBlock);
    if(text(chapter.reason)!=='待确认'||text(chapter.role)!=='待确认')box.append(node('p','','为什么值得看：'+text(chapter.reason)),node('p','','在故事里的位置：'+text(chapter.role)));
    if(mode==='学术探索版'){
      [['编纂背景',chapter.compilation],['人物关系',chapter.relationships]].forEach(([title,r])=>{const block=recordBlock(title,r,r?.narrative_type==='research'?'node-research':'node-history');if(block)box.append(block);});
    }
    if(mode==='亲子故事版')box.append(node('p','node-question','哪句话有史料依据，哪句话只是文学表达？可以和孩子聊聊。无法核实时，不替古人编台词。'));
    const inferences=Array.isArray(chapter.inferences)?chapter.inferences.filter(usableRecord):[];
    if(inferences.length)box.append(node('h3','','合理推断'));
    inferences.forEach(r=>box.append(recordBlock('合理推断',r,'node-inference')));
    $('#node-reading').hidden=box.children.length===1;
  }
  function changeMode(next){
    if(!context||!modes.includes(next)||mode===next)return;
    const reader=$('#node-view'),top=reader.scrollTop,pageTop=window.scrollY || 0;
    // 使用主面板保存阅读位置；较短模式允许浏览器按实际内容收敛滚动范围。
    $('#node-reading-content').style.minHeight='';
    mode=next;renderReading();reader.scrollTop=top;
    if(context.story){const s=window.StoryProgress.get(context.story);s.mode=mode;window.StoryProgress.save(context.story);}
    readings.set(readingKey,{top,mode,height:$('#node-reading-content').scrollHeight});window.scrollTo?.({top:pageTop,behavior:'instant'});window.CharacterChat?.refresh();
  }
  function comparison(){
    const chapter=context.chapter || {}, grid=$('#node-comparison');
    const history=chapter.history || context.place?.history;
    const blocks=[recordBlock('正史｜《三国志》及可靠史料',history,'node-history'),recordBlock('演义｜文学表达',chapter.romance,'node-literature')].filter(Boolean);
    grid.replaceChildren(...blocks);grid.hidden=!blocks.length;
    const title=$('#node-comparison-title');title.hidden=!blocks.length;
    title.textContent=usableRecord(history)&&usableRecord(chapter.romance)?'正史 × 演义':usableRecord(history)?'史籍中的人物与事件':'文学阅读';
    $('#node-compare').hidden=!blocks.length;
    const difference=$('#node-differences');
    const hasDifference=usableRecord(history)&&usableRecord(chapter.romance)&&usableRecord(chapter.differences);
    difference.replaceChildren(...(hasDifference?[recordBlock('两条叙事的差异',chapter.differences,'node-history')]:[]));difference.hidden=!hasDifference;
    const disputes=$('#node-disputes'),opinions=Array.isArray(chapter.disputes)?chapter.disputes.filter(usableRecord):[];
    disputes.replaceChildren(...(opinions.length?[node('h3','',opinions.length>1?'存在不同说法':'学术争议资料')]:[]));disputes.hidden=!opinions.length;
    opinions.forEach((r,i)=>disputes.append(recordBlock('说法 '+(i+1),r,r.narrative_type==='research'?'node-research':'node-history')));
  }
  function tourism(){
    const area=$('#node-tourism');area.replaceChildren(node('h3','','参观与出行'));
    const data=context.place.travel || {};
    [['ticket','票价'],['opening','开放时间'],['weather','天气']].forEach(([key,title])=>{
      const r=data[key],reference=status(r)==='reference'&&sources(r).some(s=>safeUrl(s.source_url))&&r.is_realtime===false;
      const live=status(r)==='live'&&evidence(r)&&typeof r?.tool_source==='string'&&r.tool_source.trim();
      const hasPrice=Number.isFinite(r?.price_min)&&Number.isFinite(r?.price_max)&&r.price_min>=0&&r.price_max>=r.price_min;
      if(key==='ticket'&&!(reference&&hasPrice||live&&Number.isFinite(r.amount)&&r.amount>0))return;
      if(key!=='ticket'&&!(reference||live)||key!=='ticket'&&!r?.text)return;
      const content=key==='ticket'?(reference?'参考票价：'+r.price_min+(r.price_max!==r.price_min?'—'+r.price_max:'')+' '+(r.unit||'元/人'):r.amount+' 元'):r.text;
      const card=node('article','node-travel-item');card.append(node('h4','',title),node('p','',content));
      if(key==='ticket'&&reference){card.append(node('p','',r.price_note));if(r.scope)card.append(node('p','','适用范围：'+r.scope));}
      if(r.updated_at&&Number.isFinite(Date.parse(r.updated_at)))card.append(node('p','','资料整理：'+r.updated_at));
      if(r.tool_source)card.append(node('p','','信息来源：'+r.tool_source));
      const links=sources(r).filter(s=>safeUrl(s.source_url));
      if(links.length){const d=node('details','node-sources');d.append(node('summary','','查看信息来源'));links.forEach(s=>{const a=node('a','',s.title||'参考页面');a.href=safeUrl(s.source_url);a.target='_blank';a.rel='noopener noreferrer';const p=node('p','');p.append(a);d.append(p);});card.append(d);}
      area.append(card);
    });
    const actions=node('div','module-actions');
    [['查询开放时间','请查询'+context.place.name+'的开放时间与参观安排，并给出资料来源。'],['查询天气与交通','请查询'+context.place.name+'所在地的天气，并帮我规划到这里的交通；先确认我的出发地点。']].forEach(([label,q])=>{const button=node('button','module-button',label);button.type='button';button.addEventListener('click',()=>window.SGTJourney.ask(q,{displayText:label+'：'+context.place.name}));actions.append(button);});
    area.append(actions);
  }
  function open(payload){
    if(!payload?.place)return false;
    if(context&&!$('#node-view').hidden)readings.set(readingKey,{top:$('#node-view').scrollTop,mode,height:$('#node-reading-content').scrollHeight});
    context={...payload,returnTo:payload.returnTo || payload.back || null};const {place,chapter,story}=context;
    $('#node-back').textContent=context.returnTo?'返回上一视图':'返回首页（来源未知）';
    const origins={welcome:'文化探索',story:'文化探索',map:'行旅地图',journal:'探索志',destinations:'目的地',planner:'活动计划',plan:'活动计划',travel:'活动计划',outing:'活动计划'};
    $('#node-origin').textContent='来自'+(origins[context.returnTo]||'未知来源')+' · 地点资料';
    readingKey=(story?.id||'unlinked')+':'+(context.index??'none')+':'+place.id;
    mode=(story?window.StoryProgress.get(story).mode:readings.get(readingKey)?.mode) || modes[0];
    $('#node-visual').replaceChildren(window.SGTStoryUI.icon(place.building));
    $('#node-title').textContent=place.name;
    $('#node-context').textContent=[place.city?'城市：'+place.city:'',story?.title?'故事：'+story.title:'',chapter?'第 '+(context.index+1)+' 幕 / '+chapter.name:'地点文化阅读'].filter(Boolean).join(' · ');
    $('#node-people').textContent=[chapter?.people?.length?'本章人物：'+list(chapter.people):'',chapter?.events?.length?'本章事件：'+list(chapter.events):''].filter(Boolean).join('；');
    $('#node-people').hidden=!$('#node-people').textContent;
    const locationNote=context.note || '地点待定位，不猜景区位置。';
    $('#node-coordinate').textContent=context.exact?'地图已提供地点位置，规划出行时请选择具体入口。':'到达路线请在高德地图中搜索并确认具体地点；阅读地图仅作区域示意。';
    $('#node-metadata').replaceChildren(node('p','node-material-summary','阅读本地点的文化介绍与相关史料，可展开来源查看文献。'),node('p','map-note','历史记载、现代研究与文学表达分别呈现；出行信息在活动计划中查询。'));
    if(sources(chapter).length)$('#node-metadata').append(provenance(chapter));
    $('#node-reading-content').style.minHeight='';renderReading();comparison();tourism();
    $('#node-add-route').disabled=!context.point;
    $('#node-add-route').textContent=context.point?(context.exact?'加入路线':'加入路线（驻地示意）'):'加入路线（待定位）';
    $('#node-feedback').textContent='史料不足时保留问题；AI讲解不作为已核验史实。';
    showContentView('node');window.CharacterChat?.refresh();$('#node-view').scrollTop=readings.get(readingKey)?.top || 0;$('#node-title').focus({preventScroll:true});return true;
  }
  function openPlace(id,{returnTo}={}){
    const place=window.SGT_PLACES.find(p=>p.id===id);if(!place)return false;
    const story=window.SGT_STORIES.find(s=>s.chapters.some(c=>c.placeId===id));
    const index=story?story.chapters.findIndex(c=>c.placeId===id):-1,chapter=story?.chapters[index];
    const located=window.StoryMap.describePlace(place,chapter || {placeId:id});
    return open({...located,story,chapter,index,returnTo});
  }
  $('#node-back').addEventListener('click',()=>showContentView(context?.returnTo || 'welcome'));
  $('#node-ask').addEventListener('click',()=>{
    if(!context)return;
    window.SGTJourney.ask('【故事章节讲解】文化节点：'+context.place.name+'；故事：'+(context.story?.title||'待关联')+'；章节：'+(context.chapter?.name||'待关联')+'；讲解模式：'+mode+'。请围绕同一地点与本章，'+(mode==='大众体验版'?'简洁说明这里是什么、为什么值得看。':mode==='亲子故事版'?'用孩子能理解的问题讲同一史实，不虚构古人对话。':'说明编纂背景、人物关系、不同观点与出处。')+'必须分段标明“史料记载”“文学表达”“合理推断”。C级来源不能支撑史实；无可靠资料明确说“当前资料中未找到可靠记载”。存在不同说法时并列来源，不编造引文。',{displayText:"请陈寿讲解"+context.place.name+"（"+window.SGTStoryUI.modeLabel(mode)+"）"});
    $('#node-feedback').textContent='已发给陈寿。回答或草稿在当前对话里，可展开来源了解依据。';
  });
  $('#node-compare').addEventListener('click',()=>{if($('#node-comparison-title').hidden)return;$('#node-comparison-title').focus({preventScroll:true});$('#node-comparison-title').scrollIntoView({block:'start',behavior:'instant'});});
  $('#node-add-route').addEventListener('click',()=>{if(!context?.point)return;$('#node-feedback').textContent=window.TravelMap.addStoryPlace(context.point)?'已加入路线；'+(context.exact?'景区入口请在出发前确认。':'仅县级驻地示意，不是景区入口。'):'该位置已在当前路线中。';});
  $('#node-view').addEventListener('scroll',()=>{if(context&&!$('#node-view').hidden)readings.set(readingKey,{top:$('#node-view').scrollTop,mode,height:$('#node-reading-content').scrollHeight});});
  window.StoryProgress?.subscribe?.(story=>{if(context?.story?.id===story.id)changeMode(window.StoryProgress.get(story).mode);});
  window.CulturalNode={getMode:()=>mode,getContext:()=>!$('#node-view').hidden?context:null,compare:()=>$('#node-compare').click(),open,openPlace,changeMode};
})();
