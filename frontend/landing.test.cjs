const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},handlers:{},attrs:{},addEventListener(t,fn){this.handlers[t]=fn;},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}});return nodes.get(id);}
const question=node('question');question.dataset.agentQuestion='阆中的故事';
const modes=['plan','culture','character','review'].map(mode=>{const n=node(mode);n.dataset.journeyMode=mode;return n;});
const calls=[],chat={pending:false},input={value:''};
const context={document:{querySelector:node,querySelectorAll:s=>s==='[data-journey-mode]'?modes:s==='[data-agent-question]'?[question]:[]},window:{matchMedia:()=>({matches:false})},chats:[chat],active:0,input,toggleChat:()=>calls.push('open'),send:q=>calls.push(q),saveDraft:()=>calls.push('draft'),updateComposer:()=>{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/landing.js','utf8'),context);
const field=node('#hero-message'),submit=node('#hero-send'),form=node('#hero-form');
const submitForm=()=>form.handlers.submit({preventDefault(){}});
assert.equal(submit.disabled,true);submitForm();assert.equal(calls.length,0);
field.value='  南充一天路线  ';field.handlers.input();assert.equal(submit.disabled,false);submitForm();
assert.deepEqual(calls,['open','南充一天路线']);assert.equal(field.value,'');assert.equal(submit.disabled,true);
// Switching tasks keeps separate drafts and never makes a request.
field.value='未完成的行程';const before=calls.length;modes[1].handlers.click();assert.equal(field.value,'');
field.value='文化草稿';modes[0].handlers.click();assert.equal(field.value,'未完成的行程');
modes[1].handlers.click();assert.equal(field.value,'文化草稿');assert.equal(calls.length,before);
assert.equal(modes[1].attrs['aria-pressed'],'true');assert.equal(modes[0].attrs['aria-pressed'],'false');
node('#journey-profile').value='亲子同行';node('#journey-style').value='亲子故事版';submitForm();
assert.ok(calls.at(-1).includes('文化草稿'));assert.ok(calls.at(-1).includes('同行方式：亲子同行'));assert.ok(calls.at(-1).includes('讲解偏好：亲子故事版'));
modes[2].handlers.click();field.value='张飞与阆中';submitForm();assert.ok(calls.at(-1).includes('不编造人物原话'));
// Pending requests preserve the existing chat draft too.
chat.pending=true;input.value='原有对话草稿';question.handlers.click();assert.equal(input.value,'原有对话草稿\n\n阆中的故事');assert.equal(calls.at(-1),'draft');
assert.equal(calls.filter(c=>c==='阆中的故事').length,0);
node('[data-prepare-review]').handlers.click();assert.equal(modes[3].attrs['aria-pressed'],'true');assert.ok(field.focused);assert.ok(node('#journey-desk').scrolled);
const html=fs.readFileSync(__dirname+'/index.html','utf8');const nav=html.match(/<nav class="content-switch"[\s\S]*?<\/nav>/)[0];assert.equal((nav.match(/data-content-view=/g)||[]).length,4);
for(const id of ['map-view','route-map','map-prefecture','map-county','map-zoom-range'])assert.ok(html.includes('id="'+id+'"'));
for(const asset of ['jianmen-pass.jpg','langzhong-town.jpg'])assert.ok(fs.statSync(__dirname+'/assets/'+asset).size>10000);
console.log('PASS: journey drafts, preference submission, character boundaries, pending draft preservation, four-item navigation and map controls');

context.window.SGTJourney.ask('故事线主题追问');
assert.ok(input.value.endsWith('故事线主题追问'));assert.equal(calls.at(-1),'draft');
chat.pending=false;context.window.SGTJourney.ask('另一条主题');assert.equal(calls.at(-1),'另一条主题');
console.log('PASS: story detail uses the same request/pending-draft bridge');
