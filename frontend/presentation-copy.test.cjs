const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let observed=0,walked=0;
const window={},document={readyState:'complete',body:{nodeType:1,closest:()=>false},createTreeWalker(){walked++;return {nextNode:()=>false};}};
vm.runInNewContext(fs.readFileSync(__dirname+'/presentation-copy.js','utf8'),{window,document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){observed++;}}});
assert.equal(observed,0,'核验语义不能被异步全页观察器改写');
assert.equal(walked,0,'不遍历页面改写原始文字');
assert.equal(window.TouristCopy,undefined,'组件不得继续依赖全局改字服务');
console.log('PASS: no global copy traversal, observer or adapter');
