# 前端当前问题清单 · FRONTEND-ISSUES

> **生成时间**：2026-09-20 ｜ **对应代码**：远端 **`dev` @ `edcf97e`**（已推送，含 Codex 最新前端 `55bb0a0` + 协作文档）
> ｜ **工作区**：主仓库 `D:\DSH Workspace\agent_threekingdom`（干净克隆，停在 `dev`）
> **口径**：只列**实测/交接文档中明确记录**的问题，不推测。每条都标了**谁来改**：
> `前端` = 前端自己能改 ｜ `后端队友` = 后端接口/数据（你队友会改）｜ `内容负责人` = 资料与来源 ｜ `人` = 协调决策。
>
> **当前绿灯状态**（同时验证过）：`node --check` 全部 JS 通过；**15 组回归 15/15 通过**；
> 容器 `sgt-snapshot-api` healthy，`/health` = ok；前端 48 文件 / 5270 KB。
>
> 相关文档：`docs/BACKEND-API-REFERENCE.md`（后端接口字典与缺口）、`frontend/HANDOFF.md`（逐轮交接与验收）、
> `frontend/START-HERE.md`（新对话接手指南）、`frontend/API-CONTRACT.md`（前端接口提案）、
> `frontend/DESIGN-SYSTEM.md`（视觉规范）。

---

## 一、前端自己能改的（owner：前端）

| # | 问题 | 现状与证据 | 影响 | 建议 |
|---|---|---|---|---|
| F1 | **首屏无打包、无压缩、请求数多** | `index.html` 同步加载 **13 个独立 `<script>`**（`app.js`、`landing.js`、`travel-api.js`、`travel-modules.js`、`map-route-core.js`、`travel-map.js`、`story-progress.js`、`stories.js`、`story-map.js`、`cultural-node.js`、`character-chat.js`、`journal.js`、`chenshou-guide.js`）+ 1 个 `styles.css`；脚本 165 KB、样式 88 KB、HTML 35 KB ≈ **首屏 288 KB / 15 个请求**，且**无 minify、无 gzip**（后端是裸 `StaticFiles`，没有压缩中间件） | 弱网/移动端首屏慢；13 个串行脚本解析 | 合并成 2–3 个 bundle 或 `<script defer>` 并保持顺序；与后端商量开 gzip/br 与静态资源长缓存（注意本项目**约定不引入打包器**，可用极简拼接脚本或后端压缩） |
| F2 | **地图/故事数据体积大，且是否懒加载待确认** | 运行期本地数据 **3.37 MB**：`sichuan-county-boundaries.json` **1.76 MB**、`sichuan-map-geometry.json` **1.38 MB**、`sichuan-map.svg` **893 KB**、`sichuan-city-boundaries.json` 161 KB（`sichuan-counties.json` 仅 27 KB） | 首次进地图/故事视图可能长时间白屏；移动端流量 | 把 183 县轮廓按市州拆分按需加载（先只发当前市州）；几何数据压缩为整数/指数记法；确认这些 fetch 是否真的延后到进图才发；SVG 与 geometry 是否重复（择一） |
| F3 | **两张实景图未压缩** | `assets/jianmen-pass.jpg` **351 KB**、`assets/langzhong-town.jpg` **186 KB**（共 537 KB），CC BY-SA 4.0，署名见 `frontend/assets/CREDITS.md` | 首屏图片开销大 | 转 WebP/AVIF + 多尺寸 `srcset`，保留署名与许可信息 |
| F4 | **地图性能偶发长帧** | Codex 实测（`frontend/HANDOFF.md`）：可见页五秒缩放首次 **p95 33.4 ms / 最大 150.3 ms / 5 帧超 50 ms**；热态 263 帧≈**53 fps**、最大 66.8 ms、1 帧超 50 ms。不能宣称所有设备稳定 60 fps | 低端机地图缩放掉帧 | 目标具体设备做绘制分析；减少 SVG 节点（按缩放层级裁剪/虚拟化）、`will-change`/合成层优化；`frontend/tests/map-performance.html` 可复测 |
| F5 | **移动端触摸与无障碍未系统验收**（任务板 #37 仍是 TODO） | 已零散做了 `aria-pressed`/`role`/键盘回调，但没有一次成体系的触摸目标（≥44px）、焦点顺序、屏幕阅读器验收 | 手机误触、键盘/读屏用户不可用 | 逐个主导航与地图控件过一遍触摸尺寸与焦点顺序；补一次桌面+375px 的键盘走查 |
| F6 | **本地存储的边界与丢失风险** | `journal.js` 探索志问题最多 **200 条**；`story-progress.js` 版本化 localStorage；**无跨标签实时同步、无账号同步**（Codex 已明确记录） | 用户换设备/清缓存即丢学习与探索记录 | 至少提供**导出/导入 JSON**；等后端提供持久化接口后再同步（见 B7/D1） |
| F7 | **`travel-api.js` 开关与联调准备**（任务板 #36） | 四个 `/api/travel/*` 保持 `enabled=false`（正确）；后端未实现（实测 `GET` → 404、`POST` → **405**） | 预算、天气、景区列表、方案预览仍显示"待接入" | 后端落地后：置 `enabled=true`、按真实路由调 `baseUrl`，并补 ok/empty/unavailable/非 2xx/超时/非法 JSON 六种响应验收（提案见 `frontend/API-CONTRACT.md`） |
| F8 | **视觉/验收证据只在 Codex 本地机器** | `frontend/START-HERE.md` 指向 `C:/Users/Rocket/.codex/visualizations/.../*.png` | 别人（含新会话）无法复核验收结论 | 把关键截图纳入仓库（如 `frontend/tests/evidence/`）并在 HANDOFF 里引用相对路径 |
| F9 | **前端文档里的 tip/状态已过期，会误导下一个 agent** | `frontend/START-HERE.md` 写「功能基线 `4485f1b`、接手时 HEAD `b425db7`」，实际前端已到 **`55bb0a0`**；该文件自己第 78 行也提醒"旧 tip 是历史状态" | 新会话按旧 tip 判断，容易误判"无改动/需回退" | 每轮收工把 START-HERE 顶部增量段与 HEAD 一起刷新（或改成只引用 `git log`，不写死 SHA） |

| F10 | **后端新增了可展示的字段，前端还没用** | 最新容器实测：`route_planning` 现在多返回 `notice`（"路线顺序和停留时间来自 Demo 模板；实时交通、天气…需接入后确认"）与 `planning_preferences`（已解析的城市/时长/人群/交通/兴趣） | 用户看不到"这是演示模板"的诚实提示，也看不到后端已经按 `4 小时` 理解了需求（结果却给了 8 小时模板）——**冲突没被摊开** | 在路线卡片里展示 `notice` 与 `planning_preferences`（并在与 `route.route.duration_hours` 冲突时明确标注差异）；注意 `data_status: "demo_template"` 未在词表内，前端当前显示"待核验"属**正确降级**，等后端改成 `sample` 后自动显示"演示数据" |

---

## 二、被后端阻塞的（owner：后端队友）

> 这些前端**已经做了诚实的降级**（保留缺口、标"待核验"、不编造），但要真正好用必须后端补。

| # | 问题 | 实测证据 | 前端现在的行为 | 后端要做什么 |
|---|---|---|---|---|
| B1 | 🔴 **`route.stops[]` 没有坐标** | `POST /chat`「南充一天三国文化路线」返回 2 站（西山风景区·万卷楼、鹤鸣山景区·王平墓），只有 `stop_order/stay_minutes/reason/spot_id/name/city/address/recommended_duration_min/open_time` | 地图保留按地名识别的「南充市」，并提示"后端返回的 2 个站点暂无 GCJ-02 坐标"；**不猜坐标、不拿驻地冒充景区入口** | **其实数据已经有了**：`scenic_spots` 表有 `lat`/`lng` 且填了值（万卷楼 `106.067/30.792`、汉桓侯祠 `105.965/31.577`、王平墓 `106.11/30.78`、剑门关 `105.57/32.214`），是 `get_route_detail()` 的 SELECT **没取这两列** → 加 `s.lat, s.lng` 并输出 `coordinates: [lng, lat]` + `coordinate_system`（**先核实坐标系与精度**：库里只到 3 位小数） |
| B2 | 🔴 **价格类缺结构化元数据，且未知金额写成 `0`** | 「南充舒适型酒店预算和万卷楼票价多少钱」→「景区票价：西山风景区·万卷楼：**0.0 - 0.0 CNY（manual_demo）**」；`spot_tickets` 无 `sources`；`data_status` 是 `manual_demo`/`manual_demo_table`（**不在协议允许集** `sample\|maintained\|live\|pending\|stale` 内） | 原样展示不退让成"免费"，并标"待核验" | 未知金额用 `null`；每条带 `data_status` + `updated_at`（带时区 ISO8601）+ `sources[]({title, source_url, source_level})`；统一 `data_status` 取值 |
| B3 | 🔴 **含地名的旅游句被漏判，进不了路线规划** | 「从南充出发，去阆中、剑阁，再到广元旅游」→ 实测落 **`culture_qa`**（当前是关键词规则：`路线/行程/规划/两天/半日/游览…`） | 地图仍标出 4 个地名与虚线示意，但**没有进路线规划**，故事→现实路线联动无法触发 | 意图识别增强（同义词/口语/结构判断），至少让"去 A、B、C"这类出行句式进 `route_planning` |
| B4 | 🔴 **路线规划忽略硬约束** | Codex 实测：南充**半天**仍回 **8 小时**一日模板；广元**半天**仍回 **16 小时**两日模板，且**重复安排已完成**的昭化古城 | 前端显示"时间超限/已完成冲突"并**不声称**可执行 | 硬约束规划 + 剩余章节过滤 + 逐节点舍弃原因 |
| B5 | 🟡 **故事 `placeId` 与后端 `spot_id` 无稳定映射** | 「剑门关」vs「剑门蜀道剑门关旅游景区」无法确认是同一 ID | 只能按明确 ID/完整名称匹配，匹配不上就保留缺口 | 提供稳定映射（或让后端直接回 `spot_id`） |
| B6 | 🟡 **部分地点缺坐标，点不出来** | 「米仓道」等无坐标 | 不画点（只显示县级驻地示意） | 补可靠 GCJ-02 坐标与**道路/入口导航**数据（导航能力目前整体不可用） |
| B7 | 🟡 **四个旅游接口未实现** | `GET /api/travel/spots` → 404；`POST /api/travel/{plans/preview,budget/estimate,travel-info}` → 405 | `travel-api.js` 关闭，页面显示"待接入" | 按 `frontend/API-CONTRACT.md` 实现，统一 `{status,message,data}` |
| B8 | 🟡 **上下文/压缩回答不保证** | 「我只有半天」实测仍可能回 `culture_qa` 的演示检索内容 | 常驻陈寿栏提供"压缩选章"入口，但结果不可信时明确留白 | 让 `/chat` 能按上下文与剩余时间给出压缩方案 |
| B9 | 🟢 **dev 上后端已改、尚未合 master** | `origin/dev` 的 `mcp_server.py` 工具 **7→8**（新增 `plan_cultural_route`）、新增 `src/mcp_stdio_server.py`、`route_planner.py` **+31 行**、`prompts/*` | 前端当前对接的是 `4fcccad` 行为 | 合入后**需要重跑前端联调**（`route_planner` 变了，路线响应可能不同） |

---

## 三、内容缺口（owner：内容负责人）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| C1 | 五条故事线模板的**核心问题、简介、人物/事件、章节顺序与地点、每站理由** | Codex 记录：`stories.js` 里"五条 SGT_STORIES 待补充模板、四个 SGT_PLACES 待确认节点"；`TASKS.md` 2026-09-17 条目同样列为 TODO | 故事视图大量"待补充/待核验"，四条空模板的开始按钮是禁用的 |
| C2 | 文化节点**正文与正史/演义/推断/争议**的分区依据 | 文化节点详情已做五种分层与三深度阅读，但"实际正文仍待可靠资料，不编造内容" | 详情页有结构、没内容 |
| C3 | **票价/开放时间/交通**的可靠来源与 `source_level` | 与 B2 同源：`source_url` 全空、`notes` 写明"待核验" | 信任标识只能显示"待核验" |
| C4 | **实景图片与授权** | 目前只有 2 张（`jianmen-pass.jpg`、`langzhong-town.jpg`，CC BY-SA 4.0，`assets/CREDITS.md` 已记） | 首页与故事页配图受限（Openverse/小红书/Pngtree 均不可用已记录） |

---

## 四、协作与流程问题（owner：人 / 协调者）

| # | 问题 | 现状 | 建议 |
|---|---|---|---|
| ~~D1~~ | ~~`docs/` 在不同 worktree 里不同步~~ | ✅ **2026-09-20 已解决**：主仓库换成最新克隆并停在 `dev`，文档是**已跟踪文件**、与代码同源，`docs/` 随处可读 | 已处理 |
| D2 | **`.venv` 仍被 git 跟踪** | 任务板 #27；DSH 本地分支 `3b69bfd` 已做好解除跟踪的提交。**注意**：新克隆的工作区是干净的（那 1084 项改动只在旧副本里），所以它现在**不再阻断** pull | 人决定后把该提交送进 `dev`/`master` |
| D3 | **`master` 落后于 `dev`** | `origin/master` = `4fcccad`，`origin/dev` = `edcf97e`（含前端全部成果 + 队友 MCP 改动 + 协作文档与问题清单） | 决定 master 合并策略（现在 `dev → master` 是干净的快进）；⛔ 协调者已明确**暂不许直接推 master** |
| ~~D4~~ | ~~worktree 数量在膨胀~~ | ✅ **2026-09-20 已解决**：3 个 worktree 全部删除，现在只有**一个工作区** = 主仓库（停在 `dev`） | 已处理 |

---

## 五、优先级建议（一句话版）

1. **先让前端自己变快**：F1（脚本/压缩）+ F2（地图数据 3.37 MB 懒加载/拆分）+ F3（图片）——**这三条不依赖任何人**，收益最直接。
2. **再要后端三条硬阻塞**：B1（坐标，**一行 SQL 就能出数据**）、B2（价格 `null` + `data_status/sources`）、B3（意图漏判），B4 紧随。
3. **内容补齐**（C1/C3）决定故事线与文化节点能不能真正上线；**接口落地**（B7）决定预算/天气/景区列表能不能从"待接入"变成可用。
4. **流程**：D1（前端工作区改从 `dev` 派生）与 D3（master 策略）确认后，整个协作链就顺了。
