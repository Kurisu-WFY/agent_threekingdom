/* 根据实际章节标记和用户消息生成浏览器本地探索志。 */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), key='sgt.journal.questions.v1', limit=200;
  const owned=new Set(), messages=new WeakMap(), tabs=[], titles=['卷一 · 山河足迹','卷二 · 人物与疑问','卷三 · 未竟之旅'];
  let questions=[], available=true, damaged=false, page=0, serial=0;
  const session=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  try {
    const raw=JSON.parse(window.localStorage.getItem(key)||'[]');
    if(!Array.isArray(raw))throw new Error('invalid journal');
    const ids=new Set();questions=raw.filter(r=>r&&typeof r.id==='string'&&!ids.has(r.id)&&ids.add(r.id)&&typeof r.text==='string'&&r.text.trim()).slice(-limit).map(r=>({id:r.id,text:r.text.slice(0,5000),persona:['陈寿','诸葛亮','张飞'].includes(r.persona)?r.persona:null,comparison:r.comparison===true,recordedAt:typeof r.recordedAt==='string'&&Number.isFinite(Date.parse(r.recordedAt))?r.recordedAt:null}));
  } catch(_){available=false;damaged=true;}
  function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function button(text,fn){const b=node('button','module-button',text);b.type='button';b.addEventListener('click',fn);return b;}
  function persist(){try{window.localStorage.setItem(key,JSON.stringify(questions));available=true;damaged=false;}catch(_){available=false;}}
  function sync(chats){
    const live=[];
    chats.forEach(chat=>(chat.messages||[]).forEach((m,i)=>{
      if(m.role!=='user'||typeof m.text!=='string'||!m.text.trim())return;
      let r=messages.get(m);
      if(!r){r={id:session+'-'+(++serial),text:m.text,persona:m.persona||null,comparison:chat.messages[i+1]?.characterAction === 'compare' || (!chat.messages[i+1]?.characterAction && Boolean(window.CharacterChat?.isComparison(m.text))),recordedAt:new Date().toISOString()};messages.set(m,r);owned.add(r.id);}
      live.push(r);
    }));
    const next=[...questions.filter(r=>!owned.has(r.id)),...live].sort((a,b)=>(a.recordedAt||'').localeCompare(b.recordedAt||'')).slice(-limit);
    if(JSON.stringify(next)!==JSON.stringify(questions)){questions=next;persist();}
    render();
  }
  const names=xs=>(Array.isArray(xs)?xs:[]).map(x=>typeof x==='string'?x:typeof x?.name==='string'?x.name:'').filter(x=>x&&x!=='待核验'&&x!=='待补充');
  const associations={chenshou:['陈寿','史书编纂'],zhangfei:['张飞'], 'shudao-xunzong':['诸葛亮','古道与关隘'], 'history-to-place':['建筑与遗址'], 'official-history':['正史与演义']};
  const themes=[['正史与演义',/正史|演义|史实|历史上/],['史书编纂',/陈寿|三国志|编纂/],['古道与关隘',/蜀道|剑门|米仓|关隘|古道/],['建筑与遗址',/建筑|遗址|古城|祠|万卷楼/]];
  function model(){
    const stories=(window.SGT_STORIES||[]).map(story=>({story,state:window.StoryProgress.get(story),total:story.chapters?.length||0}));
    const explored=new Map(),people=new Set(),events=new Set(),interests=new Map();
    const count=k=>interests.set(k,(interests.get(k)||0)+1);
    const analyze=text=>{['陈寿','诸葛亮','张飞'].forEach(n=>{if(text.includes(n))count(n);});themes.forEach(([n,re])=>{if(re.test(text))count(n);});};
    stories.forEach(({story,state})=>state.completed.forEach(i=>{const ch=story.chapters[i];if(!ch)return;const place=window.SGT_PLACES?.find(p=>p.id===ch.placeId);if(place)explored.set(place.id,{place,chapter:ch});names(ch.people).forEach(n=>people.add(n));names(ch.events).forEach(n=>events.add(n));analyze([ch.name,...names(ch.people),...names(ch.events)].join(' '));}));
    questions.forEach(q=>analyze(q.text));
    const completed=stories.filter(x=>x.total>0&&x.state.completed.size===x.total),pending=stories.filter(x=>!completed.includes(x));
    const ranked=[...interests].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const candidates=pending.map(x=>({...x,matches:(associations[x.story.id]||[]).filter(k=>interests.has(k))}));
    candidates.sort((a,b)=>b.matches.reduce((s,k)=>s+interests.get(k),0)-a.matches.reduce((s,k)=>s+interests.get(k),0)||Number(a.state.started)-Number(b.state.started)||Number(b.total>0)-Number(a.total>0));
    const next=candidates[0];let reason='';
    if(next){reason=next.matches.length?'你的本地提问或已完成章节涉及“'+next.matches.join('、')+'”，可接着探索这个相关主题。':completed.length?'你已记录完成“'+completed.map(x=>x.story.title).join('、')+'”；这里是尚未完成的另一条故事线，可以继续拓展。':(next.total?'目前没有足够的兴趣记录，先推荐已有章节框架的主题作为起点。':'目前没有足够的兴趣记录，可以先浏览一个尚未探索的主题。');if(!next.total)reason+=' 这条线仍是主题模板，章节与史料待补充。';}
    return {stories,completed,pending,explored:[...explored.values()],people:[...people],events:[...events],ranked,next,reason,started:stories.some(x=>x.state.started||x.state.completed.size)};
  }
  function heading(box,title){box.append(node('h2','',title));}
  function storyRow(box,x){
    const {story,state,total}=x,row=node('section','journal-story');row.append(node('h3','',story.title));
    row.append(node('p','',total?'第 '+(state.started||state.completed.size?state.current+1:0)+' / '+total+' 幕 · 已寻迹 '+state.completed.size+' / '+total+' 幕':'章节待补充 · 尚不能计算完成进度'));
    const scroll=node('div','journal-scroll');scroll.setAttribute('aria-label','已完成 '+state.completed.size+' / '+total+' 幕');
    (story.chapters||[]).forEach((c,i)=>scroll.append(node('span','journal-seal'+(state.completed.has(i)?' complete':''),(i+1)+' · '+(state.completed.has(i)?'已寻迹':state.skipped.has(i)?'本次跳过':'待探索'))));row.append(scroll);
    row.append(button('继续阅读',()=>window.SGTStoryUI.openStory(story.id)));box.append(row);
  }
  function footprints(box,m){
    heading(box,'地图足迹与已探索节点');box.append(node('p','','仅来自你标为“已寻迹”的章节；县级驻地是位置示意，缺坐标不绘制精确点。'));
    if(!m.explored.length){box.append(node('p','journal-empty-line','尚无已探索的建筑、遗址或古道。完成章节后，足迹会写在这里。'));return;}
    const points=[];
    m.explored.forEach(({place,chapter})=>{const located=window.StoryMap?.describePlace(place,chapter),row=node('div','journal-place');row.append(window.SGTStoryUI.icon(place.building),node('span','',place.name+' · '+(located?.point?located.exact?'来源已核验，入口待确认':'位置示意 / 待定位':'坐标待核验')));if(located?.point){points.push({...located.point,label:place.name,exact:located.exact});row.append(button('在地图中查看',()=>window.TravelMap.focusStoryPoint(located.point)));}row.append(button('重读这个节点',()=>window.CulturalNode.openPlace(place.id,{returnTo:'journal'})));box.append(row);});
    if(!points.length)return;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','journal-footprints');svg.setAttribute('role','img');svg.setAttribute('aria-label','已寻迹章节的地理位置示意，不是到访轨迹或道路导航');
    const xy=points.map(p=>window.MapRouteCore.project(p.center)),xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]);const x=Math.min(...xs)-65,y=Math.min(...ys)-45,w=Math.max(...xs)-x+100,h=Math.max(...ys)-y+65;svg.setAttribute('viewBox',[x,y,w,h].join(' '));
    (window.TravelMap?.getGeometry?.()?.cities||[]).forEach(city=>{const path=document.createElementNS(ns,'path');path.setAttribute('d',city.d);path.setAttribute('class','journal-region');svg.append(path);});
    points.forEach((p,i)=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',xy[i][0]);dot.setAttribute('cy',xy[i][1]);dot.setAttribute('r',4);const t=document.createElementNS(ns,'text');t.setAttribute('x',xy[i][0]+8);t.setAttribute('y',xy[i][1]-8+i%2*26);t.textContent=p.label+(p.exact?'':'（驻地示意）');svg.append(dot,t);});box.append(svg,node('p','','底图沿用现有四川地图资料；印记表示章节的关联位置，不是GPS轨迹。'));
  }
  function render(){
    const m=model(),book=$('#journal-book');book.replaceChildren(node('p','journal-page-kicker',titles[page]));
    $('#journal-local-notice').textContent=window.StoryProgress.notice()+' 问题记录'+(available?'保存在此浏览器本地，最多保留最近200条；删除本页会话会同步移除对应提问，撤销可恢复。':damaged?'读取失败或存储不可用，当前问题仅本页保留；没有补造旧记录。':'存储不可用，当前问题仅本页保留。');
    const empty=$('#journal-empty');empty.replaceChildren();if(!m.started){empty.append(node('h2','','你还没有开始第一段旅程'),node('p','','从一个人物、一处古道或一个疑问出发。亲手记下第一幕，书页就会留下你的印章。'),button('开始探索故事线',()=>showContentView('story')));}
    if(page===0){heading(book,'完成过的故事线');if(!m.completed.length)book.append(node('p','','还没有整条完成的故事线，未走完的章节也值得保留。'));m.completed.forEach(x=>storyRow(book,x));heading(book,'正在写下的旅程');const begun=m.pending.filter(x=>x.state.started||x.state.completed.size);if(!begun.length)book.append(node('p','','暂无进行中的旅程。'));begun.forEach(x=>storyRow(book,x));footprints(book,m);}
    if(page===1){heading(book,'已解锁的人物与事件');book.append(node('p','','人物与事件来自已完成章节的 people / events 字段，完成相应章节后可在这里回顾；提问或切换人物不会自动记为完成。'),node('p','','人物（'+m.people.length+'）：'+(m.people.join('、')||'完成章节后记录相关人物')),node('p','','事件（'+m.events.length+'）：'+(m.events.join('、')||'完成章节后记录相关事件')));heading(book,'曾经问过的三国');if(!questions.length)book.append(node('p','','你还没有留下问题。向陈寿、诸葛亮或张飞提问，疑问也会成为旅程的一部分。'));[...questions].reverse().forEach(q=>{const row=node('section','journal-question');row.append(node('span','journal-seal',q.comparison?'正史 × 演义探索':'文化提问'),node('p','',q.text),node('small','', '记录时间：'+(q.recordedAt||'待确认')+(q.persona?' · '+q.persona+'视角':'')));book.append(row);});heading(book,'最感兴趣的人物与文化主题');book.append(node('p','','按最近200条本地问题及已完成章节中的关键词出现次数统计；每条同一关键词最多计一次，非历史事实或人物关系判断。'));if(!m.ranked.length)book.append(node('p','','尚无足够的本地兴趣记录。'));m.ranked.forEach(([n,count])=>book.append(node('p','journal-interest',n+' · '+count+' 条相关记录')));}
    if(page===2){heading(book,'待探索的故事线');if(!m.pending.length)book.append(node('p','','当前已知故事线均已记录完成，可以重读章节，等待新的主题。'));m.pending.forEach(x=>storyRow(book,x));book.append(node('p','','下一次旅行仍需核验出发地、可用时间、交通和景区信息；探索志不会把主题模板当成可执行路线。'));}
    tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===page)));$('#journal-page-number').textContent='第 '+(page+1)+' / 3 页';$('#journal-prev').disabled=page===0;$('#journal-next').disabled=page===2;
    const next=$('#journal-recommendation');next.replaceChildren(node('h2','','下一条故事线推荐'));if(m.next)next.append(node('h3','',m.next.story.title),node('p','',m.reason),button('翻开下一段故事',()=>window.SGTStoryUI.openStory(m.next.story.id)));else next.append(node('p','','暂无未完成主题。你可以重读旧章，继续留下新的问题。'));
  }
  function turn(next){if(next<0||next>=titles.length)return;page=next;render();$('#journal-book').setAttribute('tabindex','-1');$('#journal-book').focus({preventScroll:true});$('#journal-book').scrollIntoView?.({block:'start',behavior:'instant'});}
  titles.forEach((title,i)=>{const b=button(title,()=>turn(i));tabs.push(b);$('#journal-pages').append(b);});
  $('#journal-prev').addEventListener('click',()=>turn(page-1));$('#journal-next').addEventListener('click',()=>turn(page+1));
  window.ExplorationJournal={sync,model,render};window.StoryProgress.subscribe(render);sync(chats);
  window.TravelMap?.ready?.then(()=>render());
})();
