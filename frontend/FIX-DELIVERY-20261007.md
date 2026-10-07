# 前端修复交付 · F1–F17 · 2026-10-07

本轮在 `D:\DSH Workspace\agent_threekingdom` 的本地 `dev` 实施。仅修改 `frontend/**`，未提交、推送、合并或新建分支/worktree，未重建后端。起点及当前 HEAD 为 `dc2a445`。这是 Codex 实现与自测记录；**DeepSeek v4.1 Flash 独立验收尚未运行**。

真实入口：[http://localhost:8002](http://localhost:8002)。主验收视口 1920×1080；375×812 仅检查明显布局回归。正文、陈寿伴行、天气、地点确认与道路查询沿用现有能力，没有新增依赖、框架或坐标数据。

## 修改文件及职责

| 文件（均在 frontend/） | 职责 |
|---|---|
| `presentation-copy.js`、`presentation-copy.test.cjs` | 废除全页替换、观察器和 TouristCopy；文件仅留停用说明，回归确保没有重写文本的运行能力 |
| `app.js` | 明确 pending/stale 信任状态，修正欢迎语，主视图切换同步公开 hash |
| `index.html` | 冲突表单、任务摘要、非方案恢复/原回答/整理清单、本次结果、查询关联头部、章节地图与导航提示；移除替换脚本并更新本轮资源版本 |
| `travel-modules.js` | 显式半天交接；目的地、故事、自动景点与原备注分离；统一冲突处理；请求版本与旧方案；非方案恢复；查询快照与条件关联；仅摘要末尾规范标点 |
| `travel-map.js` | 在既有选择接口中按需返回地点的明确地区，保留默认调用的原返回结构 |
| `stories.js` | 主区章节全文，侧栏目录；当前章节讲解；来源按文献/页码/锚点分组；章节与地图关系；公开阅读位置 |
| `story-map.js` | 章节提问与讲解偏好一致，章节同步阅读位置；分享恢复用预览模式而不自动开始/完成 |
| `story-content.js` | 异步资料加载成功或失败后通知网址恢复逻辑 |
| `navigation-state.js`（新增） | hash 写入、初始化/前进后退恢复、等待异步章节、无效链接回退；只保存主视图/故事 ID/阅读章号 |
| `cultural-node.js` | 区分缺失城市和未经核验城市；保存主面板阅读位置；取消旧 minHeight；保留原始坐标说明 |
| `journal.js` | 未开始故事显示总幕数与 0 已寻迹，不显示第 0 幕 |
| `amap-planner.js` | 保存城市/活动日期/确认点/条件快照；变更条件清除候选确认 ID，保留真实旧结果，重新查询要求重新确认 |
| `outing.js` | 保留旧 OSRM 结果及原服务回答，记录道路快照，支持活动条件带入但不自动确认地点 |
| `styles.css` | 正文 16px/1.8、主阅读列至多 760px；地图辅助、地点正文不嵌套滚动；关键状态换行及 13–14px；活动生成区优先；窄屏明显溢出修复 |
| `travel-modules.test.cjs`、`cultural-node.test.cjs`、`stories.test.cjs`、`journal.test.cjs` | 交接/自动景点独立管理、阅读滚动、引用分组及等级冲突、探索志状态回归 |
| `design-system.test.cjs`、`map-plan-polish.test.cjs` | 更新为状态可换行及活动生成条件优先布局的正确断言 |
| `fixes.browser.cjs`（新增） | 19 个浏览器行为/布局自测场景；夹具只存在于测试页面上下文，明确标记 |
| `fixes-live.browser.cjs`（新增） | 无响应夹具的真实资源、天气、确认地点/道路、半天请求及来源链接联调 |
| `FIX-DELIVERY-20261007.md`（新增） | 本交付、证据索引、独立验收和待登记文本 |

## F1–F17 对照

| 编号 | 做了什么 | 验证证据 | 剩余限制 |
|---|---|---|---|
| F1 | 移除全局替换及脚本加载，状态由组件生成；城市缺失/未核验分别表述；原备注/服务回答/来源说明保留 | `presentation-copy.test.cjs`；浏览器异步原文保持；真实天气、真实半天原回答；`trust-wrap.png`、`real-half-day-request.png` | 展示“待核验”不等于资料已核验 |
| F2 | 半天显式 0.5，章节选择随交接确认应用；普通入口保持原时间；零选择不改条件；4 小时约束来自同一状态 | 浏览器半天、零选择/取消/确认场景；`browser-report.json` 保存实际请求边界捕获的 question/preferences/summary；`half-day.png` | 真实后端返回时长无匹配模板，未生成活动方案；不能保证半天完成 |
| F3 | 故事、目的地、自动景点及用户备注分离；城市/故事/地图/手工城市统一交接；替换、明确跨城、取消；备注全文保留/编辑/清空；旧方案保留并标旧、迟到结果丢弃 | `travel-modules.test.cjs`；浏览器原复现/跨城勾选/取消/未知地区/备注/迟到/章节变化；`conflict.png`、`cross-city.png` | 无明确地区时必须在界面选择；旧混合备注不能自动识别来源 |
| F4 | 费用/模板/摘录保留原回答和已有方案，提供返回条件/复制本次需求/整理清单；复制失败显示可选全文 | 3 类回答与剪贴板失败夹具；已有方案保留回归；真实半天非方案恢复；`non-plan-recovery.png`、`real-half-day-request.png` | 整理清单不是活动方案，再次请求不保证成功 |
| F5 | 偏好说明准确；主区和地图入口带当前章节与亲子/学术偏好，请求原文保持 | `stories.test.cjs`、`story-map.test.cjs`；浏览器当前章节请求捕获及状态不变 | 已验证请求参数；未单独评审真实模型各模式的讲解质量 |
| F6 | 侧栏目录，主区全文/理由/作用/来源；预览第一章不自动开始；地图空间不足下移 | 浏览器 computed width：伴行收起/展开均 760px；`reading.png`、`reading-chat.png` | 不同设备/浏览器待独立验收；本轮主视口为 1920 |
| F7 | 地点正文 overflow visible，无固定阅读高度；位置记录迁移到 node-view；清除 minHeight | 单元回归；浏览器主滚动 400px→返回→重开 400px，切模式后合理保留；`node-parallel.png` | 较短内容下浏览器可将位置收敛到实际范围，不保留虚假空白 |
| F8 | 完全相同引用合并并列出关联章；页码/URL 查询参数/锚点保留与显示；等级冲突和 C 级限制明确 | 文献夹具同页合并/异页分开/等级冲突/锚点；真实 8 条来源链接均 HTTP 200 | HTTP 200 只说明资源可达，不是史实核验或引文质量认证 |
| F9 | 天气保存查询城市/活动日期/实际预报日，道路保存确认点及条件快照；变化即独立或未关联；旧结果保留；按活动条件重查要求重选确认点 | 日期/城市/出发地变更夹具；真实南充天气及道路切广元，`real-weather-association.png`、`real-road-association.png` | 查询是提供商结果/估计，非现场实测；OSRM 关联已测夹具/现有回归，未在本轮另作真实 OSRM 供应商查询 |
| F10 | 文案为“阅读章节附有资料出处；章节顺序不是历史行走路线，实际交通需另行规划。” | 故事真实页面及阅读截图 | 实际道路需另行核验 |
| F11 | 仅展示摘要末尾去重复标点，输入框和内部原备注保持 | 句号/问号/叹号/空格换行浏览器回归 | 服务需求原文保持，不用展示规则重写它 |
| F12 | 未开始显示尚未开始/共 N 幕/0 已寻迹；开始/读完/零章节沿用真实记录 | `journal.test.cjs` 四类状态；真实页面未开始共 3 幕检查 | 本地手动寻迹不代表到访 |
| F13 | 公共 hash 保存 view/story/chapter；异步恢复、刷新、前进后退、无效 ID/视图/越界回退；无个人信息/不改寻迹 | 浏览器有效 URL 冷加载刷新、历史导航、无效链接，完成数保持 0 | 不分享私人活动条件、备注或对话；不恢复任意第三方页面 |
| F14 | 正文 16px、行高 28.8px；关键说明 13–14px，长来源可折行 | computed style 及 1920/375 的 16 组视图/伴行布局组合，无新增横向溢出 | 375 仅明显回归检查，不是完整移动端设计/验收 |
| F15 | 页首任务摘要与条件/冲突/生成主体，本次结果或清单紧接；天气/道路带关联状态置后 | 1920 伴行开/关生成按钮均在首屏；半天、冲突和非方案截图 | 长结果仍在活动主面板滚动，真实生成质量取决于服务 |
| F16 | 章节编号/地点/当前章高亮，使用既有坐标解析；共点章节共用标记；未知坐标列出待确认，县驻地明确示意 | 阅读/章节地图截图及既有地图单元回归；没有修改地点数据 | 有来源坐标也不代表已核验入口；不绘制虚构道路 |
| F17 | trust-info 及子项换行，链接折行；关键边界直接显示 | 浏览器长链接/C 级状态夹具 scrollWidth=clientWidth；`trust-wrap.png`；现有伴行浏览器回归 | 来源可信度仍需独立核验 |

## 实际命令与结果

在仓库根目录使用 PowerShell；不使用仓库 `.venv`。

```powershell
$node = 'C:\Users\Rocket\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$evidence = 'C:\Users\Rocket\.codex\tmp\frontend-fix-20261007'
# 最终全集：扫描 frontend 所有 .js 做 --check，再逐个运行所有 .test.cjs。
# 外部 runner 调用现有测试，并在 finally 恢复测试会写入的原有证据目录。
& $node "$evidence\verify.cjs"
& $node 'frontend/fixes.browser.cjs'
& $node 'frontend/fixes-live.browser.cjs'
& $node "$evidence\resource-check.cjs"
& 'C:\Program Files\Git\cmd\git.exe' diff --check -- frontend
& 'C:\Program Files\Git\cmd\git.exe' status --short
```

- 最终全集：**30/30 个 JS 语法检查、27/27 组现有回归通过，0 失败**。含既有 `chat-polish.test.cjs`、`map-plan-polish.test.cjs` 的浏览器回归；结果 `verification.json` / `verification-final.log`。
- 补充浏览器：**19/19 场景通过，页面脚本错误 0**，结果 `browser-report.json` / `browser-final.log`。其中布局矩阵检查 welcome/story/planner/journal × 1920/375 × 伴行开/关共 16 组合。
- 真实联调脚本退出 0、页面脚本错误 0，结果 `live-report.json`；最后再次核对 **13/13 关键资源 HTTP 200 且 SHA256 与本地相同**，`final-resources.json`。
- 更新资源版本后再次冷加载第三章分享网址，视图/章号/完成数/16px字号正确，无停用脚本、页面错误0；[final-refresh-smoke.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/final-refresh-smoke.json)。
- `git diff --check -- frontend` 退出 0。
- 未运行后端/Python/Docker 构建测试：本轮未修改后端；未运行独立验收及完整移动端/跨浏览器验收。

开工运行现有 `frontend/acceptance-layout/verify-all.cjs`：29 个 JS、27 组测试中 1 组失败（伴行浏览器的原始核验文字被全局替换）。F1 后修正。新增行为回归先复现过半天、冲突、未开始探索志、旧道路错误关联、已有结果误标及来源定位等问题，再修复。F7 浏览器第一次直接 click 顶部返回按钮时，Playwright 为定位按钮先滚至 0；改为按已绑定返回处理器触发，验证离开前 400px 的位置保存/恢复，不把自动定位产生的滚动误判成产品丢失。

旧测试中要求全局替换后的文案、自动景点拼入备注、正文内层滚动、关键状态 nowrap、活动条件压缩在辅助区的断言已按本工单更新；未删除测试掩盖失败。来源 VM 增补标准 URL API，使原有安全链接行为能被正确测试。

## 真实浏览器与夹具区分

真实页面操作：故事异步内容、正文/侧栏/地图布局、地点资料/阅读恢复、讲解偏好按钮与请求参数、探索志、分享链接及历史导航、半天交接/冲突表单、窄屏边界。请求参数捕获说明前端发送意图，**不说明模型已成功生成**。

真实服务（不注入回答）：

1. 南充高德天气取得 2026-10-07 至 2026-10-10 四天预报。
2. 地点搜索实际确认“南充站 · 铁欣路1号”及“西山风景区万卷楼景区 · 火花街道玉屏路6号”，道路服务返回方案；UI 保留费用/耗时估计及核验限制。本交付不把它当现场交通可行性证明。
3. 活动换到广元后，保留南充天气/道路原结果，头部立即显示独立查询/未关联。
4. 真实半天活动需求返回：“没有满足时长上限的文化路线模板，请增加时间或选择其他目的地。”前端状态为 `other-answer`，保留原回答，显示恢复操作；**真实活动方案生成未成功**。
5. 8 个故事来源 PDF 链接均返回 HTTP 200，包括 #page=3 / #page=16。

测试夹具：费用/资料摘录/路线模板各分支、剪贴板失败、迟到回答、未知地区及跨城章节、引用重复/冲突/锚点、天气日期不一致、道路确认点/条件版本等。夹具仅由测试脚本在隔离浏览器上下文或 VM 注入，均未写进生产数据或修改后端。

## 截图与证据索引

全部位于仓库外：`C:\Users\Rocket\.codex\tmp\frontend-fix-20261007\`。下列链接使用本机绝对路径；示例/夹具截图均不是供应商结果。

| 证据 | 链接与说明 |
|---|---|
| 核验语义、真实非方案回答 | [real-half-day-request.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/real-half-day-request.png)：真实服务原回答与恢复；[trust-wrap.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/trust-wrap.png)：长来源/C 级状态夹具 |
| 半天表单 | [half-day.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/half-day.png)；4 小时发送约束及 0.5 偏好见 [browser-report.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/browser-report.json) |
| 冲突及处理 | [conflict.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/conflict.png)、[cross-city.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/cross-city.png)：具体旧/新条件、自动景点、原备注、明确处理 |
| 正文和地点 | [reading.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/reading.png)、[reading-chat.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/reading-chat.png)、[node-parallel.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/node-parallel.png) |
| 非方案恢复 | [non-plan-recovery.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/non-plan-recovery.png)：费用回答夹具，整理清单明确“不是活动方案” |
| 真实查询关联 | [real-weather-association.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/real-weather-association.png)、[real-road-association.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/real-road-association.png) |
| 道路重确认 | [road-association.png](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/road-association.png)：道路夹具，改城后旧确认 ID 清空/旧结果保留 |
| 全集/真实联调记录 | [verification.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/verification.json)、[live-report.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/live-report.json)、[final-resources.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/final-resources.json) |

## 给 DeepSeek v4.1 Flash 的独立验收清单

请使用 1920×1080，分别收起/展开右侧陈寿伴行，使用干净浏览器上下文避免先前个人记录影响。自行验收，不把本文件的自测结论直接当验收结果。证据根目录同上；可读两个新增 browser.cjs 了解夹具边界，真实服务状态与当天数据可能变化。

| 页面入口/操作 | 独立预期与证据 |
|---|---|
| `/`→文化探索→陈寿编书史→故事详情→地点资料 | 主区全文/当前章/来源对应，侧栏无长正文；收起正文宽 600–760px，展开至少约560px；地点正文无第三滚动区；原始待核验/C 级/非实测限制保留；reading/node 截图 |
| 活动表单设一天；故事半天区只留第一章并带入 | 确认后0.5天/半天摘要，请求含4小时上限；其他章跳过，完成记录不变；零章停留故事；普通带入不改时间；browser-report 请求捕获 |
| 南充万卷楼→广元剑门关→陈寿故事带入 | 冲突在生成入口；采用南充移除自动剑门关；跨城须勾选，列明确组合；取消恢复原条件；备注全文可保留/编辑/清空；手改城市同样检查；未确认不得发请求 |
| 生成期间换条件/章节，旧回答随后返回 | 旧回答不能覆盖新任务；取消交接不使原请求失效；已有/已保存方案保留并标旧条件结果；见19场景相关记录，迟到可用隔离测试夹具复核 |
| 备注分别以。/？/！/空格换行结束 | 摘要不重复句末符号，输入/原文未改写 |
| 真实南充天气及确认起终点的道路查询，活动改广元/改日期/改出发地 | 旧结果不消失，立即显示独立/未关联；按当前活动重查需重新确认具体候选点，不能复用旧 ID；真实截图及 live-report |
| 半天生成或隔离构造费用/模板/摘录 | 原回答和旧方案保留；返回条件可定位，复制需求失败有选中文字；清单包含章节状态/条件/备注/待核验项，明确不是活动方案 |
| 亲子/学术偏好→讲这一章 | 发出当前章节及对应偏好，正文原文/故事/地点/完成状态不因模式而改变；不承诺真实讲解质量 |
| 探索志未开始/开始/读完/零章节 | 没有第0幕，统计基于真实本地记录，保留不代表到访说明 |
| 新标签打开 `/#view=story&story=chenshou-book-history&chapter=2`，刷新/前进后退 | 第三章恢复，等待异步资料，不自动开始或寻迹；无效故事/view和越界章安全提示回退，网址无出行条件/备注/对话 |
| 总来源与章节地图、伴行长来源 | 同文献同页去重且列关联章节，异页保留、等级冲突明确；地图标号对应地点，高亮当前章，县驻地是示意，未知点不造坐标；trust关键状态直接换行 |
| 1920首屏活动页，另看375窄屏 | 读什么/目的地/时长/生成状态易辨，生成入口不被长道路结果挤到底部；辅助查询仍在；无明显横向溢出，375不作完整移动端验收 |

## 待协调者登记（不直接修改 docs）

TASKS 可粘贴：

> 前端 F1–F17：已实施，Codex 自测完成，待 DeepSeek v4.1 Flash 独立验收。仅 frontend/**，本地 dev 未提交/未推送。30 JS 语法检查、27 组现有回归、19 个补充浏览器场景通过；13 关键资源字节一致。真实天气/道路及来源可达通过；真实半天请求返回无匹配路线模板，未生成活动方案，前端恢复路径已可用。交付 frontend/FIX-DELIVERY-20261007.md；证据 C:\Users\Rocket\.codex\tmp\frontend-fix-20261007\。

HANDOFF 可粘贴：

> 做了什么：废除全局改字；半天/跨城市交接和备注明确确认；非方案回答保留与恢复；查询条件快照/旧结果关联；主区阅读/滚动/来源与地图；公开URL恢复和信任状态换行。下一步：DeepSeek v4.1 Flash 按交付清单独立验收，协调者再决定提交/集成。卡点：真实后端半天需求未匹配活动方案，不由前端保证生成或交通可行性；未改后端/docs。原有未提交改动保留。

## 最终文件边界与 git 状态

原有改动包括 `.gitignore`、`src/ingest/sanguozhi_people.py`，以及 docs、前端评审/截图目录和“陈寿与南充”的未跟踪文件。本轮未清理或覆盖这些内容。下附完整状态；`boundary-check.json` 对比开工与收工的 frontend 外状态条目，应完全一致。本轮20个已有前端文件修改及4个前端新增文件（含本交付）待审阅。没有 commit/push，仍为 dev@dc2a445。

<!-- final-status -->
```text
 M .gitignore
 M frontend/amap-planner.js
 M frontend/app.js
 M frontend/cultural-node.js
 M frontend/cultural-node.test.cjs
 M frontend/design-system.test.cjs
 M frontend/index.html
 M frontend/journal.js
 M frontend/journal.test.cjs
 M frontend/map-plan-polish.test.cjs
 M frontend/outing.js
 M frontend/presentation-copy.js
 M frontend/presentation-copy.test.cjs
 M frontend/stories.js
 M frontend/stories.test.cjs
 M frontend/story-content.js
 M frontend/story-map.js
 M frontend/styles.css
 M frontend/travel-map.js
 M frontend/travel-modules.js
 M frontend/travel-modules.test.cjs
 M src/ingest/sanguozhi_people.py
?? docs/AGENT-INTRO-20261003.md
?? docs/HANDOFF-TO-CODEX-20260929-r2.md
?? docs/HANDOFF-TO-CODEX-20260929-r3.md
?? docs/HANDOFF-TO-CODEX-20260929.md
?? docs/HANDOFF-TO-DSH-20260929.md
?? docs/HANDOFF-TO-DSH-20261004.md
?? docs/HANDOFF-TO-DSH.md
?? docs/IA-REVIEW-20260929.md
?? docs/REQ-20260929-frontend-chenshou-panel.md
?? docs/REVIEW-frontend-ia-20260929.md
?? docs/REVIEW-frontend-interaction-usability-20261002.md
?? docs/REVIEW-frontend-ui-audit-20260929.md
?? docs/REVIEW-product-pm-20261003.md
?? docs/WORKORDER-codex-pm-review-20261003.md
?? docs/WORKORDER-frontend-batch1-20260929.md
?? docs/WORKORDER-frontend-batch2-map-topbar-20260929.md
?? docs/WORKORDER-frontend-batch3-restructure-20261001.md
?? docs/WORKORDER-frontend-batch4-fixes-20261002.md
?? docs/WORKORDER-frontend-batch5-map-zoom-20261002.md
?? frontend/.planner-review/
?? frontend/.spots-review/
?? frontend/COPY-AUDIT-20261003.md
?? frontend/FIX-DELIVERY-20261007.md
?? frontend/UI-AUDIT-20260929.md
?? frontend/UX-INTERACTION-AUDIT-20261002.md
?? frontend/acceptance-chat-polish/
?? frontend/acceptance-map-plan-polish/
?? frontend/audit-copy/
?? frontend/audit-ia/
?? frontend/audit-interaction/
?? frontend/audit/
?? frontend/fixes-live.browser.cjs
?? frontend/fixes.browser.cjs
?? frontend/navigation-state.js
?? 陈寿与南充/
```

开工/收工状态：[initial-status.txt](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/initial-status.txt)、[final-status.txt](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/final-status.txt)、[boundary-check.json](C:/Users/Rocket/.codex/tmp/frontend-fix-20261007/boundary-check.json)。
