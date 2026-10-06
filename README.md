# 寻迹三国

以陈寿与《三国志》为线索，连接文化阅读、智能问答和旅行规划的旅游智能体项目。

从一篇文献、一位人物或一处景点出发，用户可以了解历史背景，安排文化活动，再查看道路路线、天气与住宿信息。项目主要围绕南充、阆中、广元等川东北地区展开，也支持成都等四川目的地的出行需求。

## 功能特色

- **有出处的文化问答**：结合古籍、研究论文与人物资料进行检索，呈现文献依据，区分史籍记载、文学演绎和作者观点。
- **陈寿编书史**：将人物经历、著述与文化地点组织成故事章节，支持阅读与探索。
- **对话式活动规划**：填写目的地、出发地、人数和出行偏好后，自动打开陈寿向导对话，继续讨论活动安排。
- **高德地图与道路规划**：搜索地点、确认起终点，查询公交、驾车或步行方案，展示道路轨迹与路线详情。
- **天气与住宿查询**：查询目的地天气，通过 RollingGo 搜索酒店、房型及参考房价。
- **预算与探索记录**：提供费用参考，保存本地方案、阅读进度和探索志。
- **回答核查与修订**：检查部分引文、出处与争议观点，按需补充检索和修订。
- **MCP 工具接入**：向 NuwaClaw 等客户端提供文化检索、景点、行程、地图与酒店工具。

活动规划与道路查询相互配合：先让向导整理活动安排，再确认具体地点，查看高德返回的交通方案。

## 技术栈

| 模块 | 技术 |
|---|---|
| 前端 | 原生 HTML、CSS、JavaScript |
| Web 服务 | FastAPI、Uvicorn |
| 业务数据 | SQLite |
| 知识检索 | BGE、向量与关键词混合召回、重排 |
| 智能体 | 女娲智能体、兼容 Chat Completions 的模型服务 |
| 工具协议 | MCP stdio、Streamable HTTP、SSE |
| 地图与天气 | 高德 Web 服务、JS API |
| 酒店查询 | RollingGo |

前端由后端直接提供，无需单独构建或启动前端开发服务器。

## 项目结构

```text
frontend/                 页面、聊天、地图、规划与探索志
prompts/                  系统提示词与场景提示词
config/                   示例配置
data/
  examples/               景点、路线和预算样例
  raw/                    原始资料
  processed/              业务数据库与知识索引
src/
  api.py                  Web 服务入口
  travel_api.py           旅游业务接口
  amap_map_api.py          网页地图配置与代理
  mcp_server.py           HTTP MCP 服务
  mcp_stdio_server.py     本地 stdio MCP 服务
  agent/                  问答、智能体会话与核查修订
  rag/                    向量存储、检索和重排
  ingest/                 资料提取与入库
  tools/                  文化、地图、天气与酒店工具
  planning/               文化路线与行程逻辑
  san_guo_core/           配置与数据模型
scripts/                  检查与验证脚本
tests/                    后端测试
docs/                     专项说明
```

## 快速开始

### 安装环境

需要 Python 3.12 或以上。酒店服务及部分前端测试还需要 Node.js。

在项目根目录创建自己的虚拟环境：

```powershell
py -3.12 -m venv .venv-local
.\.venv-local\Scripts\Activate.ps1
python -m pip install -r requirements.docker.txt
python -m pip install -e .
```

`requirements.docker.txt` 提供基础运行依赖，使用它并不需要 Docker。启用 BGE 和 PDF 处理时，再安装：

```powershell
python -m pip install sentence-transformers pypdf rank-bm25
```

建议自行创建环境，不直接使用随仓库复制的虚拟环境目录。

### 配置项目

在根目录创建 `.env`，可参考 `.env.example`。已有配置时保留原文件，按需修改。

以下是 BGE 本地检索的配置示例，模型和索引路径请按实际位置调整：

```dotenv
APP_ENV=dev
BUSINESS_DB_PATH=data/processed/business.sqlite3

VECTOR_BACKEND=local
EMBEDDING_BACKEND=bge
EMBEDDING_MODEL=models/bge-large-zh
EMBEDDING_DIMENSION=1024
EMBEDDING_DEVICE=cpu
EMBEDDING_BATCH_SIZE=4
VECTOR_STORE_PATH=data/processed/culture-index.json

LLM_BACKEND=mock
LLM_API_KEY=
```

BGE 模型与对应索引需要另外准备，并保持模型及向量维度一致。模型文件和知识库不随代码自动下载。

如果只想先运行页面和业务样例，可以切换到轻量配置：

```dotenv
VECTOR_BACKEND=local
EMBEDDING_BACKEND=hash
EMBEDDING_DIMENSION=384
VECTOR_STORE_PATH=data/processed/demo-index.json
LLM_BACKEND=mock
```

Hash 配置适合基础联调；文化检索建议使用 BGE。两种索引不能混用。

### 初始化数据

新环境可导入业务样例：

```powershell
python src/ingest/seed_business_db.py
```

该操作会替换同 ID 的样例记录，已有业务数据请先备份。

使用轻量配置时，可建立文本样例索引：

```powershell
python src/ingest/ingest_pipeline.py
```

通用入库脚本会重建当前索引。已有文献知识库时，不需要执行这一步，直接配置其路径即可。

### 启动服务

```powershell
python -m uvicorn api:app --app-dir src --host 127.0.0.1 --port 8010
```

启动后访问：

- 页面：`http://127.0.0.1:8010/`
- 接口文档：`http://127.0.0.1:8010/docs`
- 健康检查：`http://127.0.0.1:8010/health`

这个服务同时提供前端和后端。请通过网页地址访问，不要直接双击 HTML 文件。

修改 `.env` 后需要重启服务；修改前端文件后刷新页面即可。BGE 首次加载模型时，请等待服务完成启动。

## 智能体与模型接入

### 女娲智能体

在 `.env` 中配置：

```dotenv
NUWAX_BASE_URL=https://agent.nuwax.com
NUWAX_API_KEY=your-agent-api-key
NUWAX_AGENT_ID=your-agent-id
NUWAX_SANDBOX_ID=your-computer-id
```

智能体 ID 和电脑 ID 使用平台提供的数字标识。智能体 ID 用于选择智能体，电脑 ID 用于指定运行本地工具的电脑。

电脑 ID 可以留空；若希望调用本机 MCP，建议明确指定，并通过实际工具调用确认连接。配置完整后，网页优先使用女娲智能体。

平台系统提示词可参考 [女娲智能体提示词](prompts/nuwax_agent_system_prompt.md)。本地文件修改后，平台上的系统提示词需要同步更新。

### 兼容模型服务

也可以直接接入兼容 Chat Completions 的模型：

```dotenv
LLM_BACKEND=deepseek
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your-model-api-key
```

`LLM_BASE_URL` 应是能够追加 `/chat/completions` 的接口根地址。未配置模型时，项目提供本地资料回答等降级结果。

## MCP 接入

### 本地 stdio

适合在 NuwaClaw 等可启动本地命令的客户端使用。在客户端的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "san-guo-travel-agent": {
      "command": "<项目绝对路径>/.venv-local/Scripts/python.exe",
      "args": ["<项目绝对路径>/src/mcp_stdio_server.py"],
      "enabled": true,
      "env": {}
    }
  }
}
```

将占位路径替换为自己的解释器和脚本绝对路径。上例为 Windows；其他系统使用相应的 Python 可执行文件。

客户端会自动启动 stdio 服务，无需手动运行脚本，也无需同时启动 HTTP MCP。代码或知识库更新后，重新启用客户端中的 MCP 服务即可。

### HTTP 服务

需要通过 URL 连接时，在项目根目录运行：

```powershell
python src/mcp_server.py
```

- Streamable HTTP：`http://127.0.0.1:8000/mcp/`
- SSE：`http://127.0.0.1:8000/sse`

HTTP MCP 与网页服务分别运行。根据客户端选择 stdio 或 HTTP，不必同时启动。

容器访问宿主机可使用 `host.docker.internal`。云端服务不能通过自己的 `127.0.0.1` 访问本地电脑；远程部署时需要可达地址及相应的鉴权和网络控制。

### 工具一览

| 分类 | 工具 |
|---|---|
| 文化问答 | `retrieve_culture_knowledge`、`answer_travel_question` |
| 回答与行程核查 | `review_culture_answer`、`review_travel_plan` |
| 景点与预算 | `list_scenic_spots`、`get_spot_ticket`、`estimate_hotel_budget`、`search_hotel_poi_request`、`plan_budget` |
| 文化行程 | `plan_cultural_route`、`get_nanchong_travel_catalog`、`plan_nanchong_itinerary` |
| 高德地图 | `search_amap_places`、`get_amap_route` |
| 天气与道路参考 | `get_travel_weather`、`lookup_travel_city`、`get_road_route` |
| 酒店服务 | `get_hotel_service_status`、`search_rollinggo_hotels`、`get_rollinggo_hotel_detail` |

## 地图与出行服务

### 高德配置

```dotenv
AMAP_WEB_SERVICE_KEY=your-web-service-key
AMAP_JS_API_KEY=your-js-api-key
AMAP_JS_SECURITY_CODE=your-js-security-code
```

Web 服务 Key 用于地点、道路和天气查询；JS API Key 用于网页地图。JS 安全密钥由后端代理处理，不直接写入页面。

项目已提供 `/_AMapService` 代理，本地运行无需额外配置 Nginx。申请 Key 时注意选择对应的平台类型，并开通所需服务。

道路查询需要先搜索并确认具体地点，再选择交通方式。地图绘制供应商返回的道路轨迹；天气按供应商返回的预报展示。

### 酒店配置

安装并完成 RollingGo 授权后，配置程序与技能目录的实际路径：

```dotenv
ROLLINGGO_NODE_PATH=<Node.js可执行文件绝对路径>
ROLLINGGO_SKILL_DIR=<RollingGo技能目录绝对路径>
```

酒店功能提供搜索、房型和参考价格查询，不进行预订或支付。每位使用者需自行完成授权。

## 知识库与资料管理

知识库采用“原始资料 → 正文提取 → 审核切块 → BGE 嵌入 → 混合检索与重排”的流程。

文献保留标题、来源等级、作者归属，以及可取得的页码或文本行号。史籍、研究观点与文学资料分别处理，便于在回答中展示依据。

| 代码入口 | 用途 |
|---|---|
| `src/rag/bge_store.py` | BGE 模型加载、向量计算与索引存储 |
| `src/ingest/teacher_pdfs.py` | 按审核清单提取 PDF 正文并入库 |
| `src/ingest/jinshu_text.py` | 陈寿传文本处理 |
| `src/ingest/sanguozhi_people.py` | 景点关联人物的史籍选段处理 |
| `src/ingest/chenshou_library.py` | 陈寿专题资料筛选与增量嵌入 |
| `src/ingest/ingest_pipeline.py` | 通用 TXT、MD、JSONL 导入 |

专题脚本包含针对相应资料的审核规则，不是任意 PDF 自动导入器。新增资料时，应先检查正文质量、来源与重复内容，再建立新索引，验收后切换 `VECTOR_STORE_PATH`。

部署到另一台电脑时，需要同时准备模型、索引和有权使用的来源资料，并调整文件路径。PDF 原文展示依赖对应的来源文件。请勿将密钥、个人授权或无分发许可的电子书提交到公开仓库。

## 接口与测试

常用接口：

| 接口 | 用途 |
|---|---|
| `GET /health` | 服务与配置状态 |
| `POST /chat`、`POST /chat/stream` | 对话与流式回答 |
| `GET /api/travel/spots` | 景点资料 |
| `GET /api/travel/stories/chenshou-book-history` | 陈寿编书史 |
| `POST /api/travel/amap/places` | 高德地点搜索 |
| `POST /api/travel/amap/route` | 高德道路规划 |
| `POST /api/travel/travel-info` | 天气查询 |
| `POST /api/travel/hotels/search` | 酒店查询 |
| `POST /api/travel/budget/estimate` | 预算估算 |

完整参数可查看运行中的 `/docs`。

```powershell
python -m unittest discover -s tests -p test_travel_api.py -v
node frontend/answer-format.test.cjs
node frontend/presentation-copy.test.cjs
```

部分测试使用 pytest，运行前需安装对应依赖。浏览器测试需要正在运行的 Web 服务，请检查测试脚本中的服务地址。

## 使用说明

文化地点与故事路线用于阅读和活动安排，实际交通以道路查询为准。票价维护数据和演示预算属于参考信息，酒店服务返回的价格也不代表锁价或预订成功。

回答核查帮助发现部分引文和观点问题，但不能代替完整的史料考证。探索记录主要保存在浏览器本地，暂不提供跨设备同步。

外部模型、地图和酒店服务需要网络及相应权限。公网部署前，应配置接口鉴权、访问控制和限流，并妥善保管密钥。
