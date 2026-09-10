// Regenerate offline SVG: node frontend/build-map.cjs
// Boundary: https://geo.datav.aliyun.com/areas_v3/bound/510000.json
// City seat coordinates: https://geo.datav.aliyun.com/areas_v3/bound/510000_full.json
// Downloaded 2026-09-11. Points use center, not administrative-area centroid.
const fs = require('node:fs');
const read = name => JSON.parse(fs.readFileSync(__dirname + '/' + name, 'utf8').replace(/^\uFEFF/, ''));
const boundary = read('sichuan-boundary.json');
const cities = read('sichuan-cities.json');
const project = ([lon, lat]) => [100 + (lon - 97.3) * 60, 620 - (lat - 26) * 60 / Math.cos(30 * Math.PI / 180)];
const point = p => project(p).map(v => v.toFixed(2)).join(',');
const rings = boundary.features.flatMap(f => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates);
const outline = rings.map(r => 'M' + r.map(point).join('L') + 'Z').join('');
const shortNames = { '阿坝藏族羌族自治州': '阿坝州（马尔康）', '甘孜藏族自治州': '甘孜州（康定）', '凉山彝族自治州': '凉山州（西昌）' };
// Label offsets only; the city dots always retain their projected coordinates.
const offsets = { '成都市': [-12, -2], '德阳市': [-15,-7], '绵阳市':[12,-5], '眉山市':[-12,-8], '资阳市':[12,0], '乐山市':[-13,6], '自贡市':[-8,21], '内江市':[20,-2], '遂宁市':[14,12], '南充市':[13,-9], '广安市':[20,17], '宜宾市':[-12,19], '泸州市':[15,17], '雅安市':[-12,2], '甘孜藏族自治州':[-12,-7] };
const labels = cities.map(city => {
  const [x,y] = project(city.center);
  const [dx,dy] = offsets[city.name] || [12,-9];
  const accent = ['南充市','广元市'].includes(city.name);
  const color = accent ? '#9c2b25' : '#394a48';
  return `<g><title>${city.name}：东经 ${city.center[0]}°，北纬 ${city.center[1]}°</title>
    <path d="M${x},${y} L${x+dx},${y+dy}" stroke="#9d9a8c" fill="none"/>
    ${accent ? `<circle cx="${x}" cy="${y}" r="8" fill="#9c2b25" opacity=".12"/>` : ''}
    <circle cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="#fffdf9" stroke-width="1.2"/>
    <text x="${x+dx+(dx<0?-3:3)}" y="${y+dy+4}" text-anchor="${dx<0?'end':'start'}" fill="${color}" font-weight="${accent?700:500}">${shortNames[city.name] || city.name}</text></g>`;
}).join('\n');
fs.writeFileSync(__dirname + '/sichuan-map.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="680" viewBox="0 0 900 680" role="img" aria-labelledby="title desc">
<title id="title">四川省21个市州驻地位置图</title><desc id="desc">四川省轮廓，18个地级市与3个自治州驻地点位。南充和广元以朱红色标注。</desc>
<style>text{font-family:'Microsoft YaHei',sans-serif;font-size:14px;paint-order:stroke;stroke:#fffdf9;stroke-width:3px;stroke-linejoin:round}</style>
<path d="${outline}" fill="#eeeade" stroke="#9c927e" stroke-width="1.5" stroke-linejoin="round" fill-rule="evenodd"/>
<g>${labels}</g><g transform="translate(820 55)"><path d="M0,30V0L-5,10M0,0L5,10" stroke="#687485" fill="none"/><text x="0" y="-10" text-anchor="middle">北</text></g>
<text x="60" y="655" fill="#687485" style="font-size:12px">● 市州驻地　　朱红色：南充 / 广元</text>
</svg>\n`);
console.log(`Generated Sichuan map with ${cities.length} city/prefecture seats.`);
