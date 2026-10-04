# 前端重定位改造 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. 用户工作单已授权直接实施；不增加中途审批。

**Goal:** 围绕陈寿编撰《三国志》与南充、广元、阆中收敛故事，把道路、住宿、天气放进活动计划。

**Architecture:** 沿用 SGT_STORIES / chapters、StoryProgress.mode、现有旅游接口和道路表单。保留后端请求值与诚实降级，不猜故事接口。

**Tech Stack:** 原生 HTML/CSS/JavaScript；Node VM 回归；Chromium 1920×1080。

**Spec:** 协调者 2026-10-04 工作单（本对话）、仓库 AGENTS.md。

## Global Constraints

- 只改并提交 frontend/**；文档更新例外按工作单，仅追加、不提交。
- 不 push / merge / 强推。
- 故事 id、最终标题、接口、AQI 去留必须等协调者答复。
- 大众体验版/亲子故事版/学术探索版作为内部 mode 保留，可见名大众线/亲子线/学术线；POST /chat 仍发大众/亲子/学术。
- 不编造正文、景区坐标、酒店名、房价、实时天气或数据来源。
- 推荐表单、目的地、行旅地图机制保持；保留所有诚实边界。

## Review Focus

- 旧浏览器存储的五故事进度不能变成新故事的完成记录。
- 空章节不能启动地图或产生完成记录；故事地图注入测试用明确标注夹具。
- 道路查询迁入活动计划后，聊天带入原文、返回原对话与候选确认保持可用。
- 后端尚返旧天气或缺日夜字段时如实显示实际来源与缺项，不标成高德。
- 住宿条件修改隔离旧请求；保存/恢复档位；未接入不发假酒店查询。

## Tasks

### 1. 术语与文化节点
Files: app.js、index.html、stories.js、story-map.js、journal.js、character-chat.js、chenshou-guide.js、cultural-node.js 及对应测试。
- [ ] 更新测试：故事称故事；三档可见名改故事线但内部 mode 不变；文化节点无进入故事/三档/先读懂入口，证据与出行信息保持。
- [ ] 实跑测试见预期失败。
- [ ] 实施对应文案与节点入口移除，保留 changeMode 的共享状态机制。
- [ ] 对应测试通过，记录结果。

### 2. 酒店与道路内联
Files: index.html、travel-modules.js、app.js、outing.js、styles.css、travel-modules.test.cjs、navigation.test.cjs、outing-core.test.cjs、n8-n9.browser-test.js。
- [ ] 增加档位选择/活动请求/本地存储预期；道路与活动同面板、旧 outing 入口映射与草案返回测试，先 RED。
- [ ] 档位选项经济型/舒适型/高档型/豪华型，需求说明对应星级范围 2.0,2.5 / 3.0,3.5 / 4.0,4.5 / 4.5,5.0（参考筛选，非平台等级保证）。未接入展示位如实说明参考价、非锁价、不代订。
- [ ] 迁入完整道路工具，兼容 outing 深链与聊天来源；进入不自动查询，点击才查。
- [ ] 回归 GREEN。

### 3. 单故事与探索志（依赖协调者契约）
Files: stories.js、journal.js、相关单元/浏览器测试。
- [ ] 使用确认 id/title，删除原五故事；chapters=[]、pending/null/[]。
- [ ] 删除阶段筛选与单故事横滑控制；探索志用单故事进度/重读，删除下一条推荐机制；以 fixture 覆盖多章节和 map.setData 机制。
- [ ] RED→GREEN 验证空章节与旧状态隔离。

### 4. 数据驱动天气（依赖 AQI 决定）
Files: weather-outlook-core.js、travel-api.js、travel-modules.js、index.html、weather-outlook-core.test.cjs、travel-api.test.cjs、map-plan-polish.test.cjs。
- [ ] RED：实际返回 4/2/0 天、日期排序/去重/过期过滤、daytemp/nighttemp 和来源；AQI 按协调者决定。
- [ ] 不新猜后端路径，在现有 travel-info 上带城市 adcode；兼容后端返回 forecast 日夜字段，高德适配由后端。
- [ ] 无高德响应时仅标实际来源/待确认；按返回天数渲染，不合成缺失天。
- [ ] GREEN：来源分列、无假最低最高、请求失效隔离/失败可重试。

### 5. 验收与交接
- [ ] 全部递归 *.js node --check，全部 *.test.cjs 实跑；保留测试生成前旧证据文件字节。
- [ ] 真实 8002 / 1920×1080 各视图/聊天两态布局、产品 console/page error、道路/住宿交互；天气 fixture 与真实响应明确分开。
- [ ] 改动网页资源本地/HTTP SHA256 一致，git diff --check，独立最终审查。
- [ ] README/HANDOFF 记录证据和后端卡点；临时截图/JSON 清理；仅本轮 frontend 明确暂存提交。

## Ledger

- 2026-10-05：开工 dev，原有 AGENTS/docs/untracked audit 不提交；frontend 生产文件干净。故事与 AQI 已问，等答复。
- Ruling: 在当前 dev checkout 实施 — 8002 静态挂载该路径，用户要求改后即刷新验收 — 无隔离工作树，需精确暂存。
- Ruling: 用户直接工作单授权执行，覆盖技能额外计划确认；计划和记录存 frontend 以满足写入范围。


### 第一阶段收尾状态

- Task1 complete（故事/故事线可见文案与节点裁剪，mode原值保持）。
- Task2 complete（酒店需求/未接入展示位、完整道路内联/旧入口、旧方案档位恢复RED→GREEN）。
- Task3 pending REQUIRED coordinator reply：title已确认，id与无接口中间态待答；单故事/探索志复数/阶段筛选尚未实施。
- Task4 frontend complete：AQI去掉、实际日期/来源/日夜字段；高德真实切源是后端未完成项，实际为Open-Meteo7天。
- Task5 implemented-scope verification complete：25 JS / 24 test / 10 browser checks / 15 resource hashes；独立review无阻塞问题。本轮只做本地提交，整单不标完成。
- Final minor (deferred): nightweather缺失但其他字段完整时，卡片标未取得，状态栏缺项提示/专门重试可补强；查询提交仍可用。
- Final Ruling: reviewer暂缓项逐一明确 — story契约等回复；真实酒店/高德及后端空气请求交后端；布局/Console/HTTP由实跑浏览器证据支撑；既有AGENTS/docs变更保留且只追加不提交。
