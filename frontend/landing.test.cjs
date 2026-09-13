const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},handlers:{},addEventListener(t,fn){this.handlers[t]=fn;}});return nodes.get(id);}
const question=node('question');question.dataset.agentQuestion='阆中的故事';
const calls=[],chat={pending:false},input={value:''};
const context={document:{querySelector:node,querySelectorAll:()=>[question]},chats:[chat],active:0,input,toggleChat:()=>calls.push('open'),send:q=>calls.push(q),saveDraft:()=>calls.push('draft'),updateComposer:()=>{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/landing.js','utf8'),context);
const field=node('#hero-message'),submit=node('#hero-send'),form=node('#hero-form');
assert.equal(submit.disabled,true);form.handlers.submit({preventDefault(){}});assert.equal(calls.length,0);
field.value='  南充一天路线  ';field.handlers.input();assert.equal(submit.disabled,false);form.handlers.submit({preventDefault(){}});
assert.deepEqual(calls,['open','南充一天路线']);assert.equal(field.value,'');assert.equal(submit.disabled,true);
chat.pending=true;question.handlers.click();assert.equal(input.value,'阆中的故事');assert.equal(calls.at(-1),'draft');assert.equal(calls.filter(c=>c==='阆中的故事').length,0);
const html=fs.readFileSync(__dirname+'/index.html','utf8');const nav=html.match(/<nav class="content-switch"[\s\S]*?<\/nav>/)[0];assert.equal((nav.match(/data-content-view=/g)||[]).length,2);
for(const asset of ['jianmen-pass.jpg','langzhong-town.jpg'])assert.ok(fs.statSync(__dirname+'/assets/'+asset).size>10000);
console.log('PASS: homepage empty guard, same-chat submission, pending request draft, two-item navigation and local images');
