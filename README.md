# San Guo AI Travel Agent

三国文化 AI 旅游智能体 Demo 后端工程。

项目目标是做一个面向南充及川东北三国文化深度游的 Agent：既能讲陈寿、《三国志》、蜀汉文化，也能辅助用户做路线、预算、天气、交通和住宿位置规划。

## 当前判断

这个项目现在是“可演示后端底座”，还不是完整上线产品。

已具备：

- SQLite 业务库：景区、票价占位、酒店预算档位、外部 MCP 工具登记
- Milvus Lite 向量库：三国文化 RAG 检索
- RAG 链路：query expansion、hybrid retrieval、rerank、recall check
- MCP server：把本项目能力封装给 Nuwax/Dify/Coze 这类 Agent 平台
- FastAPI：提供 HTTP API
- Redis 封装：用于后续会话、缓存、限流，当前可选

尚未具备：

- 真实 LLM 生成
- 真实 12306 MCP 调用
- 真实百度/高德 MCP 调用
- Redis 服务
- Milvus Server 并发部署
- 权威历史资料库
- 真正动态路线调度

## 是否必须多模态

不必须。

早期版本完全可以先用 DeepSeek 这类纯文本大模型。你的核心场景是：

- 文本问答
- 历史讲解
- 路线规划
- 预算解释
- 工具结果总结

这些不需要多模态模型。

多模态适合后续功能：

- 用户上传小红书截图，识别攻略内容
- 用户上传景区照片，识别当前位置或文物
- AR/实景讲解
- 地图截图理解

因此推荐阶段：

```text
MVP：DeepSeek / 通义 / OpenAI 文本模型
增强版：加 OCR 处理截图
高级版：加多模态模型做图片识别和实景导览
```

不要一开始强行多模态。成本更高、调试更复杂，且不是当前 Demo 的核心。

## 目录结构

```text
san_guo_ai_travel_agent/
  README.md
  .env.example
  requirements.txt
  config/
    mcp_servers.example.json
  data/
    raw/
    processed/
    examples/
  prompts/
  schemas/
  src/
    agent/
    cache/
    ingest/
    planning/
    rag/
    tools/
    api.py
    cli.py
    config.py
    db.py
    domain.py
    eval_retrieval.py
    mcp_server.py
  tests/
```

## 文件夹说明

### config

外部 MCP 工具配置。

- `mcp_servers.example.json`：登记 12306、百度地图、高德地图、SerpApi、Fetch 等 MCP 工具。真实平台导入时参考这里。

### data

项目数据。

- `data/raw/`：放原始文档，例如老师给的论文、景区资料、地方志文本。
- `data/processed/`：程序生成数据，例如 SQLite、Milvus Lite、local vector fallback。
- `data/examples/`：样例数据，包括景区、路线、酒店预算档位、知识块模板。

### prompts

提示词模板。

- `system_prompt.md`：Agent 总规则
- `intent_router_prompt.md`：意图识别规则
- `answer_prompt.md`：回答生成规则
- `route_planner_prompt.md`：路线规划规则

### schemas

数据结构约束。

- `knowledge_chunk.schema.json`：RAG 知识块结构
- `spot.schema.json`：景点结构
- `route.schema.json`：路线结构

### src

核心代码。

- `config.py`：读取 `.env`，管理 Milvus、Redis、LLM、平台 token 等配置
- `db.py`：SQLite 建表
- `domain.py`：核心数据模型
- `api.py`：FastAPI 服务入口
- `cli.py`：命令行入口
- `mcp_server.py`：MCP SSE 服务入口
- `eval_retrieval.py`：检索评测脚本

### src/agent

Agent 编排层。

- `intent_router.py`：判断用户意图
- `orchestrator.py`：串联意图识别、RAG、业务工具
- `response_policy.py`：召回不足时降级，避免编造

### src/rag

RAG 检索层。

- `store.py`：Milvus Lite / local vector store
- `retriever.py`：混合召回
- `reranker.py`：轻量重排
- `recall_checker.py`：召回检查
- `query_expansion.py`：查询扩展
- `embeddings.py`：hash embedding fallback
- `tokenizer.py`：中文分词 fallback
- `chunking.py`：文档切块
- `citation.py`：来源格式化

### src/ingest

入库脚本。

- `create_vector_collection.py`：创建 Milvus collection
- `ingest_pipeline.py`：读取文档并写入向量库
- `seed_business_db.py`：初始化 SQLite 业务数据
- `validate_sources.py`：判断来源等级
- `normalize_documents.py`：文档标准化

### src/tools

业务工具。

- `business_tools.py`：查景区、查票价、估酒店预算、生成酒店 POI 查询请求、预算汇总

### src/cache

缓存层。

- `redis_cache.py`：Redis 可选封装，用于会话、限流、外部工具结果缓存

## 数据库分工

### SQLite

存结构化业务数据：

- 景区清单
- 景区票价维护数据
- 酒店预算档位
- 外部 MCP 工具登记

当前已初始化：

```text
scenic_spots 5
spot_tickets 3
hotel_budget_tiers 9
external_tool_registry 6
```

### Milvus Lite

存 RAG 向量数据。

当前 collection：

```text
san_guo_culture_chunks
```

已从开发文档索引过 141 个 chunk。

注意：Milvus Lite 是本地文件型数据库，在 Windows 上不能多进程并行访问同一个库文件。它适合本地 Demo；接 Nuwax 给多人用时，应换成 Milvus Server。

### Redis

当前只是可选封装，还没有启 Redis 服务。

用途：

- 用户会话
- 12306/天气/POI 查询缓存
- 热门问答缓存
- 限流和成本控制

## 快速运行

### 1. 安装依赖

```bash
python -m pip install -r requirements.txt
```

如果遇到 `WinError 10013`，通常是网络权限拦截，不是包不存在。

### 2. 创建 Milvus collection

```bash
python src/ingest/create_vector_collection.py
```

### 3. 文档入库

```bash
python src/ingest/ingest_pipeline.py
```

如果 `data/raw` 为空，会优先读取：

```text
C:/Users/18496/Desktop/三国文化 AI 旅游智能体 Demo 开发需求文档.md
```

### 4. 初始化业务数据库

```bash
python src/ingest/seed_business_db.py
```

### 5. 检查召回

```bash
python src/eval_retrieval.py
```

### 6. 启动 API

```bash
uvicorn src.api:app --reload
```

健康检查：

```text
GET /health
```

### 7. 启动 MCP 服务

```bash
python src/mcp_server.py
```

默认地址：

```text
http://localhost:8000/sse
```

## MCP 工具

本项目自己的 MCP server 暴露这些工具：

- `retrieve_culture_knowledge`：检索三国文化知识，返回上下文和召回检查
- `answer_travel_question`：调用本地 Agent 编排回答问题
- `list_scenic_spots`：列出川东北三国文化相关景区
- `get_spot_ticket`：查询景区票价维护数据
- `estimate_hotel_budget`：估算酒店预算
- `search_hotel_poi_request`：生成百度/高德 MCP 的酒店 POI 查询参数
- `plan_budget`：汇总住宿预算和已知路费

外部 MCP 建议：

- 火车/高铁：`12306-mcp`
- 天气/POI/路线：百度地图 MCP、高德地图 MCP
- 官方页面抓取兜底：Fetch MCP，必须加白名单

不建议：

- Airbnb MCP：中国大陆住宿不适用
- 爬携程/美团/去哪儿：合规、反爬、登录态和稳定性风险高

## Agent 平台 token

不要把 token 写进代码。

放到 `.env`：

```env
AGENT_PLATFORM_TOKEN=你的平台token
AGENT_PLATFORM_BASE_URL=https://agent.nuwax.com
LLM_API_KEY=你的模型token
LLM_BASE_URL=模型base_url
```

注意：

- 平台 token 和模型 token 不是一回事
- 云端平台访问不到你本机 `localhost`
- 如果要让 Nuwax 调本项目 MCP，需要部署到服务器或做内网穿透
- MCP 服务暴露公网后要做鉴权或 IP 白名单

## 当前能跑的功能

### 初始化业务库

```bash
python src/ingest/seed_business_db.py
```

作用：写入景区、票价占位、酒店预算档位、MCP 工具登记。

### 创建向量库

```bash
python src/ingest/create_vector_collection.py
```

作用：创建 `san_guo_culture_chunks` collection。

### 文档入库

```bash
python src/ingest/ingest_pipeline.py
```

作用：把开发文档或 `data/raw` 里的资料切块并写入 Milvus。

### 酒店预算估算

```bash
python -c "import sys; sys.path.append('src'); from tools.business_tools import estimate_hotel_budget; print(estimate_hotel_budget('南充','舒适型',1,1))"
```

作用：按城市、档位、晚数、房间数估住宿预算。

### API 健康检查

```bash
python -c "import sys; sys.path.append('src'); from api import health; print(health())"
```

作用：查看服务、Milvus、Redis 配置状态。

### MCP server 导入检查

```bash
python -c "import sys; sys.path.append('src'); import mcp_server; print(mcp_server.server.name)"
```

作用：确认 MCP server 可以被 Python 导入。

## 距离理想目标还差什么

1. 真实 LLM 生成  
当前还没有把 DeepSeek/OpenAI/通义接入生成链路。

2. 真实外部 MCP 调用  
12306、百度、高德只是配置和工具规划，还没在平台里实际调用。

3. Redis 服务  
代码已封装，但当前环境未启 Redis。

4. Milvus Server  
Milvus Lite 不能支撑多人并发。

5. 权威历史资料  
当前开发文档切出来的 chunk 只能支撑产品说明，不能支撑严肃历史结论。

6. 路线规划  
现在还是样例路线，不是真正基于时间、交通、天气、兴趣动态规划。

7. 票价维护  
现在票价表是占位。Demo 可以写死，但必须补 `source_url` 和 `updated_at`。

8. 测试  
还需要补检索、rerank、SQLite 工具、MCP 调用、低召回降级测试。

## 设计原则

- 历史文化资料进 RAG
- 景区、票价、酒店预算进 SQLite
- 天气、火车、POI 走 MCP/API
- 会话、缓存、限流走 Redis
- LLM 只负责组织和表达，不负责编事实

