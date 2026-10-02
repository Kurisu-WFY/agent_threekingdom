# 文化探索信息层级重整 Implementation Plan

> For agentic workers: implement inline with executing-plans; verify each task before completion. 用户已授权本轮实施，计划与证据仅放 frontend，不修改 docs。

**Goal:** 首屏说明文化探索能做什么，并突出“选一条故事线开始”，八个原区块功能仍可达。

**Architecture:** 保留既有五tab及所有功能DOM/id/数据/事件。Hero与故事目录常显；故事预览、陈寿与旅程、建筑与文化线索、地图邀请使用原生details按需展开。跨区的“问人物/回顾”自动展开表单祖先，保留草稿。

**Tech Stack:** 原生HTML/CSS/JS，Node内置回归，无新依赖。

**Spec:** 用户本轮工作单“文化探索板块信息层级重整（第一优先级）”。

## Global Constraints

- 只修改和提交frontend/**；保留既存未跟踪审计材料，不改docs。
- 只验1920×1080，不引入依赖，不push/merge/强推。
- 本轮交付可看版本，协调者目视确认仍待定。

## 设计决定

沿用纸色、墨色、蜀红、玉绿与现有字体；不改全站令牌。主标题32px、主行动44px以上；实景照片缩为辅景。故事目录保持五主题与筛选，其他内容以安静的展开行组织。

布局：主说明/主行动＋辅景 → 故事选择 → 可展开故事预览 → “其他开始方式”三组展开行。

## Review Focus

- 原先从文化卡片跳入表单时，表单即使折叠也必须展开且聚焦，草稿不丢。
- 收起后重开不重新渲染或清空表单；只选择内容时不产生额外请求。
- 节点返回来源仍为文化探索，原展开组保持可达。
- 五tab及view-label、聊天开合保持原流程。
- 主题缺章节提示、来源/坐标核验边界不得被隐藏为虚假已就绪。

## Task 1：重组与功能保持

Files: index.html、styles.css、landing.js、landing.test.cjs。
Interfaces: 保留原DOM id及SGTJourney.ask；prepare仅补展开祖先，不修改请求协议。

- [x] 为“折叠表单中的人物/回顾准备仍可用、草稿保留且不请求”补行为回归，先观察失败。
- [x] 改Hero文案与局部样式；将现有内容包入四个原生展开组，不删除原功能。
- [x] prepare展开journey-desk的details祖先，再滚动/聚焦。
- [x] 运行全部*.test.cjs与全部JS语法检查，预期全部通过。

## Task 2：真实浏览器验收与交付

Files: acceptance-culture-explore/截图、JSON、README.md。

- [x] 1920×1080实点主行动、故事详情/预览地图、陈寿问答/表单、建筑、三文化卡、地图入口、五tab。
- [x] 记录首屏/全部入口/状态/横向溢出/Console，以及修改资源本地与HTTP SHA256。
- [x] 自检diff范围与既存docs哈希不变，小步提交仅显式文件；不纳入此前审计目录。
- [x] 截图与8002可看版本已准备就绪，随本轮交付。
- [ ] 协调者目视裁决（待用户确认，不作为技术通过项）。

## Ledger

- Pre-flight: 所有现有功能共用index.html里的id，保留id避免改请求/地图实现；只有landing.prepare需要适配折叠。
- Ruling: 计划/协作记录放frontend验收目录，用户禁止修改docs优先于仓库更新任务板要求。

- Verification: 折叠表单回归先失败再通过；最终24个JS语法、19个回归全部通过。1920×1080实点八区块与五tab；Console error为空，三个改动资源HTTP/local SHA256一致。
- Review: 独立只读复核未发现重要问题；该复核为代码检查，浏览器证据由主智能体取得。
- Commit: a07293f，仅四个显式frontend代码/回归文件；验收目录单独提交，不纳入既存审计材料。
