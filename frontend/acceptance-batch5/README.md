# 第五批地图修复验收 · 2026-10-02

工作单：`docs/WORKORDER-frontend-batch5-map-zoom-20261002.md`。分支 `feat/frontend-acceptance-20260929`，起始基线 `449936a`，联调 http://localhost:8002。仅桌面 **1920×1080**，不评响应式、不引入依赖、不改地图数据。

## 结论与证据来源

M1 / M2 / M4 功能完成，M3 成都 **20/20** 区县浏览器渲染复核完成，另抽查顺庆、阆中、剑阁。未观察到相对仓库几何的漏绘、错位、非预期重叠；县名在各自地块内，无县级圆点。19 组回归和全部 24 个 JS 语法检查通过（根目录 JS 是 **22** 个）。

前一接续会话曾无法启动浏览器；该限制已在本次接续解除。本次新建真实 IAB 标签页、固定 1920×1080，实际查看新增截图，补齐原来缺失的 5 个成都县市及交互、Console、溢出证据。前期 15 区县 `browser-final.json` 与本次 `browser-supplement.json` 汇总为 `browser-complete.json`，引用的 20 区县截图已在本轮跨接续过程中逐张查看。旧产物全部保留，不把 M4 前截图作为最终嵌入标签证据。

**证据限制**：实体双指设备没有实测，仅受控 PointerEvent 和现有回归覆盖。行政轮廓仅与已核查的仓库底图比较，没有独立权威行政界线对照，不能据此宣称现实行政边界准确性已认证。

## 提交与实现

| 提交 | 内容 |
|---|---|
| `3e188dd` | M1：各缩放入口统一到 1500% |
| `c762811` | M2：县级模式隐藏市文字 / 圆点并排除市候选 |
| `c2256bb` | M4：多边形内点、嵌入县名、去圆点、整块点按 |
| `9c7ebd6` / `6888a65` | 前期验收材料及证据来源说明 |
| `ee118a7` | 修正高倍 SVG 粗矩形焦点遮挡 |

最后一条补齐验收材料提交在 Git 日志中查看。M3 无产品代码或数据变更。所有本批提交仅含 `frontend/**`；协作文档只收工追加，不纳入提交。

## M1 · 1500% 上限

- [x] 滑块 max=1500、最小视图宽 60、zoomTo 最大倍率 15；按钮、wheel、pinch 钳制同步。
- [x] 原生滑块键盘 End、原生「＋」点击、CDP 原生滚轮均到 1500%；value=1500、aria-valuetext=1500%，放大按钮禁用。记录见 `browser-supplement.json` 的 native-range-End / native-plus / native-wheel；截图 `supplement-central-1500.jpg`。
- [x] 原生 PageDown 返回 1360%，随后按钮 / 滚轮再次到顶。1500% 下中央五城区边界、标签、拾取正常。
- [x] 受控双指 PointerEvent 到 1500%，前期截图 `04-controlled-pinch-1500.jpg`；回归验证处理器、2000% 输入钳制、到顶禁用及回缩。
- [ ] **未取得实体双指硬件证据**。IAB 原生 touch 分发不受支持；受控事件不冒充真实触控手势。
- [x] travel-map.test.cjs / map-route.test.cjs 实跑通过。

## M2 · 市 / 县标签互斥

- [x] ≥250%：市文字与圆点隐藏、县图层显示，候选集合排除市标签；21 个 city-outline 保留。
- [x] <250%：市标签恢复、县标签隐藏。`supplement-threshold-249.jpg` / `supplement-threshold-250.jpg` 配对显示阈值两侧行为。
- [x] 成都市筛选与选中高亮、锦江 / 龙泉驿加入路线正常；`supplement-route.jpg` 显示 2 点 / 1 条顺序虚线，测试后只清除本次新增路线。
- [x] 两套地图回归通过，含 249 / 250 / 1500 / 100% 显隐和候选断言。

阈值截图用**受控 range.value + input 事件**精确设为 249 / 250%，因为原生滑块步长不能精确选到 249%。这是边界夹具，不是原生拖动证据；不改产品代码、不模拟后端结果。

## M4 · 地名嵌入与交互

- [x] polygonLabel(d,bounds) 搜索有正 clearance 的内点，奇偶填充处理凹形、孔洞及多片几何，按 adcode 缓存；路线点继续使用原有驻地坐标。
- [x] 县名居中放入自身地块内切圆，文字与描边预留包络，不做侧向偏移；放不下先缩小，低于 8px 或发生碰撞时省略；列表保留全部地点。
- [x] 去县圆点，g 保留 data-county-code / tabindex=0 / role=button / aria-label；透明县域 path 提供整块点按。
- [x] 成都 20 区县与其他 3 抽样县名均可见，文字 bbox **49 个采样点全部在自己的 path 内**，countyDotCount=0；凹形龙泉驿同样通过，中央五城区在 1500% 可显示。
- [x] 原生 Tab 聚焦锦江、Enter 打开拾取；实际点击县名和剑阁地块内部、hover、选中及加入路线通过。截图 `supplement-keyboard-focus-fixed.jpg` / `supplement-county-hover.jpg` / `supplement-route.jpg`。
- [x] 实测发现全局 focus-visible !important 在 SVG 中生成放大矩形框；ee118a7 对 county-point 取消 outline / shadow，保留县域 path **2px non-scaling-stroke** 焦点。失败截图 `supplement-keyboard-focus.jpg` 保留；修正后原生 Tab 计算样式 outline:none / shadow:none，边界焦点清晰。
- [x] 回归覆盖凹形 / 孔洞 / 多片内点、183 县区正 clearance、包络在内或省略、无圆点、县名点按及 Enter。浏览器焦点断言先失败、修正后通过。

polygonLabel 目前针对 M/L/Z 直线环（现有 183 县区均符合）；未来曲线几何需扩展解析。49 点采样是浏览器几何佐证，不等于连续几何证明；包络约束另由内切圆算法与回归验证。

## M3 · 成都逐区县复核

- [x] 20 路径非空、渲染 d 与仓库几何一致，SVG bbox 与 bounds 最大误差 <0.00004 地图单位。
- [x] 逐张查看选中县域，未见漏绘、跨邻区错位或非预期重叠；共享边线及多环 / 孔洞按底图呈现，中央五城区在 1500% 清晰。
- [x] 每县 adcode、选中 / 视口 / 包络 / 路径证据见 browser-complete.json；未发现需点名的边界渲染异常。
- [ ] **未取得独立权威行政轮廓对照**；工作单“与真实行政轮廓相符”只完成仓库底图渲染一致性部分。

| adcode | 区县 | 最终嵌入标签截图 |
|---|---|---|
| 510104 | 锦江区 | final-county-510104.jpg |
| 510105 | 青羊区 | final-county-510105.jpg |
| 510106 | 金牛区 | final-county-510106.jpg |
| 510107 | 武侯区 | final-county-510107.jpg |
| 510108 | 成华区 | final-county-510108.jpg |
| 510112 | 龙泉驿区 | final-county-510112.jpg |
| 510113 | 青白江区 | final-county-510113.jpg |
| 510114 | 新都区 | final-county-510114.jpg |
| 510115 | 温江区 | final-county-510115.jpg |
| 510116 | 双流区 | final-county-510116.jpg |
| 510117 | 郫都区 | final-county-510117.jpg |
| 510118 | 新津区 | final-county-510118.jpg |
| 510121 | 金堂县 | final-county-510121.jpg |
| 510129 | 大邑县 | final-county-510129.jpg |
| 510131 | 蒲江县 | final-county-510131.jpg |
| 510181 | 都江堰市 | supplement-county-510181.jpg |
| 510182 | 彭州市 | supplement-county-510182.jpg |
| 510183 | 邛崃市 | supplement-county-510183.jpg |
| 510184 | 崇州市 | supplement-county-510184.jpg |
| 510185 | 简阳市 | supplement-county-510185.jpg |

其他抽查：511302 顺庆区、511381 阆中市、510823 剑阁县，对应 `supplement-sample-{adcode}.jpg`，包络 / 路径 / 显隐均通过。

## 全局验收

- [x] 递归全部 24 个 .js 语法检查通过（根目录 22 个）；递归全部 19 个 *.test.cjs 全绿。结果与 stdout / stderr 见 verification-resume.json。
- [x] 1920×1080：document / body / clientWidth 均 1920，主内容 scrollWidth / clientWidth 均 1839，无横向溢出。
- [x] 本次地图加载与交互期间浏览器 Console error 记录为 0。取证脚本曾有一次 Runtime.evaluate 括号错误，修正后重取；它不是产品 JS 报错，未混入产品结论。
- [x] /health HTTP 200 / status=ok；不据此推断模型连接、Redis 或外部服务已验证。
- [x] index.html / styles.css / travel-map.js / map-route-core.js 四个改动产品资源 HTTP 原始字节与本地 SHA256 一致，包含最终焦点样式。
- [x] git diff --check 通过；提交仅 frontend/**，不改 src / deploy / data / prompts，既存审计产物保留。
- [x] 两份 docs 只收工末尾追加，旧字节前缀不变、不纳入提交；无 push / merge / 强推。

## 产物索引

- browser-complete.json：20 成都区县 + 3 其他区县合并索引，保留原始来源。
- browser-supplement.json：本次 8 区县、原生键盘 / 点击 / 滚轮、受控阈值、焦点修正前后、路线、Console / 溢出。
- browser-final.json / final-county-*.jpg / m4-central-1500.jpg：前期 M4 最终证据，原始记录保留。
- supplement-central-1500.jpg：本次中央城区高倍视图。
- supplement-keyboard-focus*.jpg：焦点失败与修复后证据，前者不是最终界面。
- supplement-route.jpg / supplement-county-hover.jpg / supplement-threshold-*.jpg：路线、地块交互、受控阈值。
- supplement-county-*.jpg / supplement-sample-*.jpg：成都外围补采及其他市州。
- 01-*.jpg–06-*.jpg / county-*.jpg：历史 M1/M2 与 M4 前证据，保留但不用于最终嵌入标签裁定。
- verify-chengdu.cjs / chengdu-verification.json：只读几何 / 锚点计算复核，非浏览器证据；可执行 `node frontend/acceptance-batch5/verify-chengdu.cjs` 重放。
- verification.txt：前期验证输出；verification-resume.json：最终产品字节下的全量验证。

未取得证据：实体双指硬件、独立权威行政界线对照。响应式按范围不适用。不得把限制或历史失败截图写成当前功能失败，也不得把它们勾为真实实测已通过。
