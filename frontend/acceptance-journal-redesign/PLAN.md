# 探索志第十三批 Implementation Plan

> **For agentic workers:** 使用 executing-plans 在当前会话实施；以用户工作单为准，保留指定分支和 live 挂载，不创建新工作树。进度与交接均写入本目录（用户禁止本轮修改 docs）。

**Goal:** 单页探索志首屏展示探索进度与下一步阅读。

**Architecture:** 仅替换 journal.js 的渲染、index.html 的探索志容器和 styles.css 的探索志样式。model()、问题存储/同步、StoryProgress、足迹 SVG 计算保持原样。

**Tech Stack:** 原生 JavaScript / CSS / HTML，Node assert 现有断言脚本，Chromium 实测。

**Spec:** 本会话工作单「探索志重构（第十三批）」。

## Global Constraints

- 只修改与提交 frontend/**；不 push / merge / 强推。
- 1920×1080；本地与 localhost:8002 资源 SHA256 一致。
- 本地记录、不代表实际到访、最近200条、驻地示意非景区入口。
- 不改数据模型、localStorage 同步、model() 或足迹 SVG 算法。

## Review Focus

- 首次访问的零进度、零问题：显示真实三个数字和开始引导（当前数据为空态 0 / 0 / 5）。
- 正在读/未开始/已完成混合：排序、折叠与继续阅读正确。
- 章节为空的模板：不制造完成百分比。
- 提问但未读章节：保留问题、不解锁人物；折叠状态在同步后保留。
- 存储失败、旧记录、删除/撤销：沿用原有诚实提示和处理。

### Task 1: 单页渲染与视觉

**Files:** journal.js / index.html / styles.css / journal.test.cjs。

**Interfaces:** 消费原有 model() 结果；保留 ExplorationJournal.sync/model/render。

- [x] 更新 journal.test.cjs：去掉翻页操作；增加总览数字、卡片顺序与折叠输出断言。先运行，确认因新渲染缺失失败。
- [x] 替换单页渲染与样式；三个记录块和已完成故事默认收起，数量在 summary 中显示。
- [x] 全部 JS 语法检查和全部 *.test.cjs；保留原有存储、时间、推荐、人物、足迹断言。

### Task 2: 可看版与验收

**Files:** 本目录中的浏览器脚本 / 截图 / JSON / HANDOFF.md。

- [x] 真正 Chromium 测空态、混合进度、记录展开、完成折叠、阅读/地图/重读/推荐跳转。
- [x] 截图检查 1920×1080，记录 Console、溢出与资源哈希。
- [x] 独立代码复核，修复必要问题；提交指定本轮文件，提供可看版供协调者目视确认。

## Ledger

- 已核对 HEAD 9c2647b9380c264759c44d6ef55ca9260d30a878；分支 feat/frontend-acceptance-20260929。
- 初始工作区已有 docs、旧验收素材改动；本轮不纳入。
- Ruling: 工作单的只改 frontend 和禁止 docs 优先于仓库启动文档更新要求；交接记录放本目录。
- Ruling: 按明确指定 live 主仓库与分支原地实施；无需新 worktree。

- Task 1: complete — 先修改 journal.test.cjs 并实跑失败（缺失指定空态渲染），实现后通过；原存储与推荐断言保留。chat-polish.test.cjs 原翻页调用实跑失败后改为展开问题块，原向导文案断言保持。
- Task 2: complete — 25 个 *.js 语法与 22 个 *.test.cjs 全绿，9 项真实 Chromium 检查通过。截图和 JSON 均在本目录。
- Ruling: Python 环境未安装 Playwright，使用已有 Node Playwright + Edge Chromium；未安装新依赖。
- 浏览器脚本调试：无限吉祥物动画导致全动画等待超时，改为只等有限动画；故事标题选择器经 index.html 核对为 #story-title。均为验收脚本修正，未改产品算法。
- Review: 独立只读 journal_review 无阻断发现；修正本计划空态描述（待探索为5而非0）。专项性能/全面可访问性/安全与非桌面布局不在本轮。
- 受保护逻辑与 9c2647b 逐段 SHA256 相同：读取/时间/同步/model、足迹 SVG计算。
- 原有聊天和地图测试会重生成各自 acceptance 目录的旧素材；这些工作区变动不纳入本轮提交。
- 协调者目视确认：待完成；可看版在 http://localhost:8002，点击「探索志」。
