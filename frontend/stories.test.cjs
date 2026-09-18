const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this.textContent='';}
  append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;}
  setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,fn){this.handlers[k]=fn;}
}
function setup(fail=false,mutation=''){
  const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
  const requests=[],views=[],questions=[];
  const mapCalls=[];const window={SGTJourney:{ask:q=>questions.push(q)},StoryMap:{open:id=>mapCalls.push(id)}};
  const ctx={window,document:{querySelector:get,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},showContentView:v=>views.push(v),fetch:url=>{requests.push(url);return fail?Promise.reject(Error('offline')):Promise.resolve({ok:true,json:()=>Promise.resolve({cities:[{d:'M0 0L1 1Z'}]})});}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/story-progress.js','utf8'),ctx);
  vm.runInNewContext(fs.readFileSync(__dirname+'/stories.js','utf8').replace('  const progress =',mutation+'\n  const progress ='),ctx);
  return {get,window,requests,views,questions,mapCalls};
}
function contents(n){return n.textContent+n.children.map(contents).join(' ');}
(async()=>{
  const test=setup();
  const cards=test.get('#story-cards').children.map(shell=>shell.children[0]);
  assert.equal(cards.length,5);assert.equal(test.window.SGT_STORIES.length,5);
  for(const record of test.window.SGT_STORIES){assert.equal(record.durationHours,null);assert.equal(record.chapters.length,record.id==='shudao-xunzong'?3:0);assert.equal(record.sources.length,0);assert.equal(record.updatedAt,null);assert.equal(record.dataStatus,'pending');}
  for(const record of test.window.SGT_STORIES)assert.ok(['寻源','读史','探秘','传承'].includes(record.phase));
  assert.equal(test.window.SGT_STORIES.find(s=>s.id==='history-to-place').phase,'探秘');
  assert.ok(!contents(cards[0]).includes('待补充'));assert.ok(contents(cards[2]).includes('3 章'));
  for(const place of test.window.SGT_PLACES)assert.equal(place.coordinates,null);
  for(const card of cards){assert.equal(card.tag,'button');assert.equal(card.type,'button');assert.equal(card.attrs['aria-controls'],'story-view');for(const key of ['主题模板','内容待接入','待核验'])assert.ok(contents(card).includes(key));}
  test.get('#story-cards').children[2].children[1].handlers.click();assert.deepEqual(test.mapCalls,['shudao-xunzong']);
  cards[2].handlers.click();assert.deepEqual(test.views,['story']);assert.equal(test.get('#story-title').textContent,'蜀汉北境·蜀道寻踪');assert.ok(test.get('#preview-selection').textContent.includes('蜀道寻踪'));
  assert.ok(contents(test.get('#story-detail-content')).includes('暂不生成历史讲解或路线'));
  test.get('#story-map-open').handlers.click();assert.equal(test.mapCalls[1],'shudao-xunzong');
  test.get('#story-ask').handlers.click();assert.equal(test.questions.length,1);assert.ok(test.questions[0].includes('蜀道寻踪'));assert.ok(test.questions[0].includes('尚未确认'));
  const story=test.window.SGT_STORIES[2],progress=test.window.StoryProgress;
  const state=progress.get(story);state.started=true;state.completed=new Set([0,1,2]);progress.save(story);
  assert.ok(contents(test.get('#story-detail-content')).includes('一卷读罢'));
  assert.ok(contents(test.get('#story-detail-content')).includes('接着探索'));
  assert.equal(test.get('#story-cards').children[2].dataset.progress,'已寻迹');
  test.get('#story-phase-filters').children[2].handlers.click();
  assert.equal(test.get('#story-cards').children.filter(n=>!n.hidden).length,1);
  assert.equal(test.get('#story-cards').children[4].hidden,false);
  const reordered=setup(false,"window.SGT_STORIES.reverse();window.SGT_STORIES.splice(1,1);window.SGT_STORIES.push({...window.SGT_STORIES[0],id:'new',phase:'unknown'});");
  reordered.get('#story-phase-filters').children[2].handlers.click();
  assert.ok(reordered.get('#story-cards').children.filter(n=>!n.hidden).every(n=>reordered.window.SGT_STORIES.find(s=>s.id===n.dataset.storyId).phase==='读史'));
  assert.equal(reordered.get('#story-cards').children.find(n=>n.dataset.storyId==='new').hidden,true);
  reordered.get('#story-phase-filters').children[0].handlers.click();assert.equal(reordered.get('#story-cards').children.find(n=>n.dataset.storyId==='new').hidden,false);
  assert.equal(test.window.SGTStoryUI.matchesPhase({},'探秘'),false);assert.equal(test.window.SGTStoryUI.matchesPhase({},'全部'),true);
  test.get('#story-phase-filters').children[4].handlers.click();assert.ok(test.get('#story-filter-status').textContent.includes('待接入'));cards[0].handlers.click();assert.ok(!contents(test.get('#story-detail-content')).includes('0 / 0'));
  const kinds=['tower','shrine','pass','wall','road'];
  const shapes=kinds.map(kind=>test.window.SGTStoryUI.icon(kind));
  assert.equal(new Set(shapes.map(svg=>svg.children[2].attrs.d)).size,5);
  assert.ok(shapes.every(svg=>svg.children.length===3));
  assert.equal(test.get('#story-buildings').children.length,5);
  // Untrusted content remains text rather than executable markup.
  test.window.SGT_STORIES[0].title='<img src=x onerror=alert(1)>';cards[0].handlers.click();assert.equal(test.get('#story-title').textContent,'<img src=x onerror=alert(1)>');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(test.get('#story-preview-map').children.length,1);assert.deepEqual(test.requests,['sichuan-map-geometry.json']);
  const offline=setup(true);await new Promise(resolve=>setImmediate(resolve));assert.ok(offline.get('#story-preview-status').textContent.includes('暂不可用'));assert.equal(offline.get('#story-cards').children.length,5);
  console.log('PASS: five pending templates, missing-field labels, no invented coordinates, story selection, shared chat bridge, safe text and map-load failure');
})().catch(e=>{console.error(e);process.exitCode=1;});
