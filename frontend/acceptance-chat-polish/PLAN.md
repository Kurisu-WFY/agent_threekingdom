# 陈寿伴行第十一批 Implementation Plan

> 本轮按用户工作单在当前 live 挂载分支直接执行；全部文件与过程记录只写 frontend/**。用户已授权执行、测试和小步提交，不另加审批流程。

**Goal:** 固定陈寿伴行，精简面板、确认删除、逐行淡入真实回答并居中发送按钮。

**Architecture:** 沿用原生 DOM 与 /chat/stream；主题推荐与向导身份分离。对最终回答的文本按实际布局行分段添加视觉淡入，保持模型原文、Markdown 与链接。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node CJS 测试、Playwright Chromium。

**Spec:** 本轮聊天中的《工作单 · 陈寿伴行聊天模块打磨（第十一批）》。

## Global Constraints
- 只改 frontend/**，不 push / merge / 强推；沿用 feat/frontend-acceptance-20260929 @ ea2eb0d。
- 仅桌面 1920×1080；保持待核验、来源分级、非实测、非到访证明等边界。
- 不改模型返回原文；不回退前 1–10 批文化主题与地图功能。
- 全部 *.js node --check、全部 *.test.cjs 实跑；浏览器无横向溢出/产品报错；服务与本地资源 SHA256 一致。
- 本轮禁止修改 docs/AGENTS.md；交接说明放同目录 README.md，原有文档改动不纳入提交。

## Review Focus
- 旧会话 persona 不得重新引入别的向导；问其他人物仍由陈寿讲解。
- 删除取消后会话、草稿、待处理请求完整保留；确认和撤销保持原行为。
- 长段落、格式文本、表格、地点链接逐行出现后文本与交互完整。
- 历史重绘/切换不得反复播放；后台完成回答和减少动态效果偏好可读。
- 输入框从单行到多行，按钮均居中；展开设置和撤销提示不得遮挡消息。

## Task 1：身份、顶部与设置（#1/#2/#4）
Files: index.html, character-chat.js, app.js, chenshou-guide.js, styles.css；character-chat.test.cjs, app.test.cjs, chenshou-guide.test.cjs, chat-polish.test.cjs。
- [x] 浏览器断言：无人物切换、仅陈寿回答/请求背景，顶部无重复标题，状态位于右下；讲解模式三项有效且地图主题推荐保留。
- [x] 先运行新断言并记录 RED；删除角色档案与切换 API，保留独立主题推荐；移除顶部头像/标题/状态冗余，保留关闭和辅助对话名称。
- [x] 更新受身份简化影响的旧测试；新断言 GREEN + 全套测试后提交。

## Task 2：删除、逐行呈现与发送（#3/#5/#6）
Files: app.js, styles.css, chat-polish.test.cjs；原 app 测试添加确认允许的环境替身。
- [x] 浏览器断言：取消无删除，确认可撤销；提示≤32px且不与消息相交；单行/多行发送按钮中心差≤1px。
- [x] 浏览器断言：控制回答夹具的长段落产生多个屏幕行，行淡入有先后、最终文本完整、历史不重播、用户消息不动画、减少动态时直接显示。
- [x] 先运行 RED，再实现 DOM 布局行测量和一次性淡入；真实 /chat/stream 回答独立实测，原文与 response.answer 一致。
- [x] 全局验证、截图/JSON/交接入库；只暂存本轮路径并小步提交。
