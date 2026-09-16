// Test rapid view changes without timers, and preserve map/scroll state.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let cancelled=0,animated=0,reduced=false,focused=0;
const section=(view,hidden)=>({dataset:{viewPanel:view},hidden,contains:()=>false,animate(){animated++;return {cancel(){cancelled++;}};}});
const home=section('welcome',false),map=section('map',true);map.selection='仪陇县';map.zoom=450;
const options=['welcome','map'].map(view=>({dataset:{contentView:view},setAttribute(k,v){this[k]=v;},addEventListener(){}}));
const scrolls=[],win={scrollY:700,scrollTo(o){scrolls.push(o.top);this.scrollY=o.top;},matchMedia:()=>({matches:reduced})};
const context=vm.createContext({document:{querySelectorAll:s=>s==='[data-view-panel]'?[home,map]:options,querySelector:()=>({focus(){focused++;}})},window:win,panel:{hidden:true},chatOpeningScroll:null,updateChatLayout(){}});
const source=fs.readFileSync(__dirname+'/app.js','utf8');vm.runInContext(source.slice(source.indexOf('const contentScrollPositions')),context);
const show=view=>vm.runInContext('showContentView('+JSON.stringify(view)+')',context);
home.contains=()=>true;show('map');assert.equal(focused,1);assert.equal(home.hidden,true);assert.equal(map.hidden,false);assert.equal(win.scrollY,0);
win.scrollY=120;show('welcome');assert.equal(win.scrollY,700);assert.equal(cancelled,1);
show('map');assert.equal(win.scrollY,120);assert.equal(map.selection,'仪陇县');assert.equal(map.zoom,450);
assert.equal(options[1]['aria-pressed'],'true');const count=animated;show('map');show('invalid');assert.equal(animated,count);
reduced=true;show('welcome');assert.equal(animated,count);assert.equal(home.hidden,false);assert.equal(map.hidden,true);
context.panel.hidden=false;context.chatOpeningScroll={view:'welcome',top:920};win.scrollY=0;show('map');show('welcome');assert.equal(win.scrollY,920);
console.log('PASS: rapid view switching, focus transfer, independent scroll positions, preserved map state and reduced motion');
