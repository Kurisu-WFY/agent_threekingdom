/* 固定由陈寿讲解；文化主题推荐与向导身份分离。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const guideStyle='史官视角：审慎、简洁，先核对材料再解释，不虚构见闻。';
  const themes={
    '陈寿':{story:'chenshou',city:'南充市'},
    '诸葛亮':{story:'shudao-xunzong',city:'剑阁县'},
    '张飞':{story:'zhangfei',city:'阆中市'}
  };
  function node(tag,cls,text){const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;if(typeof text==='string'&&/待核验|待接入|未找到可靠记载|存在不同说法|无可靠依据/.test(text))n.setAttribute('data-trust-state','unverified');return n;}
  function button(text,fn){const n=node('button','module-button',text);n.type='button';n.addEventListener('click',fn);return n;}
  function portrait(){
    if(window.ChenshouGuide)return window.ChenshouGuide.portrait();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 80 90');svg.setAttribute('role','img');svg.setAttribute('aria-label','陈寿史官插画，非历史肖像');svg.setAttribute('class','character-portrait');
    const paths=['M10 84Q10 56 40 55Q70 56 70 84Z','M26 27Q25 13 40 13Q56 13 54 29L52 46Q40 60 28 46Z','M25 22V10H55V22ZM19 62H40V83H19ZM23 66H36M23 72H36'];
    paths.forEach((d,i)=>{const path=document.createElementNS(svg.namespaceURI||'http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class','portrait-layer layer-'+i);svg.append(path);});return svg;
  }
  function sync(chat){window.ChenshouGuide?.refresh();$('#character-notice').textContent=chat.characterNotice||'';$('#character-mode').value=getMode();}
  function context(){return window.CulturalNode?.getContext()||($('#story-view').hidden===false?window.SGTStoryUI?.getContext():null)||window.StoryMap?.getContext()||window.SGTStoryUI?.getContext()||{};}
  const modeMap={'大众体验版':'大众','亲子故事版':'亲子','学术探索版':'学术'};
  function getMode(){const story=context().story;if(!story&&window.CulturalNode?.getContext())return window.CulturalNode.getMode();return (story&&window.StoryProgress?window.StoryProgress.get(story).mode:chats[active].readingMode)||'大众体验版';}
  function backendMode(){return modeMap[getMode()]||'大众';}
  function normalizeHistory(history){
    // 旧失败消息只迁移向导元信息；保留问题、原回答和请求中的章节/模式快照。
    return history.map((entry,index)=>{
      if(typeof entry.content!=='string'||!/^【人物视角：[^】]+】/.test(entry.content))return entry;
      let content=entry.content.replace(/^【人物视角：[^】]+】/,'【人物视角：陈寿】');
      const mode=content.indexOf(' 讲解模式：');
      if(index===history.length-1&&entry.role==='user'&&mode>=0&&content.includes('这是AI人物解读，不是本人原话。'))content='【人物视角：陈寿】'+guideStyle+content.slice(mode);
      return {...entry,content};
    });
  }
  function setMode(mode){if(!modeMap[mode])return;const story=context().story;if(story&&window.StoryProgress){window.StoryProgress.get(story).mode=mode;window.StoryProgress.save(story);}else {chats[active].readingMode=mode;if(window.CulturalNode?.getContext())window.CulturalNode.changeMode(mode);}sync(chats[active]);}
  // 探索志优先使用请求中保存的操作；旧消息使用同一分类器。
  const isComparison=text=>/历史上|正史|演义|真是这样|史实/.test(String(text).split('\n')[0]);
  function prepare(chat,text){
    const userQuestion=text.split('\n')[0];
    const compare=isComparison(userQuestion);
    const discovered=!compare&&Object.keys(themes).find(name=>new RegExp('(?:想|要|希望).{0,4}了解'+name).test(userQuestion));
    const discover=Boolean(discovered), theme=discover?window.SGT_STORIES?.find(s=>s.id===themes[discovered].story):null, city=themes[discovered]?.city;
    if(discover){chat.characterNotice='已匹配“'+(theme?.title||'人物故事主题')+'”，地图预选'+city+'；阅读视图保持，可在回答中选择进入。';window.TravelMap?.focusMention(city,{reveal:false});}
    const persona='陈寿',c=context();
    const snapshot='【人物视角：'+persona+'】'+guideStyle+' 讲解模式：'+getMode()+'；当前故事线：'+(c.story?.title||'未选择')+'；当前章节：'+(c.chapter?.name||'未选择')+'；当前地点：'+(c.place?.name||'未选择')+'。';
    if(compare&&window.CulturalNode?.getContext())window.CulturalNode.compare();
    const rules='这是AI人物解读，不是本人原话。按问题需要区分史料、推断与演义，不机械输出空栏目；史料有出处时提供实际来源，C级不能独立支撑史实。不编造引文或把演义当亲历。背景只作辅助，当前用户问题优先，不要复述内部背景。';
    return {persona,discovered,storyId:c.story?.id,mode:backendMode(),context:snapshot+rules+(window.ChenshouGuide?.requestContext(text)||'')+(discover?' 请介绍“'+(theme?.title||'人物故事主题')+'”主题，说明章节和史料仍待补充，并询问游客可用时间（半天/一天/两天）。':''),question:text,preserveMap:compare||discover,action:discover?'discover':compare?'compare':null};
  }
  function url(raw){try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}}
  function sources(record){return Array.isArray(record?.sources)?record.sources.filter(s=>s&&typeof s==='object'):[];}
  function reliable(record){return ['maintained','live'].includes(record?.data_status)&&typeof record.updated_at==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(record.updated_at)&&Number.isFinite(Date.parse(record.updated_at))&&sources(record).some(s=>['A','B'].includes(s.source_level)&&['maintained','live'].includes(s.data_status)&&s.title&&url(s.source_url));}
  function placeInline(text){
    const inline=node('span'), places=(window.SGT_PLACES||[]).filter(item=>item&&typeof item.name==='string'&&item.name), names=[...new Set([...places.map(item=>item.name),'阆中','南充'])].sort((a,b)=>b.length-a.length);
    let rest=String(text||'');
    while(rest){const matches=names.map(name=>({name,index:rest.indexOf(name)})).filter(item=>item.index>=0).sort((a,b)=>a.index-b.index||b.name.length-a.name.length),hit=matches[0];if(!hit){inline.append(node('span','',rest));break;}if(hit.index)inline.append(node('span','',rest.slice(0,hit.index)));
      const place=places.find(item=>item.name===hit.name),located=place&&window.StoryMap?.describePlace?.(place,{placeId:place.id});
      if(place){const link=button(hit.name,()=>{const view=window.getContentView?.()||'welcome';window.CulturalNode.openPlace(place.id,{returnTo:view==='node'?(window.CulturalNode.getContext?.()?.returnTo||'welcome'):view});});link.className='character-place-link';link.title='查看地点资料';inline.append(link);}
      else inline.append(node('span','character-place-name',hit.name));
      rest=rest.slice(hit.index+hit.name.length);
    }
    return inline;
  }
  function placeText(text){
    const p=node('p');p.append(placeInline(window.AgentAnswer?.clean?window.AgentAnswer.clean(text):text));
    return p;
  }
  function answer(message){
    const box=node('div','character-answer');
    box.append(window.AgentAnswer?window.AgentAnswer.render(message.text,{decorateText:placeInline}):placeText(message.text));
    return box;
  }
  function actions(message){
    const box=node('div','character-actions');
    if(window.AmapChat?.hasMentions(message.text||'')||window.TravelMap?.hasMentions?.(message.text||''))box.append(button('在地图查看提及地点',()=>window.AmapChat?window.AmapChat.showMentions(message.text):window.TravelMap.showMentions(message.text,window.getContentView?.()||'welcome')));
    if(message.characterAction==='discover'&&themes[message.discovered]){const {story:id,city}=themes[message.discovered],title=window.SGT_STORIES?.find(s=>s.id===id)?.title||'人物故事主题';
      const question=String(message.originalQuestion||'');
      const durations=[...question.matchAll(/半天|一天|一日|两天|两日/g)].map(m=>({'一日':'一天','两日':'两天'}[m[0]]||m[0]));
      const explicit=/(?:^|[；;，,。\n])\s*(?:(?:可用时间|游玩时间|时间安排)[：:]\s*|我(?:有|只有|可用|打算用|计划用)\s*|只有\s*)(?:半天|一天|一日|两天|两日)(?:的?时间)?(?=[；;，,。\s]|$)/.test(question);
      const duration=explicit&&new Set(durations).size===1?durations[0]:null;
      box.append(node('p','',title+'：主题模板已匹配，章节与史料待补充。'+(duration?'已按'+duration+'考虑，可继续调整。':'你有半天、一天还是两天？')));box.append(button('进入'+title,()=>window.SGTStoryUI.openStory(id)),button('在地图中查看'+city.replace(/[市县]$/,''),()=>window.TravelMap.focusMention(city,{reveal:true})));}
    if(message.characterAction==='discover')box.append(node('p','','故事线推荐 · 你可以打开相关主题，路线不会自动修改。'));
    if(message.characterAction==='compare')box.append(node('p','', '正史 × 演义对照 · 保留当前章节与地点；缺少逐项出处时不判断真伪。'));
    if(message.storyId&&/半天|时间不够|只有.*小时/.test(message.originalQuestion||''))box.append(node('p','','想缩短行程，需要你选择保留哪些章节。现有章节的时长与推荐理由尚待核验，不保证半天可行。'),button('选好保留章节，重新画路线',()=>window.SGTStoryUI.openStory(message.storyId)));
    return box;
  }
  $('#character-mode').addEventListener('change',()=>setMode($('#character-mode').value));
  window.CharacterChat={context,refresh:()=>sync(chats[active]),sync,portrait,prepare,answer,actions,reliable,isComparison,getMode,setMode,backendMode,normalizeHistory};window.StoryProgress?.subscribe(()=>sync(chats[active]));sync(chats[active]);
})();
