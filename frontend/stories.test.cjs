const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this.textContent='';}
  append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,fn){this.handlers[k]=fn;}
}
function setup(fail=false,mutation=''){
  const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
  const requests=[],views=[],questions=[],nodeCalls=[];
  const mapCalls=[];const window={SGTJourney:{ask:q=>questions.push(q)},StoryMap:{open:id=>mapCalls.push(id),exit:()=>mapCalls.push('exit')},CulturalNode:{openPlace:(id,options)=>nodeCalls.push([id,options.returnTo])}};
  const ctx={window,document:{querySelector:get,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},showContentView:v=>views.push(v),fetch:url=>{requests.push(url);return fail?Promise.reject(Error('offline')):Promise.resolve({ok:true,json:()=>Promise.resolve({cities:[{d:'M0 0L1 1Z'}]})});}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/story-progress.js','utf8'),ctx);
  vm.runInNewContext(fs.readFileSync(__dirname+'/stories.js','utf8').replace('  const progress =',mutation+'\n  const progress ='),ctx);
  return {get,window,requests,views,questions,mapCalls,nodeCalls};
}
function contents(n){return n.textContent+n.children.map(contents).join(' ');}

const walk=n=>[n,...n.children.flatMap(walk)];
(async()=>{
 const t=setup(),stories=t.window.SGT_STORIES,story=stories[0],cards=t.get('#story-cards').children;
 assert.equal(stories.length,1);assert.equal(cards.length,1);
 assert.equal(story.id,'chenshou-book-history');assert.equal(story.title,'陈寿编书史');assert.equal(story.chapters.length,0);
 assert.equal(story.sources.length,0);assert.equal(story.durationHours,null);assert.equal(story.updatedAt,null);assert.equal(story.dataStatus,'pending');
 assert.ok(t.window.SGT_PLACES.every(p=>p.coordinates===null));
 assert.equal(t.get('#preview-story-open').disabled,false,'independent geographic map remains available');
 t.get('#preview-story-open').handlers.click();assert.deepEqual(t.views,['map']);t.views.length=0;t.mapCalls.length=0;
 const card=cards[0].children[0];assert.equal(cards[0].children.length,1);assert.equal(card.tag,'button');assert.equal(card.type,'button');assert.equal(card.attrs['aria-controls'],'culture-preview');
 assert.match(contents(card),/章节与地点待补充/);card.handlers.click();assert.deepEqual(t.views,[]);assert.equal(card.attrs['aria-pressed'],'true');
 assert.equal(t.get('#story-map-open').disabled,true);assert.equal(t.get('#preview-story-open').disabled,true);
 t.get('#preview-story-open').handlers.click();t.get('#story-map-open').handlers.click();assert.deepEqual(t.mapCalls,[],'empty story cannot start or silently enter a geographic map');
 t.get('#preview-detail-open').handlers.click();assert.deepEqual(t.views,['story']);assert.equal(t.get('#story-title').textContent,'陈寿编书史');
 assert.match(contents(t.get('#story-detail-sidebar')),/章节.*待补充/);assert.match(contents(t.get('#story-detail-content')),/待核验/);assert.doesNotMatch(contents(t.get('#story-detail-content')),/0 \/ 0|pending|接着读：/);
 const modes=walk(t.get('#story-detail-content')).filter(n=>n.tag==='button'&&/^(大众线|亲子线|学术线)$/.test(n.textContent));
 assert.equal(modes.length,3);modes[1].handlers.click();assert.equal(t.window.StoryProgress.get(story).mode,'亲子故事版');
 t.get('#story-ask').handlers.click();assert.match(t.questions.at(-1),/陈寿编书史/);
 t.window.SGTStoryUI.openStory('retired', {id:'retired',title:'旧故事',chapters:[]});assert.equal(t.get('#story-title').textContent,'陈寿编书史','saved unknown story cannot resurrect catalog entry');
 const html=fs.readFileSync(__dirname+'/index.html','utf8');assert.doesNotMatch(html,/story-phase-filters|story-filter-status|story-scroll-prev|story-scroll-next|journal-recommendation|五条主题/);
 assert.equal(t.window.SGTStoryUI.matchesPhase,undefined);
 // Same-id adapter content is explicit, independently supplied test data.
 const adapted={...story,chapters:[{name:'适配口测试夹具章',placeId:'zhaohua'}]};
 assert.equal(t.window.SGTStoryUI.openStory(story.id,adapted),true);assert.equal(t.get('#story-map-open').disabled,false,'same-id backend content can enter without active map');
 t.window.StoryMap.getContext=()=>({story:adapted});
 assert.equal(t.window.SGTStoryUI.openStory(story.id,adapted),true);assert.equal(t.get('#story-map-open').disabled,false);delete t.window.StoryMap.getContext;
 // Explicit rendering fixture: multi-chapter mechanics, never real story content.
 const fixture={id:'fixture-chapters',title:'多章节机制测试夹具',chapters:['zhaohua','jianmenguan','micangdao'].map((placeId,i)=>({name:'夹具第'+(i+1)+'幕',placeId,sources:[],dataStatus:'pending'})),sources:[],people:[]};
 const multi=setup(false,'window.SGT_STORIES = ['+JSON.stringify(fixture)+'];');const mc=multi.get('#story-cards').children[0].children[0];mc.handlers.click();
 assert.equal(multi.get('#preview-story-open').disabled,false);multi.get('#preview-story-open').handlers.click();assert.deepEqual(multi.mapCalls,['fixture-chapters']);
 multi.get('#preview-detail-open').handlers.click();const chapterButtons=walk(multi.get('#story-detail-sidebar')).filter(n=>n.tag==='button'&&n.textContent==='阅读地点资料');assert.equal(chapterButtons.length,3);chapterButtons[0].handlers.click();assert.equal(multi.nodeCalls[0][1],'story');
 multi.get('#story-map-open').handlers.click();assert.equal(multi.mapCalls.at(-1),'fixture-chapters');
 const ps=multi.window.StoryProgress,state=ps.get(multi.window.SGT_STORIES[0]);state.started=true;state.completed=new Set([0,1,2]);ps.save(multi.window.SGT_STORIES[0]);assert.match(contents(multi.get('#story-detail-content')),/这条故事已读完/);assert.doesNotMatch(contents(multi.get('#story-detail-content')),/接着读：/);assert.equal(multi.get('#story-cards').children[0].dataset.progress,'已寻迹');
 const shapes=['tower','shrine','pass','wall','road'].map(k=>t.window.SGTStoryUI.icon(k));assert.equal(new Set(shapes.map(svg=>svg.children[2].attrs.d)).size,5);assert.ok(shapes.every(svg=>svg.children.length===3));assert.equal(t.get('#story-buildings').children.length,5);
 story.title='<img src=x onerror=alert(1)>';card.handlers.click();assert.equal(t.get('#story-title').textContent,story.title);
 for(const d of walk(t.get('#story-detail-content')).filter(n=>n.tag==='details'&&n.className==='chapter-sources')){assert.match(contents(d),/当前显示：/);assert.match(contents(d),/待确认项：/);assert.match(contents(d),/更新时间：/);assert.equal((contents(d.children[0]).match(/待核验/g)||[]).length,1);}
 await new Promise(r=>setImmediate(r));assert.equal(t.get('#story-preview-map').children.length,1);assert.deepEqual(t.requests,['sichuan-map-geometry.json']);
 const offline=setup(true);await new Promise(r=>setImmediate(r));assert.match(offline.get('#story-preview-status').textContent,/暂不可用/);assert.equal(offline.get('#story-cards').children.length,1);
 console.log('PASS: unique pending story, disabled exploration, independent map, mode contract, unknown saved story rejection, explicit multi-chapter fixture, safe text/coordinates and offline geometry');
})().catch(e=>{console.error(e);process.exitCode=1;});
