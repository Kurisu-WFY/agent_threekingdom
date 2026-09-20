# 三国文化旅游智能服务 — 测试清单

> 目标：给出"可直接复制执行"的命令和"预期结果"，用于验收各个环节是否正常。
> 覆盖：本地 Python 环境 与 Docker 两种跑法；以及三条约主要意图链路。

---

## 0. 准备工作

### 本地（Python 3.11 venv）
```powershell
cd D:\DSH Workspace\agent_threekingdom
$python = "D:\DSH Workspace\agent_threekingdom\.venv\Scripts\python.exe"
$env:PYTHONPATH = "D:\DSH Workspace\agent_threekingdom\src"

# 初始化业务库（第2步）
& $python src\ingest\seed_business_db.py
# 创建向量 collection（第3步）
& $python src\ingest\create_vector_collection.py
# 导入知识文档（第4步）
& $python src\ingest\ingest_pipeline.py
# 启动 API（第5步，另开一个终端）
cd src
& $python -m uvicorn api:app --reload --app-dir src
```

### Docker（推荐，数据卷持久化）
```powershell
cd D:\DSH Workspace\agent_threekingdom
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
& $docker compose up --build -d        # 启动
& $docker ps --filter name=agent-threekingdom   # 看是否 healthy
& $docker compose down                  # 停止
```
> 本机若 8000 被占，compose 已映射到 `8001`，访问 `http://localhost:8001`。
> 一键重置数据：`& $docker compose down -v`（删数据卷后再 up）。

---

## 1. 健康检查

```powershell
# 本地
& $python -c "from api import health; print(health())"
# Docker
try { Invoke-RestMethod -Uri 'http://localhost:8001/health' -Method GET } catch { $_.Exception.Message }
```
**预期**：返回 `{"status": "ok", "vector_backend": "milvus", "milvus_collection": "san_guo_culture_chunks", "redis": {...}}`。

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
$base='http://localhost:8001'
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
| 健康检查 | `/health` 返回 `status=ok` |
| 预算票价 | intent 正确，answer 含预算与说明 |
| 路线规划 | intent 正确，含路线与站点 |
| 文化问答 | intent 正确，检索式回答，retrieval.passed=true |
| 数据库 | 三个查询函数返回值符合预期 |
| 容器 | `docker ps` 显示 `healthy` |
