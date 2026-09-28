const assert=require('node:assert/strict');
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';}
 append(...items){this.children.push(...items);}
 setAttribute(k,v){this.attrs[k]=v;}
}
global.document={createElement:tag=>new Element(tag)};
const {render,clean,latestCalls}=require('./answer-format.js');
const walk=n=>[n,...n.children.flatMap(walk)];
const result=render('## 景点\n| 名称 | 状态 |\n| --- | --- |\n| **万卷楼** | `manual_demo` |\n\n- 核验公告\n<script>alert(1)</script>\n[危险](javascript:alert(1))\n[官方](https://example.com)');
const nodes=walk(result);
assert.equal(nodes.filter(n=>n.tag==='table').length,1);
assert.equal(nodes.filter(n=>n.tag==='td').length,2);
assert.ok(nodes.some(n=>n.tag==='strong'&&n.textContent==='万卷楼'));
assert.ok(nodes.some(n=>n.tag==='code'&&n.textContent==='manual_demo'));
assert.equal(nodes.filter(n=>n.tag==='script').length,0);
assert.equal(nodes.filter(n=>n.tag==='a').length,1);
assert.equal(clean('前\n<div><markdown-custom-process name="x"></markdown-custom-process></div>\n后'),'前\n\n后');
assert.equal(latestCalls([{name:'x',status:'EXECUTING'},{name:'x',status:'FINISHED'}]).length,1);
assert.equal(latestCalls([{name:'x',status:'EXECUTING'},{name:'x',status:'FINISHED'}])[0].status,'FINISHED');
console.log('PASS: safe Markdown table/headings/code/lists/links, inert HTML, process cleanup and latest tool status');
assert.equal(clean('`retrieve_culture_knowledge`（成都武侯祠+陈寿关系）'),'`文化知识检索`（成都武侯祠+陈寿关系）');
assert.equal(clean('san-guo-travel-agent__list_scenic_spots'),'景点查询');
assert.equal(clean('召回率：100%\n命中5个chunk\n陈寿是史学家。\n来源：《三国志》，第3页。'),'陈寿是史学家。\n来源：《三国志》，第3页。');
assert.equal(clean('[来源](https://example.com/retrieve_culture_knowledge)'),'[来源](https://example.com/retrieve_culture_knowledge)');
const filtered=walk(render('| 论文 | chunk数 | rerank最高分 | PDF页码 |\n| --- | --- | --- | --- |\n| 陈寿研究 | 5 | 0.9 | 3 |'));
assert.equal(filtered.filter(n=>n.tag==='th').length,2);
assert.ok(filtered.some(n=>n.tag==='td'&&n.children.some(c=>c.textContent==='陈寿研究')));
