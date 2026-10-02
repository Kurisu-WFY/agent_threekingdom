# 第五批地图修复 Implementation Plan

**Goal:** 桌面 1920×1080 地图各缩放入口统一到 1500%，县级模式隐藏市标签，区县名称嵌入地块，复核成都 20 区县渲染。
**Architecture:** 沿用现有 travel-map.js、MapRouteCore 和 SVG 图层；不改数据或投影。
**Tech Stack:** 原生 HTML / CSS / JS、Node 现有回归、真实 IAB 浏览器。
**Spec:** docs/WORKORDER-frontend-batch5-map-zoom-20261002.md。

## Global Constraints

- 工作区与分支保持用户指定；仅 frontend 修改并提交，不 push / merge。
- 仅 1920×1080；不改既存审计产物，不引入依赖。
- docs/HANDOFF.md、docs/TASKS.md 仅收工末尾追加，不纳入提交。

## Review Focus

- 滑块、按钮、滚轮、双指不能各自停在旧上限。
- 1500% 的放大禁用状态、value 和 aria-valuetext 同步；回缩仍可用。
- 249% / 250% 边界两侧市 / 县图层互斥，市轮廓保留。
- 成都市筛选、县域拾取、加入路线不回归。
- 成都中心小区及外围区县必须真实查看，不以数据存在替代渲染证据。

## 执行

- [ ] M1：travel-map.test.cjs 加各入口上限行为断言，确认旧代码失败；修 index.html 和 travel-map.js 的所有入口钳制；回归通过后独立提交。
- [ ] M2：标签候选与图层互斥断言确认旧代码失败；切换 city-points 显隐并排除候选市标签；两套地图回归通过后独立提交。
- [ ] M4：先以凹形 / 孔洞 / 多片几何和真实区县验证内点与文字包络，再去掉圆点；文字及地块可点按，保留键盘可达。小地块放不下就缩小至 8px 或省略，禁止移到邻区；独立提交。
- [ ] M3：M4 完成后真实浏览器重新查看成都 20 区县，并抽查其他市州；保存截图、逐 adcode 渲染记录及限制；不改数据。
- [ ] 全量现有测试 / JS 语法、Console、溢出、health、HTTP 字节和改动范围验证；验收产物提交。

## 决定与记录

- M1 额外入口限制：zoomTo 的最大倍率 10，wheel 与 pinch 的最小宽度 90 也必须同步；否则工作单目标无法实现。保持最小改动，不扩展 API。
- 工作单允许两份 docs 收工追加，视作“不改 docs”的明确例外；保存原始长度 / 哈希校验前缀。
- 按用户已授权的顺序直接执行，不等待计划二次确认；本轮自行复核，不新增 agent。
