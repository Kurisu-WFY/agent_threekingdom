# 第五批地图修复验收 · 2026-10-02

工作单：`docs/WORKORDER-frontend-batch5-map-zoom-20261002.md`。工作区主仓库，分支 `feat/frontend-acceptance-20260929`，基线 `449936a`。仅桌面 **1920×1080**，联调 http://localhost:8002；响应式/1280/移动端未实施、未验收。

## 提交概览

| 提交 | 内容 |
|---|---|
| `3e188dd` | M1 · 地图各缩放入口统一放大至 1500% |
| `c762811` | M2 · 县级模式隐藏市标签和圆点 |
| `c2256bb` | M4 · 区县地名嵌入地块（去圆点、点内标签、地块整体可点按） |
| `9c7ebd6` | 验收产物入库（README/verification/计算复核/截图/browser-final.json） |

M3 只出复核结论，无代码改动、不出独立提交。

## 渲染证据来源（先声明，避免误读）

本会话受管浏览器两次启动均失败（`Browser exited before DevTools became ready`），且当前模型无图像输入，**未能重新取得或目视复核任何渲染证据**。

仓库内 `browser-final.json` + `final-county-*.jpg` 等截图**来自上一会话（2026-10-02 18:40–18:50）的真实浏览器自动化**，本会话将其随 `frontend/**` 一并入库，但**未复核其截图视觉正确性**。下文引用它们时均标注「上一会话浏览器证据」，不把它当作本会话实测。

## M1 · 放大上限 1000% → 1500%

- [x] `index.html` 滑块 `max="1500"`；`travel-map.js` 三处钳制统一：`setView` `Math.max(60,…)`、滚轮 `Math.max(60,…)`、双指 `Math.max(60,…)`、放大禁用 `targetView[2]<=60`；`zoomTo` 最大倍率 15。
- [x] 1500% 对应 `view[2]=60`；`#map-zoom-range` 的 `max/value/aria-valuetext` 一致，放大按钮在 1500% 禁用、可回缩。
- [x] 回归断言（`travel-map.test.cjs`）覆盖滑块/按钮/滚轮/双指各自到 1500% 及 2000% 钳制、放大禁用、1500% 回缩。
- [x] 截图 `01-*.jpg`–`04-*.jpg`（上一会话浏览器证据）。

## M2 · 显示区/县时隐藏市标签

- [x] `updateLabels` 同步切换 `#city-points` 显隐（`detailed` 时 `display:none`）；候选集合 `detailed ? !l.city : l.city`；市州轮廓（`city-outline`）保留。
- [x] 249%/250%/1500%/100% 四档互斥显隐由 `travel-map.test.cjs` 断言覆盖。
- [x] 截图 `05-city-labels-249.jpg`、`06-county-labels-250.jpg`（上一会话浏览器证据）。
- [x] `browser-final.json`：15 个成都区县逐条 `cityHidden: true`（上一会话浏览器证据）。

## M4 · 区县地名嵌入地块

- [x] `map-route-core.js` 新增 `polygonLabel(path, bounds)`：奇偶填充兼容孔洞/多片地块，取离边界最远内点放标签，首屏后按 adcode 缓存。
- [x] `labelLayout` 对带 `area` 的条目：文字与描边包络放进内切 clearance，不做地块外侧向避让；放不下缩小至 `<8px` 省略，不越出到相邻地块。
- [x] `travel-map.js drawCounties` 去掉 `<circle>` 圆点，改用地块 `path`（`county-hit-area`）+ 居中县名（`text-anchor=middle`、`dominant-baseline=central`）；`<g>` 保留 `data-county-code/tabindex/role=button/aria-label` 与键盘可达；点击县名或地块内部均可选中该县。
- [x] 回归断言：凹形/带孔/多片地块内点、183 县区均有正 clearance、文字包络不越界或省略、地块无圆点、县名可点按选中、键盘仍可选。
- [x] `browser-final.json`：15 个成都区县逐条 `countyDotCount: 0`（无圆点）、`labelBox49SamplesInside: true`（文字包络 49 采样点均在地块内）、`labelVisible: true`、中心五城区 `fontSize≈0.89px`（1500% 下缩至约 11px 屏幕字号，符合小地块缩小显示）（上一会话浏览器证据）。
- [x] 截图 `m4-central-1500.jpg`、`final-county-*.jpg`（上一会话浏览器证据）。

## M3 · 成都各区边界复核

- [x] **数据层（本会话计算复核，结论干净）**：`sichuan-map-geometry.json` 中成都 counties **20/20 齐全**，名字、`parent=成都市`、`bounds`、`d` 路径全部有效；`d` 仅含 M/L/Z 直线环、无曲线；金牛/双流/郫都/蒲江/彭州/简阳为多环（孔洞/多片），`polygonLabel` 奇偶填充正确处理。详见 `chengdu-verification.json`。
- [x] **标签锚点（本会话计算复核）**：20 区县 anchor 均 `clearance>0`、文字包络 `within`；中心五城区 clearance 1.75–2.56 较小但仍能缩小显示，凹形龙泉驿区 anchor 在多边形内。
- [x] **渲染层（上一会话浏览器证据，15/20）**：`browser-final.json` 对 15 个区县逐条 `pathMatchesGeometry: true`（渲染路径与几何一致，无错位/漏绘）、`bboxMaxError` 约 1e-5（SVG 路径 bbox 与几何 bounds 误差近零）、`nonempty: true`。
- [ ] **渲染层未覆盖 5 个区县**：`510181 都江堰市`、`510182 彭州市`、`510183 邛崃市`、`510184 崇州市`、`510185 简阳市` 无 `browser-final.json` 记录、无 `final-county-*.jpg` 截图；本会话无法补采。它们的**数据层与锚点计算复核已通过**（见 `chengdu-verification.json`），仅缺浏览器渲染复核。

## 全局验收

- [x] 全部 `*.js` `node --check` 通过；全部 `*.test.cjs` 通过（含新增 M1/M2/M4 断言）。
- [x] 8 个本轮改动资源本地 vs http://localhost:8002 原始字节 SHA256 一致（Node `arrayBuffer` 比对，见 `verification.txt`）。
- [x] `/health` = ok；`git diff --check` 通过。
- [x] 未改 `src/**`、`deploy/**`、`data/**`、`prompts/**`、`docs/**`。
- [ ] 1920×1080 无横向溢出 / Console 零报错：**未取得本会话浏览器证据**（受管浏览器不可用）。

## 证据边界与裁定

- **本会话未取得渲染证据**；渲染证据全部来自上一会话浏览器自动化（`browser-final.json` + 截图），已入库但未复核视觉正确性。M1/M2/M4/M3 的**逻辑层**另有独立断言 + 计算复核支撑。
- Ruling：`polygonLabel` 依赖底图 `d` 仅含 M/L/Z 直线环（已复核全 183 县区成立）；若未来几何数据引入贝塞尔曲线，该解析需同步扩展。
- Ruling：小地块（中心五城区）在低倍下字号 `<8px` 省略、高倍才显示，符合工作单「小地块名称可能省略」约定。
- Ruling：`browser-final.json` 的 `states: []` 与 15/20 覆盖表明上一会话自动化在 15 个区县后被中断，5 个西南县市缺口如实保留，未伪造补采。

## 产物与重放

- `verify-chengdu.cjs`：M3/M4 计算复核脚本（只读，产品页不加载）。`node verify-chengdu.cjs` 重跑并生成 `chengdu-verification.json`。
- `chengdu-verification.json`：成都 20 区县逐条数据/锚点/文字包络复核结果。
- `browser-final.json`：上一会话浏览器自动化逐区县渲染断言（路径一致/无圆点/市标签隐藏/文字在地块内/bbox 误差）。
- 截图：`01-*.jpg`–`06-*.jpg`（M1/M2）、`county-*.jpg` 与 `final-county-*.jpg`（M3/M4，上一会话采集）、`m4-central-1500.jpg`。
- `verification.txt`：语法/测试/健康/SHA256 命令输出。
