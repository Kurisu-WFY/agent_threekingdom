# 第四批修复实施计划与进度

> 按 executing-plans 在当前会话逐项执行；用户已授权实施。工作单是最终依据。

**Goal:** 修复带入字段、隐藏县区拾取并调整桌面地图与顶栏。
**Architecture:** 保留原生前端、单活动表单和地图状态；从地图读取真实选择，拾取复用县级显示阈值，视觉修改现有 CSS。
**Tech Stack:** HTML/CSS/JavaScript，Node 内置回归，Chromium 实页验收。
**Spec:** docs/WORKORDER-frontend-batch4-fixes-20261002.md

## Global Constraints

- 分支 feat/frontend-acceptance-20260929，起点291a64d；唯一主工作区。
- 只改/提交本轮明确列出的 frontend 文件；docs两份只末尾追加、不提交。
- 仅1920×1080验收，不做响应式；不恢复住宿，不引入依赖。
- 不push、merge、强推、清理既存产物；截图/JSON入库。

## Review Focus

- 无地图选择不能带入固定城市；选择县区、仅市州、多个路线点能保留真实来源。
- 更改来源时保留用户已填日期/条件/出发地；未填出发地明确提示。
- 隐藏县区不能附近拾取；县级可见、文字拦截、章节操作与拖动保持。
- 加粗市州边界不覆盖县区与选中高亮；线宽随缩放保持屏幕尺寸。
- 顶栏降高后聊天开合与内部滚动不导致文档溢出；品牌滚动宽度不变。

## Tasks

### Task 1: F1 活动带入
Files: travel-modules.js/index.html/travel-map.js/travel-modules.test.cjs/travel-map.test.cjs。
Interfaces: TravelMap.getPlanSelection() → {cities:string[],places:string[]}；TravelModules 读取它带入同一trip-form。
- [x] RED：断言空出发地明确提示、空日期带入当地今天、用户日期保留、地图真实来源/无选择不跳转。
- [x] GREEN：chooseCity预填日期与状态；地图按钮去固定字符串，读取当前县区/市州（无选中时使用当前路线）。
- [x] 验证：node frontend/travel-modules.test.cjs、node frontend/travel-map.test.cjs，预期PASS；全回归后独立提交。

### Task 2: F2 地图拾取
Files: travel-map.js/travel-map.test.cjs。
Interfaces: 与F1共享地图状态，保持getPlanSelection。
- [x] RED：100%空白处县区驻地坐标点击不选县；250%以上恢复县区附近拾取。
- [x] GREEN：县级拾取与绘制统一使用900/view[2]>=2.5。
- [x] 验证：travel-map与map-route回归PASS；全回归后独立提交。

### Task 3: F3 边界粗线
Files: styles.css；桌面渲染断言与验收记录。
- [x] RED：实页普通线宽至少2.5，选中更粗；原值1/1.5失败。
- [x] GREEN：普通2.5、选中3，各选择器唯一线宽来源，保留non-scaling-stroke。
- [x] 验证：全省与≥250%实页清晰、回归PASS；独立提交。

### Task 4: F4 顶栏收窄
Files: styles.css/design-system.test.cjs；桌面渲染断言。
Interfaces: header-height供workspace和content现有calc共用。
- [x] RED：高度48、三项单行、打开/关闭无文档溢出；旧64断言按新需求调整。
- [x] GREEN：桌面header-height48、左右padding24/gap12，保留高度依赖token。
- [x] 验证：实际64→48，回归PASS；独立提交。

### Task 5: F5 品牌不缩放
Files: styles.css/n10-n17.browser-test.js；桌面渲染断言。
- [x] RED：滚动前后品牌宽度相同，旧缩小断言调整。
- [x] GREEN：移除scaleX及transform过渡，保留opacity与is-scrolled状态。
- [x] 验证：实页滚动及回归PASS；独立提交。

### Task 6: F6 logo圆角
Files: styles.css；桌面渲染断言。
- [x] RED：实页圆角8，宽高29及原配色/字重保持。
- [x] GREEN：只把生效圆角3改8。
- [x] 验证：实页截图及回归PASS；独立提交。

## Verification & Finish

- 实跑全19组回归和现存JS语法；health、修改资源SHA256、Console、1920几何。
- 五来源带入与地图隐藏/可见拾取实页点击；不将受控断言描述成浏览器点击。
- 截图、browser-reports.json、verification.txt、README逐条验收入库。
- 最后只读全批审查；修重要发现，记录证据边界；frontend/HANDOFF追加；docs前缀哈希保持。

## Ledger

- Pre-flight: F1/F2共享地图选择；F3使用同一轮廓；F4/F5/F6共享品牌与顶栏CSS。先记录原始1920几何再改，避免丢失对照。
- Ruling: 用户明确指定主工作区与分支、只改frontend，因此不创建worktree、不改docs计划、不运行会写入范围外的skill脚本；进度在此保存。代价：执行脚本自动记账改为显式记账。
- Task 1: complete；RED 空日期≠本地今天/getPlanSelection缺失，GREEN 两组专项及全19组/22语法；浏览器基线确认空日期/出发地。F1验收点击待最终重放。
- Task 2: complete；RED 全省空白点击打开隐藏县区候选，真实100%点击亦复现附近4地点；GREEN 全19组/22语法，县区拾取与绘制共用阈值。
- Task 3: complete；RED原1/1.5px线宽回归与实页粗线断言失败，GREEN 21轮廓2.5px、non-scaling-stroke实页通过、全19组/22语法。普通刷新命中缓存，开发验收暂禁缓存；最终资源版本更新。
- Task 4: complete；RED64≠48及聊天展开态多余40px文档滚动，GREEN 顶栏48、两态内容960/文档1080/工作区1032、三项单行；全19组/22语法。
- Ruling: F4验收发现桌面聊天展开态使用仅扣32px的旧高度公式，工作区垂直padding实为72px；让已有桌面公式同时覆盖开关两态，满足无多余滚动。代价：展开态内容高比旧公式少40px，正文仍内部滚动可达。
- Task 5: complete；RED真实品牌缩放断言失败，GREEN滚动94.125→94.125px、transform none/opacity .65；全19组/22语法，旧N11断言按F5更新。
- Task 6: complete；RED原3px圆角失败，GREEN 8px圆角、29×29px、18px/700与原渐变；全19组/22语法。
- Final review: 独立只读审查发现2项Important，0 Critical/Minor。F1查看两站路线时残留selected丢第一站；GCJ-02景点规范化丢city，已有站点被误判无选择。
- Final: fixed 两项F1重要边界 — 真实选县/加入/查看路线与structured→带入断言RED→GREEN，无城市仍保留地点并提示补目的地；全19/19回归、22/22根JS语法。
- Ruling: 地图来源随操作明确切换：新选县/市州为地点来源；绘制/加入/查看路线为整条路线来源。城市缺失仅带入已有地点，保持目的地空并提示补充，禁止猜城市。代价：用户修改路线后带入全部点，若只要某点需重新选择该点。
- Final review scope rulings: 响应式/1280按工作单排除；基线市州文字/面域无选市事件保持，筛选入口仍正常；更换城市累积补充需求保持原行为以免删除手写条件，代价是用户需核对旧地点；无真实后端景点坐标不豁免前端兼容，已补受控真实模块链路；最终截图与几何由主agent验收。
