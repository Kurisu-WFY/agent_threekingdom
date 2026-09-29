/* 在现有 /chat 会话中展示人物视角和证据。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), missing='当前资料中未找到可靠记载';
  const profiles={
    '陈寿':{style:'史官视角：审慎、简洁，先核对材料再解释，不虚构见闻。',basis:'史料依据摘要待核验；可从《三国志》的编纂与记载入手，具体引文和出处待补充。',story:'chenshou'},
    '诸葛亮':{style:'筹划者视角：条理清楚，讨论选择与条件，不虚构本人动机和原话。',basis:'史料依据摘要待核验；可从《三国志》相关传记入手，具体引文和出处待补充。',story:'shudao-xunzong'},
    '张飞':{style:'守城者视角：直率、朴实，不以演义性格代替历史人物，不虚构亲历。',basis:'史料依据摘要待核验；可从《三国志》相关传记入手，具体引文和出处待补充。',story:'zhangfei'}
  };
  function node(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;if(typeof text==='string'&&/待核验|待接入|未找到可靠记载|存在不同说法|无可靠依据/.test(text))n.setAttribute('data-trust-state','unverified');return n;}
  function button(text,fn){const n=node('button','module-button',text);n.type='button';n.addEventListener('click',fn);return n;}
  function portrait(name){
    if(name==='陈寿'&&window.ChenshouGuide)return window.ChenshouGuide.portrait();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 80 90');svg.setAttribute('role','img');svg.setAttribute('aria-label',name+'人物视角插画，非历史肖像');svg.setAttribute('class','character-portrait');
    const paths=['M10 84Q10 56 40 55Q70 56 70 84Z','M26 27Q25 13 40 13Q56 13 54 29L52 46Q40 60 28 46Z',name==='陈寿'?'M25 22V10H55V22ZM19 62H40V83H19ZM23 66H36M23 72H36':name==='诸葛亮'?'M23 24L28 8L42 13L55 8L58 24ZM54 79L65 48M65 48Q40 43 50 29Q59 26 63 41Q65 18 73 30Q81 45 65 48':'M23 24Q40 2 57 24L54 29H26ZM27 44L30 58L40 65L50 58L53 44M18 64L40 78L62 64'];
    paths.forEach((d,i)=>{const path=document.createElementNS(svg.namespaceURI||'http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class','portrait-layer layer-'+i);svg.append(path);});return svg;
  }
  function sync(chat){window.ChenshouGuide?.refresh();$('#character-notice').textContent=chat.characterNotice||'';$('#character-mode').value=getMode();const name=profiles[chat.persona]?chat.persona:'陈寿';$('#character-select').value=name;const box=$('#character-card');box.replaceChildren(portrait(name),node('strong','',name+' · '+profiles[name].style),node('p','',profiles[name].basis));const story=window.SGT_STORIES?.find(s=>s.id===profiles[name].story);if(story)box.append(button('相关主题：'+story.title,()=>window.SGTStoryUI.openStory(story.id)));}
  function context(){return window.CulturalNode?.getContext()||($('#story-view').hidden===false?window.SGTStoryUI?.getContext():null)||window.StoryMap?.getContext()||window.SGTStoryUI?.getContext()||{};}
  const modeMap={'大众体验版':'大众','亲子故事版':'亲子','学术探索版':'学术'};
  function getMode(){const story=context().story;if(!story&&window.CulturalNode?.getContext())return window.CulturalNode.getMode();return (story&&window.StoryProgress?window.StoryProgress.get(story).mode:chats[active].readingMode)||'大众体验版';}
  function backendMode(){return modeMap[getMode()]||'大众';}
  function setMode(mode){if(!modeMap[mode])return;const story=context().story;if(story&&window.StoryProgress){window.StoryProgress.get(story).mode=mode;window.StoryProgress.save(story);}else {chats[active].readingMode=mode;if(window.CulturalNode?.getContext())window.CulturalNode.changeMode(mode);}sync(chats[active]);}
  // 探索志优先使用请求中保存的操作；旧消息使用同一分类器。
  const isComparison=text=>/历史上|正史|演义|真是这样|史实/.test(String(text).split('\n')[0]);
  function prepare(chat,text){
    const userQuestion=text.split('\n')[0];
    const compare=isComparison(userQuestion);
    const discovered=!compare&&Object.keys(profiles).find(name=>new RegExp('(?:想|要|希望).{0,4}了解'+name).test(userQuestion));
    const discover=Boolean(discovered), theme=discover?window.SGT_STORIES?.find(s=>s.id===profiles[discovered].story):null, city={'陈寿':'南充市','诸葛亮':'剑阁县','张飞':'阆中市'}[discovered];
    if(discover){chat.characterNotice='已匹配“'+(theme?.title||'人物故事主题')+'”，地图预选'+city+'；当前人物与阅读视图保持，可在回答中选择进入。';window.TravelMap?.focusMention(city,{reveal:false});}
    const persona=profiles[chat.persona]?chat.persona:'陈寿',c=context();
    const snapshot='【人物视角：'+persona+'】'+profiles[persona].style+' 讲解模式：'+getMode()+'；当前故事线：'+(c.story?.title||'未选择')+'；当前章节：'+(c.chapter?.name||'未选择')+'；当前地点：'+(c.place?.name||'未选择')+'。';
    if(compare&&window.CulturalNode?.getContext())window.CulturalNode.compare();
    const rules='这是AI人物解读，不是本人原话。按问题需要区分史料、推断与演义，不机械输出空栏目；史料有出处时提供实际来源，C级不能独立支撑史实。不编造引文或把演义当亲历。背景只作辅助，当前用户问题优先，不要复述内部背景。';
    return {persona,discovered,storyId:c.story?.id,mode:backendMode(),context:snapshot+rules+(window.ChenshouGuide?.requestContext(text)||'')+(discover?' 请介绍“'+(theme?.title||'人物故事主题')+'”主题，说明章节和史料仍待补充，并询问游客可用时间（半天/一天/两天）。':''),question:text,preserveMap:compare||discover,action:discover?'discover':compare?'compare':null};
  }
  function url(raw){try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function sources(record){return Array.isArray(record?.sources)?record.sources.filter(s=>s&&typeof s==='object'):[];}
  function reliable(record){return ['maintained','live'].includes(record?.data_status)&&typeof record.updated_at==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(record.updated_at)&&Number.isFinite(Date.parse(record.updated_at))&&sources(record).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(s.data_status)&&s.title&&url(s.source_url));}
  function provenance(record){const d=node('details','character-sources');d.append(node('summary','','展开来源 · '+(record?.data_status||'待核验')),node('p','','更新时间：'+(record?.updated_at||'待核验')));if(!sources(record).length)d.append(node('p','','来源待核验'));sources(record).forEach(s=>{const u=url(s.source_url),a=node(u?'a':'span','',s.title||'标题待核验');if(u){a.href=u;a.target='_blank';a.rel='noopener noreferrer';}d.append(a,node('p','','来源等级：'+(['A','B','C'].includes(s.source_level)?s.source_level:'待核验')+' · data_status：'+(s.data_status||'待核验')+(s.source_level==='C'?' · C级可信度不足，不能作为史实依据。':'')));});return d;}
  function placeInline(text){
    const inline=node('span'), places=(window.SGT_PLACES||[]).filter(item=>item&&typeof item.name==='string'&&item.name), names=[...new Set([...places.map(item=>item.name),'阆中','南充'])].sort((a,b)=>b.length-a.length);
    let rest=String(text||'');
    while(rest){const matches=names.map(name=>({name,index:rest.indexOf(name)})).filter(item=>item.index>=0).sort((a,b)=>a.index-b.index||b.name.length-a.name.length),hit=matches[0];if(!hit){inline.append(node('span','',rest));break;}if(hit.index)inline.append(node('span','',rest.slice(0,hit.index)));
      const place=places.find(item=>item.name===hit.name),located=place&&window.StoryMap?.describePlace?.(place,{placeId:place.id});
      const link=button(hit.name,()=>{if(located?.point)window.TravelMap.focusStoryPoint(located.point);else if(place)window.CulturalNode.openPlace(place.id);else window.TravelMap.focusMention(hit.name+'市');});link.className='character-place-link';link.title=place?(located?.point?'在地图查看 · '+(located.exact?'核验位置':'县级驻地示意'):'坐标待核验 · 查看地点资料'):'在地图查看 · '+(hit.name==='南充'?'市州范围示意':'县级驻地示意');inline.append(link);rest=rest.slice(hit.index+hit.name.length);
    }
    return inline;
  }
  function placeText(text){
    const p=node('p');p.append(placeInline(window.AgentAnswer?.clean?window.AgentAnswer.clean(text):text));
    return p;
  }
  function answer(message){
    const box=node('div','character-answer'+(message.characterAction==='compare'?' character-comparison':''));box.append(node('strong','',message.persona+'视角 · AI解读，非人物原话'));
    // 智能体正文不属于旧的 evidence_segments 结构，应直接按正文展示，
    // 不凭空补充缺失的证据、路线几何信息或检索失败状态。
    if(message.data?.generation?.kind==='nuwax'&&window.AgentAnswer){
      box.append(window.AgentAnswer.render(message.text,{decorateText:placeInline}));
      const evidence=node('details','character-sources');evidence.append(node('summary','','来源与数据说明'),node('p','','回答中的来源由智能体提供，尚未逐项核验；未返回结构化来源不代表知识库没有命中。'),provenance(message.data));box.append(evidence);
    } else {
    const records=Array.isArray(message.data?.evidence_segments)?message.data.evidence_segments.filter(r=>r&&typeof r==='object'):[];
    // 只提取正文中明确标注的推断或文学内容，不将其提升为史实证据。
    if(!records.length){const parts=message.text.split(/【(史料记载|合理推断|演义|无依据)】/);for(let i=1;i<parts.length;i+=2){if(['合理推断','演义'].includes(parts[i])&&parts[i+1]?.trim())records.push({type:parts[i]==='演义'?'romance':'inference',text:parts[i+1].trim(),data_status:'pending'});}}
    const historic=records.filter(r=>r?.type==='history'&&typeof r.text==='string'&&reliable(r)&&!/(三国演义|演义情节)/.test(r.text));
    const section=(label,text,cls)=>{const s=node('section','character-evidence '+cls);s.append(node('h4','',label),placeText(text));box.append(s);return s;};
    const isNuwax=message.data?.generation?.kind==='nuwax';
    if(!historic.length)section(isNuwax?'来源核验提示':'史料记载 · 无可靠依据',isNuwax?'智能体回答尚未提供前端可核验的逐项来源字段；不代表知识库没有命中。':missing,'unverified').append(provenance(message.data));
    historic.forEach(r=>section('史料记载',r.text,'history').append(provenance(r)));
    records.filter(r=>r&&['inference','romance'].includes(r.type)&&typeof r.text==='string').forEach(r=>section(r.type==='inference'?'合理推断 · 非史料原文':'演义 · 文学表达，不是亲历史实',r.text,r.type).append(provenance(r)));
    // 模型正文中的标签不能证明来源；保留原文，但不纳入史实层。
    const raw=node('details','character-raw');if(isNuwax||window.AgentAnswer)raw.setAttribute('open','');raw.append(node('summary','',isNuwax?'智能体回答 · 来源未逐项核验':'查看后端原回答 · 未逐项核验，可能含推断或演义'),window.AgentAnswer?window.AgentAnswer.render(message.text,{decorateText:placeInline}):placeText(message.text),provenance(message.data));box.append(raw);
    if(!records.some(r=>r?.type==='inference'))section('合理推断','尚无已分层的推断内容；原回答中的推测不作为史实。','inference');
    if(!records.some(r=>r?.type==='romance'))section('演义对照','尚无可靠的逐项对照；文学情节不能作为人物亲历。','romance');
    }
    if(message.characterAction==='discover'){const name=profiles[message.discovered]?message.discovered:'张飞',id=profiles[name].story,title=window.SGT_STORIES?.find(s=>s.id===id)?.title||'人物故事主题',city={'陈寿':'南充市','诸葛亮':'剑阁县','张飞':'阆中市'}[name];box.append(node('p','',title+'：主题模板已匹配，章节与史料待补充。你有半天、一天还是两天？'));box.append(button('进入'+title,()=>window.SGTStoryUI.openStory(id)),button('在地图中查看'+city.replace(/[市县]$/,''),()=>window.TravelMap.focusMention(city)),button('切换到'+name+'视角',()=>selectPersona(name)));}
    if(message.characterAction==='discover')box.append(node('p','','故事线推荐 · 选择进入相关主题，不自动修改路线。'));
    if(message.characterAction==='compare')box.append(node('p','', '正史 × 演义对照 · 保留当前章节与地点；缺少逐项出处时不判断真伪。'));
    if(message.storyId&&/半天|时间不够|只有.*小时/.test(message.originalQuestion||''))box.append(node('p','','压缩需由你选择保留章节；现有章节的时长与推荐理由尚待核验，不保证半天可行。'),button('选择保留章节并重绘路线',()=>window.SGTStoryUI.openStory(message.storyId)));
    const places=(window.SGT_PLACES||[]).filter(p=>message.text.includes(p.name));
    places.forEach(p=>{const located=window.StoryMap?.describePlace?.(p,{placeId:p.id});if(located?.point){box.append(button('地图定位：'+p.name+' · '+(located.exact?'核验位置':'县级示意'),()=>window.TravelMap.focusStoryPoint(located.point)),button('加入路线：'+p.name,()=>window.TravelMap.addStoryPlace(located.point)));}else box.append(node('p','',p.name+' · 坐标待核验，暂不能定位'));box.append(button('查看地点：'+p.name,()=>window.CulturalNode.openPlace(p.id)),button('为'+p.name+'规划路线',()=>window.SGTJourney.ask('请规划到'+p.name+'的路线；先询问可用时间、出发地和交通方式。')));});
    if(message.text.includes('阆中'))box.append(button('定位阆中 · 县级示意',()=>window.TravelMap.focusMention('阆中市')));
    return box;
  }
  function selectPersona(name){if(!profiles[name])return;chats[active].persona=name;chats[active].characterNotice='已切换为'+name+'；故事、章节与地点保持。已发请求仍使用发出时的人物。';sync(chats[active]);}
  $('#character-select').addEventListener('change',()=>{selectPersona($('#character-select').value);$('#character-notice').textContent='已切换为'+chats[active].persona+'；故事、章节与地点保持。已发请求仍使用发出时的人物。';});
  $('#character-mode').addEventListener('change',()=>setMode($('#character-mode').value));
  window.CharacterChat={context,refresh:()=>sync(chats[active]),selectPersona,sync,portrait,prepare,answer,reliable,isComparison,getMode,setMode,backendMode};window.StoryProgress?.subscribe(()=>sync(chats[active]));sync(chats[active]);
})();
