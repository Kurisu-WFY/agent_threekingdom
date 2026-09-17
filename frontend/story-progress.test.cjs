const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/story-progress.js','utf8');
const memory={}; const storage={getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v};
function setup(localStorage=storage){const window={localStorage};vm.runInNewContext(code,{window});return window.StoryProgress;}
const story={id:'a',chapters:[{name:'一',placeId:'x'},{name:'二',placeId:'y'},{name:'三',placeId:'z'}]};
let p=setup();assert.equal(p.status(story),'未开始');assert.equal(p.choose(story,[]),false);
assert.equal(p.choose(story,[0,2]),true);let s=p.get(story);assert.ok(s.skipped.has(1));s.started=true;s.current=2;s.mode='亲子故事版';s.completed.add(0);s.completed.add(2);p.save(story);assert.equal(p.status(story),'探索中');
p=setup();s=p.get(story);assert.equal(s.current,2);assert.equal(s.mode,'亲子故事版');assert.ok(s.skipped.has(1));assert.equal(s.completed.size,2);
assert.equal(p.get({id:'b',chapters:story.chapters}).completed.size,0);
p.choose(story,[0,1,2]);s.completed.add(1);p.save(story);assert.equal(p.status(story),'已寻迹');s.completed.delete(1);p.save(story);assert.equal(p.status(story),'探索中');
assert.equal(p.get({...story,chapters:[{name:'新章',placeId:'x'}]}).completed.size,0);
const blocked=setup({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});blocked.get(story).completed.add(0);blocked.save(story);assert.ok(blocked.notice().includes('仅本页'));assert.equal(blocked.get(story).completed.size,1);
memory['sgt.story-progress.v1']='{invalid';assert.equal(setup().status(story),'未开始');
console.log('PASS: local persistence, story isolation, modes, partial completion, undo, selection validation, changed chapters, corrupt/blocked storage');
