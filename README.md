# 三国文化旅游智能服务

面向川东北三国文化旅游场景的后端服务工程，提供文化知识检索、路线模板推荐、预算估算、景区票价维护和外部 MCP 工具对接能力。

## 项目定位

本项目用于构建三国文化主题旅游助手的后端基础能力。系统将历史文化资料、景区结构化信息、路线模板、预算估算和外部实时工具分层管理，避免把动态价格、交通班次、天气等高变动信息写入静态知识库。

适用场景：

- 三国文化、陈寿、《三国志》、蜀汉相关问答
- 南充、阆中、广元等川东北目的地路线推荐
- 景区门票和酒店预算估算
- 高铁/火车、天气、地图 POI 等外部工具编排
- Nuwax、Dify、Coze 等 Agent 平台的 MCP 工具接入

## 功能概览

- 业务数据：SQLite 存储景区、票价、酒店预算、路线模板、来源文档和工具调用记录。
- 知识检索：Milvus Lite 存储文化资料向量，支持混合召回、重排和召回质量检查。
- Agent 编排：根据用户意图分流到文化问答、路线规划、预算票价等流程。
- 模型接入：支持 OpenAI-compatible Chat Completions 接口，可接入 DeepSeek 等文本模型。
- 平台工具：提供 MCP Server，便于外部 Agent 平台调用本项目能力。
- 缓存预留：提供 Redis 封装，用于会话、限流和外部工具结果缓存。

## 目录结构

```text
D:\agent_threekingdom
  README.md
  pyproject.toml
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
    mcp_server.py
  tests/
```

## 模块说明

- `src/db.py`：SQLite 表结构和迁移逻辑。
- `src/ingest/seed_business_db.py`：导入景区、票价、酒店预算和路线样例数据。
- `src/ingest/create_vector_collection.py`：创建 Milvus collection。
- `src/ingest/ingest_pipeline.py`：文档切块、来源校验和向量入库。
- `src/tools/business_tools.py`：业务工具函数，包括景区查询、票价查询、酒店预算、路线模板和 POI 查询请求。
- `src/planning/route_planner.py`：基于城市、时长和用户类型选择路线模板。
- `src/agent/intent_router.py`：识别文化问答、路线规划、预算票价等意图。
- `src/agent/orchestrator.py`：串联意图识别、RAG 检索、业务工具和回答生成。
- `src/agent/llm_client.py`：大模型调用封装。
- `src/rag/retriever.py`：混合召回、重排和召回报告生成。
- `src/rag/recall_checker.py`：检测召回覆盖度、缺失实体和来源等级风险。
- `src/api.py`：FastAPI HTTP 服务入口。
- `src/mcp_server.py`：MCP SSE 服务入口。

## 数据库设计

SQLite 表：

```text
scenic_spots              景区/POI 主数据
spot_tickets              景区票价维护数据
hotel_budget_tiers        酒店预算档位
route_templates           路线模板
route_stops               路线站点
user_sessions             用户会话画像
travel_plans              行程方案记录
source_documents          来源文档登记
knowledge_chunk_metadata  知识块业务元数据
external_tool_registry    外部 MCP 工具登记
tool_call_logs            外部工具调用日志
```

向量库：

```text
backend: Milvus Lite
collection: san_guo_culture_chunks
usage: 历史文化知识、景区讲解资料、产品资料检索
```

Milvus Lite 适用于本地开发和小规模演示。多人并发或公网部署场景应迁移至 Milvus Server 或托管向量数据库。

Redis 当前为可选组件，适用于会话缓存、热门问答缓存、外部工具结果短缓存、限流和成本控制。

## 环境配置

配置文件使用 `.env`。敏感信息不得提交到代码仓库。

常用配置项：

```env
VECTOR_BACKEND=milvus
MILVUS_LITE_URI=data/processed/milvus_lite.db
MILVUS_COLLECTION=san_guo_culture_chunks

LLM_BACKEND=deepseek
LLM_MODEL=deepseek-chat
LLM_API_KEY=replace-with-provider-key
LLM_BASE_URL=https://api.deepseek.com

REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379/0

AGENT_PLATFORM_BASE_URL=https://agent.nuwax.com
AGENT_PLATFORM_TOKEN=replace-with-platform-token
```

模型服务 token 与 Agent 平台 token 分属不同系统，应分别管理。

## 本地运行

安装项目：

```powershell
cd D:\agent_threekingdom
& 'C:\Program Files\Python312\python.exe' -m pip install -e .
```

初始化业务库：

```powershell
& 'C:\Program Files\Python312\python.exe' src\ingest\seed_business_db.py
```

创建向量 collection：

```powershell
& 'C:\Program Files\Python312\python.exe' src\ingest\create_vector_collection.py
```

导入知识文档：

```powershell
& 'C:\Program Files\Python312\python.exe' src\ingest\ingest_pipeline.py
```

启动 API：

```powershell
uvicorn api:app --reload --app-dir src
```

健康检查：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "from api import health; print(health())"
```

## 功能测试

路线规划：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('广元两天三国文化路线推荐'))"
```

预算票价：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('南充舒适型酒店预算和万卷楼票价多少钱'))"
```

本地检索链路：

```powershell
$env:LLM_BACKEND='none'
$env:LLM_API_KEY=''
$env:MILVUS_URI=''
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('陈寿和南充有什么关系'))"
```

## MCP 接入

启动本项目 MCP 服务：

```powershell
& 'C:\Program Files\Python312\python.exe' src\mcp_server.py
```

默认入口：

```text
http://localhost:8000/sse
```

推荐使用 Streamable HTTP 的客户端配置为：

```text
http://localhost:8000/mcp
```

容器内客户端访问 Windows 宿主机时，使用：

```text
http://host.docker.internal:8000/mcp
```

云端 Agent 平台通常无法直接访问本机 `localhost`。平台接入时应采用公网部署、内网穿透或平台原生工具改写方式，并配置鉴权、IP 白名单和调用日志。

本项目 MCP 工具：

- `retrieve_culture_knowledge`：检索文化知识并返回召回检查报告。
- `answer_travel_question`：执行本地 Agent 编排。
- `list_scenic_spots`：查询景区主数据。
- `get_spot_ticket`：查询票价维护数据。
- `estimate_hotel_budget`：估算酒店预算。
- `search_hotel_poi_request`：生成百度/高德 POI 查询参数。
- `plan_budget`：汇总住宿预算和已知交通费用。

## 外部工具规划

- 火车/高铁：`Joooook/12306-mcp`。
- POI、地理编码、路线、天气：百度地图 MCP 或高德 MCP。
- 酒店：早期采用预算档位；正式部署应接入合规 OTA 或酒店供应商接口。
- 页面抓取：仅用于白名单官方页面，需记录来源 URL 和更新时间。

## 数据维护要求

- 权威资料放入 `data/raw/`，入库前需校验来源等级。
- 景区票价维护 `source_url`、`updated_at`、`data_status`。
- 酒店预算按城市、档位、淡旺季和节假日策略拆分。
- 路线模板按人群、时长、交通方式和叙事主题维护。
- POI 坐标应通过百度或高德地理编码核验。

## 已知限制

- 当前知识库主要来自项目资料，历史事实回答需要补充权威来源。
- 当前路线规划基于模板选择，不包含实时交通、排队和天气动态优化。
- 当前票价为样例维护数据，不代表实时售价。
- 使用外部大模型时，检索上下文会发送至模型服务商，应按数据合规要求评估。
- 本地 Milvus Lite 不适合多人并发部署。
