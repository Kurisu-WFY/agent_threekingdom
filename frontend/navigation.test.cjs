// 使用真实视图切换器测试所有导航状态。
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let cancelled=0,animated=0,reduced=false,focused=0,storyFocused=0;
const label={textContent:''};
const section=(view,hidden)=>({dataset:{viewPanel:view},hidden,contains:()=>false,querySelector:()=>({focus(){storyFocused++;}}),animate(){animated++;return {cancel(){cancelled++;}};}});
const cultural=section('node',true),journal=section('journal',true);
const home=section('welcome',false),map=section('map',true),story=section('story',true);map.selection='仪陇县';map.zoom=450;
const options=['welcome','map','story','journal'].map(view=>({dataset:{contentView:view},setAttribute(k,v){this[k]=v;},addEventListener(){}}));
const scrolls=[],win={scrollY:700,scrollTo(o){scrolls.push(o.top);this.scrollY=o.top;},matchMedia:()=>({matches:reduced})};
const context=vm.createContext({document:{querySelectorAll:s=>s==='[data-view-panel]'?[home,map,story,cultural,journal]:options,querySelector:s=>s==='#view-label'?label:s.includes('"story"')?null:{focus(){focused++;}}},window:win,panel:{hidden:true},chatOpeningScroll:null,updateChatLayout(){},updateTopbarScroll(){}});
const source=fs.readFileSync(__dirname+'/app.js','utf8');vm.runInContext(source.slice(source.indexOf('/* ---------------- 主框内容切换 ---------------- */')),context);
const show=view=>vm.runInContext('showContentView('+JSON.stringify(view)+')',context);
home.contains=()=>true;show('map');assert.equal(focused,1);assert.equal(home.hidden,true);assert.equal(map.hidden,false);assert.equal(win.scrollY,700);assert.equal(label.textContent,'行旅地图');
win.scrollY=120;show('welcome');assert.equal(win.scrollY,120);assert.equal(cancelled,1);
show('story');assert.equal(story.hidden,false);assert.equal(label.textContent,'故事线');assert.equal(storyFocused,1);assert.equal(options[2]['aria-pressed'],'true');assert.equal(options[0]['aria-pressed'],'false');
win.scrollY=80;show('map');assert.equal(win.scrollY,80);assert.equal(map.selection,'仪陇县');assert.equal(map.zoom,450);
show('story');assert.equal(win.scrollY,80);show('map');
assert.equal(options[1]['aria-pressed'],'true');const count=animated;show('map');show('invalid');assert.equal(animated,count);
reduced=true;show('welcome');assert.equal(animated,count);assert.equal(home.hidden,false);assert.equal(map.hidden,true);assert.equal(story.hidden,true);assert.equal(label.textContent,'主界面');
context.panel.hidden=false;context.chatOpeningScroll={view:'welcome',top:920};win.scrollY=0;show('story');show('welcome');assert.equal(win.scrollY,0);
console.log('PASS: story/map/home labels, focus fallback, rapid cancellation, scroll memory, preserved map and reduced motion');

show('node');assert.equal(cultural.hidden,false);assert.equal(label.textContent,'文化节点');show('story');assert.equal(cultural.hidden,true);

show('journal');assert.equal(journal.hidden,false);assert.equal(label.textContent,'我的三国探索志');assert.equal(options[3]['aria-pressed'],'true');win.scrollY=315;show('map');assert.equal(map.selection,'仪陇县');assert.equal(map.zoom,450);show('journal');assert.equal(win.scrollY,315);assert.equal(journal.hidden,false);
console.log('PASS: journal label, aria-pressed, independent scroll memory and map preservation');

assert.equal(scrolls.length,0,'tab switches must never scroll the document');
