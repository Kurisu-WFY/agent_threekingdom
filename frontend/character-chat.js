/* Perspective and evidence presentation over the existing /chat conversation. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), missing='当前资料中未找到可靠记载';
  const profiles={
    '陈寿':{style:'史官视角：审慎、简洁，先核对材料再解释，不虚构见闻。',basis:'史料依据摘要待核验；可从《三国志》的编纂与记载入手，具体引文和出处待补充。',story:'chenshou'},
    '诸葛亮':{style:'筹划者视角：条理清楚，讨论选择与条件，不虚构本人动机和原话。',basis:'史料依据摘要待核验；可从《三国志》相关传记入手，具体引文和出处待补充。',story:'shudao-xunzong'},
    '张飞':{style:'守城者视角：直率、朴实，不以演义性格代替历史人物，不虚构亲历。',basis:'史料依据摘要待核验；可从《三国志》相关传记入手，具体引文和出处待补充。',story:'zhangfei'}
  };
  function node(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;}
  function button(text,fn){const n=node('button','module-button',text);n.type='button';n.addEventListener('click',fn);return n;}
  function portrait(name){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 80 90');svg.setAttribute('role','img');svg.setAttribute('aria-label',name+'人物视角插画，非历史肖像');svg.setAttribute('class','character-portrait');
    const paths=['M10 84Q10 56 40 55Q70 56 70 84Z','M26 27Q25 13 40 13Q56 13 54 29L52 46Q40 60 28 46Z',name==='陈寿'?'M25 22V10H55V22ZM19 62H40V83H19ZM23 66H36M23 72H36':name==='诸葛亮'?'M23 24L28 8L42 13L55 8L58 24ZM54 79L65 48M65 48Q40 43 50 29Q59 26 63 41Q65 18 73 30Q81 45 65 48':'M23 24Q40 2 57 24L54 29H26ZM27 44L30 58L40 65L50 58L53 44M18 64L40 78L62 64'];
    paths.forEach((d,i)=>{const path=document.createElementNS(svg.namespaceURI||'http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class','portrait-layer layer-'+i);svg.append(path);});return svg;
  }
  function sync(chat){$('#character-notice').textContent='AI 人物解读 · 非人物原话 · 对话仅本页保留';const name=profiles[chat.persona]?chat.persona:'陈寿';$('#character-select').value=name;const box=$('#character-card');box.replaceChildren(portrait(name),node('strong','',name+' · '+profiles[name].style),node('p','',profiles[name].basis));const story=window.SGT_STORIES?.find(s=>s.id===profiles[name].story);if(story)box.append(button('相关主题：'+story.title,()=>window.SGTStoryUI.openStory(story.id)));}
  function context(){return window.CulturalNode?.getContext()||window.StoryMap?.getContext()||window.SGTStoryUI?.getContext()||{};}
  function prepare(chat,text){
    const userQuestion=text.split('\n')[0];
    const compare=/历史上|正史|演义|真是这样|史实/.test(userQuestion);
    const discover=!compare && /(?:想|要|希望).{0,4}了解张飞/.test(userQuestion);
    if(discover){chat.persona='张飞';if(window.StoryMap?.isActive())window.StoryMap.exit();window.SGTStoryUI?.openStory('zhangfei');window.TravelMap?.focusMention('阆中市');}
    const persona=profiles[chat.persona]?chat.persona:'陈寿',c=context();
    const snapshot='【人物视角：'+persona+'】'+profiles[persona].style+' 当前故事线：'+(discover?'镇守阆中·寻迹张飞':c.story?.title||'未选择')+'；当前章节：'+(c.chapter?.name||'未选择')+'；当前地点：'+(discover?'阆中市（县级示意）':c.place?.name||'未选择')+'。';
    if(compare&&window.CulturalNode?.getContext())window.CulturalNode.compare();
    const rules='这是AI人物解读，不是本人原话。分段使用【史料记载】【合理推断】【演义】【无依据】；史料逐项提供出处和来源等级，C级不能支撑史实。无可靠资料说“'+missing+'”。不能编造引文或把演义当亲历。';
    return {persona,context:snapshot+rules+(discover?' 请介绍“镇守阆中·寻迹张飞”主题，说明章节和史料仍待补充，并询问游客可用时间（半天/一天/两天）。':''),question:text,preserveMap:compare||discover,action:discover?'discover':compare?'compare':null};
  }
  function url(raw){try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function sources(record){return Array.isArray(record?.sources)?record.sources.filter(s=>s&&typeof s==='object'):[];}
  function reliable(record){return ['maintained','live'].includes(record?.data_status)&&typeof record.updated_at==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(record.updated_at)&&Number.isFinite(Date.parse(record.updated_at))&&sources(record).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(s.data_status)&&s.title&&url(s.source_url));}
  function provenance(record){const d=node('details','character-sources');d.append(node('summary','','展开来源 · '+(record?.data_status||'待核验')),node('p','','更新时间：'+(record?.updated_at||'待核验')));if(!sources(record).length)d.append(node('p','','来源待核验'));sources(record).forEach(s=>{const u=url(s.source_url),a=node(u?'a':'span','',s.title||'标题待核验');if(u){a.href=u;a.target='_blank';a.rel='noopener noreferrer';}d.append(a,node('p','','来源等级：'+(['A','B','C'].includes(s.source_level)?s.source_level:'待核验')+' · data_status：'+(s.data_status||'待核验')+(s.source_level==='C'?' · C级可信度不足，不能作为史实依据。':'')));});return d;}
  function answer(message){
    const box=node('div','character-answer'+(message.characterAction==='compare'?' character-comparison':''));box.append(node('strong','',message.persona+'视角 · AI解读，非人物原话'));
    const records=Array.isArray(message.data?.evidence_segments)?message.data.evidence_segments.filter(r=>r&&typeof r==='object'):[];
    // Only explicit inference/literature labels can be extracted from prose, never promoted to historical evidence.
    if(!records.length){const parts=message.text.split(/【(史料记载|合理推断|演义|无依据)】/);for(let i=1;i<parts.length;i+=2){if(['合理推断','演义'].includes(parts[i])&&parts[i+1]?.trim())records.push({type:parts[i]==='演义'?'romance':'inference',text:parts[i+1].trim(),data_status:'pending'});}}
    const historic=records.filter(r=>r?.type==='history'&&typeof r.text==='string'&&reliable(r)&&!/(三国演义|演义情节)/.test(r.text));
    const section=(label,text,cls)=>{const s=node('section','character-evidence '+cls);s.append(node('h4','',label),node('p','',text));box.append(s);return s;};
    if(!historic.length)section('史料记载 · 无可靠依据',missing,'unverified').append(provenance(message.data));
    historic.forEach(r=>section('史料记载',r.text,'history').append(provenance(r)));
    records.filter(r=>r&&['inference','romance'].includes(r.type)&&typeof r.text==='string').forEach(r=>section(r.type==='inference'?'合理推断 · 非史料原文':'演义 · 文学表达，不是亲历史实',r.text,r.type).append(provenance(r)));
    // Labels in model prose cannot establish provenance. Keep the original available but outside the factual layer.
    const raw=node('details','character-raw');raw.append(node('summary','','查看后端原回答 · 未逐项核验，可能含推断或演义'),node('p','',message.text),provenance(message.data));box.append(raw);
    if(!records.some(r=>r?.type==='inference'))section('合理推断','尚无已分层的推断内容；原回答中的推测不作为史实。','inference');
    if(!records.some(r=>r?.type==='romance'))section('演义对照','尚无可靠的逐项对照；文学情节不能作为人物亲历。','romance');
    if(message.characterAction==='discover'){section('故事线推荐','镇守阆中·寻迹张飞：主题模板已匹配，章节与史料待补充。你有半天、一天还是两天？','story');box.append(button('进入镇守阆中·寻迹张飞',()=>window.SGTStoryUI.openStory('zhangfei')));}
    if(message.characterAction==='compare')box.append(node('p','', '正史 × 演义对照 · 保留当前章节与地点；缺少逐项出处时不判断真伪。'));
    const places=(window.SGT_PLACES||[]).filter(p=>message.text.includes(p.name));
    places.forEach(p=>{const located=window.StoryMap?.describePlace?.(p,{placeId:p.id});if(located?.point){box.append(button('地图定位：'+p.name+' · '+(located.exact?'核验位置':'县级示意'),()=>window.TravelMap.focusStoryPoint(located.point)),button('加入路线：'+p.name,()=>window.TravelMap.addStoryPlace(located.point)));}else box.append(node('p','',p.name+' · 坐标待核验，暂不能定位'));box.append(button('查看地点：'+p.name,()=>window.CulturalNode.openPlace(p.id)),button('为'+p.name+'规划路线',()=>window.SGTJourney.ask('请规划到'+p.name+'的路线；先询问可用时间、出发地和交通方式。')));});
    if(message.text.includes('阆中'))box.append(button('定位阆中 · 县级示意',()=>window.TravelMap.focusMention('阆中市')));
    return box;
  }
  function selectPersona(name){if(!profiles[name])return;chats[active].persona=name;sync(chats[active]);}
  $('#character-select').addEventListener('change',()=>{selectPersona($('#character-select').value);$('#character-notice').textContent='已切换为'+chats[active].persona+'；故事、章节与地点保持。已发请求仍使用发出时的人物。';});
  window.CharacterChat={selectPersona,sync,portrait,prepare,answer,reliable};sync(chats[active]);
})();
