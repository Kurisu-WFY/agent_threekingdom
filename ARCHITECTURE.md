# 三国文化旅游智能服务 — 架构说明

> 面向团队阅读的架构与编排说明。目标：让不熟悉代码的人也能看懂"一次请求是怎么被编排起来的"，以及"该往哪里增加内容 / 优化逻辑"。
>
> 📌 **要动手改后端时，先读 `docs/BACKEND-TODO.md`**（待办 + 实测证据 + 验收标准 + 自测命令）；
> 接口字段与边界细节见 `docs/BACKEND-API-REFERENCE.md`。

## 1. 一句话定位

这是一个 **「三国文化导游」的后端"大脑"**：用户问一句话 → 系统判断问题类型 → 按类型去 **查知识库 / 查景区与预算数据 / 规划路线** → 组装成回答返回。

它本身**不做界面**，而是给「女娲 / Dify / Coze 这类智能体平台」提供能力。有两种对外暴露方式：

- **HTTP API**：`POST /chat`（直接调用），`GET /health`（健康检查）。
- **MCP 服务器**：`/sse`（SSE 传输），当前 **8 个工具**（`plan_cultural_route` 是 `dev` 上新增的），供智能体平台以"工具"方式调用；
  另有 **stdio 入口** `src/mcp_stdio_server.py`（不开端口，协议走 `stdin/stdout`，复用同一个 server 实例，
  给能直接拉起本地命令的客户端用）。

## 2. 核心设计理念

- **静态与动态分层**：查询成本低、相对固定的内容（文化知识、景区、票价维护数据、路线模板、酒店预算档位）入库；高波动、需要实时的内容（实时票价、交通班次、天气）**不写死**，交给外部工具（12306、百度/高德、天气 MCP）。避免把动态数据固化进知识库。
- **检索式 + 受控回答**：默认不依赖大模型也能回答（检索式受控回答）；配置了大模型后就走大模型生成，但仍以检索证据为根基。
- **叙事主线**："陈寿笔下的蜀汉记忆"。讲解和路线围绕史学家陈寿与《三国志》的蜀汉视角展开，景点顺序服务叙事主线。
- **可信度纪律**：来源分级 **A/B/C**（A=官方/原典，B=论文/研究，C=一般）；C 级来源不得支撑史实结论；动态数据必须标注 `data_status`。

## 3. 一次请求的编排流程（主干）

```
用户输入
   ▼
① intent_router.py   关键词判定问题类型
   （route_planning / budget_ticket / history_vs_romance / culture_qa）
   ▼
② orchestrator.py    按意图分流（"大脑"）
   │
   ├─ 路线规划 → planning/route_planner.py
   │     猜城市/时长/人群 → 查路线模板 → 路线+各站+风险提示
   │     + 酒店POI查询参数
   │
   ├─ 预算票价 → tools/travel_business_tools.py
   │     猜城市/酒店档位 → 酒店预算档位 + 景区票价 → 预算回答
   │
   └─ 文化问答(含正史vs演义) → RAG 检索 + 回答生成
         ③ hybrid_retriever.py  查询扩展→向量+词法→重排→召回检查
         ④ answer_chain.py      大模型生成 / 降级为受控回答
   ▼
⑤ 数据来源  SQLite业务库(db.py) + 知识块(向量库) + 外部工具
   ▼
返回 { "intent": 意图, "answer": 回答, "route"/"retrieval": 附加 }
```

## 4. 分层结构

| 层 | 文件 | 职责 | 类比 |
|---|---|---|---|
| 接口层 | `src/api.py`、`src/mcp_server.py`、`src/mcp_stdio_server.py` | HTTP /chat、健康检查；MCP 8 工具（SSE + stdio 两种传输） | 前台 / 门面 |
| 编排层 | `src/agent/orchestrator.py`、`intent_router.py` | 意图识别、分支调度 | 大脑 / 大堂经理 |
| 检索层 | `src/rag/*`（`hybrid_retriever`、`reranker`、`recall_checker`、`embeddings`、`tokenizer`、`query_expansion`、`vector_store`） | 混合召回、重排、召回质量检查 | 记忆检索 |
| 规划层 | `src/planning/route_planner.py`、`dynamic_scheduler.py` | 路线模板选择、动态调度占位 | 行程策划 |
| 业务工具层 | `src/tools/travel_business_tools.py` | 景区/票价/酒店预算/路线/POI 查询 | 业务窗口 |
| 数据层 | `src/db.py`（SQLite 表）、`src/san_guo_core/`（`settings`+`models`） | 表结构、配置、领域模型 | 仓库+账本 |
| 缓存层 | `src/cache/redis_cache.py` | 会话/限流/结果缓存（可选） | 便利贴 |

## 5. 目录职责速查

```text
src/
  api.py                 FastAPI：/health / /chat
  mcp_server.py          MCP 服务器（8 个工具；SSE 传输）
  mcp_stdio_server.py    MCP stdio 入口（复用同一个 server，不开端口）
  cli.py                 交互式命令行 REPL
  config.py / domain.py  对 san_guo_core 的 re-export
  db.py                  SQLite 建表 + 迁移（11 张表）
  eval_retrieval.py      检索效果评估脚本
  san_guo_core/
    settings.py          全局配置（读 .env）
    models.py            领域模型：KnowledgeChunk / RetrievalHit / RecallReport
  agent/
    intent_router.py     意图识别（关键词规则）
    orchestrator.py      总编排（TravelAgentService）
    answer_chain.py      回答生成链（大模型 / 受控回答）
    llm_client.py        大模型客户端（OpenAI-compatible）
    response_policy.py   受控回答生成（无证据降级、来源分级）
  rag/
    hybrid_retriever.py  混合召回：向量+词法+重排+召回检查
    vector_store.py      向量存储（哈希向量落盘；可换 Milvus）
    embeddings.py        哈希嵌入 + 余弦
    tokenizer.py         中文分词(jieba)
    reranker.py          重排打分
    recall_checker.py    召回质量报告
    query_expansion.py   查询扩展
    chunking.py / citation.py  知识切块 / 引用格式
  planning/
    route_planner.py     城市/时长/人群推断 → 模板推荐
    dynamic_scheduler.py 动态调度占位
  tools/
    travel_business_tools.py  景区/票价/酒店/路线/POI 业务工具
  ingest/
    seed_business_db.py        初始化业务库(样例数据)
    create_vector_collection.py 创建向量 collection
    ingest_pipeline.py         导入知识文档
    normalize_documents.py / validate_sources.py  归一化/来源分级
```

## 6. 数据模型与来源纪律

**SQLite 关键表**（`src/db.py`）：`scenic_spots`、`spot_tickets`、`hotel_budget_tiers`、`route_templates`、`route_stops`、`source_documents`、`knowledge_chunk_metadata`、`external_tool_registry`、`tool_call_logs` 等。

**来源分级**：`source_level` ∈ {A, B, C}；C 级不能支撑史实结论（`recall_checker` 会据此告警）。

**动态数据标记**：票价等维护数据带 `data_status`，并记录 `source_url`、`updated_at`。正式展示前需核验。

> ✅ **`data_status` 词表已拍板（协调者 2026-09-20）：`sample` / `maintained` / `live` / `pending` / `stale`**
> —— 全项目以这一套为**唯一口径**（定义见 `docs/BACKEND-API.md`，前端已按它实现）。
> 本文早先写的 `verified` / `manual_pending` / `simulated` / `manual_demo` **作废**；
> 数据库与样例数据里现有的 `manual_demo` / `manual_demo_table` / `manual_fixed` **需要迁移**
> （映射表、以及"前端只在什么条件下才认为是可靠数据"见 `docs/BACKEND-TODO.md` P0-2）。
> 另外各表的 `updated_at` 现在是 `date.today()` 兜底（= 入库当天），**不是真实维护时间**；
> 未知金额目前被写成 `0`（显示得像"免费"），应改为 `null`。

**向量**：知识块进入 Milvus（本地演示用 `hash` 嵌入 + 本地向量存储，见 `vector_store.py`），collection 名为 `san_guo_culture_chunks`。

## 7. 内容维护规范（不写代码也能贡献）

- **文化知识**：`data/examples/knowledge_chunks.sample.jsonl`
  每条含 `id/title/content/knowledge_type/entities/narrative_stage/audience/source/source_level/risk_note`。内容需核实，`source_level` 依来源填 A/B/C，不确定必填 `risk_note`。
- **景区**：`data/examples/scenic_spots_northeast_sichuan.sample.json`
  字段含 `spot_id/name/city/theme/relation_level/recommended_duration_min/suitable_users/demo_ticket`。
- **票价**（在景区文件内 `demo_ticket`）：`price_min/price_max/data_status`，说明是样例、需上线前核验。
- **酒店预算**：`data/examples/hotel_budget_tiers.sample.json` 按城市/档位/淡旺季。
- **路线模板**：`data/examples/routes.sample.json` 按城市/时长/人群/交通方式/叙事主题；`stops` 顺序服务叙事主线。
- **提示词**：`prompts/system_prompt.md`、`intent_router_prompt.md`、`answer_prompt.md`、`route_planner_prompt.md`。

## 8. 两种运行 / 接入方式

- **本地直跑**：见 README（`seed_business_db` → `create_vector_collection` → `ingest_pipeline` → `uvicorn api:app --app-dir src`）。
- **Docker**：⚠️ **现状与本节原先的描述不同，别照跑**。根 `docker-compose.yml` + 根 `Dockerfile` 跑的是 **MCP 服务**
  （`container_name: san-guo-mcp`、只开 `127.0.0.1:8000`、`CMD python src/mcp_server.py`）；
  `deploy/docker-compose.yml` 才是 Web API 版，但它有三处问题：① `context: .` 会被 Compose 解析为
  **compose 文件所在目录**（`deploy/`），于是 `dockerfile: deploy/Dockerfile` 变成 `deploy/deploy/Dockerfile`
  → **构建必失败**；② 没设 `VECTOR_BACKEND=local` → 默认 `milvus`，无 `pymilvus` 时崩；
  ③ `deploy/docker-entrypoint.sh` 在 Windows 上检出成 CRLF 且仓库无 `.gitattributes` → 容器报
  `exec /docker-entrypoint.sh: no such file or directory`。
  修法（`context: ..`、补 `VECTOR_BACKEND`、加 `.gitattributes` 写 `*.sh text eol=lf`）与**当前正在跑的**快照容器
  见 **`docs/BACKEND-TODO.md` 第 4.6 节**与 `TESTING.md`。
- **接入女娲/Dify/Coze**：默认启动的是 HTTP `/chat`；若要给平台当工具，改跑 `python src/mcp_server.py`（`/sse`），并在平台侧把该地址注册为 MCP 服务器。云端平台无法访问本机 `localhost`，需公网部署/内网穿透，并配鉴权、IP 白名单、调用日志。

## 9. 已知限制与后续方向

- 知识库目前以结构样例为主，真实内容需填充、校对来源。
- 意图识别目前是关键词规则，中文同义/口语易漏判，可升级为模型判定。
- 路线规划基于模板选择，不含实时交通/排队/天气动态优化（`dynamic_scheduler` 为占位）。
- 票价为样例数据，正式服务需接 OTA/官方接口。
- 本地向量存储适合演示，多人并发应换 Milvus Server。

### 2026-09-20 实测补充（**都写在 `docs/BACKEND-TODO.md` 里，带验收标准**）

- **意图漏判有具体反例**：`"从南充出发，去阆中、剑阁，再到广元旅游"` 实测落成 `culture_qa`，进不了 `route_planning`；
  `"阆中古城门票多少钱"` 只回酒店预算、完全不提门票（`_answer_budget()` 里的景区名是**硬编码 6 个**）。
- **`route.stops[]` 不返回坐标，而数据其实已经有了**：`scenic_spots` 表有 `lat`/`lng`（万卷楼 `30.792/106.067` 等），
  是 `get_route_detail()` 的 SELECT 没取这两列。**坐标系必须先核实**（前端底图是 GCJ-02）。
- **价格类缺结构化元数据**，且未知金额写成 `0`；`updated_at` 是入库当天而非维护时间。
- **`/chat` 未定义响应模型**，`/openapi.json` 里响应 schema 为空；`route.found=false` 时 `route.route`/`stops` 键直接消失。
- **四个 `/api/travel/*` 接口仍未实现**（实测 `GET` → 404、`POST` → 405）。
