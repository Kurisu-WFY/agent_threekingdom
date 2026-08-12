# San Guo AI Travel Agent

三国文化 AI 旅游智能体 Demo 工程。

本项目参考 `D:\rag_text` 的工程思路搭建：入库、检索、重排、召回检查、问答服务、API 和评测脚本分层实现。当前不内置需要嵌入的大段历史正文，正式内容应由老师、地方文旅资料、公开出版物、景区官方信息等来源补充。

## 产品定位

本 Demo 不是普通聊天机器人，而是面向南充及川东北三国文化深度游的全流程 Agent：

- 行前：攻略导入、路线规划、预算估算
- 行中：定位陪游、动态调度、分层讲解
- 内容：围绕“陈寿笔下的蜀汉记忆”组织知识
- 可信：用 RAG 限制回答边界，区分正史、演义、地方传说和未核实信息

## 目录结构

```text
san_guo_ai_travel_agent/
  README.md
  docs/
    premise_review.md
    product_framework.md
    rag_design.md
    mvp_scope.md
    engineering_architecture.md
    mcp_tool_integration.md
    ticket_service_design.md
    agent_platform_deployment.md
  data/
    raw/.gitkeep
    processed/.gitkeep
    examples/
      knowledge_chunks.sample.jsonl
      spots.sample.json
      routes.sample.json
      scenic_spots_northeast_sichuan.sample.json
      hotel_budget_tiers.sample.json
  config/
    mcp_servers.example.json
  prompts/
    system_prompt.md
    intent_router_prompt.md
    answer_prompt.md
    route_planner_prompt.md
  schemas/
    knowledge_chunk.schema.json
    spot.schema.json
    route.schema.json
  src/
    config.py
    domain.py
    api.py
    cli.py
    eval_retrieval.py
    mcp_server.py
    db.py
    agent/
      __init__.py
      intent_router.py
      orchestrator.py
      response_policy.py
    rag/
      __init__.py
      chunking.py
      embeddings.py
      query_expansion.py
      recall_checker.py
      retriever.py
      reranker.py
      store.py
      citation.py
    planning/
      __init__.py
      route_planner.py
      dynamic_scheduler.py
    ingest/
      __init__.py
      ingest_pipeline.py
      create_vector_collection.py
      seed_business_db.py
      validate_sources.py
      normalize_documents.py
    tools/
      __init__.py
      business_tools.py
    cache/
      redis_cache.py
  tests/
    test_schemas.py
```

## 快速运行

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 构建本地索引

先创建 Milvus collection：

```bash
python src/ingest/create_vector_collection.py
```

再入库：

```bash
python src/ingest/ingest_pipeline.py
```

如果 `data/raw` 为空，系统会使用 `data/examples/knowledge_chunks.sample.jsonl` 构建一个最小索引。

### 3. 初始化业务数据库

```bash
python src/ingest/seed_business_db.py
```

业务数据库使用 SQLite，默认文件为 `data/processed/business.sqlite3`，存放景区、票价维护数据、酒店预算档位和外部 MCP 工具登记。

### 4. 检查召回质量

```bash
python src/eval_retrieval.py
```

### 5. 启动命令行

```bash
python src/cli.py
```

### 6. 启动 API

```bash
uvicorn src.api:app --reload
```

### 7. 启动 MCP 服务

```bash
python src/mcp_server.py
```

默认 SSE 地址：

```text
http://localhost:8000/sse
```

## 下一步

1. 收集并标注资料来源。
2. 按 `schemas/knowledge_chunk.schema.json` 生成知识块。
3. 将 `EMBEDDING_BACKEND` 从 hash fallback 切换为 BGE 或线上 embedding。
4. 将 `VECTOR_BACKEND` 从 local fallback 切换为 Milvus Lite / Milvus Server。
5. 接入真实 LLM，完成有引用的回答生成。
6. 将三个叙事模式接入前端交互。

## 真实业务边界

- 实时票价、开放时间、活动、天气、人流不能由模型编造，必须走接口或后台维护。
- C 级来源只能用于游玩体验参考，不能支撑历史事实。
- 召回检查不通过时，回答必须降级为“资料不足/需要追问/需要人工核实”。

## 与参考项目的关系

本项目主要参考 `D:\rag_text` 的工程方式，而不是照搬 notebook：

- 保留了 `ingest/retriever/reranker/eval` 的主链路。
- 把“难度”维度替换为三国文旅业务里的 `source_level / narrative_stage / audience / knowledge_type`。
- 增加了 recall check，用于检查关键实体是否被最终上下文覆盖。
- 增加了 FastAPI 入口，方便后续接前端或小程序。
- 增加了 SQLite 业务库和 MCP server，方便接入 Nuwax/Dify/Coze 这类 Agent 平台。
