# 三国文化旅游智能服务 — 测试清单

> 目标：给出"可直接复制执行"的命令和"预期结果"，用于验收各个环节是否正常。
> 覆盖：本地 Python 环境 与 Docker 两种跑法；以及三条约主要意图链路。

---

## 0. 准备工作

### 本地（推荐：后端自测就靠它）
```powershell
$repo   = "D:\DSH Workspace\agent_threekingdom"
$python = "C:\Python\Python311\python.exe"      # 3.11.4（实测可跑）
# 依赖只装一次（轻量那份，约 68 秒；requirements.txt 会拖 torch，演示不需要）：
# & $python -m pip install -r "$repo\requirements.docker.txt" -i https://pypi.tuna.tsinghua.edu.cn/simple
$env:PYTHONPATH = "$repo\src"
$env:VECTOR_BACKEND = "local"                   # ⚠️ 必须！默认 milvus 而本机不装 pymilvus → 直接崩

& $python src\ingest\seed_business_db.py        # 初始化业务库
# ⛔ 不要跑 src\ingest\create_vector_collection.py：它只认 Milvus 且没有兜底（见 docs/BACKEND-TODO.md 4.4）
& $python src\ingest\ingest_pipeline.py         # 导入知识文档（应打印 Indexed 8 chunks）
& $python -m uvicorn api:app --host 127.0.0.1 --port 8010 --app-dir src   # 另开一个终端
```
> ⚠️ **别用仓库根那份 `.venv`**：它是**被 git 跟踪的 Python 3.12 环境**、而且 `pyvenv.cfg` 里写着
> 上次生成它的那台机器的路径。把 venv 建在**仓库外**（如 `D:\venvs\sanguo`），仓库才能保持干净（任务板 #27）。

### Docker（⚠️ 先读这段：仓库自带的配置目前**不能直接跑 Web API**）
```powershell
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
& $docker ps -a --format '{{.Names}} | {{.Status}}'      # 看现有容器
```
- **根 `docker-compose.yml` 跑的是 MCP 服务**（`container_name: san-guo-mcp`、只开 `127.0.0.1:8000`、
  `CMD python src/mcp_server.py`）——**没有前端，也不是 Web API**。要联调 MCP 才用这套。
- **`deploy/docker-compose.yml` 才是 Web API 版，但它有三处问题**（`context: .` 会被解析成 `deploy/`，
  于是 `deploy/deploy/Dockerfile` 不存在 → **构建必失败**；没设 `VECTOR_BACKEND=local`；`*.sh` 是 CRLF），
  修法见 **`docs/BACKEND-TODO.md` 第 4.6 节**。
- **现在真正在跑**的是交付快照容器（镜像内容是 `master@4fcccad`，**不含 `dev` 上的新改动**）：
  ```powershell
  cd "D:\DSH Workspace\sgt-snapshot-4fcccad-827adc8"
  & $docker compose -f docker-compose.backend.yml up -d    # 已在跑；只有改了镜像内容才需要 --build
  & $docker compose -f docker-compose.backend.yml logs -f
  ```
  访问 `http://localhost:8002`（宿主 8002 → 容器 8000，容器名 `sanguo-latest-api`）。
  数据卷 = 该快照目录里的 `data/`（业务库 + 向量库），**不能删**。

---

## 1. 健康检查

```powershell
# 本地
& $python -c "from api import health; print(health())"
# Docker
try { Invoke-RestMethod -Uri 'http://localhost:8002/health' -Method GET } catch { $_.Exception.Message }
```
**预期**：返回 `{"status": "ok", "vector_backend": "local", "milvus_collection": "san_guo_culture_chunks", "redis": {...}}`。
> ⚠️ **`vector_backend` 就是 `local`**：只有装了 `pymilvus` 才会是 `milvus`。旧文档写「预期 `milvus`」是错的，
> 照着判会误报失败。`redis.available=false` 也属正常（Redis 是可选项）。

---

## 2. 三条约主要意图链路

> 说明：下面命令对中文结果在 Windows 终端可能显示乱码，属控制台编码（GBK）问题，非程序 bug。用 Postman/浏览器（UTF-8）可正常查看。判断是否成功主要看返回的 JSON 结构与 `intent` 是否正确。

### 2.1 预算票价（intent = budget_ticket）
```powershell
& $python -c "from agent.orchestrator import handle_user_message; print(handle_user_message('南充舒适型酒店预算和万卷楼票价多少钱'))"
```
**预期**：
- `intent.intent == "budget_ticket"`
- `answer` 含 `南充舒适型酒店预算：200.0 - 380.0 CNY/晚/间`、以及"景区票价为维护数据"的说明。

### 2.2 路线规划（intent = route_planning）
```powershell
& $python -c "from agent.orchestrator import handle_user_message; print(handle_user_message('广元两天三国文化路线推荐'))"
```
**预期**：
- `intent.intent == "route_planning"`
- `answer` 含 `推荐路线：广元蜀道三国两日线，16.0小时...`，并列出各站点（剑门关、昭化古城）。
- `route` 非空、含 `stops`；`hotel_poi_request` 非空。

### 2.3 文化问答（intent = culture_qa / history_vs_romance）
```powershell
& $python -c "from agent.orchestrator import handle_user_message; print(handle_user_message('陈寿和南充有什么关系'))"
& $python -c "from agent.orchestrator import handle_user_message; print(handle_user_message('三国志和三国演义有什么区别'))"
```
**预期**：
- `intent.intent` 分别为 `culture_qa` 与 `history_vs_romance`。
- `answer` 为检索式回答，列出命中的知识块与来源；`retrieval` 含 `coverage / final_hits / passed`。

---

## 3. 检索效果评估（eval_retrieval）
```powershell
& $python src\eval_retrieval.py
```
**预期**：打印每条 Query 的 `coverage`/`warnings`，末尾显示 `Recall check: N/M = xx%`。当前样例数据下应为通过（覆盖度 1.0）。

---

## 4. HTTP 接口测试（Docker 运行中）

用 UTF-8 编码发送中文，避免乱码：
```powershell
$base='http://localhost:8002'
function Post-Chat($msg){
  $body = @{ message=$msg } | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  Invoke-RestMethod -Uri "$base/chat" -Method POST -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 30
}
Post-Chat '南充舒适型酒店预算和万卷楼票价多少钱'   # intent=budget_ticket
Post-Chat '广元两天三国文化路线推荐'                # intent=route_planning
Post-Chat '三国志和三国演义有什么区别'              # intent=history_vs_romance
```

---

## 5. 数据查看（验证库已写入）

```powershell
& $python -c "from tools.travel_business_tools import list_scenic_spots, get_spot_ticket, plan_budget; print(list_scenic_spots('南充')); print(get_spot_ticket('万卷楼')); print(plan_budget('南充','舒适型',1,1))"
```
**预期**：
- `list_scenic_spots('南充')` 返回南充景区（万卷楼、王平墓等）。
- `get_spot_ticket('万卷楼')` 返回 `found=True`、价格区间、`data_status`。
- `plan_budget('南充','舒适型',1,1)` 返回 `estimated_total_min/max = 200.0 / 380.0`。

---

## 6. 验收判定标准

| 检查项 | 通过标准 |
|---|---|
| 健康检查 | `/health` 返回 `status=ok`；`vector_backend=local`（本镜像） |
| 预算票价 | intent 正确，answer 含预算与说明 |
| 路线规划 | intent 正确，含路线与站点 |
| 文化问答 | intent 正确，检索式回答，retrieval.passed=true |
| 数据库 | 三个查询函数返回值符合预期 |
| 容器 | `docker ps` 显示 `healthy` |
| **校验与错误** | 缺 `message` → **422**（不是 200/500）；`GET /chat` → 404；`POST /health` → 405 |
| **多态响应** | 四条意图的顶层字段符合 `docs/BACKEND-API-REFERENCE.md` 第 3.2.3 节矩阵（`culture_qa`/`history_vs_romance` **没有 `route` 键**，`budget_ticket` 的 `route` 是 `null`） |
| **MCP** | `dev` 上 `src/mcp_server.py` 应有 **8 个工具**（`plan_cultural_route` 是新增的），另有 stdio 入口 `src/mcp_stdio_server.py` |
| **前端不被接口改动打破** | `Get-ChildItem frontend\*.test.cjs` → **15/15 通过**；`node --check` 全部 JS 通过 |
