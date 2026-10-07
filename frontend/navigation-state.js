/* URL仅保存公开阅读位置，不保存个人活动条件或对话。 */
(() => {
  const allowed=new Set(['welcome','story','map','destinations','planner','plan','journal','outing','travel']);
  let restoring=false, ready=Boolean(window.SGT_STORIES?.[0]?.chapters.length), waiting=null, lastApplied=null;
  const notice=text=>{document.querySelector('#navigation-status').textContent=text;};
  function write(replace=false){
    if(restoring)return;
    let view=window.getContentView(),context;
    if(view==='node'){context=window.CulturalNode?.getContext?.();view=context?.returnTo||'welcome';}
    if(view==='story')context=window.SGTStoryUI.getContext();
    else if(view==='map')context=window.StoryMap?.getContext?.();
    const hash=new URLSearchParams({view});
    if(context?.story?.id&&['story','map'].includes(view)){hash.set('story',context.story.id);hash.set('chapter',String(context.index||0));}
    const value='#'+hash.toString();lastApplied=value;if(location.hash!==value)history[replace?'replaceState':'pushState'](null,'',value);
  }
  async function restore(){
    if(lastApplied===location.hash)return;
    const raw=location.hash.slice(1),params=raw.includes('=')?new URLSearchParams(raw):new URLSearchParams({view:raw||'welcome'}),view=params.get('view');
    const storyId=params.get('story'),chapterRaw=params.get('chapter');
    if(!allowed.has(view)){fallback('无效视图，已返回文化探索。');return;}
    const story=storyId&&window.SGT_STORIES.find(s=>s.id===storyId);
    if(storyId&&!story){fallback('故事不存在，已返回文化探索。');return;}
    if(storyId&&!ready){waiting=location.hash;notice('正在加载分享链接的故事章节…');return;}
    waiting=null;restoring=true;
    try{
      notice('');
      if(['story','map'].includes(view)&&story){
        const chapter=chapterRaw===null?0:Number(chapterRaw),valid=/^\d+$/.test(chapterRaw??'0')&&Number.isInteger(chapter)&&chapter>=0&&chapter<story.chapters.length;
        const index=valid?chapter:0;if(!valid)notice('章节无效或越界，已安全回到第一章；未改变已寻迹记录。');
        if(view==='map'&&story.chapters.length){await window.StoryMap.open(story.id,{preview:true,index});}
        else{window.SGTStoryUI.openStory(story.id);window.SGTStoryUI.selectReading(index);}
      }else if(view==='story')window.SGTStoryUI.openStory(window.SGT_STORIES[0].id);
      else window.showContentView(view);
    }finally{restoring=false;write(true);}
  }
  function fallback(message){waiting=null;restoring=true;window.showContentView('welcome');restoring=false;notice(message);write(true);}
  window.SGTNavigation={write,restore,contentReady(){ready=true;if(waiting===location.hash)restore();}};
  window.addEventListener('hashchange',restore);window.addEventListener('popstate',restore);
  restore();
})();
