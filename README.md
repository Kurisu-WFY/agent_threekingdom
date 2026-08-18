# 三国文化 AI 旅游智能体 Demo

项目路径：`D:\agent_threekingdom`

这是一个面向“川东北三国文化旅游”的 Agent 后端 Demo。当前定位是可跑的工程底座，不是完整上线系统。

## 先纠正几个前提

1. 景区票价不一定长期不变。Demo 可以写死，但正式上线必须保存 `source_url`、`updated_at`、`data_status`，并提示“以官方/下单页为准”。
2. 酒店价格不能靠 RAG 写死。酒店受日期、节假日、库存、位置、房型影响很大，早期只能做预算档位；上线应接 OTA 或地图 POI + 外部报价服务。
3. 不必须用多模态。当前问答、路线、预算、工具结果总结用 DeepSeek 这类纯文本模型就能先做。多模态适合后续截图攻略解析、景区照片识别、AR/实景讲解。
4. Milvus Lite 适合本地 Demo，不适合多人并发上线。多人访问要换 Milvus Server 或云向量库。
5. 当前知识库来源主要是开发文档，可信等级偏 C，不能支撑严肃历史结论。上线前必须补权威史料、地方志、景区官方资料、论文或博物馆资料。

## 当前已经能跑

- SQLite 业务库：景区、票价占位、酒店预算、路线模板、路线站点、用户会话、计划记录、来源文档、知识块元数据、外部工具登记、工具调用日志。
- Milvus Lite collection：`san_guo_culture_chunks`，已能做向量检索。
- RAG 链路：query expansion、hybrid retrieval、rerank、recall check。
- Agent 编排：意图识别后分流到路线规划、预算票价、文化问答。
- FastAPI：`src/api.py`。
- MCP server：`src/mcp_server.py`，用于导入 Nuwax/Dify/Coze 类平台。
- DeepSeek 接入框架：`.env` 已按 OpenAI-compatible chat completions 形式配置，真实调用需你确认外发知识库上下文风险。

## 目录结构

```text
D:\agent_threekingdom
  README.md
  .env
  pyproject.toml
  requirements.txt
  config/
    mcp_servers.example.json
  data/
    raw/             # 原始资料
    processed/       # SQLite、Milvus Lite、本地向量缓存
    examples/        # Demo 景区、酒店预算、路线样例数据
  prompts/           # Agent 提示词
  schemas/           # JSON Schema
  src/
    agent/           # 意图识别、回答链、编排器、LLM client
    cache/           # Redis 可选封装
    ingest/          # 入库、建 collection、业务库种子
    planning/        # 路线规划
    rag/             # chunk、embedding、检索、rerank、召回检查
    tools/           # 本地业务工具封装
    api.py
    cli.py
    config.py
    db.py
    domain.py
    mcp_server.py
  tests/
```

## 核心文件作用

- `src/db.py`：SQLite 建表和旧表迁移。业务数据不要塞进向量库，结构化数据放这里。
- `src/ingest/seed_business_db.py`：把 `data/examples` 里的景区、酒店预算、路线模板写入 SQLite。
- `src/tools/business_tools.py`：本地工具层，查景区、票价、酒店预算、路线模板，并生成百度/高德 POI MCP 调用请求。
- `src/planning/route_planner.py`：根据用户话术猜城市、时长、用户类型，选择路线模板。
- `src/agent/orchestrator.py`：Agent 总编排，按意图分流。
- `src/rag/retriever.py`：混合召回 + rerank + recall check。
- `src/rag/recall_checker.py`：召回质量检查，防止低证据强答。
- `src/agent/llm_client.py`：DeepSeek/OpenAI-compatible 文本模型调用封装。
- `src/api.py`：HTTP API。
- `src/mcp_server.py`：给 Agent 平台导入的 MCP 服务。

## 数据库设计

SQLite 当前表：

```text
scenic_spots              景区/POI 主数据
spot_tickets              景区票价维护数据
hotel_budget_tiers        酒店预算档位
route_templates           路线模板
route_stops               路线站点
user_sessions             用户会话画像
travel_plans              生成过的行程方案
source_documents          来源文档登记
knowledge_chunk_metadata  RAG chunk 业务元数据
external_tool_registry    外部 MCP 工具登记
tool_call_logs            外部工具调用日志
```

当前种子数据：

```text
scenic_spots: 5
route_templates: 3
route_stops: 5
hotel_budget_tiers: 9
```

Milvus Lite：

```text
collection: san_guo_culture_chunks
用途: 历史文化知识、产品文档、讲解材料的向量检索
```

Redis：当前未启用。上线建议用于会话缓存、热门问题缓存、12306/天气/POI 结果短缓存、限流和成本控制。

## 怎么跑

先确认使用系统 Python：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "import sys; print(sys.executable)"
```

安装项目为 editable 包：

```powershell
cd D:\agent_threekingdom
& 'C:\Program Files\Python312\python.exe' -m pip install -e .
```

初始化业务数据库：

```powershell
& 'C:\Program Files\Python312\python.exe' src\ingest\seed_business_db.py
```

创建 Milvus collection：

```powershell
& 'C:\Program Files\Python312\python.exe' src\ingest\create_vector_collection.py
```

文档入库：

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

## 已验证功能

路线规划：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('我想在广元玩两天三国文化路线'))"
```

预算票价：

```powershell
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('南充舒适型酒店预算和万卷楼票价多少钱'))"
```

本地 RAG 检索，不外发给大模型：

```powershell
$env:LLM_BACKEND='none'
$env:LLM_API_KEY=''
$env:MILVUS_URI=''
& 'C:\Program Files\Python312\python.exe' -c "from agent.orchestrator import handle_user_message; print(handle_user_message('陈寿和南充有什么关系'))"
```

## 你后续要填什么

1. 权威知识资料：陈寿、《三国志》、蜀汉、阆中张飞庙、剑门蜀道、昭化古城等资料，放 `data/raw/` 后重新入库。
2. 景区票价：维护到 `data/examples/scenic_spots_northeast_sichuan.sample.json` 的 `demo_ticket`，并补 `source_url`、`updated_at`。
3. 酒店预算：按城市、节假日、淡旺季拆更细的 `hotel_budget_tiers`，否则预算只能粗估。
4. 路线模板：补亲子、学术、年轻游客、自驾、公共交通等版本，写进 `data/examples/routes.sample.json`。
5. 平台 token：放 `.env`，不要写进代码。`AGENT_PLATFORM_TOKEN` 是平台 token，`LLM_API_KEY` 是模型 token，不是一回事。
6. 百度/高德 Key：用于 POI、地理编码、天气、路线。
7. 12306 MCP 配置：用于火车票和车次查询。

## 接 Agent 平台的判断

Nuwax 这类 Agent 平台从产品形态上可以按 Dify/Coze 类似平台理解：导入工具、配置知识库/工作流/模型、由平台调 MCP 或 HTTP API。但具体支持的 MCP 协议、鉴权方式、SSE/stdio/http 入口，要以 Nuwax 控制台实际配置项为准。

本机 `localhost` 不能直接给云平台调用。要让 Nuwax 调这个项目，有三种方式：

```text
方案 A: 部署到云服务器，暴露 HTTPS MCP/API
方案 B: 内网穿透，仅 Demo 使用
方案 C: 把工具逻辑按平台要求改写成平台内置工具/工作流
```

## 外部工具建议

- 火车/高铁：`Joooook/12306-mcp`。
- POI/位置/酒店附近搜索：百度地图 MCP 或高德 MCP。
- 天气：优先高德/百度天气接口；也可用平台已有天气工具。
- 酒店价格：不要直接爬携程/美团/去哪儿，合规和稳定性风险高。早期用预算档位，正式上线找 OTA 合作接口或只做“附近酒店 POI + 价格以平台为准”。
- Airbnb：中国大陆房源覆盖和可用性不适合做本项目主住宿数据源。

## 当前不足和风险

- RAG 数据质量不足：现在主要是开发文档，召回检查会提示 C 级来源不足。
- 路线规划还是模板选择，不是实时交通/天气/排队动态优化。
- 票价是 Demo 人工值，不是事实实时价。
- DeepSeek 可以接，但文化知识上下文会外发给模型供应商；正式项目要确认数据合规。
- Milvus Lite 不能承载多用户并发。
- Redis 没启用，短期可不加；上线必须考虑缓存、限流和工具调用成本。
- POI 坐标当前是近似样例，正式展示地图前要用百度/高德地理编码核验。
