# AGENTS.md — 三国文化旅游智能服务 · 协作上下文

> 本文件是 **Codex 与 DSH（DeepSeek Harness）共同读取的仓库级上下文**。
> 动手前先读它；完成工作后按第 6 节的规则更新 `docs/TASKS.md` 与 `docs/HANDOFF.md`。

---

## 1. 项目是什么

面向 **川东北（南充 / 阆中 / 广元）三国文化旅游**的智能体后端 + Web 前端。

- **后端**：Python 3.11 服务。意图识别 → 分流到「文化问答（RAG）/ 路线规划 / 预算票价」；
  对外提供 HTTP API（`/health`、`/chat`）与 MCP 服务器（`/sse`，**8 个工具**，另有 stdio 入口 `src/mcp_stdio_server.py`）。
- **前端**：单页 Web UI（无框架、无依赖），由后端挂载在 `/` 根路径，调用同源 `/chat`。
- **设计理念**：静态内容（文化知识、景区、票价维护数据、路线模板、酒店预算档位）入库；
  动态信息（实时票价、班次、天气）交给外部 MCP 工具，不写死进知识库。
- **叙事主线**：「陈寿笔下的蜀汉记忆」；来源分级 A/B/C（C 级不能支撑史实结论）。

详细架构见 `ARCHITECTURE.md`；测试清单见 `TESTING.md`。

## 2. 代码位置

| 项 | 值 |
|---|---|
| 本地仓库 | `D:\DSH Workspace\agent_threekingdom` |
| 远端 | `https://gitee.com/wwffyyy/agent_threekingdom.git` |
| 主分支 | `master`；开发分支 `dev` |
| git 可执行文件 | `C:\Program Files\Git\cmd\git.exe`（不在 PATH，需用全路径） |
| Python | `C:\Python\Python311\python.exe`（3.11.4），venv 在 仓库根 `.venv` |

## 3. ⚠️ 当前状态（重要，务必先看）

**远端 `origin/master` = `4fcccad`（未动）；`origin/dev` = 当前开发线（前端全量 + 协作文档 + 后端改动都在这里）。**
<!-- tip 会随提交前进：用 git -C <repo> log --oneline origin/dev 查，不要照抄本文里的 SHA -->
队友已把补齐的 5 个实现模块推上去了（`7537459 补充`，随 `4fcccad` 合入 master），**远端 master 现在是一个完整可跑的后端**。
⛔ **协调者 2026-09-20 明确：不许直接推 master。** master 仍是 `4fcccad`。
`dev` 现在包含：① 队友的后端改动（MCP **8 个工具**、`src/mcp_stdio_server.py` 的 stdio 入口、`route_planner`、`prompts/*`）；
② **前端全量成果**（Codex 的 21 个提交）；③ **协作文档与问题清单**（`AGENTS.md`/`ARCHITECTURE.md`/`TESTING.md`/`docs/`）。
接口差异见 `docs/BACKEND-API-REFERENCE.md` 第 5.2 节；前端遗留问题见 `docs/FRONTEND-ISSUES.md`；
**后端待办见 `docs/BACKEND-TODO.md`**。

> 🔁 **如果你是新开的会话 / 新 agent**：先读
> `D:\DSH Workspace\HANDOFF-threekingdom-20260912.md`（**自包含交接**，含全部路径、命令、坑与禁令），
> 再回到本文件看协作边界。
>
> 🧑💻 **如果你是后端同事**：直接看 **`docs/BACKEND-TODO.md`**（工作单：P0/P1/P2 + 实测证据 + 改哪里 + 验收 + 自测命令）；
> 接口字典见 `docs/BACKEND-API-REFERENCE.md`，前端协议见 `docs/BACKEND-API.md`，
> `TESTING.md` 已按本机实情修正（**不要照旧命令跑 `create_vector_collection.py`，会崩**）。

### ✅ 现状（2026-09-12）

| 事项 | 状态 |
|---|---|
| 缺实现模块 | ✅ 队友已推送（`7537459`）。DSH 那份实现了同一批模块但**不要推**，见文末遗留分支 |
| 后端可跑 | ✅ 已用全新克隆 + Docker 实测：入库 8 条演示知识，`/health` 与三条意图全过 |
| 前端（冻结基线） | ⏸️ `feat/frontend-iteration-2` @ `827adc8`（功能代码最后提交 `adccd3c`）。现在只是**本地分支**；旧副本整份保留在 `agent_threekingdom-frozen-20260920`，新主仓库停在 `dev` |
| 远端 dev | ✅ 当前开发线（队友后端改动 + **前端全量** + **协作文档/问题清单/后端工作单**）；**master 未动**（`4fcccad`） |
| 前端（合并候选） | ✅ 分支 `chore/merge-frontend-into-master` = 前端合并提交 `9623be1` + 一条「协作文档入库」提交。**2026-09-20 前端已推到 `dev`**（dev tip 见上）；该候选分支保留本地备用（要进 master 时 `dev → master` 是干净快进） |
| 前端（当前迭代） | 🚧 `feat/frontend-iteration-3` @ `55bb0a0`：Codex 21 个提交（地图分级、故事线、陈寿常驻栏、探索志、视觉令牌…，15 组回归 + 桌面/375px 浏览器验收）。**已并入 `dev`** |
| 交付快照 | ✅ 见下节（**前端挂载源 = 主仓库 `frontend/`**，见「仓库与工作区布局」） |

### 📦 快照（当前交付物）

```
D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8\
```

= **后端 `master@4fcccad` + 前端 `827adc8`** 的合并快照，自带 DSH 自建的
`Dockerfile.backend` + `docker-compose.backend.yml`（**不使用**仓库里的 Docker 配置），
目录内 `SNAPSHOT.md` 有完整说明。当前跑在 **http://localhost:8001**（容器 `sgt-snapshot-api`）。

### 🗂 仓库与工作区布局（2026-09-20 重置后）

**当前分工**：**前端**继续做（唯一工作区 = 主仓库，分支 `dev`）；**后端缺口交给队友**，
已整理成工作单 `docs/BACKEND-TODO.md`（不要在文档里硬编码 tip，**用 `git log --oneline origin/dev` 查**）。

2026-09-20 按协调者要求，**用最新仓库的干净克隆替换了旧工作副本**（旧副本保留为回滚点）：

| 路径 | 内容 | 说明 |
|---|---|---|
| `D:\DSH Workspace\agent_threekingdom` | **主仓库 = 干净克隆，停在 `dev`** | **唯一工作区**：`frontend/**`、`docs/**`、`src/**` 都在里面；文档已是**被跟踪文件**，前端与文档同源，**不会再出现「worktree 里读不到 docs」** |
| `D:\DSH Workspace\agent_threekingdom-frozen-20260920` | 旧工作副本（194 MB） | **回滚点**：含冻结基线 `feat/frontend-iteration-2`、旧 `.venv` 状态与旧 worktree 注册。确认无误后可删 |
| `D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8` | 部署快照（28 MB） | **容器数据卷 + 镜像构建上下文，不能删**（见下节） |
| `D:\DSH Workspace\backup-agent_threekingdom-20260920.bundle` | 全引用 bundle（9.7 MB） | 备份**唯一未推送的** 5 个遗留提交（`chore/commit-missing-modules`），已在新仓库恢复为本地分支 |
| `D:\DSH Workspace\sgt-local-backup-20260911\` | 旧文件备份 | 5 个旧模块副本 + **DSH 版根 Docker 三件套**（任务 #22 待决策） |

- **原来的 3 个 worktree 已删除**（`sgt-merge-frontend`、`sgt-frontend-iter3`、`sgt-dev-integration`）：
  它们的提交内容都已在 `origin/dev` 里验证过（前端树与 `55bb0a0` 逐字节一致），删掉只损失目录、不损失历史。
  分支名都还在本地：`dev`、`feat/frontend-iteration-2`、`feat/frontend-iteration-3`、
  `chore/merge-frontend-into-master`、`chore/frontend-into-dev`、`chore/commit-missing-modules`。
- **不再需要稀疏检出**：主仓库是完整克隆（1267 个文件，含被跟踪的 `.venv` 1120 个文件 / 20.4 MB）。
  `.venv` 依然被 git 跟踪（任务 #27 未解决），但**克隆出来就是干净的**——别再去改它。
- **前端怎么改**：直接在 `D:\DSH Workspace\agent_threekingdom\frontend` 改（不是 worktree），
  改完刷新 http://localhost:8001 即生效（容器挂载的就是这个目录）。
- **合并候选 `9623be1`** 实测只有 `frontend/index.html` 一处 add/add 冲突，已解（取前端第二迭代版；
  `origin/master` 侧是早期「单文件版」）。验证：`frontend` 树哈希与 `827adc8` **完全相同**、
  17 文件 0 差异、改动面**只有 `frontend/**`**、`src`/`deploy` **零污染**。
  **已随 2026-09-20 的 dev 推送生效**（`origin/dev` = `b8a8ce3`）；**`master` 未动**。
- **迭代分支 `55bb0a0`** = 合并候选 + `aff0c37`（真实联调缺陷修复：后端 stops 无坐标且落不到位时
  不再清空地图，新增 `MapRouteCore.resolveRoute`）+ Codex 随后 20 个提交（市县分级地图、故事线与故事地图、
  万卷史官陈寿常驻栏、三国探索志、整站视觉令牌、已授权实景照片…；含浏览器验收与 15 组回归）。
  **已并入 `origin/dev`（`b8a8ce3`）**。
- **2026-09-20 推送（协调者指令：不许推 master）**：从 `origin/dev`（`546cabf`）建
  `chore/frontend-into-dev`，先合 `feat/frontend-iteration-3`、再合文档提交，得到 **`b8a8ce3`**，
  以**纯快进**推到 `origin/dev`。验证：前端树与 `55bb0a0` **逐字节一致**、队友的
  `src/**`/`prompts/**`/`README.md`/`.idea` **保留 dev 版本**、**零文件丢失**、
  相对 dev 的改动面只有 `frontend/**` + `docs/**` + 3 个根 md、**15/15 前端回归通过**。
- **联调环境（2026-09-20 现状）**：快照 `docker-compose.backend.yml` 的前端挂载源 =
  **`D:\DSH Workspace\agent_threekingdom\frontend`**（= 这份干净克隆，停在 `dev`）；容器已重建，
  实测服务端文件与主仓库**逐字节一致** → 改前端刷新即生效，看到的就是 `dev` 上的前端。
  想回到「只看镜像里那份封版前端（`827adc8`）」：把那行挂载注释掉再 `up -d`。
- 📌 **给 Codex 的接手提示词**（自包含、可直接粘）：`docs\HANDOFF-TO-CODEX.md`。

### ✅ `.venv`：已决定不管它（2026-09-12 协调者决策）

⚠️ **2026-09-20 现状**：`.venv` 仍被 git 跟踪（`dev` 上 1120 个文件 / 20.4 MB），但**新克隆出来就是干净的**；
那 1084 项本地改动只存在于旧副本 `agent_threekingdom-frozen-20260920` 里。
`3b69bfd`（解除跟踪）仍未进 master，所以**别去动 `.venv`、也别指望它从 git 里消失**（任务 #27）。

**协调者决定：不管它。** 分工上前端组只做前端、后端由 Docker 提供，所以不在这上面纠缠：

- ⛔ 不要清理或改动 `.venv`（现在本来就没有本地改动了，别自己制造）。新主仓库**可以正常 `git pull`**。
- ✅ 前端开发环境 = **Docker 后端 + 挂载前端目录**，**完全不需要本地 Python / venv**。
  后端跑在 http://localhost:8001（容器 `sgt-snapshot-api`）。
- ✅ 前后端对接靠接口协议，不靠"环境一致"：
  - `docs/BACKEND-API.md` —— DSH 对真实后端**实测**出来的协议（现状 + 缺口清单）
  - `frontend/API-CONTRACT.md` —— Codex 写的**前端提案**（4 个待实现接口 + `map_route`）

### 已知问题

1. **`.venv` 被 git 跟踪**：会阻断 pull/merge。→ 需要把 `3b69bfd` 这类改动送进 master。
2. **`master` 与 `dev` 历史分叉**，合并策略需人确认。
3. **网络受限**：连不上 `registry.npmjs.org`、`pypi.org`、Docker Hub。走镜像
   （pip 清华源已配；npm 用 `https://registry.npmmirror.com`）。
4. **仓库自带的 Docker 配置都有问题**（建议反馈队友）：
   - 根 `Dockerfile` / `docker-compose.yml` 跑的是 **MCP 服务**（基底 Dify 镜像），不是 Web API + 前端；
   - `deploy/docker-compose.yml` 的 `context: .` 会被 Compose 解析成 `deploy/` 目录 →
     构建必失败（`deploy/deploy/Dockerfile` 不存在）；且仓库无 `.gitattributes`，Windows 上
     `deploy/docker-entrypoint.sh` 检出成 CRLF → 容器报 `exec /docker-entrypoint.sh: no such file or directory`；
   - `src/ingest/create_vector_collection.py` **直接实例化 `MilvusVectorStore()`、没有兜底**，
     而镜像又不装 `pymilvus` → 默认 `VECTOR_BACKEND=milvus` 下容器启动必崩。
     需 `VECTOR_BACKEND=local`，或给该脚本加兜底（`get_vector_store()` 是有兜底的，就它没有）。

### DSH 的遗留分支（仅在本地，未推送）

`chore/commit-missing-modules`，5 个提交（**2026-09-20 已随新克隆恢复为本地分支；整份引用另有 bundle 备份** `backup-agent_threekingdom-20260920.bundle`）：

| 提交 | 内容 | 处置建议 |
|---|---|---|
| `3b69bfd` | 解除 `.venv` 的 git 跟踪 | **有价值**，.venv 问题仍在，可摘出来用 |
| `35333dc` | 5 个实现模块 | ⛔ **别推** —— 会和队友版本撞车（两套实现不同） |
| `378d405` | `src/api.py` 静态资源禁缓存 | 可选 |
| `a370553` | `requires-python >=3.11` | 可选 |
| `671a703` | compose 构建上下文 + `*.sh` 换行符 | **有价值**，修的是真 bug |

### 仍未入库（需要人决策）

| 项 | 说明 | 建议 |
|---|---|---|
| ~~`AGENTS.md`、`ARCHITECTURE.md`、`TESTING.md`、`docs/`~~ | ✅ **已入库**：2026-09-20 起这些文档是**被跟踪文件**，随 `dev` 一起走。主仓库就是干净克隆，`docs/` 与代码同在一处，**不需要再按绝对路径找**；本地候选分支 `chore/merge-frontend-into-master` 上也有同一份 | 已处理 |
| 根目录 `Dockerfile`、`docker-compose.yml`、`docker-entrypoint.sh`（主工作树里未跟踪的那三个） | 是 DSH 早先做的**Web API 版**，与队友新增的根 MCP 版**同名不同用途**，会造成混淆 | 明确取舍后删掉其中一套 |
| 主工作树里 5 个未跟踪的模块副本 | 队友已推送官方版本，本地这几份（内容不同）**已被备份**到 `D:\DSH Workspace\sgt-local-backup-20260911\` | 可删 |


## 4. 如何运行与验证

### 本地（推荐用于快速验证）
```powershell
$dest = "D:\DSH Workspace\agent_threekingdom"
$py   = "$dest\.venv\Scripts\python.exe"
$env:PYTHONPATH = "$dest\src"
$env:VECTOR_BACKEND = "local"      # ⚠️ 必须：不装 pymilvus 时 milvus 后端会崩

& $py src\ingest\seed_business_db.py           # 初始化业务库
# & $py src\ingest\create_vector_collection.py # ⚠️ 跳过：只认 Milvus 且无兜底，本地后端不需要它
& $py src\ingest\ingest_pipeline.py            # 导入知识（写入 data/processed/vector_store.json）
& $py -m uvicorn api:app --host 127.0.0.1 --port 8010 --app-dir src
```

### Docker（推荐：用快照）
```powershell
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
cd "D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8"
& $docker compose -f docker-compose.backend.yml up -d --build
```
访问 `http://localhost:8001`（宿主 8001 → 容器 8000，容器名 `sgt-snapshot-api`）。
快照说明见该目录下 `SNAPSHOT.md`。

> ⚠️ **不要**拿仓库里的 Docker 配置构建：
> `deploy/docker-compose.yml` 的 `context: .` 会被 Compose 解析成 `deploy/` 目录 → 构建必失败；
> 根目录 `Dockerfile`/`docker-compose.yml` 跑的是 MCP 服务、不是 Web API。
> 两者的问题详见第 3 节「已知问题 4」。

### 前端联调（2026-09-20 重置后：挂载的是主仓库）
```powershell
# 容器已在跑：sgt-snapshot-api @ http://localhost:8001
# 挂载源 = 主仓库（干净克隆，停在 dev）：
#   D:\DSH Workspace\agent_threekingdom\frontend  ->  /app/frontend (ro)
# → 改 frontend/** 之后浏览器刷新即生效（Ctrl+F5 兜底），
#   不需要重建镜像，也不需要本地 Python / venv。
# 想回到「只看镜像里那份封版前端（827adc8）」：把 compose 里那行挂载注释掉，再 up -d。
# 校验容器是否真在服务你改的字节：Get-FileHash 对比
#   http://127.0.0.1:8001/xxx.js 与本地的 frontend/xxx.js（应一致）。
```

### 用「最新仓库」起一个独立容器（2026-09-20 起，DSH 自建）
```powershell
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
cd "D:\DSH Workspace\sgt-latest-dev"
& $docker compose -f docker-compose.latest.yml up -d --build    # 构建 + 启动（上下文 = 主仓库）
& $docker compose -f docker-compose.latest.yml logs -f          # 看 seed/ingest 与访问日志
& $docker compose -f docker-compose.latest.yml down             # 停止并删容器（数据目录保留）
```
- 访问 **http://localhost:8002**（宿主 8002 → 容器 8000）；容器名 `sanguo-latest-api`，镜像 `sanguo-latest:dev`（约 440MB）。
- 与 8001 上那个联调快照容器**并存互不干扰**：8001 = 快照（`master@4fcccad`）+ 实时挂载前端；
  8002 = **当前 `dev` 代码**烘焙进镜像（**验证"最新仓库能不能跑"用这个**）。
- 数据卷 = 主仓库的 `data/`（`data/processed/*` 已被 `.gitignore` 忽略，不会弄脏 git）。
- 这个配置**不使用**仓库自带的 Docker 文件（那两套都有问题，见第 3 节「已知问题 4」与 `docs/BACKEND-TODO.md` 4.6）。

### 验收标准
- `GET /health` → `{"status":"ok", ...}`
- `GET /` → 返回前端页面（含「三国文化旅游助手」）
- `POST /chat` body `{"message":"南充一天三国文化路线"}` → `intent=route_planning`，含路线与站点
- 前端页面：对话面板**默认收起**，点右下角「对话助手」展开。

## 5. 分工边界（防冲突铁律）

> **两个 agent 绝不同时改同一个文件。** 跨界的改动，写进任务板请对方处理。

| 负责方 | 范围 |
|---|---|
| **队友（后端）** | `src/**`、`data/**`、`prompts/**`、`deploy/**` 与 Docker 配置。**开工先读 `docs/BACKEND-TODO.md`**（工作单：优先级 + 实测证据 + 改哪里 + 验收 + 自测命令） |
| **Codex / 前端** | `frontend/**`（界面、交互、样式） |
| **DSH** | 部署快照与 Docker 环境、联调脚本、协作文档维护（`docs/**` 的最终决策归人） |
| **人（协调者）** | `data/**`、`prompts/**`、`docs/**` 的决策；review 与合并；**推送目标** |

> 🔸 **2026-09-20 现状**：**前端**继续做，唯一工作区就是主仓库 `D:\DSH Workspace\agent_threekingdom`（分支 `dev`）；
> **后端的缺口交给队友**，已经整理成工作单 **`docs/BACKEND-TODO.md`**。
> 两边在同一仓库、同一条 `dev` 分支上干活：**改别人负责的文件前先写进任务板**，也别多人同时改同一文件。

## 6. 协作规则

1. **动手前**：读本文件 → 看 `docs/TASKS.md` 认领任务 → 在任务板把状态改成 `DOING`。
2. **分支**：各自开分支（Codex: `feat/*`；DSH: `fix/*` 或 `chore/*`），**不要直接推 `master`**。
3. **小步提交**：频繁 commit，写明改了什么；提交信息用 `<type>(<scope>): <描述>`（如 `fix(frontend): ...`）。
4. **收工**：更新 `docs/TASKS.md` 状态，并在 `docs/HANDOFF.md` 留下「做了什么 / 下一步 / 卡点」。
5. **不擅自合并**：由人 review 后合并；涉及共享分支的强制操作（force push 等）必须先经人确认。
6. **凭据**：`.env`、Gitee 私人令牌等敏感信息**不得提交**。

## 7. 代码约定

- Python：类型注解 + `from __future__ import annotations`；配置集中在 `san_guo_core/settings.py`；统一用 `get_settings()`。
- 数据模型：`san_guo_core/models.py`（pydantic）；不要另起体系。
- 前端：原生 HTML/CSS/JS，无构建步骤；**不要引入打包器/框架**（除非事先约定）。
- 中文文案直接写中文，不用转义。
- 票价/时间等动态信息必须带 `data_status`；来源必须标 `source_level`。

## 8. 快速导航

| 想改什么 | 去哪里 |
|---|---|
| 界面 / 交互 / 样式 | `frontend/index.html`、`styles.css`、`app.js` |
| 意图分支逻辑 | `src/agent/intent_router.py`、`src/agent/orchestrator.py` |
| 检索质量 | `src/rag/hybrid_retriever.py`、`reranker.py`、`recall_checker.py` |
| 路线规划 | `src/planning/route_planner.py` |
| 业务数据查询 | `src/tools/travel_business_tools.py` |
| 表结构 | `src/db.py` |
| 文化内容 / 景区 / 票价 / 路线数据 | `data/examples/*.json`、`data/raw/` |
| 提示词 | `prompts/*.md` |
| 前端工作区（唯一） | `D:\DSH Workspace\agent_threekingdom`（干净克隆，分支 `dev`；直接改 `frontend/**`） |
| 给 Codex 的接手提示词 | `docs\HANDOFF-TO-CODEX.md`（自包含，可直接粘贴给新会话） |
| 后端全部接口字典 | `docs\BACKEND-API-REFERENCE.md`（HTTP + MCP、逐字段、边界、错误码、源码索引） |
| **后端工作单（队友）** | `docs\BACKEND-TODO.md`（P0/P1/P2、实测证据、改哪里、验收标准、自测命令） |
| 前端当前问题清单 | `docs\FRONTEND-ISSUES.md`（F1–F10 前端自己改 / B1–B9 交后端队友 / C1–C4 内容 / D1–D4 协作流程） |
| 用最新仓库起容器（8002） | `D:\DSH Workspace\sgt-latest-dev\docker-compose.latest.yml`（见第 4 节「用最新仓库起一个独立容器」） |
| 前端对接协议 / 缺口清单 | `docs\BACKEND-API.md` |
| 部署 | 快照目录 `sgt-snapshot-4fcccad-827adc8\`（DSH 自建的 `Dockerfile.backend` + `docker-compose.backend.yml`）；仓库自带的 `deploy/` 与根目录 Docker 配置目前都有问题，见第 3 节 |
