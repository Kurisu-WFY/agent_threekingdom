# 文案断言更新

仅更新6个既有回归文件的显示文本期待，没有删测试、改场景或放宽解析/行为断言。仍是19组；24JS清单沿用第九批。初次文字断言失败保存在group1-checks/group2-checks，修正后green文件及最终verification通过。

```diff
diff --git a/frontend/app.test.cjs b/frontend/app.test.cjs
index 249ee66..46abc9b 100644
--- a/frontend/app.test.cjs
+++ b/frontend/app.test.cjs
@@ -175,7 +175,7 @@ const flush = () => new Promise(resolve => setImmediate(resolve));
     assert.equal(run('chats[active].messages.at(-1).error'),true);
     assert.equal(run('chats[active].pending'),false);
     const errorMessage = run('chats[active].messages.at(-1)');
-    assert.match(textTree(run('messageNode(chats[active].messages.at(-1))')),/重新请求/);
+    assert.match(textTree(run('messageNode(chats[active].messages.at(-1))')),/重试，请陈寿再回答一次/);
     run('requestReply(chats[active],chats[active].messages.at(-1))');
     requests.at(-1).resolve({ok:true,json:async()=>({answer:'重试成功',intent:{intent:'culture_qa'}})});
     await flush();
diff --git a/frontend/chenshou-guide.test.cjs b/frontend/chenshou-guide.test.cjs
index ef9533e..edec432 100644
--- a/frontend/chenshou-guide.test.cjs
+++ b/frontend/chenshou-guide.test.cjs
@@ -18,7 +18,7 @@ const guide=ctx.window.ChenshouGuide,progress=ctx.window.StoryProgress;
  assert.ok(text(get('#guide-context')).includes('测试蜀道线'));assert.ok(text(get('#guide-context')).includes('昭化古城'));
  assert.ok(all(guide.portrait()).some(n=>n.attrs.class==='historian-book'));assert.ok(all(guide.portrait()).some(n=>n.attrs.class==='historian-map'));
  guide.enter(current);assert.equal(get('#chat-panel').hidden,false);assert.equal(requests.length,0);assert.match(text(get('#guide-narration')),/当前资料中未找到可靠记载/);
- const mark=get('#guide-actions').children.find(n=>n.textContent==='标记本章已寻迹');mark.click();assert.equal(progress.get(story).completed.has(0),true);assert.equal(get('#chat-panel').dataset.guideState,'complete');assert.match(text(get('#guide-narration')),/下一卷可接“第2幕”/);assert.match(text(get('#guide-context')),/已寻迹.*昭化古城/);
+ const mark=get('#guide-actions').children.find(n=>n.textContent==='标记本章已寻迹');mark.click();assert.equal(progress.get(story).completed.has(0),true);assert.equal(get('#chat-panel').dataset.guideState,'complete');assert.match(text(get('#guide-narration')),/接下来可以读“第2幕”/);assert.match(text(get('#guide-context')),/已寻迹.*昭化古城/);
  get('#guide-actions').children.find(n=>n.textContent==='撤销本章已寻迹').click();assert.equal(progress.get(story).completed.size,0);
  current={story,chapter:story.chapters[1],place:places[1],index:1};guide.enter(current);assert.match(text(get('#guide-narration')),/上章“第1幕”之后/);assert.match(text(get('#guide-transition')),/第 2 幕/);
  const baseline=JSON.stringify(current);ctx.window.CharacterChat.selectPersona('诸葛亮');ctx.window.CharacterChat.setMode('学术探索版');assert.equal(JSON.stringify(current),baseline);assert.match(text(get('#guide-context')),/学术探索版/);
@@ -27,7 +27,7 @@ const guide=ctx.window.ChenshouGuide,progress=ctx.window.StoryProgress;
  assert.match(requests[0].body.history.at(-1).content,/已寻迹节点.*昭化古城/);assert.match(requests[0].body.history.at(-1).content,/核心章节由游客选择/);assert.equal(requests[0].body.mode,'学术');
  const snapshot=JSON.stringify(requests[0].body);current={story,chapter:story.chapters[2],place:places[2],index:2};guide.enter(current);run("send('新的问题')");assert.equal(requests.length,1);assert.match(get('#message').value,/新的问题/);assert.equal(JSON.stringify(requests[0].body),snapshot);
  requests[0].reject(Object.assign(new Error('timeout'),{name:'TimeoutError'}));await flush();assert.match(run('chats[active].messages.at(-1).text'),/超时/);run('requestReply(chats[active],chats[active].messages.at(-1))');assert.equal(JSON.stringify(requests[1].body),snapshot);
- requests[1].resolve({ok:true,json:async()=>({answer:'半天路线须核验',intent:{intent:'culture_qa'}})});await flush();assert.ok(text(ctx.window.CharacterChat.actions(run('chats[active].messages.at(-1)'))).includes('选择保留章节并重绘路线'));
+ requests[1].resolve({ok:true,json:async()=>({answer:'半天路线须核验',intent:{intent:'culture_qa'}})});await flush();assert.ok(text(ctx.window.CharacterChat.actions(run('chats[active].messages.at(-1)'))).includes('选好保留章节，重新画路线'));
  run("send('史料问题')");assert.equal(get('#chat-panel').dataset.guideState,'research');assert.match(text(run('bubbleNode(chats[active].messages.at(-1))')),/正在整理回答/);
  get('#new-chat').onclick();assert.notEqual(get('#chat-panel').dataset.guideState,'research');requests.at(-1).resolve({ok:true,json:async()=>({answer:'预算待核验',intent:{intent:'budget_ticket'},route:null})});await flush();assert.equal(run('chats[active].messages.length'),1);
  for(const name of ['陈寿','诸葛亮','张飞']){const prepared=ctx.window.CharacterChat.prepare(run('chats[active]'),'我想了解'+name);assert.equal(prepared.discovered,name);assert.equal(prepared.preserveMap,true);assert.equal(JSON.stringify(current),JSON.stringify({story,chapter:story.chapters[2],place:places[2],index:2}));}
diff --git a/frontend/cultural-node.test.cjs b/frontend/cultural-node.test.cjs
index 36d9a86..d0de764 100644
--- a/frontend/cultural-node.test.cjs
+++ b/frontend/cultural-node.test.cjs
@@ -17,7 +17,7 @@ api.open({place,chapter,story,index:1,back:'map',exact:false,point:null});
 assert.equal(views.at(-1),'node');assert.match(get('#node-context').textContent,/第二幕/);assert.match(get('#node-coordinate').textContent,/坐标待核验/);
 assert.match(text(get('#node-reading-content')),/当前资料中未找到可靠记载/);assert.ok(!text(get('#node-reading-content')).includes('未经核验的文字'));
 assert.match(text(get('#node-metadata')),/C 级可信度不足/);assert.equal(get('#node-add-route').disabled,true);
-get('#node-reading').scrollTop=260;api.changeMode('亲子故事版');assert.equal(get('#node-reading').scrollTop,260);assert.equal(scrolls.at(-1),270);assert.equal(state.current,1);assert.equal(state.completed.size,1);assert.equal(state.mode,'亲子故事版');assert.match(text(get('#node-reading-content')),/亲子共读/);
+get('#node-reading').scrollTop=260;api.changeMode('亲子故事版');assert.equal(get('#node-reading').scrollTop,260);assert.equal(scrolls.at(-1),270);assert.equal(state.current,1);assert.equal(state.completed.size,1);assert.equal(state.mode,'亲子故事版');assert.match(text(get('#node-reading-content')),/可以和孩子一起看看下方资料/);
 api.changeMode('学术探索版');assert.match(text(get('#node-reading-content')),/编纂背景/);assert.equal(get('#node-reading').scrollTop,260);assert.equal(get('#node-reading-content').style.minHeight,'1500px');
 state.mode='亲子故事版';window.StoryProgress.save(story);assert.equal(api.getMode(),'亲子故事版');assert.equal(get('#node-reading').scrollTop,260);api.changeMode('学术探索版');
 click('#node-ask');assert.match(asks.at(-1).q,/测试关楼/);assert.match(asks.at(-1).q,/合理推断/);assert.match(asks.at(-1).q,/学术探索版/);assert.equal(state.current,1);assert.match(asks.at(-1).o.displayText,/测试关楼/);assert.ok(!asks.at(-1).o.displayText.includes('必须分段'));
diff --git a/frontend/journal.test.cjs b/frontend/journal.test.cjs
index 1222428..8158f85 100644
--- a/frontend/journal.test.cjs
+++ b/frontend/journal.test.cjs
@@ -11,7 +11,7 @@ function setup({saved={},blocked=false,broken=false}={}){
  return {get,window,story,chats,store,views,map};
 }
 const t=setup(),journal=t.window.ExplorationJournal,progress=t.window.StoryProgress;
-assert.ok(text(t.get('#journal-empty')).includes('你还没有开始第一段旅程'));assert.equal(journal.model().completed.length,0);assert.equal(journal.model().people.length,0);assert.equal(t.views.length,0);assert.ok(text(t.get('#journal-recommendation')).includes('没有足够的兴趣记录'));
+assert.ok(text(t.get('#journal-empty')).includes('你还没开始读故事'));assert.equal(journal.model().completed.length,0);assert.equal(journal.model().people.length,0);assert.equal(t.views.length,0);assert.ok(text(t.get('#journal-recommendation')).includes('兴趣记录还不够'));
 t.get('#journal-empty').children.at(-1).handlers.click();assert.deepEqual(t.views,['story']);
 const s=progress.get(t.story);s.started=true;s.current=1;s.completed.add(0);progress.save(t.story);
 assert.equal(journal.model().explored.length,1);assert.equal(journal.model().people[0],'诸葛亮');assert.equal(journal.model().events[0],'示例事件');assert.ok(text(t.get('#journal-book')).includes('第 2 / 2 幕'));assert.ok(text(t.get('#journal-book')).includes('驻地示意'));assert.equal(flatten(t.get('#journal-book')).filter(n=>n.tag==='circle').length,1);
diff --git a/frontend/map-route.test.cjs b/frontend/map-route.test.cjs
index cf076ad..3549624 100644
--- a/frontend/map-route.test.cjs
+++ b/frontend/map-route.test.cjs
@@ -48,7 +48,7 @@ const located = core.structured({ route: { stops: [
   { name: '鹤鸣山景区·王平墓', coordinates: [106.1163, 30.7839], coordinate_system: 'GCJ-02' }
 ] } }, places);
 const replaced = core.resolveRoute(mentioned, located);
-assert.equal(replaced.kind, '后端返回的站点顺序');
+assert.equal(replaced.kind, '服务返回的站点顺序');
 assert.deepEqual(replaced.points.map(p => p.center), [[106.0842, 30.8163], [106.1163, 30.7839]]);
 assert.deepEqual(replaced.backendStopsPending, []);
 // 3) 双方都落不到位时保留后端顺序与缺口，不伪造点位
diff --git a/frontend/stories.test.cjs b/frontend/stories.test.cjs
index 424b2f2..b07ab62 100644
--- a/frontend/stories.test.cjs
+++ b/frontend/stories.test.cjs
@@ -27,7 +27,7 @@ function contents(n){return n.textContent+n.children.map(contents).join(' ');}
     if(i!==2)assert.match(contents(shell),/章节与地点待补充/);
   }
   for(const place of test.window.SGT_PLACES)assert.equal(place.coordinates,null);
-  for(const card of cards){assert.equal(card.tag,'button');assert.equal(card.type,'button');assert.equal(card.attrs['aria-controls'],'story-view');assert.ok(contents(card).includes('文化主题与故事线'));}
+  for(const card of cards){assert.equal(card.tag,'button');assert.equal(card.type,'button');assert.equal(card.attrs['aria-controls'],'story-view');assert.ok(contents(card).includes('故事详情'));}
   test.get('#story-cards').children[2].children[1].handlers.click();assert.deepEqual(test.mapCalls,['shudao-xunzong']);
   cards[2].handlers.click();assert.deepEqual(test.views,['story']);assert.equal(test.get('#story-title').textContent,'蜀汉北境·蜀道寻踪');assert.ok(test.get('#preview-selection').textContent.includes('蜀道寻踪'));
   assert.ok(!contents(test.get('#story-detail-content')).includes('pending'),'U08 story status is Chinese');
@@ -42,8 +42,8 @@ function contents(n){return n.textContent+n.children.map(contents).join(' ');}
   test.get('#story-ask').handlers.click();assert.equal(test.questions.length,2);assert.equal(test.questions[1],'请介绍“蜀汉北境·蜀道寻踪”这条故事线，适合怎么游览？');assert.ok(!test.questions[1].includes('模板'));
   const story=test.window.SGT_STORIES[2],progress=test.window.StoryProgress;
   const state=progress.get(story);state.started=true;state.completed=new Set([0,1,2]);progress.save(story);
-  assert.ok(contents(test.get('#story-detail-content')).includes('一卷读罢'));
-  assert.ok(contents(test.get('#story-detail-content')).includes('接着探索'));
+  assert.ok(contents(test.get('#story-detail-content')).includes('这条故事线已读完'));
+  assert.ok(contents(test.get('#story-detail-content')).includes('接着读'));
   assert.equal(test.get('#story-cards').children[2].dataset.progress,'已寻迹');
   test.get('#story-phase-filters').children[2].handlers.click();
   assert.equal(test.get('#story-cards').children.filter(n=>!n.hidden).length,1);
@@ -54,7 +54,7 @@ function contents(n){return n.textContent+n.children.map(contents).join(' ');}
   assert.equal(reordered.get('#story-cards').children.find(n=>n.dataset.storyId==='new').hidden,true);
   reordered.get('#story-phase-filters').children[0].handlers.click();assert.equal(reordered.get('#story-cards').children.find(n=>n.dataset.storyId==='new').hidden,false);
   assert.equal(test.window.SGTStoryUI.matchesPhase({},'探秘'),false);assert.equal(test.window.SGTStoryUI.matchesPhase({},'全部'),true);
-  test.get('#story-phase-filters').children[4].handlers.click();assert.ok(test.get('#story-filter-status').textContent.includes('向陈寿询问'));cards[0].handlers.click();assert.ok(!contents(test.get('#story-detail-content')).includes('0 / 0'));
+  test.get('#story-phase-filters').children[4].handlers.click();assert.ok(test.get('#story-filter-status').textContent.includes('问陈寿这个主题'));cards[0].handlers.click();assert.ok(!contents(test.get('#story-detail-content')).includes('0 / 0'));
   const kinds=['tower','shrine','pass','wall','road'];
   const shapes=kinds.map(kind=>test.window.SGTStoryUI.icon(kind));
   assert.equal(new Set(shapes.map(svg=>svg.children[2].attrs.d)).size,5);

```
