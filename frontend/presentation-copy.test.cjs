const assert = require('node:assert/strict');
const {humanize, refresh} = require('./presentation-copy.js');
assert.equal(humanize('开放时间：待核验'), '开放时间：以景区当日公告为准');
assert.equal(humanize('数据库坐标尚未核验，不能用于精确落点或导航。'), '地点位置仅供概览；实际导航请使用高德地点搜索。');
assert.equal(humanize('回答提及的文献出处尚未核验，请勿作为已核验引文。'), '文献引用请结合原始文献阅读，不作为直接引文使用。');
assert.equal(humanize('演示数据：住宿预算200元；非实时报价'), '演示数据：住宿预算200元；非实时报价');
assert.equal(humanize('票价未知，不代表免费。'), '票价未知，不代表免费。');
for (const label of ['待核验', '尚未核验', '未验证', '仍需核验']) {
  const result = humanize(label);
  assert.doesNotMatch(result, /未验证|未核验|待核验/);
  assert.equal(humanize(result), result);
}
// 用户原话、表单和原始代码不做显示转换。
let walked = false;
global.document = {createTreeWalker() {walked = true;}};
refresh({nodeType: 1, closest: selector => selector.includes('.message.user')});
assert.equal(walked, false);
console.log('PASS: 游客文案自然化，保留估算与演示说明，不改用户原话');
