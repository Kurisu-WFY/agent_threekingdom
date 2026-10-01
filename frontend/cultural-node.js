/* 文化阅读以证据为依据，不把缺失的数据编造成历史叙述。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), missing='当前资料中未找到可靠记载';
  const modes=['大众体验版','亲子故事版','学术探索版'], readings=new Map();
  let context=null, mode=modes[0], readingKey='', modeButtons=[];
  const text=v=>typeof v==='string'&&v.trim()?v.trim():'待核验';
  const list=v=>Array.isArray(v)&&v.length?v.map(text).join('、'):'待核验';
  const status=r=>r?.data_status || r?.dataStatus;
  const updated=r=>r?.updated_at || r?.updatedAt;
  const sources=r=>Array.isArray(r?.sources)?r.sources.filter(s=>s&&typeof s==='object'):[];
  function node(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;if(typeof content==='string'&&/待核验|待接入|未找到可靠记载|存在不同说法|无可靠依据/.test(content))n.setAttribute('data-trust-state','unverified');return n;}
  function safeUrl(raw){try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function dated(r){return typeof updated(r)==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(updated(r))&&Number.isFinite(Date.parse(updated(r)));}
  function evidence(r){return ['maintained','live'].includes(status(r))&&dated(r)&&sources(r).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(status(s))&&safeUrl(s.source_url));}
  function provenance(r,label='史料来源'){
    const d=node('details','node-sources');d.append(node('summary','',label+' · '+sources(r).length+' 条'));
    d.append(node('p','','资料状态：'+text(status(r))+' · 更新时间：'+(dated(r)?updated(r):'待核验')+(evidence(r)?'':' · 待核验')));
    if(!sources(r).length)d.append(node('p','','来源待核验。'));
    sources(r).forEach(s=>{
      const row=node('p',''),url=safeUrl(s.source_url), title=text(s.title)+' · 来源等级 '+(['A','B','C'].includes(s.source_level)?s.source_level:'待核验');
      if(url){const a=node('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}else row.append(node('span','',title+' · 链接待核验'));
      row.append(node('span','',' · 资料状态：'+text(status(s))));
      if(s.source_level==='C')row.append(node('strong','node-unverified',' C 级可信度不足，不能作为史实依据。'));
      d.append(row);
    });return d;
  }
  function recordBlock(title,record,kind){
    const block=node('section','node-evidence '+kind);block.append(node('h4','',title));
    const usable=evidence(record)&&typeof record?.text==='string'&&record.text.trim();
    block.append(node('p','node-evidence-label',kind==='node-inference'?'合理推断 · 非史料原文':kind==='node-literature'?'文学表达 · 不等于历史事实':'史料记载'));
    block.append(node('p','',usable?record.text:missing));
    block.append(provenance(record));return block;
  }
  function renderReading(){
    const chapter=context.chapter || {}, box=$('#node-reading-content');
    const headings={ '大众体验版':'先读懂这里', '亲子故事版':'带着一个问题看这里', '学术探索版':'从证据与编纂背景读这一章' };
    box.replaceChildren(node('h3','',headings[mode]));
    box.append(node('p','',mode==='大众体验版'?'先看这里是什么、为什么值得看，再联系当前故事。':mode==='亲子故事版'?'亲子共读：这一幕讲到谁？眼前建筑和故事有什么关系？请从下方同一组资料里找答案；没有记载就保留问题。':'依次核对史料出处、编纂背景、人物关系与不同观点；区分记载、文学和推断。'));
    const narrative={...chapter,text:['record','inference','literature'].includes(chapter.narrative_type)?chapter.story:''};
    box.append(recordBlock('本章故事',narrative,chapter.narrative_type==='inference'?'node-inference':chapter.narrative_type==='literature'?'node-literature':'node-history'));
    box.append(node('p','','为什么值得看：'+text(chapter.reason)),node('p','','在故事里的位置：'+text(chapter.role)));
    if(mode==='学术探索版')box.append(recordBlock('编纂背景',chapter.compilation,'node-history'),recordBlock('人物关系',chapter.relationships,'node-history'));
    if(mode==='亲子故事版')box.append(node('p','node-question','一起想一想：哪句话有史料依据？哪句话只是文学表达？无法核实时，不替古人编台词。'));
    const inferences=Array.isArray(chapter.inferences)?chapter.inferences:[];
    box.append(node('h3','','合理推断'));
    if(!inferences.length)box.append(node('p','node-inference','合理推断：暂无有依据的推断内容，不用推测填空。'));
    inferences.forEach(r=>box.append(recordBlock('合理推断',r,'node-inference')));
    $('#node-mode-status').textContent='当前为'+mode+'；同一故事、章节与地点，阅读位置保留。';
    modeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===mode)));
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
    difference.replaceChildren(node('h3','','两条叙事的差异'),node('p','',evidence(chapter.history)&&evidence(chapter.romance)&&evidence(chapter.differences)?text(chapter.differences.text):'当前资料不足，无法核验具体差异；文学情节不能作为历史事实。'),provenance(chapter.differences));
    const disputes=$('#node-disputes'),opinions=Array.isArray(chapter.disputes)?chapter.disputes:[];
    disputes.replaceChildren(node('h3','',opinions.length>1?'存在不同说法':'学术争议资料'));
    if(!opinions.length)disputes.append(node('p','','当前资料中未找到可靠记载；不能据此断言不存在争议。'));
    opinions.forEach((r,i)=>disputes.append(recordBlock('说法 '+(i+1),r,'node-history')));
  }
  function tourism(){
    const area=$('#node-tourism');area.replaceChildren(node('h3','','出行信息 · 与历史史料分开核验'));
    const data=context.place.travel || {};
    [['ticket','票价'],['opening','开放时间'],['weather','天气']].forEach(([key,title])=>{
      const r=data[key],valid=status(r)==='live'&&evidence(r)&&typeof r?.tool_source==='string'&&r.tool_source.trim();
      const content=valid&&(key!=='ticket'||Number.isFinite(r.amount)&&r.amount>0)?(key==='ticket'?r.amount+' 元':text(r.text)):'请以景区公告为准';
      const card=node('article','node-travel-item');card.append(node('h4','',title),node('p','',content),node('p','','更新时间：'+(dated(r)?updated(r):'待核验')),node('p','','工具来源：'+text(r?.tool_source)),provenance(r,'旅游信息来源'));area.append(card);
    });
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
    $('#node-context').textContent='城市：'+text(place.city)+' · 故事线：'+(story?.title || '待关联')+' · '+(chapter?'第 '+(context.index+1)+' 幕 / '+chapter.name:'章节待关联');
    $('#node-people').textContent='本章人物：'+list(chapter?.people)+'；本章事件：'+list(chapter?.events);
    $('#node-coordinate').textContent=context.exact?'景区坐标有来源；入口和道路导航仍待核验。':'坐标待核验 · '+(context.note || '地点待定位，不猜景区位置。');
    $('#node-metadata').replaceChildren(node('p','node-unverified','史料标签：'+text(status(chapter))+(evidence(chapter)?' · 来源见下方':' · 待核验')),provenance(chapter));
    $('#node-reading-content').style.minHeight=readings.get(readingKey)?.height?readings.get(readingKey).height+'px':'';renderReading();comparison();tourism();
    $('#node-enter-story').disabled=!story;$('#node-add-route').disabled=!context.point;
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
  modes.forEach(name=>{const b=node('button','module-button',name);b.type='button';b.addEventListener('click',()=>changeMode(name));modeButtons.push(b);$('#node-modes').append(b);});
  $('#node-back').addEventListener('click',()=>showContentView(context?.returnTo || 'welcome'));
  $('#node-enter-story').addEventListener('click',()=>{if(context?.story)window.SGTStoryUI.openStory(context.story.id,context.story);});
  $('#node-ask').addEventListener('click',()=>{
    if(!context)return;
    window.CharacterChat?.selectPersona('陈寿');
    window.SGTJourney.ask('【故事章节讲解】文化节点：'+context.place.name+'；故事线：'+(context.story?.title||'待关联')+'；章节：'+(context.chapter?.name||'待关联')+'；讲解模式：'+mode+'。请围绕同一地点与本章，'+(mode==='大众体验版'?'简洁说明这里是什么、为什么值得看。':mode==='亲子故事版'?'用孩子能理解的问题讲同一史实，不虚构古人对话。':'说明编纂背景、人物关系、不同观点与出处。')+'必须分段标明“史料记载”“文学表达”“合理推断”。C级来源不能支撑史实；无可靠资料明确说“当前资料中未找到可靠记载”。存在不同说法时并列来源，不编造引文。');
    $('#node-feedback').textContent='已交给陈寿；回答或草稿在现有对话中，资料仍需核验。';
  });
  $('#node-compare').addEventListener('click',()=>{$('#node-comparison-title').focus({preventScroll:true});$('#node-comparison-title').scrollIntoView({block:'start',behavior:'instant'});});
  $('#node-add-route').addEventListener('click',()=>{if(!context?.point)return;$('#node-feedback').textContent=window.TravelMap.addStoryPlace(context.point)?'已加入路线；'+(context.exact?'景区入口仍待核验。':'仅县级驻地示意，不是景区入口。'):'该位置已在当前路线中。';});
  $('#node-reading').addEventListener('scroll',()=>{if(context&&!$('#node-view').hidden)readings.set(readingKey,{top:$('#node-reading').scrollTop,mode,height:$('#node-reading-content').scrollHeight});});
  window.StoryProgress?.subscribe?.(story=>{if(context?.story?.id===story.id)changeMode(window.StoryProgress.get(story).mode);});
  window.CulturalNode={getMode:()=>mode,getContext:()=>!$('#node-view').hidden?context:null,compare:()=>$('#node-compare').click(),open,openPlace,changeMode};
})();
