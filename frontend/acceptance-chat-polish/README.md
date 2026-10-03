# 第十一批 · 陈寿伴行聊天模块验收与交接（2026-10-03）

产品提交：`cf0e4c4` — `fix(frontend): polish Chenshou chat identity and line reveal`。起点 `ea2eb0d`，沿用 `feat/frontend-acceptance-20260929`。未 push / merge / 强推。

本轮工作单明确只改 frontend/**、不改 docs。根 AGENTS.md 与 docs/TASKS.md、docs/HANDOFF.md 等已有修改均保留，未改写、未暂存；本记录供 DSH 同步启动文档。

## 六项逐条验收
- [x] 1：固定陈寿；移除人物选择、切换 API、多人物头像/风格档案及文化节点中的切换调用。旧消息展示和失败重试均统一陈寿。诸葛亮/张飞保留为文化问题与故事主题，不再作为向导选项。
- [x] 2：移除聊天顶部重复大标题、头像和状态；关闭入口仍可用，模型服务状态位于面板右下角，18px 行高的小字。
- [x] 3：删除前浏览器确认框包含“确认删除”；取消保留会话/草稿；确认删除后 28px 撤销提示只占底部一行、不覆盖消息。删除待处理会话、迟到回答与撤销的原测试仍通过。
- [x] 4：设置只保留三种讲解模式、当前故事/地点背景与章节提示；无人物选择。亲子/学术后台 mode 与上下文、章节状态保持。
- [x] 5：真实模型回答的正文按实际屏幕行淡入，85ms 行间隔、260ms 淡入；原始 answer 不变，Markdown/地点链接/表格/代码/Unicode 保留。超长回答从可见首行开始；同条历史重绘不重播；减少动态偏好直接显示。
- [x] 6：发送按钮随输入框垂直居中；44px 与 97px 输入高度的中心偏差均为 0px。

## 证据
- `browser-green.json`：真实 Microsoft Edge / Chromium，1920×1080，10 项行为断言。聊天正文为明确标注的渲染夹具，未冒充后端回答。
- `browser-red.json`：复核中长回答首行、旧失败消息重试、探索志文案三处问题的 RED 记录；修复后 GREEN 在上方文件。最初六项均已在会话中跑出预期失败，再写产品实现。
- `live-answer.json`：真实 localhost:8002 `/chat/stream`，未替换接口响应；HTTP 200，`generation.kind=llm`。只复制响应流取证；会话原文与返回 answer 严格相等，逐行淡入前后渲染内容相同，重绘不重播；Console 错误为空。
- `fixture-lines-progress.png` / `fixture-lines-complete.png`：超长格式正文逐行出现与完整呈现。
- `live-lines-progress.png` / `live-answer-complete.png`：真实回答逐行出现与完成状态；长回答完整原文在 live-answer.json。
- `delete-undo.png` / `chat-final.png`：轻量撤销及最终面板。
- `verification.json`：24 个 *.js 语法检查、20 个 *.test.cjs 实跑全通过，7 个改动资源 SHA256 一致（index.html、app.js、character-chat.js、chenshou-guide.js、cultural-node.js、journal.js、styles.css），diff --check 通过。
- `suite-initial.json`：身份简化后的首次全套结果，其中三组旧多人物断言按本轮要求更新；草稿、重试、地图、章节、诚实边界等原断言保持。
- `scope-verification.json`：产品提交与验收交付仅 frontend/**。

## 复核与修复
只读独立复核未发现 Critical；Important 为旧失败消息重试仍发送旧身份背景，Minor 为探索志切换提示。本轮两项均补断言观察 RED 后修复并通过全套。截图复查另发现长回答自动滚到底部导致首行不可见，已按同样 RED→GREEN 修复。

后台完成的回答首次切回时淡入一次；以后重绘或切回直接显示。其为首次展示行为，不构成反复播放。减少动态偏好始终直接显示。

## DSH 接手复跑
```powershell
node frontend/acceptance-chat-polish/verify-all.cjs
node frontend/acceptance-chat-polish/verify-live.cjs
```
前者执行全部语法/测试/资源校验，后者调用真实模型。浏览器脚本使用已安装 Microsoft Edge（headless），优先普通 Playwright 模块，兜底 Codex bundled runtime；不依赖仓库根 .venv。

本轮六项已完成，没有功能任务遗留。后续仍按协调者指示检查完整体验；其余评审维度继续暂缓。
