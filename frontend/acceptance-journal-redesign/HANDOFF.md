# 第十三批 · 探索志单页可看版（2026-10-03）

基线 `9c2647b`，工作分支 `feat/frontend-acceptance-20260929`。本轮已完成实施与技术验收，供协调者目视确认；未 push / merge。

打开 http://localhost:8002，点击主导航「探索志」。首次进入显示真实本地进度（空态为已寻迹0幕、读完0条、待探索5条）。截图的非零阅读进度和问题为验收夹具，不代表真实用户阅读或实际到访。

## 工作单逐项验收

- [x] ① 总览含「陈寿」和已寻迹 / 读完 / 待探索数字。
- [x] ② 每条故事线有标题、进度与继续阅读；正在读 → 待探索；已完成单独折叠，可展开并继续阅读。无章节的主题保留「章节待补充」而不伪造进度。
- [x] ③ 足迹 SVG、节点列表、重读与地图查看均保留；缺坐标节点仍留在列表，不绘制精确点。
- [x] ④ 问题 / 感兴趣主题 / 解锁人物事件三个记录块初始收起，标题始终显示数量，点击可查看详情。同步重绘保留当前展开状态；刷新后恢复初始收起。
- [x] ⑤ 推荐理由和「看看下一条故事线」保留且跳转有效。
- [x] 移除三卷标题、页码、prev / next 翻页；改为主内容区内单页滚动。
- [x] 无进度且无提问时显示「去读一条故事线、问陈寿一个问题，这里就会记下来」和开始入口。
- [x] 本地、不同设备不共享、最多最近200条、删除/撤销、非实际到访、驻地示意非景区入口边界保留。
- [x] 25 个 `*.js` 的 `node --check`、22 个 `*.test.cjs` 全通过，详见 `node-checks.json`。
- [x] 1920×1080 真 Edge Chromium：9项检查全通过；陈寿栏开/关，页面宽1920、scrollWidth1920，探索志内部无横向溢出；Console / pageerror 均为0。详见 `browser-results.json`。
- [x] `index.html` / `journal.js` / `styles.css` 本地与8002响应 SHA256一致（同上JSON）。
- [x] 本轮仅修改并提交 `frontend/**`，不包含旧素材、docs 等已有变动。
- [x] 独立只读复核无阻断发现。
- [ ] 协调者目视确认效果（尚未取得）。

## 变更与证据

生产文件：`frontend/index.html`、`frontend/journal.js`、`frontend/styles.css`。不修改 `model()`、本地同步与足迹 SVG计算；`algorithm-boundaries.json` 记录与基线逐段比对一致。

`journal.test.cjs` 如实更新：去掉翻页操作/页码断言，增加总览、卡片排序、折叠与同步后展开状态、阅读和推荐行为断言。原问题去重/重载/删除/撤销/200条、损坏/不可用存储、时间转换、推荐、人物事件、足迹断言保留。`chat-polish.test.cjs` 原「后一页」点击改为展开问题块，原向导文案断言保留。

截图：`empty-overview.png`、`progress-overview.png`、`footprints.png`、`records-collapsed.png`、`questions-expanded.png`、`records-expanded.png`、`completed-expanded.png`、`chat-open-overview.png`。浏览器脚本 `verify-browser.cjs` 可复跑。

现有聊天与地图测试会重生成原 acceptance 目录素材，本轮未将它们纳入提交。仓库启动文件/doc文件已有变动也未纳入；按本轮工作单禁止修改 docs，交接只写在本目录。

## 交给 DSH / 下一对话

先读取仓库 AGENTS.md，再看本文件与 `PLAN.md`，核对 `git log -1`。保持现有分支和主仓库live挂载；只在 frontend 改界面，不改推荐/存储/地图算法，不 push / merge。

已完成：第十三批探索志单页重构、自动检查、真实浏览器技术验收、独立复核和本目录证据。未完成：协调者目视确认；AGENTS.md 当前进度与 docs/TASKS.md、docs/HANDOFF.md 由 DSH 根据本记录维护（本轮禁止 Codex修改docs）。卡点：无技术卡点。剩余专项评审继续暂缓。
