const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},handlers:{},attrs:{},addEventListener(t,fn){this.handlers[t]=fn;},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}});return nodes.get(id);}
const question=node('question');question.dataset.agentQuestion='阆中的故事';
const modes=['plan','culture','character','review'].map(mode=>{const n=node(mode);n.dataset.journeyMode=mode;return n;});
const calls=[],chat={pending:false},input={value:''};
const journeyDisclosure={open:false};
node('#journey-desk').closest=()=>journeyDisclosure;
const context={document:{querySelector:node,querySelectorAll:s=>s==='[data-journey-mode]'?modes:s==='[data-agent-question]'?[question]:[]},window:{matchMedia:()=>({matches:false})},chats:[chat],active:0,input,toggleChat:()=>calls.push('open'),send:q=>calls.push(q),saveDraft:()=>calls.push('draft'),updateComposer:()=>{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/landing.js','utf8'),context);
const field=node('#hero-message'),submit=node('#hero-send'),form=node('#hero-form');
const submitForm=()=>form.handlers.submit({preventDefault(){}});
assert.equal(submit.disabled,true);submitForm();assert.equal(calls.length,0);
field.value='  南充一天路线  ';field.handlers.input();assert.equal(submit.disabled,false);submitForm();
assert.deepEqual(calls,['open','南充一天路线']);assert.equal(field.value,'');assert.equal(submit.disabled,true);
// 切换任务时保留各自的草稿，不发起请求。
field.value='未完成的行程';const before=calls.length;modes[1].handlers.click();assert.equal(field.value,'');
field.value='文化草稿';modes[0].handlers.click();assert.equal(field.value,'未完成的行程');
modes[1].handlers.click();assert.equal(field.value,'文化草稿');assert.equal(calls.length,before);
assert.equal(modes[1].attrs['aria-pressed'],'true');assert.equal(modes[0].attrs['aria-pressed'],'false');
node('#journey-profile').value='亲子同行';node('#journey-style').value='亲子故事版';submitForm();
assert.ok(calls.at(-1).includes('文化草稿'));assert.ok(calls.at(-1).includes('同行方式：亲子同行'));assert.ok(calls.at(-1).includes('讲解偏好：亲子故事版'));
modes[2].handlers.click();field.value='张飞与阆中';submitForm();assert.ok(calls.at(-1).includes('不编造人物原话'));
// 请求等待期间也应保留已有聊天草稿。
chat.pending=true;input.value='原有对话草稿';question.handlers.click();assert.equal(input.value,'原有对话草稿\n\n阆中的故事');assert.equal(calls.at(-1),'draft');
assert.equal(calls.filter(c=>c==='阆中的故事').length,0);
node('[data-prepare-review]').handlers.click();assert.equal(modes[3].attrs['aria-pressed'],'true');assert.ok(field.focused);assert.ok(node('#journey-desk').scrolled);
assert.equal(journeyDisclosure.open,true,'prepare must reveal the collapsed journey form');
const beforePrepare=calls.length;
field.value='未发送的回顾草稿';journeyDisclosure.open=false;
node('[data-prepare-character]').handlers.click();
assert.equal(journeyDisclosure.open,true);assert.equal(modes[2].attrs['aria-pressed'],'true');
field.value='未发送的人物草稿';journeyDisclosure.open=false;
node('[data-prepare-review]').handlers.click();
assert.equal(journeyDisclosure.open,true);assert.equal(field.value,'未发送的回顾草稿');
assert.equal(calls.length,beforePrepare,'preparing a collapsed form must not send a request');
const html=fs.readFileSync(__dirname+'/index.html','utf8');const nav=html.match(/<nav class="content-switch"[\s\S]*?<\/nav>/)[0];assert.equal((nav.match(/data-content-view=/g)||[]).length,5);assert.ok(nav.includes('data-content-view="destinations"'));assert.ok(nav.includes('data-content-view="planner"'));assert.ok(!nav.includes('data-content-view="outing"'));
for(const id of ['map-view','route-map','map-prefecture','map-county','map-zoom-range'])assert.ok(html.includes('id="'+id+'"'));
for(const asset of ['jianmen-pass.jpg','langzhong-town.jpg'])assert.ok(fs.statSync(__dirname+'/assets/'+asset).size>10000);
console.log('PASS: journey drafts, preference submission, character boundaries, pending draft preservation, five-item navigation and map controls');

context.window.SGTJourney.ask('故事线主题追问');
assert.ok(input.value.endsWith('故事线主题追问'));assert.equal(calls.at(-1),'draft');
chat.pending=false;context.window.SGTJourney.ask('另一条主题');assert.equal(calls.at(-1),'另一条主题');
console.log('PASS: story detail uses the same request/pending-draft bridge');

chat.pending=true;context.window.SGTJourney.ask('待发送的活动方案',{activityPlan:{version:9}});assert.equal(chat.draftActivityPlan.question,'待发送的活动方案');assert.equal(chat.draftActivityPlan.activityPlan.version,9);
context.window.SGTJourney.ask('完整生成指令：不编造价格与坐标',{displayText:'南充一日活动',activityPlan:{version:10}});
assert.ok(input.value.endsWith('南充一日活动'),'U01 queued request shows the visitor summary');
assert.ok(!input.value.includes('完整生成指令'));
assert.equal(chat.draftRequests.at(-1).question,'完整生成指令：不编造价格与坐标');

// 行程条件无需重复抄进自由文本，也必须进入同一请求与等待草稿流程。
chat.pending=false;modes[0].handlers.click();field.value='';
node('#journey-days').value='2';node('#journey-origin').value='南充';
node('#journey-interest').value='史书与遗迹';node('#journey-person').value='诸葛亮';
assert.equal(typeof node('#journey-days').handlers.change,'function','trip condition changes must update submit availability');
node('#journey-days').handlers.change();assert.equal(submit.disabled,false);
submitForm();
for(const part of ['2 天','南充','史书与遗迹','诸葛亮'])assert.ok(calls.at(-1).includes(part),'structured trip condition reaches request: '+part);
chat.pending=true;input.value='保留原草稿';submitForm();
assert.ok(input.value.startsWith('保留原草稿'));assert.ok(input.value.includes('诸葛亮'));
assert.ok(chat.draftRequests.at(-1).question.includes('出发地：南充'));

modes[0].handlers.click();field.value='待恢复的推荐草稿';
node('[data-prepare-character]').handlers.click();
assert.equal(node('#journey-return-plan').hidden,false,'character mode exposes a return path');
assert.equal(typeof node('#journey-return-plan').handlers.click,'function','return recommendation restores its draft');
node('#journey-return-plan').handlers.click();assert.equal(field.value,'待恢复的推荐草稿');
