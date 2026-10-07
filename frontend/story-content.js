/* 目录正文来自同源后端，失败时保留原有空状态。 */
(() => {
  fetch('/api/travel/stories/chenshou-book-history', {signal:AbortSignal.timeout(15000)})
    .then(response=>{if(!response.ok)throw new Error('章节读取失败');return response.json();})
    .then(result=>{
      if(result.status!=='ok')return;
      const normalize=record=>{(record.sources||[]).forEach(source=>{if(source.source_url?.startsWith('/api/travel/sources/'))source.source_url=new URL(source.source_url,location.origin).href;});};
      normalize(result.data.story);result.data.story.chapters.forEach(chapter=>{
        normalize(chapter);
        ['compilation','relationships','history','romance','differences'].forEach(key=>{if(chapter[key])normalize(chapter[key]);});
        ['disputes','inferences'].forEach(key=>(chapter[key]||[]).forEach(normalize));
      });
      result.data.places.forEach(place=>{normalize(place);if(place.overview)normalize(place.overview);});
      window.SGTStoryUI.installContent(result.data);
    })
    .catch(()=>{document.querySelector('#story-action-status').textContent='章节资料暂未加载，请刷新重试；仍可向向导提问。';}).finally(()=>window.SGTNavigation?.contentReady());
})();
