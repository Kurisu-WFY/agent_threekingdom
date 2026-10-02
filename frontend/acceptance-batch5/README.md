# 第五批地图修复验收 · 2026-10-02

工作单：`docs/WORKORDER-frontend-batch5-map-zoom-20261002.md`。工作区主仓库，分支 `feat/frontend-acceptance-20260929`，基线 `449936a`。仅桌面 **1920×1080**，联调 http://localhost:8002；响应式/1280/移动端未实施、未验收。

## 提交概览

| 提交 | 内容 |
|---|---|
| `3e188dd` | M1 · 地图各缩放入口统一放大至 1500% |
| `c762811` | M2 · 县级模式隐藏市标签和圆点 |
| 本会话 M4 提交 | M4 · 区县地名嵌入地块（去圆点、点内标签、地块整体可点按） |

M3 只出复核结论，无代码改动、不出独立提交。

## M1 · 放大上限 1000% → 1500%

- [x] `index.html` 滑块 `max="1500"`；`travel-map.js` 三处钳制统一：`setView` `Math.max(60,…)`、滚轮 `Math.max(60,…)`、双指 `Math.max(60,…)`、放大禁用 `targetView[2]<=60`；`zoomTo` 最大倍率 15。三处不再各自停在旧上限。
- [x] 1500% 对应 `view[2]=60`；`#map-zoom-range` 的 `max/value/aria-valuetext` 一致，放大按钮在 1500% 禁用、可回缩。
- [x] 回归断言（`travel-map.test.cjs`）覆盖滑块/按钮/滚轮/双指各自到 1500% 及 2000% 钳制、放大禁用、1500% 回缩。
- [x] 真实浏览器截图 `01-chengdu-central-1500.jpg`、`02-plus-1500.jpg`、`03-wheel-1500.jpg`、`04-controlled-pinch-1500.jpg`（上一会话 18:40–18:42 采集，见证据边界）。

## M2 · 显示区/县时隐藏市标签

- [x] `updateLabels` 同步切换 `#city-points` 显隐（`detailed` 时 `display:none`）；候选集合 `detailed ? !l.city : l.city`，县级模式不再让市标签挤占县标签；市州轮廓（`city-outline`）保留。
- [x] 249% / 250% / 1500% / 100% 四档互斥显隐由 `travel-map.test.cjs` 断言覆盖；市州筛选、拾取、路线回归保持通过。
- [x] 真实浏览器截图 `05-city-labels-249.jpg`、`06-county-labels-250.jpg`。

## M4 · 区县地名嵌入地块

- [x] `map-route-core.js` 新增 `polygonLabel(path, bounds)`：奇偶填充兼容孔洞/多片地块，以离边界最远的内点放标签（pole of inaccessibility），首轮渲染后按 adcode 缓存。
- [x] `labelLayout` 对带 `area` 的条目：文字与描边包络完整放进内切 clearance，不进行地块外侧向避让；放不下缩小至 `<8px` 则省略，不越出到相邻地块。
- [x] `travel-map.js drawCounties` 去掉 `<circle>` 圆点，改为地块 `path`（`county-hit-area`）+ 居中文案（`text-anchor=middle`、`dominant-baseline=central`）；`<g>` 保留 `data-county-code/tabindex/role=button/aria-label` 与键盘 Enter/Space 可达；点击县名或地块内部均可选中该县。
- [x] 回归断言：凹形/带孔/多片地块内点、183 个县区均有正 clearance、文字包络在 1920 屏不越界或省略、地块无圆点、县名可点按选中、键盘仍可选。
- [x] 计算复核 `chengdu-verification.json`：成都 20 区县 anchor 均 `clearance>0` 且文字包络 `within`（详见下节）。

## M3 · 成都各区边界复核

- [x] **数据层（计算复核，结论干净，无需改数据）**：`sichuan-map-geometry.json` 中成都 counties **20/20 齐全**（锦江/青羊/金牛/武侯/成华/龙泉驿/青白江/新都/温江/双流/郫都/新津/金堂/大邑/蒲江/都江堰/彭州/邛崃/崇州/简阳），名字、`parent=成都市`、`bounds`、`d` 路径全部有效；`d` 仅含 M/L/Z 直线环、无曲线；金牛/双流/郫都/蒲江/彭州/简阳为多环（孔洞或多片），`polygonLabel` 奇偶填充正确处理。
- [x] **标签锚点（计算复核）**：20 区县 anchor 均在自身地块内（`clearance>0`），中心五城区（锦江 1.86/青羊 1.75/金牛 1.78/武侯 2.56/成华 2.42）clearance 较小但文字包络仍 `within`；凹形区县（龙泉驿 6.12）anchor 在多边形内（非驻地点）。
- [ ] **渲染层复核未取得证据**：本会话受管浏览器两次启动均失败（`Browser exited before DevTools became ready`），且当前模型不支持读图，无法重新取得或复核逐区县渲染截图。上一会话已采集 10 张成都区县截图（`county-510104.jpg`–`county-510116.jpg`），本会话**无法确认其对应代码状态与视觉正确性**，仅作为已存在证据入库。剩余 10 区县（郫都/新津/金堂/大邑/蒲江/都江堰/彭州/邛崃/崇州/简阳）无渲染截图。

## 全局验收

- [x] 全部 `*.js` `node --check` 通过；全部 `*.test.cjs` 通过（含新增 M1/M2/M4 断言）。
- [x] 8 个本轮改动资源本地 vs http://localhost:8002 原始字节 SHA256 一致（Node `arrayBuffer` 比对，见 `verification.txt`）。
- [x] `/health` = ok。
- [x] `git diff --check` 通过。
- [x] 未改 `src/**`、`deploy/**`、`data/**`、`prompts/**`、`docs/**`。
- [ ] 1920×1080 无横向溢出 / Console 零报错：**未取得浏览器证据**（受管浏览器不可用）。

## 证据边界与裁定

- **浏览器渲染证据本会话未取得**：受管浏览器两次启动均失败，按契约停止重试、未杀任何系统浏览器进程；当前模型无图像输入，无法读取/复核已有截图。M1/M2/M4 的**视觉层**结论因此标注为「未取得渲染证据」，仅以回归断言 + 计算复核支撑。
- M1/M2/M3/M4 的**逻辑层**均有独立断言或计算证据，不作为「万能好评」。
- Ruling：`polygonLabel` 依赖底图 `d` 仅含 M/L/Z 直线环（已复核全 183 县区成立）；若未来几何数据引入贝塞尔曲线，该解析需同步扩展。
- Ruling：小地块（中心五城区）在低倍下字号 `<8px` 被省略、高倍才显示，符合工作单「小地块名称可能省略」的约定。

## 产物与重放

- `verify-chengdu.cjs`：M3/M4 计算复核脚本（只读，产品页不加载）。`node verify-chengdu.cjs` 重跑并生成 `chengdu-verification.json`。
- `chengdu-verification.json`：成都 20 区县逐条数据/锚点/文字包络复核结果。
- 截图：`01-*.jpg`–`06-*.jpg`（M1/M2）、`county-510104.jpg`–`county-510116.jpg`（M3 部分，上一会话采集）。
- `verification.txt`：语法/测试/健康/SHA256 命令输出。
