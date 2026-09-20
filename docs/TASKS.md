# 任务板 · TASKS

> 规则：动手前先认领并把状态改为 `DOING`；收工改成 `DONE` 并在 `docs/HANDOFF.md` 留交接。
> 状态：`TODO` / `DOING` / `BLOCKED` / `DONE`。负责方：`Codex` / `DSH` / `人`。
>
> **当前焦点（2026-09-12 · 前端组接手）**：队友已把 5 个缺失模块补齐并推送，`master@4fcccad` 是**完整可跑的后端**；
> Codex 的前端已按协调者指令**暂停冻结**在 `feat/frontend-iteration-2@827adc8`。
> DSH 已产出交付快照 `D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8\`（后端 + 前端 + 自建 Docker 配置），
> 跑在 **http://localhost:8001**。**下一步是把两条线并回仓库主线。**
> **本轮（前端组）已做**：#25 合并候选、#7 真实联调 + 缺陷修复 —— 都在**隔离 worktree** 里做
> （主工作树脏、1100 项 `.venv`；绝不切主工作树分支、不 pull）。
> 结果：合并候选 `9623be1`（前端并入 master）与迭代分支 `feat/frontend-iteration-3`（`aff0c37` 缺陷修复）
> **均已提交并实测验证；都在本地、都未 push、都未合 master**，等 review（AGENTS 6.5）。

> 🔸 **2026-09-12 起：团队只做前端。** `src/**`、`data/**`、`prompts/**` 的缺口不归本组，写进本板交人转给后端/队友。
> - 联调环境已对准前端：容器 `sgt-snapshot-api` 的前端挂载源改为
>   `D:\DSH Workspace\sgt-frontend-iter3\frontend`（= 迭代分支 `feat/frontend-iteration-3`），
>   改前端刷新即生效，不需要重建镜像。
> - **前端唯一工作区**：`D:\DSH Workspace\sgt-frontend-iter3`（分支 `feat/frontend-iteration-3`）。
>   主工作树 `agent_threekingdom` 是**冻结基线**（`827adc8`），别在它上面切分支/提交/pull。
> - 📌 交接提示词（给 Codex，自包含可直接粘）：`docs/HANDOFF-TO-CODEX.md`。

## 前端待办（Codex · 本轮起只做前端）

| # | 任务 | 负责 | 涉及文件 | 状态 | 备注 |
|---|---|---|---|---|---|
| 34 | 浏览器视觉验收 + 真实联调（1280 / 375） | Codex | `frontend/**` | DONE | 内置浏览器验收、三意图、地图保留、真实 422 重试通过；截图与步骤见 frontend/HANDOFF.md 最新记录。真实断网未操作，由自动注入测试覆盖 |
| 35 | 对话结果信任标识容错渲染 | Codex | `frontend/app.js`、`styles.css` | DONE | 状态/带时区更新时间/安全来源链接；缺失待核验，C 级不能支撑史实；回归通过 |
| 36 | 旅游四接口联调准备（开关与 `baseUrl`） | Codex | `frontend/travel-api.js` | TODO | 现在 `enabled=false` 是对的；等后端实现 4 个 `/api/travel/*` 后再置 `true`，提案见 `frontend/API-CONTRACT.md` |
| 37 | 移动端触摸目标 / 键盘可达 / 无障碍标签 | Codex | `frontend/**` | TODO | 有余力再做 |
| 38 | 183 点地图渲染与交互性能 | Codex | `frontend/travel-map.js` | TODO | 有余力再做 |
| 39 | 基于项目介绍完善智能体能力叙事与旅程闭环 | Codex | `frontend/**` | DONE | 首页新增四步智能陪伴叙事与四类游客场景提问；保持两项主导航及四川地图完整，五组回归和桌面/375px 浏览器验收通过 |

## 进行中

| # | 任务 | 负责 | 涉及文件 | 状态 | 备注 |
|---|---|---|---|---|---|
| 26 | ~~主工作树的 `pull`~~ | — | 仓库根 | **取消** | **2026-09-12 协调者决定：不管 `.venv`，不再尝试 pull 主工作树。** 前端组只做前端、后端走 Docker，E2E 对接靠 `docs/BACKEND-API.md` |
| 5 | 容器化配置统一 | DSH + 人 | `deploy/**`、根目录与快照的 Docker 文件 | DOING | 快照里已有可用的 `Dockerfile.backend`/`docker-compose.backend.yml`；仓库自带的 `deploy/` 与根目录两套**都有问题**（见 `AGENTS.md` 已知问题 4），建议反馈队友 |

## 待办（高优先级）

> ⚠️ **本轮起只做前端**：下表里 #32 属前端（与 #34 同）；#31 是人 review+合并；#27/#28/#8/#21/#22/#33
> **不归前端组**，列在这里只为交代上下文，别去动手。

| # | 任务 | 负责 | 涉及文件 | 状态 | 备注 |
|---|---|---|---|---|---|
| 27 | 把 `.venv` 从 git 跟踪里摘掉 | 人 + DSH | 仓库根 + `.gitignore` | TODO | **这是 #26 的根因**。DSH 分支里的 `3b69bfd`（`git rm -r --cached .venv`）已经做好并可复用；不解决会持续阻断 pull/merge |
| 28 | 反馈队友：`create_vector_collection.py` 缺兜底 | DSH + 人 | `src/ingest/create_vector_collection.py` | TODO | 它直接实例化 `MilvusVectorStore()`，而 `requirements.docker.txt` 又不装 `pymilvus` → **仓库自带的 Docker 入口必然崩**。`get_vector_store()` 有兜底，就它没有 |
| 8 | 后端意图识别增强 | DSH | `src/agent/intent_router.py`、`orchestrator.py` | TODO | 目前是关键词规则，口语/同义词易漏判（如"陈寿跟南充有啥关系"可能漏）。**2026-09-12 前端组实测补充**：「阆中古城门票多少钱」只回酒店预算 220–420 CNY、**没有任何门票信息** |
| 21 | 协作文档入库（`AGENTS.md`/`ARCHITECTURE.md`/`TESTING.md`/`docs/`） | 人 | 同名文件 | TODO | 现在只在主工作树里、从未提交；任何 worktree / 全新克隆都读不到，违背"共同读取"的初衷 |
| 22 | 清理根目录重复 Docker 文件 | 人 | 根 `Dockerfile`、`docker-compose.yml`、`docker-entrypoint.sh` | TODO | 主工作树里未跟踪的那三个是 DSH 早先做的 **Web API 版**；队友新增的根版是 **MCP 版**，同名不同用途 → 必须明确取舍 |
| 31 | 人 review 后把前端合入 `master` | 人 | `frontend/**` | **待确认** | 两个本地候选：`chore/merge-frontend-into-master`（= 前端合并提交 **`9623be1`** + **文档入库提交**）；`feat/frontend-iteration-3` = **`55bb0a0`**（Codex 在其上又完成 21 个提交：地图分级/故事线/陈寿常驻/探索志/视觉令牌…）。**推送已就绪**：凭据 OK、`push --dry-run` 通过，且从 `origin/master` 到候选分支是**干净的 fast-forward**。**2026-09-20 协调者决定：先不推**（保持就绪，随时可推） |
| 32 | 前端浏览器视觉验收（桌面 + 手机） | 人 / DSH | `frontend/**` | DONE | Codex 已完成，证据与限制见 #34 及 frontend/HANDOFF.md |
| 33 | 后端补两个 P0 缺口：`stops[].coordinates` + 价格 `data_status`/`sources` | 后端 / 人 | `src/**`、`data/**` | TODO | 实测证据见 `docs/HANDOFF.md` 2026-09-12 条：`stops` 无坐标；票价实测回 `0.0 - 0.0 CNY（manual_demo）`（未知写成 0，前端照实显示会像"免费"）；结构化字段无 `data_status`/`sources`/`updated_at`。**前端已就绪：坐标一补上地图自动对齐（已实测对照）** |

## 待办（内容类，需人核实来源）

| # | 任务 | 负责 | 涉及文件 | 状态 | 备注 |
|---|---|---|---|---|---|
| 9 | 扩充三国文化知识块（带 `source_level`） | 人 | `data/raw/`、`data/examples/knowledge_chunks.sample.jsonl` | TODO | 队友已加了演示数据 `data/raw/demo_knowledge.jsonl`（8 条），文化问答已能给出真实内容；仍需权威来源 |
| 10 | 核对景区与票价数据（标 `data_status`、`source_url`） | 人 | `data/examples/scenic_spots_*.json` | TODO | 票价为演示维护数据（实测返回 `0.0 - 0.0 CNY (manual_demo)`），非实时 |
| 11 | 扩充路线模板（按人群/时长/主题） | 人 | `data/examples/routes.sample.json` | TODO | 目前仅 3 条 |
| 12 | 打磨提示词 | 人 | `prompts/*.md` | TODO | 讲解风格、正史/演义区分规则 |

## 已完成

| # | 任务 | 完成方 | 备注 |
|---|---|---|---|
| 41 | **协作文档入库** | DSH（前端组） | 按协调者 2026-09-20 决定，`AGENTS.md`、`ARCHITECTURE.md`、`TESTING.md`、`docs/`（共 8 个 md）已作为**一条独立提交**放在 `chore/merge-frontend-into-master` 分支上，会随它进 master。**未 push**（见 #31）|
| 40 | **后端所有接口整理成文档** | DSH | 新增 `docs/BACKEND-API-REFERENCE.md`：HTTP（`/health`、`/chat` 四意图多态矩阵、静态挂载、`/docs`/`/openapi.json`、错误码、CORS）+ MCP（7 个工具 + dev 上 8 个与 stdio 入口），逐字段与边界**全部对运行中的容器实测**。**关键发现**：①`route.stops` 缺坐标其实是 `get_route_detail` 没 SELECT `scenic_spots.lat/lng`（**数据本来就有**，一行 SQL 的事）；②`REDIS_ENABLED` 环境变量**无效**（`Settings` 没这个字段）；③`spot_tickets.data_status=manual_demo` **不在协议允许集**里 |
| 25 | **把 Codex 前端分支并进 `master`（产出合并候选）** | DSH（前端组） | `9623be1`：实测只有 `frontend/index.html` 一处 add/add 冲突，解冲突取前端分支版本（`origin/master` 那份是早期单文件版；**#1 的 `[hidden]` 修复在 `styles.css` 中未丢**）。验证：合并后的 `frontend` 树哈希与 `827adc8` **完全相同**、17 个文件 0 差异、改动面只有 `frontend/**`、`src`/`deploy` 零污染。**未 push、未合 master**（见 #31） |
| 7 | **前端对真实后端联调 + 修真实缺陷** | DSH（前端组） | `aff0c37`：后端 stops 无坐标且落不到位时不再清空地图（新增 `resolveRoute`）。验证：真实响应回放（冻结版 0 个已定位点 → 修复版保留「南充市」）+ 含 GCJ-02 坐标对照与冻结版行为一致 + 前端回归全过；浏览器验收见 #32 |
| 4 | **补齐 5 个缺失实现模块** | **队友** | 提交 `7537459`（随 `4fcccad` 进 master）。DSH 那份同批模块（`35333dc`）**已作废，不要推** |
| 30 | 交付快照（后端 + 冻结前端 + 自建 Docker 配置） | DSH | `sgt-snapshot-4fcccad-827adc8\`，含 `SNAPSHOT.md`；实测前端 17 文件逐字节一致、容器 healthy、三条意图全过 |
| 29 | 实测全新克隆的完整后端可跑 | DSH | 入库 8 条演示知识；`/health`+ 三条意图全过；Docker 容器 healthy |
| 6 | 解除 `.venv` 的 git 跟踪（DSH 侧做完） | DSH | 提交 `3b69bfd`，移除 1120 个文件。**仍在本地分支、未推送**；仓库侧的 `.venv` 跟踪问题依然存在（见 #27） |
| 24 | 实测全新克隆可跑（本地 / Docker / Gitee 远端 三条链路） | DSH | 见 `docs/HANDOFF.md` |
| 2 | 静态资源禁缓存（改前端不生效问题） | DSH | 提交 `378d405`。**快照未打此补丁**；但 2026-09-12 起快照默认把前端目录**挂载**进容器（改完刷新即生效），所以禁缓存补丁仍不需要；要吃现成缓存就 `Ctrl+F5` |
| 1 | 前端对话面板默认收起（`hidden` 被 CSS 覆盖的 bug） | DSH | 已加 `[hidden]{display:none!important}` |
| 3 | 前端界面改版（主题 + 落地页 + 结构化气泡） | DSH → Codex | 后续迭代已全部由 Codex 接手 |
| 13 | 环境搭建（Python 3.11 venv、依赖、pip 清华源） | DSH | — |
| 14 | 补齐 5 个缺失实现模块（本地可跑通三条链路） | DSH | 已被队友的官方版取代（见 #4） |
| 15 | Docker 化 | DSH | 快照版可用；仓库自带的两套待统一（见 #5） |
| 16 | 前端从零接入 `/chat`（含多轮历史、加载态、错误态） | DSH | — |
| 17 | `dev` 合并进 `master` 并推送 | DSH | — |
| 18 | 编写 `ARCHITECTURE.md`、`TESTING.md` | DSH | 尚未入库，见 #21 |


### 2026-09-12 Codex 联调新增缺口

- 交人协调后端：输入“从南充出发，去阆中、剑阁，再到广元旅游”实际回 culture_qa，未进入路线规划；前端仍保留四个地名点和虚线。前端未改识别逻辑。

### 2026-09-13 · Codex 地图迭代

| 任务 | 负责人 | 范围 | 状态 | 验证 / 后续 |
|---|---|---|---|---|
| 市县轮廓分级、平滑缩放、标注避让、成都省会、川东北文案、县域内部点击 | Codex | frontend/** | DONE | 四组自动回归通过；桌面/手机截图与可见页帧率见 frontend/HANDOFF.md。服务恢复后最终在线复测通过；热态约 53fps，仍有偶发长帧，详见交接 |

### 2026-09-13 地图缺陷修复（Codex）

- DONE：高倍拖动边缘缺块、地图文字拖选、独立简化导致的地块错缝、成都省会后缀；四组回归通过，浏览器 800% 拖动与禁选实测通过。详见 frontend/HANDOFF.md 最新记录。

### 2026-09-13 智能体优先首页（Codex）

- DONE：主导航七项缩为两项，首页直接提问，地图辅助智能体，加入已署名授权的剑门关/阆中实景图片；五组回归与桌面/手机浏览器联调通过。详见 frontend/HANDOFF.md 与 assets/CREDITS.md。

### 2026-09-14 新对话接手文档

- DONE（Codex）：frontend/START-HERE.md 已整理，交接提交 ec4e714，功能基线 4485f1b；没有新增功能，下一轮按用户反馈继续。

### 2026-09-14 项目介绍图转译为游客体验（Codex）

- DONE：没有照搬内部多智能体架构图，而是在智能体优先首页加入“从听懂你，到陪你走完”的四步旅程：需求理解、遗迹串联、人物文化讲解、持续追问调整；普通初访、亲子同行、研学寻史、人物追踪均可直接发起同一对话。
- 四川地图未删除、未改地图脚本；自动回归覆盖地图节点、21 市州/183 县区及交互，浏览器桌面和 375×812 移动视口均确认地图可见。详见 frontend/HANDOFF.md 最新记录。


### 2026-09-16 接手状态核验（Codex）

- DONE：已读 START-HERE、AGENTS、任务板与前端最新交接；实际分支 feat/frontend-iteration-3，HEAD b425db7（比提示中的 ec4e714 新），工作区干净。首页与 /health 返回 200，服务首页与迭代目录 index.html 内容一致。未认领新功能，等待用户后续需求。

### 2026-09-16 智能体旅程工作台重构（Codex）

- DONE：已提交 fba8a41，完成旅程工作台四主题、偏好传递、独立草稿、文化线索卡与地图入口；增加可取消过渡、滚动/焦点恢复。四川地图实现未改，桌面/手机验收和六组回归通过；未合并、未 push。

### 2026-09-17 首页故事线推荐（Codex）

- DONE：已先审查再实现五个故事线模板、详情、地图轮廓预览、陈寿入口与建筑节点。用户确认桌面五卡/手机单列和缺项提示；七组回归与桌面/375px 浏览器验收通过，实际服务文件一致。完整内容待提供；详见 frontend/HANDOFF.md 2026-09-17。
- TODO（人 / 内容负责人）：提供五模板的核心问题、简介、人物事件、章节顺序及地点、各站理由、A/B 来源与更新时间；补可信坐标及出行约束。当前全部待补充/待核验，不生成假路线。


### 2026-09-17 三国故事地图（Codex）

- DONE：完成既有地图上的故事图层、章节三态/进度、建筑微缩卡和陈寿上下文承接；八组回归、JS 语法及桌面/375px 浏览器检查通过。仅前端增量改造，详见 frontend/HANDOFF.md。
- TODO（后端 / 内容负责人）：补齐故事资料与来源、米仓道具体落点、可靠 GCJ-02 坐标和道路/入口导航数据；通过 StoryMap.setData 适配口接入。当前缺项标待确认，导航不可用，/api/travel/* 未启用。



### 2026-09-17 故事线系统（需求12）
- DONE（Codex）：已实现筛选、详情章节轴、本地进度、手选压缩与三讲解模式；用户确认内容缺项保留。九组回归、语法检查及桌面/375px浏览器验收通过，详见迭代 frontend/HANDOFF.md 需求12记录。


### 2026-09-17 故事线转现实路线
- DONE（Codex，2026-09-18）：旧trip-form接入/chat，完成站点理由/章节取舍、局部重绘、重试、县级示意与返回路径。十组回归及真实后端/375px验收通过，进度2/3保持。


- TODO（后端/人）：真实半天请求仍返回南充8小时/广元16小时固定模板；已完成昭化古城仍重复安排。需硬约束/剩余章节过滤、逐节点舍弃原因、稳定story.placeId↔spot_id映射、交通/开放/费用来源。前端已标冲突，不宣称可执行。

### 2026-09-18 文化节点详情
- DONE（Codex）：文化节点详情、五种分层SVG、三深度阅读与位置保持、正史/演义/推断/争议及旅游信息分区完成。十一组回归与桌面/375px验收通过。实际正文仍待可靠资料，不编造内容。


### 2026-09-18 人物视角对话
- DONE（Codex，c67b532）：三人物视角与SVG、请求快照、证据分层、张飞兴趣匹配及同章节对照完成；十二组回归和桌面/375px联调通过。人物规则放history避免污染关键词路由，原回答无逐项出处保持未核验。


### 2026-09-18 我的三国探索志
- DONE（Codex，4e7fcfe）：journal主导航、三卷书页、真实完成进度/足迹/人物事件/问题兴趣/有理由推荐完成。十三组测试及桌面/375px联调通过；本地200条问题、删除撤销同步，缺项不编造。


### 2026-09-18 需求20修正与接口契约
- DONE（Codex，d8b46c1）：阶段显式化、人物联动不抢视图、提示保留、真实mode共用状态、空模板收敛、九项接口契约与适配降级完成；13组测试、JS语法、diff检查及桌面/375px联调通过。仅本地提交，未推送或合并。


### 2026-09-18 万卷史官·陈寿
- DONE（Codex，b8c4eb1，2026-09-19）：常驻陈寿SVG四态、真实上下文、选章承接/完成撤销、半天选章入口、三人物匹配与地点链接完成；14组回归、JS语法、diff检查、桌面/375px验收通过。后端演示检索仍不保证上下文压缩路线。仅本地提交，未推送或合并。


### 2026-09-19 整站视觉语言
- DONE（Codex）：已补齐间距/字体/层级/阶段/动效令牌与组件可信度状态；新增 DESIGN-SYSTEM.md 和设计令牌测试。15组回归通过，文字关键配色最低4.91:1，375/768/1440静态浏览器验收；Docker未运行，未重跑/chat。
