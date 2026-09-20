# 后端待办与接手说明 · BACKEND-TODO

> **给谁看**：本项目的**后端负责人（队友）**。前端侧的问题清单在 `docs/FRONTEND-ISSUES.md`（B 组就是从后端角度摘过来的），
> 接口字典在 `docs/BACKEND-API-REFERENCE.md`，协议口径在 `docs/BACKEND-API.md`。
>
> **口径（别当推测）**：下面每条都写明**证据**。HTTP 相关结论来自**对运行中的容器实测**
> （`http://localhost:8001`，后端 = 本仓库 `dev` 分支的 `src/**`）；SQL/字段来自**源码与 SQLite 实查**；
> 复现脚本在 `D:\DSH Workspace\.tmp-e2e\`（`probe_all.py`、`inspect_db.py`、`dump_openapi.py`）。
> **写成这份文档时的基线**：`origin/dev`（前端 + 文档 + 你的 MCP 改动都在里面）。
> 远端随时会前进，**别照抄 SHA，用 `git log --oneline origin/dev` 看当前 tip**。

---

## 0. 先说三件事

1. **别推 `master`**（协调者 2026-09-20 明确）。推送目标只到 `dev`，且先 `git push --dry-run` 确认是**快进**——
   不要强推，`dev` 上有别人的提交。
2. **不要用仓库自带的 Docker 配置跑 Web API**（根 `docker-compose.yml` 跑的是 MCP 服务，`deploy/` 那套有构建 bug）。
   细节和修法见第 4 节。
3. **改完接口请顺手跑一遍前端回归**（15 组，第 5 节给了命令）：前端直接消费你的响应，
   协议一变它会先坏；跑一遍能立刻发现。

---

## 1. 你的工作区与怎么把它跑起来

### 1.1 代码

| 项 | 值 |
|---|---|
| 仓库 | `D:\DSH Workspace\agent_threekingdom`（**2026-09-20 换成了最新仓库的干净克隆，停在 `dev`**） |
| 远端 | `https://gitee.com/wwffyyy/agent_threekingdom.git` |
| 你的范围 | `src/**`、`data/**`、`prompts/**`、`deploy/**` 与 Docker 配置 |
| 别人的范围 | `frontend/**` 归前端；`docs/**` 的最终决策归协调者（你可以回填 `docs/TASKS.md`/`docs/HANDOFF.md`） |
| git（不在 PATH） | `C:\Program Files\Git\cmd\git.exe` |
| Python | `C:\Python\Python311\python.exe`（3.11.4）；仓库里还有个**被 git 跟踪的 `.venv`（其实是 3.12）**，见 4.5 |

> 旧工作副本（含 1100 项 `.venv` 本地改动）已退役，整份保留在 `D:\DSH Workspace\agent_threekingdom-frozen-20260920`。

### 1.2 本地直跑（后端自测最快）

```powershell
$py  = "C:\Python\Python311\python.exe"
$src = "D:\DSH Workspace\agent_threekingdom\src"
$env:PYTHONPATH = $src
$env:VECTOR_BACKEND = "local"      # ⚠️ 必须！不设的话默认 milvus，而本镜像不装 pymilvus → 直接崩

& $py "$src\ingest\seed_business_db.py"     # 业务库（写入 data\processed\business.sqlite3）
# ⛔ 不要跑 src\ingest\create_vector_collection.py —— 它只认 Milvus 且无兜底（见 4.4）
& $py "$src\ingest\ingest_pipeline.py"      # 知识入库（写入 data\processed\vector_store.json）
& $py -m uvicorn api:app --host 127.0.0.1 --port 8010 --app-dir src
```

自测（三条意图 + 边界）：

```powershell
$env:PYTHONIOENCODING = "utf-8"
# 健康检查
& $py -c "import json,urllib.request;print(json.dumps(json.loads(urllib.request.urlopen('http://127.0.0.1:8010/health',timeout=15).read().decode()),ensure_ascii=False,indent=2))"
# 缺 message 必须 422（不是 200/500）
& $py -c "import urllib.request,urllib.error;r=urllib.request.Request('http://127.0.0.1:8010/chat',data=b'{}',headers={'Content-Type':'application/json'})
try: urllib.request.urlopen(r,timeout=15)
except urllib.error.HTTPError as e: print('HTTP',e.code,e.read().decode()[:120])"
```

### 1.3 已经跑着的联调容器（前端在用，可直接打）

```powershell
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
& $docker ps --format '{{.Names}} | {{.Status}} | {{.Ports}}'   # 期望看到 sgt-snapshot-api | Up (healthy) | 0.0.0.0:8001->8000/tcp
```

- 访问 **http://localhost:8001**；`/` 是前端页面、`/chat` 与 `/health` 是接口、`/docs` 与 `/openapi.json` 也在。
- **注意**：这个容器是**交付快照**（`D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8`），
  它跑的后端镜像内容是 `master@4fcccad`，**不含你 `dev` 上的新改动**。要验证你的新代码，
  用 1.2 的本地直跑，或把快照的 `Dockerfile.backend` 指向你的代码后重建。

---

## 2. 🔴 P0：三条卡住前端功能的

### P0-1　`route.stops[]` 没有坐标 —— **数据其实已经有，只差一行 SQL**

**现状（实测）**：`POST /chat {"message":"南充一天三国文化路线"}` 的 `route.stops[]` 只有
`stop_order / stay_minutes / reason / spot_id / name / city / address / recommended_duration_min / open_time`，
**没有任何坐标字段**。前端因此只能按地名把路线画成"示意"，并在界面上写"后端返回的 N 个站点暂无 GCJ-02 坐标"。

**根因（源码 + SQLite 实查）**：`scenic_spots` 表**有 `lat`/`lng` 且样例数据都填了值**：

| spot_id | name | lat | lng |
|---|---|---|---|
| `nanchong_xishan_wanjuanlou` | 西山风景区·万卷楼 | 30.792 | 106.067 |
| `nanchong_langzhong_huanhouci` | 阆中古城·汉桓侯祠（张飞庙） | 31.577 | 105.965 |
| `nanchong_hemingshan_wangpingmu` | 鹤鸣山景区·王平墓 | 30.78 | 106.11 |
| `guangyuan_jianmen_shudao` | 剑门蜀道剑门关旅游景区 | 32.214 | 105.57 |
| `guangyuan_zhaohua_ancient_city` | 昭化古城 | 32.322 | 105.966 |

而取站点用的 `src/tools/travel_business_tools.py::get_route_detail()` 的 SELECT **没取这两列**：

```sql
SELECT rs.stop_order, rs.stay_minutes, rs.reason,
       s.spot_id, s.name, s.city, s.address, s.recommended_duration_min, s.open_time
FROM route_stops rs JOIN scenic_spots s ON s.spot_id = rs.spot_id
WHERE rs.route_id = ? ORDER BY rs.stop_order
```

**要做什么**：
1. SELECT 加上 `s.lat, s.lng`；在每站输出
   `"coordinates": [lng, lat]`（**经度在前**，与 GeoJSON/前端约定一致）与 `"coordinate_system": "..."`。
2. ⚠️ **坐标系必须先核实再标**：现在库里的值**没有标注坐标系**，且只有 3 位小数（≈百米级）。
   前端底图是 **GCJ-02**（高德/腾讯系）。如果原始值其实是 WGS84，直接标 `GCJ-02` 会**偏几百米**。
   - 能确认是 GCJ-02 → 标 `"GCJ-02"`，前端立刻按后端顺序精确对齐（**前端已就绪，无需改代码**——我用含坐标的
     对照响应实测过：与"冻结版"行为完全一致）。
   - 不能确认 → **不要猜**：要么先转换后再标 `GCJ-02`，要么标 `"WGS84"` 并在 `risk_note` 里写明"待转换"，
     让前端继续走降级（保留地名示意 + 缺口提示）。**宁可降级，也不要骗前端**。

**验收**：`POST /chat {"message":"南充一天三国文化路线"}` → `route.stops[*]` 里
`coordinates == [106.067, 30.792]`（万卷楼）等，且 `coordinate_system` 非空；
前端地图从"南充市（示意）"变成**两个景区级点位**。

### P0-2　价格类没有结构化元数据，且**未知金额被写成 `0`**

**现状（实测）**：`POST /chat {"message":"南充舒适型酒店预算和万卷楼票价多少钱"}` 的 `answer` 里是
「景区票价：西山风景区·万卷楼：**0.0 - 0.0 CNY（manual_demo）**」——**结构化字段里既没有价格，也没有状态/来源**。

**根因（SQLite 实查）**：

| 表/字段 | 实际值 | 问题 |
|---|---|---|
| `spot_tickets.price_min/max` | 万卷楼 `0/0`、王平墓 `0/30`、剑门关 `90/120` | **未知被写成 `0`**，前端照实显示会像"免费" |
| `spot_tickets.data_status` | 全是 `manual_demo` | **不在协议允许集**里 |
| `spot_tickets.source_url`、`booking_url` | 全是空串 | 没有来源链接 |
| `scenic_spots.ticket_source_status` | `manual_demo` | 同上 |
| `hotel_budget_tiers.source_type` | `manual_demo_table` | 同上 |
| 各表 `updated_at` | `date.today()` 兜底（= 入库/重建当天） | **不是真实维护时间** |

**要做什么**（协议细节见 `docs/BACKEND-API.md` 第三节）：
1. **未知金额用 `null`，不要用 `0`**（`0` 只该表示"确实免费"）。
2. 含价格/时间/动态信息的记录带齐：
   `data_status` + `updated_at`（**带时区** ISO8601，如 `2026-09-20T10:00:00+08:00`）+ `sources[]({title, source_url, source_level})`。
3. **`data_status` 词表已拍板（协调者 2026-09-20）：`sample` / `maintained` / `live` / `pending` / `stale`**
   —— 以 `docs/BACKEND-API.md` 的定义为**唯一口径**，全项目照这套改。
   数据库与样例数据里现有的旧值按下面迁移：

   | 现有值（DB / 样例数据） | 迁移为 | 说明 |
   |---|---|---|
   | `manual_demo` | `sample` | 人工演示数据（现在用于 `spot_tickets.data_status`） |
   | `manual_demo_table` | `sample` | 来自档位表的演示数据 |
   | `manual_fixed` | `maintained` | 人工维护且视为已核验 —— **注意下面的前端判定规则** |
   | （未知/未核验：米仓道坐标、待核验票价…） | `pending` | 前端显示"待接入 / 待确认" |
   | （外部 MCP 实时返回：天气、班次…） | `live` | 前端显示"实时数据" |
   | （维护数据已超期） | `stale` | 前端显示"已过期" |

   ⚠️ **前端是怎么判的（决定你必须补哪些字段）**：这 5 个值前端已经**硬编码**在
   `frontend/app.js`（`statuses`）、`frontend/travel-modules.js`（`names`）、`frontend/story-map.js`（`statuses`）里；
   而且只有 **`maintained` / `live`** 会被当成"可靠"，**并且还要同时满足两个条件**：
   ① `updated_at` 是**带时区**的 ISO8601（前端正则要求以 `Z` 或 `±HH:MM` 结尾且可解析）；
   ② `sources[]` 里**至少有一条 `source_level` 为 `A` 或 `B`** 的来源（`title` 与合法 http/https 链接齐备）。
   只改了 `data_status` 而 `updated_at`/`sources` 不到位，前端**依旧显示"待核验"**。

   ⚠️ 另外两个**名字像但不是它**的字段：`scenic_spots.ticket_source_status` 与
   `hotel_budget_tiers.source_type` **不是**协议里的 `data_status`，别混用（建议改名以免误读）。
4. `updated_at` 不要再用 `date.today()` 兜底，否则每次重建都"最新"。

**验收**：结构化字段里能拿到 `data_status` + `updated_at` + `sources`；未知票价的 `price_min/max` 是 `null` 而不是 `0`。

### P0-3　含地名的旅游句被漏判，进不了路线规划

**现状（实测）**：`{"message":"从南充出发，去阆中、剑阁，再到广元旅游"}` → **`intent=intent.intent == "culture_qa"`**，
走的是文化问答检索，**没有进 `route_planning`**。前端因此只能把 4 个地名画成虚线示意，拿不到真正的路线站点。

**根因（源码）**：`src/agent/intent_router.py` 是**纯关键词子串**、按顺序命中即返回：
`route_planning` 只认 `路线/行程/怎么玩/一日游/半日/两天/规划/游览`；这句话里一个都没有 → 掉到 `culture_qa`（默认兜底 0.55）。

**要做什么**：至少让"去 A、B、C""从 X 出发"这类**出行句式**进 `route_planning`（词表扩充、加结构判断，
或先识别出行动词 + 地名组合）。顺带一提：`history_vs_romance` 这条意图**以前的文档漏了**，它在
`docs/BACKEND-API-REFERENCE.md` 里已补上（0.72，行为与 `culture_qa` 一致：有 `retrieval`、**没有 `route` 键**）。

**附带发现（也属于这一类）**：`{"message":"阆中古城门票多少钱"}` 命中 `budget_ticket`，
但回答**只给酒店预算、完全没提门票**——因为 `orchestrator._answer_budget()` 只在消息里出现
`万卷楼/汉桓侯祠/张飞庙/剑门关/昭化古城/王平墓` 这 6 个**硬编码名字**时才附票价行。

**验收**：上面那句 → `intent.intent == "route_planning"` 且 `route.found == true`；
"阆中古城门票多少钱" 至少给出对应景区票价（或明确说明未维护），不要再只回酒店。

---

## 3. 🟡 P1：影响体验与可执行性的

### P1-1　路线规划忽略硬约束
- **现状（实测）**：「南充半天三国路线」仍回 **8 小时**一日模板；「广元半天」仍回 **16 小时**两日模板，
  而且**重复安排已完成**的昭化古城。
- **要做什么**：按时长/人群做**硬约束筛选**（选不出就别硬套模板，返回 `found:false` + 说明更好），
  支持"排除已完成章节/景点"，并在 `selection_reason` 里给出**逐节点取舍理由**（现在只是一句通用说明）。
- **验收**：半天请求不再返回 8/16 小时模板；已完成景点不再出现。

### P1-2　故事 `placeId` 与后端 `spot_id` 没有稳定映射
- **现状**：前端故事侧的「剑门关」与后端的 `guangyuan_jianmen_shudao`（"剑门蜀道剑门关旅游景区"）**无法确认是同一个**，
  只能按"ID 或完整名称"精确匹配，匹配不上就留缺口。
- **要做什么**：给一份稳定映射（或让接口直接回 `spot_id`），别让前端靠名字猜。

### P1-3　部分地点缺坐标 + 没有导航数据
- **现状**：米仓道等点位无坐标 → 前端**不画点**（只显示县级驻地示意，并注明"驻地≠景区入口"）。
- **要做什么**：补可靠 GCJ-02 坐标；道路/入口级导航数据可留给外部 MCP（但要在协议里说明由谁提供）。

### P1-4　四个旅游接口**还没实现**（前端已写好、开关关着）
- **现状（实测）**：`GET /api/travel/spots?city=南充` → **404**；
  `POST /api/travel/plans/preview`、`/api/travel/budget/estimate`、`/api/travel/travel-info` → **405**
  （请求落进了根路径的静态挂载，Starlette 对非 GET/HEAD 一律 405）。
- **要做什么**：按 **`frontend/API-CONTRACT.md`** 实现，统一返回
  `{ "status": "ok|empty|unavailable", "message": "...", "data": {...} }`。
  - 空结果 → `empty`（**不要**用 404 表示"没有数据"）。
  - **天气/班次/实时票价拿不到就返回 `unavailable`，绝对不要伪造**（协议里写明了）。
  - 前端 `frontend/travel-api.js` 的 `enabled=false` 是对的，**等你实现后再由前端打开**；
    打开时前端会按约定做六种响应（ok/empty/unavailable/非2xx/超时/非法 JSON）的验收。

---

## 4. 🧰 P2：内部质量与“别再踩”的坑

### 4.1 `/chat` 没有响应模型
handler 直接返回 `dict`，所以 `/openapi.json` 里 `/chat` 的 `responses` **只有 200、没有 schema**。
建议加 `response_model`（或多态响应的联合模型），这样外部平台接进来时不用靠猜。

### 4.2 `route.found=false` 时字段直接消失
实测「襄阳两天三国文化路线规划」→ `route` 变成 `{"found": false, "message": "..."}`，
**`route.route` 和 `route.stops` 这两个键根本不存在**（不是 `null`）。前端只能写三种分支。
建议归一化：**顶层字段恒定，不适用时为 `null`**（破坏性变更，需前后端一起改，所以标 P2）。

### 4.3 `/health` 的 `redis.enabled` 不是配置开关
实测返回 `"redis": {"enabled": true, "available": false, ...}`，而 compose 里明明设了 `REDIS_ENABLED=false`。
**原因**：`san_guo_core/settings.py` 里**根本没有 `redis_enabled` 字段**（`extra="ignore"` 把环境变量吞了），
所以 `enabled` 只是"`redis` 包能不能 import + 客户端能不能构造"。要么把字段补上，要么把语义改成
`client_constructed` 之类，别让人误以为是开关。

### 4.4 `src/ingest/create_vector_collection.py` 没有兜底（任务板 #28）
它**直接实例化 `MilvusVectorStore()`**（`rag/vector_store.py` 里 `get_vector_store()` 是有 try/except 回退的，**只有它没有**），
而镜像不装 `pymilvus` → **默认 `VECTOR_BACKEND=milvus` 下容器一启动就崩并无限重启**。
现在只能靠"设 `VECTOR_BACKEND=local` + 跳过这一步"绕过。建议给它加同样的回退。

### 4.5 `.venv` 被 git 跟踪（任务板 #27）
`dev` 上跟了 **1120 个文件 / 20.4 MB**（还是 cpython-312 的），已经多次阻断 `pull`/合并。
DSH 本地分支 `chore/commit-missing-modules` 里有个 **`3b69bfd`：`git rm -r --cached .venv` + `.gitignore`**，
可以直接摘进 `dev`（那个分支的其它提交**不要**推：`35333dc` 和你的实现撞车）。

### 4.6 仓库自带的 Docker 配置：两套都不是"Web API + 前端"
| 配置 | 实际行为 | 结论 |
|---|---|---|
| 根 `docker-compose.yml` + 根 `Dockerfile` | `container_name: san-guo-mcp`、只开 `127.0.0.1:8000:8000`、`CMD python src/mcp_server.py` | **是 MCP 服务**，不是 Web API，也没有前端 |
| `deploy/docker-compose.yml` | 目标是 Web API（`agent-threekingdom`、8001→8000、挂 `./data`），但：<br>① `context: .` 会被 Compose 解析为**compose 文件所在目录** = `deploy/`，于是 `dockerfile: deploy/Dockerfile` 变成 `deploy/deploy/Dockerfile` → **构建必失败**（文件里的注释"构建上下文 = 仓库根目录"是**错的**）；<br>② 没设 `VECTOR_BACKEND` → 默认 `milvus` → 无 `pymilvus` 时崩（见 4.4）；<br>③ `deploy/docker-entrypoint.sh` 在 Windows 上会被检出成 CRLF，而仓库没有 `.gitattributes` → 容器报 `exec /docker-entrypoint.sh: no such file or directory` | **三处都要修** |

**建议修法**：`context: ..`（或者固定用 `docker compose --project-directory .. -f deploy/docker-compose.yml`）；
补 `VECTOR_BACKEND: local`；加 `.gitattributes` 写 `*.sh text eol=lf`；`dockerfile:` 用 `deploy/Dockerfile` 时上下文要保持仓库根。

---

## 5. 改完怎么自证（请照着跑一遍）

```powershell
$py = "C:\Python\Python311\python.exe"
$repo = "D:\DSH Workspace\agent_threekingdom"

# ① 后端自己的链路（本地直跑，见 1.2；docker 起的容器在 8001）
& $py "$repo\src\eval_retrieval.py"                 # 检索评估：期望覆盖度 1.0 / passed
# 三条意图 + 边界（README/TESTING.md 里也有，但注意 TESTING.md 已按 1.2 修正过）
#   route_planning / culture_qa / history_vs_romance / budget_ticket、空串→200、缺 message→422

# ② 前端回归（15 组）——**你改接口后必跑**
Get-ChildItem "$repo\frontend\*.test.cjs" | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { "✗ $($_.Name)" } }
Get-ChildItem "$repo\frontend\*.js" | ForEach-Object { node --check $_.FullName }

# ③ 真实响应回放（不用浏览器，验证地图/协议降级没被破坏）
node "D:\DSH Workspace\.tmp-e2e\replay-map.cjs" "$repo\frontend"
```

**接口改动的验收要点**（更全的在 `docs/BACKEND-API.md` 第五节）：
1. 四条意图的**顶层字段**是否符合 `docs/BACKEND-API-REFERENCE.md` 第 3.2.3 节的矩阵；
2. `route.stops[]` 是否带 `coordinates` + `coordinate_system`；
3. 含价格/时间的记录是否带 `data_status` / `updated_at` / `sources`；
4. **未知金额是否为 `null`**；
5. 缺 `message` 是否仍是 **422**（不是 500）。

---

## 6. 协作约定（改完别忘）

- 分支/推送：改动进 `dev`；**先 `git push --dry-run` 确认快进**；⛔ 不推 `master`、不强推。
- 提交信息：`<type>(<scope>): <描述>`（后端用 `src`/`tools`/`api` 之类的 scope）。
- 收工回填：`docs/TASKS.md`（认领项状态）与 `docs/HANDOFF.md`（追加一条：做了什么/改了哪些文件/怎么验证的/下一步/卡点）。
- **协议改动请同步更新**：`docs/BACKEND-API-REFERENCE.md`（接口字典）与 `docs/BACKEND-API.md`（前端协议），
  否则前端会照旧协议写代码。

---

## 7. 相关文档索引

| 文档 | 用途 |
|---|---|
| `docs/BACKEND-API-REFERENCE.md` | **全部接口字典**：HTTP（`/health`、`/chat` 四条意图的多态矩阵）+ MCP（8 个工具 + stdio 入口），逐字段、边界、错误码、源码索引 |
| `docs/BACKEND-API.md` | 前端 ↔ 后端协议 + 缺口清单（「要什么」） |
| `frontend/API-CONTRACT.md` | 前端提案：四个 `/api/travel/*` 的请求/响应契约、`map_route`、坐标系要求 |
| `docs/FRONTEND-ISSUES.md` | 前端侧问题清单（B 组 = 本文件第 2–3 节的后端视角） |
| `AGENTS.md` | 协作上下文、分工、命令 |
| `docs/TASKS.md` | 任务板（后端条目见其中的「后端待办」小节） |
| `ARCHITECTURE.md` / `TESTING.md` | 架构与测试清单（`TESTING.md` 已按本文件的坑修正） |
