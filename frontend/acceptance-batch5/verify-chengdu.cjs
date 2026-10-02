/* 第五批 M3 计算复核：成都 20 区县几何数据 + 地块内标签锚点。
   只读脚本，产品页不加载；用 Node 以 UTF-8 读取真实几何，复算 polygonLabel 内点与文字包络。 */
const fs = require('node:fs');
const path = require('node:path');
const FE = __dirname; // acceptance-batch5/
const ROOT = path.join(FE, '..');
const core = require(path.join(ROOT, 'map-route-core.js'));
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'sichuan-map-geometry.json'), 'utf8').replace(/^\uFEFF/, ''));

const EXPECTED = [
  ['510104', '锦江区'], ['510105', '青羊区'], ['510106', '金牛区'], ['510107', '武侯区'], ['510108', '成华区'],
  ['510112', '龙泉驿区'], ['510113', '青白江区'], ['510114', '新都区'], ['510115', '温江区'], ['510116', '双流区'],
  ['510117', '郫都区'], ['510118', '新津区'], ['510121', '金堂县'], ['510129', '大邑县'], ['510131', '蒲江县'],
  ['510181', '都江堰市'], ['510182', '彭州市'], ['510183', '邛崃市'], ['510184', '崇州市'], ['510185', '简阳市'],
];

const chengdu = geo.counties.filter(c => c.parent === '成都市');
const missing = EXPECTED.filter(([adcode, name]) => !chengdu.some(c => String(c.adcode) === adcode && c.name === name));
const extra = chengdu.filter(c => !EXPECTED.some(([adcode]) => String(c.adcode) === adcode));

const rows = EXPECTED.map(([adcode, name]) => {
  const c = chengdu.find(x => String(x.adcode) === adcode);
  if (!c) return { adcode, name, present: false };
  const d = c.d || '';
  const hasCurve = /[CQASTVHcqastvh]/.test(d);
  const rings = (d.match(/M/g) || []).length;
  const bounds = Array.isArray(c.bounds) && c.bounds.length === 4 ? c.bounds : null;
  const anchor = bounds ? core.polygonLabel(d, bounds) : null;
  // 与 map-route.test.cjs 同款「文字包络不超出内切 clearance」检查（1920 屏、视口框住该县）。
  let labelFit = null;
  if (anchor && anchor.clearance > 0) {
    const view = [anchor.x - 30, anchor.y - 680 / 30, 60, 680 / 15];
    const item = { id: adcode, name, size: 11, x: anchor.x, y: anchor.y, area: anchor };
    const laid = core.labelLayout([item], view, 1920, 563);
    const scale = Math.min(1920 / view[2], 563 / view[3]);
    const diagonal = laid.length ? Math.hypot((laid[0].box[2] - laid[0].box[0]) / 2, (laid[0].box[3] - laid[0].box[1]) / 2) : 0;
    labelFit = laid.length ? { visible: laid.length > 0, fontSize: laid[0].fontSize, diagonal, within: diagonal <= anchor.clearance * scale + 0.001 } : { visible: false, reason: 'omitted (parcel too small)' };
  }
  return {
    adcode, name, present: true,
    parent: c.parent,
    bounds, rings, dLength: d.length, hasCurve,
    anchor: anchor ? { x: +anchor.x.toFixed(3), y: +anchor.y.toFixed(3), clearance: +anchor.clearance.toFixed(3) } : null,
    labelFit,
  };
});

const allValid = rows.every(r => r.present && r.bounds && r.anchor && r.anchor.clearance > 0 && !r.hasCurve && r.parent === '成都市');

const report = {
  generatedAt: new Date().toISOString(),
  source: 'sichuan-map-geometry.json (UTF-8)',
  count: chengdu.length,
  expectedCount: EXPECTED.length,
  missing: missing.map(([a, n]) => `${a} ${n}`),
  extra: extra.map(c => `${c.adcode} ${c.name}`),
  allValid,
  rows,
};

fs.writeFileSync(path.join(FE, 'chengdu-verification.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('成都区县数:', chengdu.length, '/ 期望', EXPECTED.length);
console.log('缺失:', report.missing.length ? report.missing.join(', ') : '无');
console.log('多余:', report.extra.length ? report.extra.join(', ') : '无');
console.log('全部有效(存在/边界/内点>0/无曲线/父级=成都市):', allValid);
for (const r of rows) {
  console.log(`${r.adcode} ${r.name}  present=${r.present} rings=${r.rings} dlen=${r.dLength} curve=${r.hasCurve} clearance=${r.anchor ? r.anchor.clearance : '-'} fit=${r.labelFit ? (r.labelFit.within ? 'within' : (r.labelFit.visible ? 'OVERFLOW' : 'omitted')) : '-'}`);
}
