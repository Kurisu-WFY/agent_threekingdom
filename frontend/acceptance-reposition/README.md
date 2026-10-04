# 前端重定位第一阶段 · 验收证据

**整张工作单尚未完成。** 标题“陈寿编书史”已确认；新 id 与内容接口中间态仍待协调者回复。不能把当前25 JS / 24 test全绿理解为单故事替换已完成。

## 已实施与待办

2026-10-05 · 前端重定位第一阶段（整单尚未完成）

- 完成：可见术语改为故事/故事线三档，内部 mode 与 POST 契约不变；文化节点删除进入故事/三档入口/先读懂介绍，证据与出行核验保留；活动计划直接包含完整道路工具，旧 outing / 深链 / 聊天草案返回仍可用，显式“带入当前活动地点”只复制文字；住宿档位/需求/未接入展示位；天气移除 AQI 和前端外部补查，actual forecast 日期/天数/来源，daytemp/nighttemp 按白天夜间展示，三城 adcode 补带同源请求。
- 未完成：单故事替换及探索志单故事收敛。标题已由协调者定为“陈寿编书史”，建议新 id chenshou-book-history（不继承旧进度）及本批接口未约定/chapters=[]，已经提问但尚未获确认，依工作单§5不自行定案；原五故事未删除，阶段筛选机制与复数推荐仅改术语，待下一步处理。
- 后端依赖：真实天气本次仍返回 Open-Meteo 7 日，前端照实标来源与7天，不能宣称高德已接通。高德4日适配及停止后端 AQI 请求、RollingGo 网页接口/OAuth、故事正文与节点由后端完成。真实酒店名/房价未取得，没有虚构。
- 验证：递归25 JS语法、24/24 *.test.cjs通过；真实8002/Edge/1920×1080 八视图×聊天开关无横向溢出，Console/Page errors=0，health=ok；15个改动JS/CSS/HTML与HTTP SHA256一致；n8-n9/n10-n17实际执行通过。天气4/2/0天为明确标注协议夹具，真实Open-Meteo7天分开取证；原对话返回为受控消息回调，不冒充真实后端回答。真实道路查询成功与酒店真实数据未取得本轮新证据。
- 独立只读review无Critical/Important；延期minor：缺 nightweather 时卡片如实显示未取得，状态缺项提示及专门重试按钮可补强，普通查询按钮仍可用。旧方案无 hotel_tier 时清空残留档位已RED→GREEN修复。
- 只提交本轮frontend；不push/merge。既有AGENTS/docs/audit与旧批次验收材料保留；本轮截图/JSON验收后清理，README/复验脚本留存。

## 复验

在仓库根执行：

```powershell
node frontend/acceptance-reposition/verify-all.cjs
node frontend/acceptance-reposition/browser-checks.cjs
```

verify-all会恢复原有两个会生成证据的测试目录运行前字节。脚本重新生成的PNG/JSON是临时取证，检查后清理。browser-checks的--story选项为后续单故事确认/实施后使用，本次未运行。

## 逐项实跑

|检查|结果|
|---|---|
|真实服务健康|通过|
|道路与住宿直接在活动计划，无自动查询|通过|
|道路旧入口的实际导航与候选失效隔离（受控草案）|通过|
|聊天草案原文与返回回调（受控消息，非后端回答）|通过|
|节点入口裁剪及 mode 契约（受控不发送）|通过|
|1920×1080 各视图聊天开关无横向溢出|通过|
|真实天气响应，来源与天数如实显示，无前端外部补查|通过|
|浏览器回归 n8-n9 与 n10-n17|通过|
|改动资源与 HTTP SHA256 一致|通过|
|Console / Page 零产品报错|通过|

单位回归与浏览器测试共24组，语法25个，失败0。

## 改动资源 SHA256

本地与HTTP两份hash逐项比较完全一致（15项）；下表只保留相同的hash，不持久化JSON。

|资源|SHA256（本地=HTTP）|
|---|---|
|frontend/app.js|4afe27c031215501f1f673f655bf272824bd34a2ef6b0dfc65782dcf00ce763e|
|frontend/character-chat.js|d84f614b05bf0d10a7d5d1421589c24ffe725d3bc9b45dcda9340f7f9bce60ff|
|frontend/chenshou-guide.js|d1aa529a01c033ed36f020d82561aa933a54d7409dc7ad553f429ee7fc92881b|
|frontend/cultural-node.js|cbad1715785450a08a3b918943a7baac9e8c06e643f2199a1a217e1499da2432|
|frontend/index.html|b8782caea5cfe96e0e3007a28f50208605c8dc3c05f5bc67fc87116fd965b3c1|
|frontend/journal.js|de7b4a02fdeb687d385388d0ecbc00dfae44255760c0368d654c397c31041b64|
|frontend/n10-n17.browser-test.js|0ac0569cfe784609cefe7762f8208b20540246d7c60ff3aa13b88a5ae2d93dc6|
|frontend/n8-n9.browser-test.js|300e3490eafe5728ce952ee1119f644efae9e420caeb166261030c6fa29b6e74|
|frontend/outing.js|fd6a9a43ea6664bfec18103cb337005cef71cbd355b61d86ad863771ab08d524|
|frontend/stories.js|cbda5992e0e530ccf78ab9d27fb2da64177ccf555455e90d3d24a9d5efcb34ef|
|frontend/story-map.js|a529daebb872e3288d9dddf65027d615f88a12ec1e61f5692664468b6efceab5|
|frontend/styles.css|6c44f297df50a86903dddeca12474534fc2d6585888d9da9cd9fa18f906447d5|
|frontend/travel-api.js|a655608068b33e54c5e58b775561b8bc4254fa40d60ba34d4125672498b4fcd6|
|frontend/travel-modules.js|03549dce33987bd7fce581cd50c07e02dd852b7a285861358b79ba6547b670de|
|frontend/weather-outlook-core.js|86ba2d5d0e2da29d2c5f928217d596f9c9e3276b6ed242d290a5d0e79b46b09d|

## 下一对话交接提示词

继续 D:\DSH Workspace\agent_threekingdom 的重定位工作单。先读 AGENTS.md、frontend/HANDOFF.md最后一节和本README。第一阶段已实现并验收，勿重做。协调者确认标题“陈寿编书史”、去掉AQI；新id建议chenshou-book-history，以及本批未约定接口/空chapters中间态仍待确认。确认后删除原五故事新增唯一空章节故事；删除阶段筛选/单卡横滑冗余；探索志去掉下一条推荐并收敛单故事；人物兴趣仅陈寿关联新故事，张飞/诸葛亮保留文化与地点动作，不再引用已删除故事。同步维护stories/journal/character/guide/browser测试，用显式fixtures覆盖多章节map/progress机制。遵守mode原值不变、只frontend提交、不push、章节不得编造。后台真实天气仍Open-Meteo7天，高德4日与酒店/OAuth属后端缺口。完成后重新全套验收及故事范围补审。
