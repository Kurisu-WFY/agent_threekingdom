/* Chen Shou accompanies the existing session; no new transport or invented records. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), seen=new Map();
  let lastKey='', remembered={}, celebration=0, timer, narratedKey='';
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function portrait(){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 120 128');svg.setAttribute('class','historian-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label','陈寿史官插画，持书卷与印章，非历史肖像');
    const shape=(tag,attrs,parent=svg)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.append(n);return n;};
    shape('ellipse',{cx:61,cy:119,rx:43,ry:6,fill:'color-mix(in srgb,var(--ink) 12%,transparent)'});
    const body=shape('g',{class:'historian-body'});
    shape('path',{d:'M19 115Q15 66 59 63Q103 68 104 115Z',fill:'var(--jade)',stroke:'var(--jade-deep)','stroke-width':2},body);
    shape('path',{d:'M43 66L60 99L77 66L67 115H51Z',fill:'var(--brass-soft)'},body);
    shape('ellipse',{cx:60,cy:44,rx:27,ry:30,fill:'var(--portrait-skin)',stroke:'var(--brass-ink)','stroke-width':1.5},body);
    shape('path',{d:'M32 34L36 13Q60 4 84 13L88 34Q61 23 32 34ZM44 12V6H76V12',fill:'var(--ink)'},body);
    shape('path',{d:'M44 44Q49 41 53 44M68 44Q73 41 77 44',fill:'none',stroke:'var(--ink)','stroke-width':2,class:'historian-eyes'},body);
    shape('path',{d:'M51 58Q61 65 70 57M46 65Q60 88 75 65',fill:'none',stroke:'var(--ink-soft)','stroke-width':3,'stroke-linecap':'round'},body);
    shape('path',{d:'M25 79Q25 91 39 94M94 77L101 59',fill:'none',stroke:'var(--portrait-skin)','stroke-width':10,'stroke-linecap':'round',class:'historian-hand'},body);
    const book=shape('g',{class:'historian-book'},body);
    shape('path',{d:'M29 86L59 90L90 82V110L59 118L29 114Z',fill:'var(--brass-soft)',stroke:'var(--brass-ink)','stroke-width':2},book);
    shape('path',{d:'M59 91V116M35 91V109M42 92V110M49 94V112M67 93V109M75 90V107M83 88V105',fill:'none',stroke:'var(--brass-ink)','stroke-width':1.5},book);
    const map=shape('g',{class:'historian-map'},body);shape('path',{d:'M28 86L50 91L72 83L93 88V114L72 109L50 117L28 112Z',fill:'var(--paper)',stroke:'var(--jade)','stroke-width':2},map);shape('path',{d:'M37 102L47 96L61 106L79 96L87 99',fill:'none',stroke:'var(--shu)','stroke-width':2,'stroke-dasharray':'3 2'},map);
    const stamp=shape('g',{class:'historian-stamp'});shape('rect',{x:84,y:92,width:31,height:28,rx:3,fill:'var(--shu)'},stamp);const label=shape('text',{x:99,y:109,'text-anchor':'middle',fill:'var(--surface)','font-size':9},stamp);label.textContent='已寻迹';
    return svg;
  }
  function context(){const c=window.CharacterChat?.context?.()||{};if(c.story||c.place)remembered=c;return c.story||c.place?c:remembered;}
  function completed(c){const s=c.story&&window.StoryProgress?.get(c.story);const places=window.StoryMap?.getPlaces(c.story?.id)||window.SGT_PLACES||[];return s?[...s.completed].map(i=>{const chapter=c.story.chapters[i];return places.find(p=>p.id===chapter?.placeId)?.name||chapter?.name;}).filter(Boolean):[];}
  function refresh(){
    const c=context(), done=completed(c), mode=window.CharacterChat?.getMode()||'大众体验版';
    const chapter=c.chapter?.name?`第 ${(c.index??0)+1} 幕 · ${c.chapter.name}`:'章节待关联';
    const key=[c.story?.id,c.chapter?.name,c.place?.id,mode].join('|');
    if(narratedKey&&narratedKey!==[c.story?.id,c.chapter?.name,c.place?.id].join('|'))$('#guide-note').hidden=true;
    $('#guide-location').textContent=c.place?.name||c.story?.title||'尚未启程';
    $('#guide-context').textContent=[c.story?.title||'未选择故事线',chapter,c.place?.name||'地点待关联',mode,'已寻迹（本地手动记录，非实际到访证明）：'+(done.join('、')||'暂无')].join(' / ');
    if(lastKey&&lastKey!==key)$('#guide-transition').textContent='已接续：'+chapter+' · '+mode;
    lastKey=key;
    const chat=chats[active], pending=chat.messages.find(m=>m.pending), planning=pending&&/路线|半天|规划|时间/.test(pending.originalQuestion||pending.question||'');
    const state=pending?(planning?'planning':'research'):Date.now()<celebration?'complete':'idle';
    $('#chat-panel').dataset.guideState=state;$('#launcher').dataset.guideState=state;
    $('#historian-state').textContent={idle:'展卷相伴 · 有据说史，无据留白',research:'陈寿正在查阅史料',planning:'陈寿正在筹划故事路线',complete:'已寻迹 · 这一章记下了'}[state];
  }
  function action(label,fn){const b=node('button',label);b.type='button';b.className='module-button';b.addEventListener('click',fn);$('#guide-actions').append(b);}
  function narrate(c,finished=false){
    remembered=c;narratedKey=[c.story?.id,c.chapter?.name,c.place?.id].join('|');const chapters=c.story?.chapters||[],i=c.index??0,s=c.story&&window.StoryProgress?.get(c.story);
    const previous=chapters[i-1],next=chapters.find((_,j)=>j>i&&!s?.skipped.has(j)&&!s?.completed.has(j));
    $('#guide-note').hidden=false;$('#guide-note').open=true;
    const options=document.querySelector('.chat-options');if(options)options.open=true;
    const text=finished?'这一章“'+(c.chapter?.name||'当前节点')+'”已记为寻迹完成。'+(next?'下一卷可接“'+next.name+'”。':'本次选取中没有待继续的后续章节；可回故事查看跳过或未完成章节。'):(previous?'上章“'+previous.name+'”之后，':'我们从这里展卷。')+'现在来到“'+(c.chapter?.name||c.place?.name||'待关联章节')+'”。';
    const box=$('#guide-narration');box.replaceChildren(node('p',text));
    // Only records with explicit reliable provenance enter the factual layer.
    const record=c.chapter?.history;
    if(record?.text&&window.CharacterChat.reliable(record))box.append(window.CharacterChat.answer({persona:'陈寿',text:record.text,data:{evidence_segments:[{...record,type:'history'}]}}));
    else box.append(node('p','本章史料摘要：当前资料中未找到可靠记载。章节模板仅作行旅引导，不能代替史实。'));
    $('#guide-actions').replaceChildren();
    action('这一章有什么可靠史料？',()=>window.SGTJourney.ask('请讲解当前章节“'+(c.chapter?.name||c.place?.name||'待关联')+'”，列出可靠史料；缺资料请明确说明。'));
    action('正史与演义有何不同？',()=>window.SGTJourney.ask('当前章节的正史与演义有何不同？请保留当前地点，列出处。'));
    if(next)action('接着探索：'+next.name,async()=>{if(window.StoryMap.getContext()?.story?.id===c.story.id||await window.StoryMap.open(c.story.id))window.StoryMap.selectChapter(chapters.indexOf(next));});
    if(c.story&&c.chapter)action(s.completed.has(i)?'撤销本章已寻迹':'标记本章已寻迹',()=>{if(s.completed.has(i)){s.completed.delete(i);window.StoryProgress.save(c.story);narrate(c);}else{s.completed.add(i);window.StoryProgress.save(c.story);}});
    if(c.story)action('只有半天 · 选择保留章节',()=>window.SGTStoryUI.openStory(c.story.id,c.story));
    refresh();
  }
  function enter(c){if(!c)return;narrate(c);toggleChat(true);}
  function requestContext(text){const c=context();return ' 已寻迹节点（本地手动记录）：'+(completed(c).join('、')||'暂无')+'。'+(/半天|时间不够|只有.*小时/.test(text)?'围绕当前故事线“'+(c.story?.title||'未选择，先询问')+'”解释压缩取舍，保留已完成章节状态。核心章节由游客选择；使用 selection_reason 和各站 reason，缺少时长/推荐理由明确待核验，不能保证可行或擅自删章。':'');}
  (window.SGT_STORIES||[]).forEach(s=>seen.set(s.id,new Set(window.StoryProgress.get(s).completed)));
  window.StoryProgress?.subscribe(story=>{
    const s=window.StoryProgress.get(story),before=seen.get(story.id)||new Set(),added=[...s.completed].filter(i=>!before.has(i));seen.set(story.id,new Set(s.completed));
    if(added.length){const i=added[added.length-1],chapter=story.chapters[i],place=(window.StoryMap?.getPlaces(story.id)||window.SGT_PLACES||[]).find(p=>p.id===chapter.placeId);celebration=Date.now()+3500;narrate({story,chapter,place,index:i},true);clearTimeout(timer);timer=setTimeout(refresh,3500);}
    refresh();
  });
  $('#historian-portrait').append(portrait());const launch=$('#launcher');launch.querySelector('svg')?.remove();launch.prepend(portrait());
  window.ChenshouGuide={portrait,refresh,enter,requestContext,context};refresh();render();
})();
