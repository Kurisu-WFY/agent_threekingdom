/* 文化阅读以证据为依据，不把缺失的数据编造成历史叙述。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), missing='当前资料中未找到可靠记载';
  const modes=['大众体验版','亲子故事版','学术探索版'], readings=new Map();
  let context=null, mode=modes[0], readingKey='';
  const text=v=>typeof v==='string'&&v.trim()?v.trim():'待核验';
  const list=v=>Array.isArray(v)&&v.length?v.map(text).join('、'):'待核验';
  const status=r=>r?.data_status || r?.dataStatus;
  const statusLabel=r=>({pending:'待核验',maintained:'维护资料',live:'实时查询',sample:'示例资料',stale:'已过期',forecast:'天气预报',model:'模型估计'}[status(r)] || '待核验');
  const updated=r=>r?.updated_at || r?.updatedAt;
  const sources=r=>Array.isArray(r?.sources)?r.sources.filter(s=>s&&typeof s==='object'):[];
  function node(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;if(typeof content==='string'&&/待核验|待接入|未找到可靠记载|存在不同说法|无可靠依据/.test(content))n.setAttribute('data-trust-state','unverified');return n;}
  function safeUrl(raw){try{const u=new URL(raw,window.location?.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function dated(r){return typeof updated(r)==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(updated(r))&&Number.isFinite(Date.parse(updated(r)));}
  function evidence(r){return ['maintained','live'].includes(status(r))&&dated(r)&&sources(r).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(status(s))&&safeUrl(s.source_url));}
  const usableRecord=r=>evidence(r)&&typeof r?.text==='string'&&!!r.text.trim();
  function emptyBlock(title,content){
    const block=node('details','node-empty');block.append(node('summary','',title),node('p','',content));return block;
  }
  function provenance(r,label='史料来源'){
    const d=node('details','node-sources');d.append(node('summary','',label+' · '+sources(r).length+' 条'));
    d.append(node('p','','资料状态：'+statusLabel(r)+'；当前显示：资料条目；待确认项：'+(evidence(r)?'具体内容与时效':'出处与内容依据')+'；更新时间：'+(dated(r)?updated(r):'未提供')));
    if(!sources(r).length)d.append(node('p','','来源待核验。'));
    sources(r).forEach(s=>{
      const row=node('p',''),url=safeUrl(s.source_url), title=text(s.title)+' · 来源等级 '+(['A','B','C'].includes(s.source_level)?s.source_level:'待核验');
      if(url){const a=node('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}else row.append(node('span','',title+' · 链接待核验'));
      row.append(node('span','',' · 资料状态：'+statusLabel(s)));
      if(s.source_level==='C')row.append(node('strong','node-unverified',' C 级可信度不足，不能作为史实依据。'));
      d.append(row);
    });return d;
  }
  function recordBlock(title,record,kind){
    const usable=usableRecord(record);
    const block=node(usable?'section':'details','node-evidence '+kind+(usable?'':' node-empty'));
    block.append(node(usable?'h4':'summary','',title+(usable?'':' · 资料待补充')));
    block.append(node('p','node-evidence-label',kind==='node-research'?'现代研究解读 · 观点归属论文作者':kind==='node-inference'?'合理推断 · 非史料原文':kind==='node-literature'?'文学表达 · 不等于历史事实':'史料记载'));
    block.append(node('p','',usable?record.text:kind==='node-literature'?'尚未补充可核对的文学文本/版本出处':missing));
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
    box.append(recordBlock('本章故事',narrative,chapter.narrative_type==='research'?'node-research':chapter.narrative_type==='inference'?'node-inference':chapter.narrative_type==='literature'?'node-literature':'node-history'));
    if(text(chapter.reason)!=='待核验'||text(chapter.role)!=='待核验')box.append(node('p','','为什么值得看：'+text(chapter.reason)),node('p','','在故事里的位置：'+text(chapter.role)));
    else box.append(emptyBlock('章节说明 · 资料待补充','章节与地点的关联、参观理由仍需资料支持。'));
    if(mode==='学术探索版')box.append(recordBlock('编纂背景',chapter.compilation,chapter.compilation?.narrative_type==='research'?'node-research':'node-history'),recordBlock('人物关系',chapter.relationships,chapter.relationships?.narrative_type==='research'?'node-research':'node-history'));
    if(mode==='亲子故事版')box.append(node('p','node-question','哪句话有史料依据，哪句话只是文学表达？可以和孩子聊聊。无法核实时，不替古人编台词。'));
    const inferences=Array.isArray(chapter.inferences)?chapter.inferences:[];
    if(inferences.length)box.append(node('h3','','合理推断'));
    else box.append(emptyBlock('合理推断 · 资料待补充','暂无有依据的推断内容，不用推测填空。'));
    inferences.forEach(r=>box.append(recordBlock('合理推断',r,'node-inference')));
  }
  function changeMode(next){
    if(!context||!modes.includes(next)||mode===next)return;
    const reader=$('#node-reading'),top=reader.scrollTop,pageTop=window.scrollY || 0;
    // 保持阅读区域足够高，避免较短模式限制原有滚动位置。
    $('#node-reading-content').style.minHeight=$('#node-reading-content').scrollHeight+'px';
    mode=next;renderReading();reader.scrollTop=top;
    if(context.story){const s=window.StoryProgress.get(context.story);s.mode=mode;window.StoryProgress.save(context.story);}
    readings.set(readingKey,{top,mode,height:$('#node-reading-content').scrollHeight});window.scrollTo?.({top:pageTop,behavior:'instant'});window.CharacterChat?.refresh();
  }
  function comparison(){
    const chapter=context.chapter || {}, grid=$('#node-comparison');
    grid.replaceChildren(recordBlock('正史｜《三国志》及可靠史料',chapter.history,'node-history'),recordBlock('演义｜文学表达',chapter.romance,'node-literature'));
    const difference=$('#node-differences');
    const hasDifference=usableRecord(chapter.history)&&usableRecord(chapter.romance)&&usableRecord(chapter.differences);
    difference.replaceChildren(hasDifference?recordBlock('两条叙事的差异',chapter.differences,'node-history'):emptyBlock('两条叙事的差异 · 资料待补充','当前资料不足，无法核验具体差异；文学情节不能作为历史事实。'));
    if(!hasDifference&&sources(chapter.differences).length)difference.children[0].append(provenance(chapter.differences));
    const disputes=$('#node-disputes'),opinions=Array.isArray(chapter.disputes)?chapter.disputes:[];
    disputes.replaceChildren(...(opinions.length?[node('h3','',opinions.length>1?'存在不同说法':'学术争议资料')]:[emptyBlock('学术争议 · 资料待补充','当前资料中未找到可靠记载；不能据此断言不存在争议。')]));
    opinions.forEach((r,i)=>disputes.append(recordBlock('说法 '+(i+1),r,r.narrative_type==='research'?'node-research':'node-history')));
  }
  function tourism(){
    const area=$('#node-tourism');area.replaceChildren(node('h3','','出行信息 · 与历史史料分开核验'));
    const data=context.place.travel || {};
    const unavailable=emptyBlock('票价、开放时间与天气 · 待实时查询','出行信息请以景区公告及实时工具为准，不由历史材料推定。');
    let missingCount=0;
    [['ticket','票价'],['opening','开放时间'],['weather','天气']].forEach(([key,title])=>{
      const r=data[key],valid=status(r)==='live'&&evidence(r)&&typeof r?.tool_source==='string'&&r.tool_source.trim();
      const content=valid&&(key!=='ticket'||Number.isFinite(r.amount)&&r.amount>0)?(key==='ticket'?r.amount+' 元':text(r.text)):(key==='weather'?'尚未查询所在地天气，可查询预报；景区开放另查公告':'请以景区公告为准');
      const card=node('article','node-travel-item');card.append(node('h4','',title),node('p','',content),node('p','','更新时间：'+(dated(r)?updated(r):'待核验')),node('p','','工具来源：'+text(r?.tool_source)),provenance(r,'旅游信息来源'));
      if(valid&&(key!=='ticket'||Number.isFinite(r.amount)&&r.amount>0))area.append(card);
      else {missingCount++;unavailable.append(card);}
    });
    if(missingCount){unavailable.children[0].textContent='查看待查询的出行资料（'+missingCount+'项）';area.append(unavailable);}
  }
  function open(payload){
    if(!payload?.place)return false;
    if(context&&!$('#node-view').hidden)readings.set(readingKey,{top:$('#node-reading').scrollTop,mode,height:$('#node-reading-content').scrollHeight});
    context={...payload,returnTo:payload.returnTo || payload.back || null};const {place,chapter,story}=context;
    $('#node-back').textContent=context.returnTo?'返回上一视图':'返回首页（来源未知）';
    const origins={welcome:'文化探索',story:'文化探索',map:'行旅地图',journal:'探索志',destinations:'目的地',planner:'活动计划',plan:'活动计划',travel:'活动计划',outing:'活动计划'};
    $('#node-origin').textContent='来自'+(origins[context.returnTo]||'未知来源')+' · 地点资料';
    readingKey=(story?.id||'unlinked')+':'+(context.index??'none')+':'+place.id;
    mode=(story?window.StoryProgress.get(story).mode:readings.get(readingKey)?.mode) || modes[0];
    $('#node-visual').replaceChildren(window.SGTStoryUI.icon(place.building));
    $('#node-title').textContent=place.name;
    $('#node-context').textContent='城市：'+text(place.city)+' · 故事：'+(story?.title || '待关联')+' · '+(chapter?'第 '+(context.index+1)+' 幕 / '+chapter.name:'章节待关联');
    $('#node-people').textContent=chapter?.people?.length||chapter?.events?.length?'本章人物：'+list(chapter?.people)+'；本章事件：'+list(chapter?.events):'本章人物与事件资料待补充。';
    const locationNote=(context.note || '地点待定位，不猜景区位置。').replace(/^坐标待核验(?:\s*\/\s*景区待定位)?\s*·\s*/, '');
    $('#node-coordinate').textContent='当前显示：'+(context.exact?'有来源的景区坐标':locationNote)+'；待确认项：景区入口与道路导航；资料状态：坐标待核验；更新时间：'+(dated(place)?updated(place):'未提供');
    const narrative={...chapter,text:['record','inference','literature','research'].includes(chapter?.narrative_type)?chapter.story:''};
    const absent=[['本章故事',narrative],['正史',chapter?.history],['文学',chapter?.romance]].filter(([,r])=>!usableRecord(r)).map(([label])=>label);
    $('#node-metadata').replaceChildren(node('p','node-material-summary',absent.length?'资料概况：'+absent.join('、')+'尚缺可靠材料，缺资料的部分已收起，展开后可以查看核验说明。':'资料概况：已有来源的正文在下方，可以逐项核对出处。'),node('p','map-note','正史以可靠史料为据；文学不等于历史事实；合理推断须有依据；实时出行信息单独查询核验。'));
    if(sources(chapter).length)$('#node-metadata').append(provenance(chapter));
    $('#node-reading-content').style.minHeight=readings.get(readingKey)?.height?readings.get(readingKey).height+'px':'';renderReading();comparison();tourism();
    $('#node-add-route').disabled=!context.point;
    $('#node-add-route').textContent=context.point?(context.exact?'加入路线':'加入路线（驻地示意）'):'加入路线（待定位）';
    $('#node-feedback').textContent='史料不足时保留问题；AI讲解不作为已核验史实。';
    showContentView('node');window.CharacterChat?.refresh();$('#node-reading').scrollTop=readings.get(readingKey)?.top || 0;$('#node-title').focus({preventScroll:true});return true;
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
    $('#node-feedback').textContent='已发给陈寿。回答或草稿在当前对话里，资料仍需核验。';
  });
  $('#node-compare').addEventListener('click',()=>{$('#node-comparison-title').focus({preventScroll:true});$('#node-comparison-title').scrollIntoView({block:'start',behavior:'instant'});});
  $('#node-add-route').addEventListener('click',()=>{if(!context?.point)return;$('#node-feedback').textContent=window.TravelMap.addStoryPlace(context.point)?'已加入路线；'+(context.exact?'景区入口仍待核验。':'仅县级驻地示意，不是景区入口。'):'该位置已在当前路线中。';});
  $('#node-reading').addEventListener('scroll',()=>{if(context&&!$('#node-view').hidden)readings.set(readingKey,{top:$('#node-reading').scrollTop,mode,height:$('#node-reading-content').scrollHeight});});
  window.StoryProgress?.subscribe?.(story=>{if(context?.story?.id===story.id)changeMode(window.StoryProgress.get(story).mode);});
  window.CulturalNode={getMode:()=>mode,getContext:()=>!$('#node-view').hidden?context:null,compare:()=>$('#node-compare').click(),open,openPlace,changeMode};
})();
