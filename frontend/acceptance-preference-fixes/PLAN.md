# 第七批交互偏好项 Implementation Plan

> For agentic workers: use executing-plans inline; task-by-task RED → GREEN。用户已授权实施；记录仅放 frontend。

**Goal:** 按已定方向收尾 U14/U21/U24，保留前六批行为。

**Architecture:** 筛选提示紧邻地图控件且不移动视口；历史对话使用可选行内改名表单，手动标题不随消息变化；文化节点用共同缺资料摘要和原生 details 收起空材料，可靠正文常显。

**Tech Stack:** 原生 HTML/CSS/JS、Node 内置回归，无依赖。

**Spec:** UX-INTERACTION-AUDIT-20261002.md §3低优先级及用户第七批工作单。

## Global Constraints

- 当前 feat/frontend-acceptance-20260929 @ 4b7d0cf；仅 frontend/**，不改 docs，不 push/merge/强推，不清理既存资料。
- 真实浏览器仅1920×1080；截图/JSON入库本目录。
- U14不自动市域定位；U21不自动改名；U24不编造资料，保留正史/文学/推断/实时边界。

## Review Focus

- 切回全省、县区清空及多次筛选的提示不残留，市筛选不缩放。
- 空白改名拒绝、取消不变；改非当前会话不切会话、不丢草稿；未发首问的手动标题保留。
- 改名输入遇到流式重绘保留，消息默认标题仍只来自首问。
- C级/无时间/无来源正文仍不解锁；部分可靠资料不能随空区块折叠隐藏。
- 讲解模式切换与对照按钮仍可用；实时资料与历史材料分别核验。

## Tasks

1. U14：travel-map.js / index.html / travel-map.test.cjs。新增行为断言：反馈包含市名及选县指引，viewBox不变，县选择聚焦，全省清除反馈；先失败，再最小实现，再回归提交。
2. U21：app.js / styles.css / app.test.cjs。行内改名表单，最大60字，取消/空白/手动首问标题/草稿/会话顺序/流式重绘回归；先失败，再实现，再回归提交。
3. U24：cultural-node.js / styles.css / cultural-node.test.cjs。共同状态摘要；空故事/推断/对照/争议/旅游信息details默认收起，来源仍可展开；可靠资料常显。先失败，再实现，再回归提交。
4. 24JS/19回归、真实浏览器三项及五tab/聊天布局、Console与资源SHA256；材料与逐条勾选README独立提交。

## Ledger

- Pre-flight: 分支/HEAD符合；既存docs及审计未跟踪材料保留。三任务无共享JS接口，index/styles分步串行编辑。
- Ruling: 用户已明确照工作单实施，直接原生执行；计划和日志保留在frontend，不采用skill默认docs/临时目录，不创建新worktree。
- docs SHA256: TASKS=1B38DA928FF3B53A81A047AE414BDBBEDB5EC7AFA80F4B7FB29995963241A11D；HANDOFF=2C11DF1C7459455C5302CA463E6A79633A2E52C82A0269621D635A3C41726FC3。
- Task 1 complete: U14反馈断言由空文本失败到通过；travel-map/map-route回归通过，commit 39b562c。
- Task 2 complete: U21入口缺失断言先失败；空白/取消/重绘草稿/手动首问/非当前会话与顺序回归通过，commit 9e0414e。
- Task 3: U24空对照折叠数量0≠2先失败；实现后C级拒绝、模式位置、可靠正文常显通过；24JS/19回归全绿，verification.json已保存。真实浏览器U24旧节点高度2826px已取基线截图。
- Final review: 独立只读复核发现U21重绘焦点/选区/IME风险（Important）及Escape冒泡（原Minor，按键盘取消意外关闭聊天的实际影响提升为Important）。DOM身份/精确焦点/选区与Escape隔离断言均先失败；历史状态未变时不重建DOM，局部Escape停止冒泡。
- Final: Ruling: 审查暂未判断像素高度、混合资料Grid拉伸和模式滚动；由本轮真实浏览器测量裁决，不据源码宣称通过。
- Final: fixed U21：编辑器DOM身份、精确焦点、选区与Escape隔离RED→GREEN；全套24JS/19回归通过，commit 43d618f。真实请求由pending到回答完成，同一DOM仍连接/聚焦，选区0–1不变；Escape后聊天保持展开。
- Final: U24默认剑门节点2826→1636px，8个空区块默认折叠，默认可见重复缺记载/零来源均0；对照展开、学术模式及返回文化探索实点通过。Grid显式align-items:start避免混合可靠/空材料拉伸；当前资料没有可靠混合节点，未将此情形写为真实数据浏览器通过。
- Task 4 complete: 最终产品5cfbcbd上24JS/19回归全绿，5个产品资源SHA与8002一致；五页×聊天开关10种布局无横向溢出，Console零产品报错，14张真实1920×1080截图及JSON入库。docs两个文件哈希不变；既存工作树内容保留。
- Final review ruling: 两个有实际交互影响的评审问题已修复并RED→GREEN验证；没有以DOM保留代替物理IME测试，没有将受控可靠正文回归或CSS防拉伸写成真实混合节点浏览器证据。仅本批用户授权三项，无新功能自动启动。
