# 交接提示词 · 给 Codex（前端组 · 2026-09-12）

> **怎么用**：把下面「↓ 提示词正文 ↓」到「↑ 提示词正文 ↑」之间的内容**整段复制**给 Codex（新会话直接粘即可，它自包含）。
> 配套阅读：`docs/HANDOFF.md`（公共交接，2026-09-12 条）、`docs/TASKS.md`（任务板）、`docs/BACKEND-API.md`（接口协议）、
> `frontend/API-CONTRACT.md`（前端提案，已在 Codex 的分支上）。
>
> ⚠️ 这四个文档都在**主工作树** `D:\DSH Workspace\agent_threekingdom` 下、且**从未 git 提交**，
> 所以任何 worktree / 全新克隆里都没有——只能按绝对路径读（提示词正文里已写明）。

---

↓ 提示词正文 ↓

# 交接：三国文化旅游智能服务 · 前端（Codex 接手）

## 0. 一句话

你接手本项目的**前端**，只改 `frontend/**`。后端已完整可用（Docker 容器跑在 http://localhost:8001），
**本轮起团队只做前端**，后端/部署/内容的缺口写进任务板交给人处理，不归你。

## 1. 你的工作区（照这个来，别用别的）

- 你的工作目录：`D:\DSH Workspace\sgt-frontend-iter3`，分支 `feat/frontend-iteration-3`（当前 tip `bccae1f`）。
- 这是个 **git worktree + 稀疏检出**：只物化了 `frontend/`，所以目录里**看不到 `src/`、`docs/`**，这是正常的。
  需要放宽时用 `git sparse-checkout set frontend docs`（但见下一条：docs 是 untracked，放不出来）。
- ⛔ **不要**去主工作树 `D:\DSH Workspace\agent_threekingdom` 切分支或提交：它冻结在
  `feat/frontend-iteration-2 @ 827adc8`，还带着 1100 项 `.venv` 本地改动，切分支/`pull` 都会炸
  （协调者已决定不处理 `.venv`，别去清）。你的提交只在 `sgt-frontend-iter3` 里做。
- 公共文档只存在于主工作树的绝对路径下（它们是 untracked，任何 worktree 里都没有）：
  - `D:\DSH Workspace\agent_threekingdom\AGENTS.md`
  - `D:\DSH Workspace\agent_threekingdom\docs\TASKS.md`
  - `D:\DSH Workspace\agent_threekingdom\docs\HANDOFF.md`
  - `D:\DSH Workspace\agent_threekingdom\docs\BACKEND-API.md`
  - `D:\DSH Workspace\agent_threekingdom\docs\HANDOFF-TO-CODEX.md`（本文件）
- 工具全路径：git = `C:\Program Files\Git\cmd\git.exe`（不在 PATH）；docker = `C:\Program Files\Docker\Docker\resources\bin\docker.exe`；
  Node = `node`（v24，可直接跑前端测试，**不需要 npm install、没有打包步骤**）。

## 2. 联调环境（已就绪，直接用）

- 后端容器 `sgt-snapshot-api` → **http://localhost:8001**（healthy）。后端代码 = `origin/master @ 4fcccad`（完整可跑）。
- 容器已把 **`D:\DSH Workspace\sgt-frontend-iter3\frontend` 只读挂载**到 `/app/frontend`：
  **你改前端文件 → 浏览器刷新即生效**，不需要重建镜像、不需要本地 Python/venv（刷新没变化就 `Ctrl+F5`）。
- 端口别动：宿主 8000 被别的项目（inventree）占着，本项目固定映射 **8001**。
- 三条 `/chat` 意图 2026-09-12 实测：`route_planning` 置信度 0.82、`culture_qa` 0.55（**默认兜底值，不是真识别出来的**）、
  `budget_ticket` 0.78；空串 `message` → 200 落 `culture_qa`；**缺 `message` → HTTP 422**。

## 3. 已经做完的（别重复做，直接在其上迭代）

- `chore/merge-frontend-into-master @ 9623be1`：**前端并入 master 的候选合并**（父 `4fcccad` + `827adc8`）。
  实测只有 `frontend/index.html` 一处 add/add 冲突，已解（取前端第二迭代版；`origin/master` 侧那份是早期
  「单文件版」内联 style/script 页面，任务 #1 的 `[hidden]` 修复在 `styles.css` 里保留）。
  验证：合并结果 `frontend` 树哈希与 `827adc8` **完全相同**、17 个文件 0 差异、改动面**只有 `frontend/**`**、
  `src`/`deploy` 零污染。**未 push、未合 master**——等人 review。
- `feat/frontend-iteration-3 @ bccae1f`：**你的分支**，比上面多三个提交：
  - `aff0c37` 修了一个**真实联调缺陷**：后端 `route.stops` 既无坐标、名称又是景区 → 落不到位时
    **不再**用后端站点覆盖已识别的地名路线（新增纯函数 `MapRouteCore.resolveRoute`，把落不到位的站点记入
    `backendStopsPending` 并在状态栏提示）。
  - `366ba3e` 补了 `frontend/HANDOFF.md`（本轮交接记录）。
  - `bccae1f` 记录了「联调环境已改指本分支」与「缺坐标降级行为」（`frontend/HANDOFF.md`、`frontend/API-CONTRACT.md`）。
- 前端自带回归现状：`node --check` 6/6 通过；`app.test.cjs`、`travel-api.test.cjs`、`map-route.test.cjs` 全 PASS。

## 4. 接口协议（硬约束；细节见 `docs/BACKEND-API.md` 与 `frontend/API-CONTRACT.md`）

1. **`/chat` 响应是多态的**，一律"先判 `intent.intent` 再取字段"或用可选链：
   `culture_qa` **根本没有 `route` 这个 key**；`budget_ticket` 的 `route` 是 **`null`**；只有 `route_planning` 有对象。
   `intent` = `{intent, confidence, reason}`；顶层还有 `answer`（纯文本、含换行）。
2. **非 2xx（含 422）、超时、JSON 非法 → 必须当错误处理并可重试，不许伪装成成功。**
3. **无数据 → 显示"无数据 / 待接入"，不许生成假路线、假票价、假天气、假来源。**
4. 金额未知用 `null` 而**不是 `0`**（后端现在还没做到，前端**不许**把 `0.0 - 0.0` 说成"免费"）；
   含价格/时间/动态信息的记录必须有 `data_status`(`sample|maintained|live|pending|stale`) +
   `updated_at`(带时区 ISO8601) + `sources[]({title, source_url, source_level: A|B|C})`；
   来源链接只允许 http/https；C 级来源不得用于支撑史实结论。
5. **坐标**：底图是 **GCJ-02**（高德/腾讯系）。后端补 `stops[].coordinates` + `coordinate_system: "GCJ-02"` 之前，
   景区级点位**点不出来是正常的**——不要拿县级/市州驻地坐标冒充景区入口，不要猜坐标；缺就留缺口并提示。
6. 多态/缺字段的容错已经在 `app.js` 的 `metaNode` 和 `travel-map.js` 里实现过，改的时候**别把它改回去**。

## 5. 后端两个 P0 缺口（尚未补；前端要优雅降级 —— 以下都是实测）

1. **`route.stops[]` 没有坐标**：实测「南充一天三国文化路线」返回 2 站
   （西山风景区·万卷楼、鹤鸣山景区·王平墓），字段只有 `stop_order / stay_minutes / reason / spot_id / name / city /
   address / recommended_duration_min / open_time`。→ 地图只能按地名识别 + 标出缺口。
2. **价格类没有结构化 `data_status`/`sources`/`updated_at`，且未知金额被写成 `0`**：实测
   「南充舒适型酒店预算和万卷楼票价多少钱」→「景区票价：西山风景区·万卷楼：**0.0 - 0.0 CNY（manual_demo）**」。
   → 前端**不要改写后端文案、不要自己编数据状态**，按协议给"待核验 / 待接入"表达即可（任务板 #33）。
   （附带观察：「阆中古城门票多少钱」只回了酒店预算、没给门票信息，已记在任务板 #8。）

## 6. 你这轮该干什么（按优先级）

1. **浏览器视觉验收 + 真实联调（最该补的）**：目前**没有任何浏览器渲染验收**——上一轮受管浏览器 Edge/Chrome
   两次启动都失败（`Browser exited before DevTools became ready`）。请用你手边可用的方式跑一遍，重点：
   - 首页在 **1280 宽**与 **375 宽**：对话面板**默认收起**；右下角「对话助手」可展开/关闭；主框与面板不重叠、不横向溢出。
   - 三条意图各发一次（路线 / 文化问答 / 预算票价）：气泡、意图标签、路线卡片、召回覆盖标签正常；
     `culture_qa`（无 `route` 键）与 `budget_ticket`（`route: null`）**不报错**。
   - 地图：发「从南充出发，去阆中、剑阁，再到广元旅游」出虚线示意；后端返回**无坐标**站点时
     **地名点位不被清空**（这是 `aff0c37` 修的，务必回归确认）。
   - 错误态：断网 / 改错端口 / 触发 422 → 显示错误且「重新请求」可用；空输入时发送键禁用。
   - 结论（截图路径、复现步骤、发现的问题）写进你分支上的 `frontend/HANDOFF.md`。
2. **把验收中发现的问题修掉**（只改 `frontend/**`），每修一项配一条回归断言。
3. **对话结果的信任标识渲染**：把 `data_status` / `updated_at` / `sources` 的容错渲染补进对话结果
   ——**后端有就显示、没有就显示「待核验」，不要伪造**（协议见第 4 节）。
4. **旅游四接口的联调准备**：`travel-api.js` 默认 `enabled=false` 是**对的，先别打开**；等后端实现
   `GET /api/travel/spots`、`POST /api/travel/plans/preview`、`POST /api/travel/budget/estimate`、
   `POST /api/travel/travel-info` 后再置 `true` 并按实际路由调 `baseUrl`（提案见 `frontend/API-CONTRACT.md`）。
5. 有余力再动：移动端触摸目标、键盘可达性、无障碍标签、183 点地图的渲染性能。

## 7. 怎么自证（每次改完都跑）

- 语法：对 `frontend/*.js` 逐个 `node --check`
- 回归：`node frontend/app.test.cjs`、`node frontend/travel-api.test.cjs`、`node frontend/map-route.test.cjs`
- **真实响应回放**（没有浏览器也能验地图逻辑）：
  `node "D:\DSH Workspace\.tmp-e2e\replay-map.cjs" "D:\DSH Workspace\sgt-frontend-iter3\frontend"`
  （用最小 DOM 桩加载**真实 `travel-map.js`**，喂实测 `/chat` 响应，打印地图状态与已定位点数）
- **容器是否真在服务你改的字节**：`Invoke-WebRequest http://127.0.0.1:8001/map-route-core.js -OutFile $env:TEMP\x.js`
  然后 `Get-FileHash` 与你本地的 `frontend\map-route-core.js` 对比（应一致）
- 后端协议自测：`/health` = ok；三条意图；**缺 `message` 应回 422**

## 8. 收工要求（不遵守会被打回）

- 提交信息用 `<type>(frontend): <描述>`，小步提交，**只提交 `frontend/**`**。
- 收工回填三处：`D:\DSH Workspace\agent_threekingdom\docs\TASKS.md`（认领项改 DOING/DONE）、
  `docs\HANDOFF.md`（追加一条：做了什么 / 改了哪些文件 / 怎么验证的 / 当前状态 / 下一步 / 卡点）、
  以及你分支上的 `frontend/HANDOFF.md`。
- ⛔ 不 push `master`、不自行合并、不强推。合并由人 review 后做（先 `9623be1` 进 master，再合你的分支）。
- ⛔ 不碰 `src/**`、`deploy/**`、`data/**`、`prompts/**`；不用仓库自带的 Docker 配置构建
  （`deploy/docker-compose.yml` 与根 `Dockerfile`/`docker-compose.yml` 都是有问题的/跑 MCP 的）；
  不删快照 `data/`（业务库 + 向量库在里面）；不提交任何凭据 / `.env`。
- ⛔ 不引入框架或打包器：**原生 HTML/CSS/JS、无构建步骤**是硬约定。

## 9. 已知限制（别当真数据用）

- `LLM_BACKEND=mock`：文化问答是检索式模板输出，不是真大模型。
- 知识库只有 8 条演示知识（`data/raw/demo_knowledge.jsonl`）；票价/酒店是**维护数据、非实时**。
- 四川 21 市州 / 183 个县级点位来自 2026-09-11 的 DataV 快照，**是"驻地"不是景区入口**；
  仅作位置示意，**不提供导航**。
- 地图虚线表示"地名提及顺序"，不是道路导航，也不代表里程/车程。

↑ 提示词正文 ↑

---

## 附：协调者（人）需要做的三件事

1. **review 并合并**：先 `chore/merge-frontend-into-master`（`9623be1`）进 `master`，再合
   `feat/frontend-iteration-3`（分支 tip 会随 Codex 继续前进）。两个分支**都还在本地、都没 push**。
2. **决定协作文档是否入库**：`AGENTS.md`、`ARCHITECTURE.md`、`TESTING.md`、`docs/` 至今 **untracked**，
   所以任何 worktree / 全新克隆都读不到，Codex 只能按绝对路径读主工作树（任务板 #21）。
3. **把两个 P0 缺口转给后端/队友**：`route.stops[].coordinates` + `coordinate_system`，
   以及价格类 `data_status`/`sources`/`updated_at` 与"未知金额用 `null`"（任务板 #33；实测证据在 `docs/HANDOFF.md`）。

## 附：本轮已变更的环境（2026-09-12，DSH 做）

- 快照 `docker-compose.backend.yml` 的前端挂载源已从主工作树（`827adc8`，冻结）改为
  **`D:/DSH Workspace/sgt-frontend-iter3/frontend`**，容器已重建，实测服务端 9 个文件与迭代分支**逐字节一致**。
- 想回到「只看镜像里那份封版前端（`827adc8`）」：把那行挂载注释掉再 `up -d`；
  想回到旧的主工作树挂载源：把该行改回 `D:/DSH Workspace/agent_threekingdom/frontend` 再 `up -d`。
- 主工作树 `frontend/**` **一行未改**、仍保持冻结干净（`git status --short -- frontend` 无输出）。
