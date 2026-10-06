# 寻迹三国 · 三国文化旅游智能服务

以“陈寿笔下的蜀汉记忆”为主线，将文献问答、人物故事、文化地点、活动规划、高德地图和住宿查询连接起来的旅游智能体 Demo。

项目包含 **原生 Web 前端 + FastAPI 后端 + RAG 知识库 + MCP 工具服务**。主要展示南充、阆中、广元等川东北文化主题，也支持填写成都等四川目的地；各地资料完整程度不同，不等同于全省景点均已入库。

本文按 **2026-10-06 的本地 dev 版本**整理。密钥、模型文件、个人授权和本地知识库不随代码仓库自动分发。

## 1. 当前功能

| 功能 | 当前实现 |
|---|---|
| 文化问答 | 检索教师论文、古籍与人物资料，结合模型回答，保留文献出处和作者观点 |
| 陈寿编书史 | 将资料映射到故事章节、文化地点和前端阅读页面 |
| 活动规划 | 填写目的地、出发地、日期、时间、人数、人群、交通与住宿条件，打开陈寿对话并传递需求 |
| 高德地图 | 地点搜索、起终点确认、公交/驾车/步行查询，展示底图、道路轨迹、距离和预计时间 |
| 对话与地图联动 | 回答中的地点查看入口、可识别路线链接可以转入地点搜索或道路页面 |
| 天气 | 使用高德天气服务，按实际返回的日期和天数展示，不固定承诺 7 天预报 |
| 住宿 | 接入本机 RollingGo 酒店查询，展示参考报价；需要独立安装和登录授权 |
| 预算 | 维护价格、用户输入和演示估算，与酒店服务的查询结果分开管理 |
| 核查与修订 | 文化问答提供有限的出处、引文、页码与争议覆盖检查，必要时补检索、最多两轮修订 |
| 探索记录 | 浏览器本地保存阅读进度、探索志和部分方案；会话由后端及女娲适配器管理 |
| MCP | 同一套业务工具通过本地 stdio 或 HTTP 提供给 NuwaClaw 等客户端 |

**活动安排与道路导航是两个环节。** 活动表单会打开智能体对话，但智能体输出不一定自动变成可绘制道路路线。可靠的演示流程：

```text
填写条件 → 陈寿生成活动安排 → 带入地点 → 确认高德起终点 → 查询并显示道路地图
```

## 2. 技术结构

```text
浏览器前端（frontend/）
  ├─ /chat/stream → 女娲智能体 / 本地模型 → 文化回答核查
  └─ /api/travel/* → 景点、故事、天气、高德道路、住宿、预算
                         │
                  共用业务函数与 RAG
                         │
            NuwaClaw ← stdio / HTTP MCP
```

- 前端：原生 HTML、CSS、JavaScript，无 npm 构建步骤。
- Web 后端：FastAPI，同时提供接口和前端静态站点。
- 业务数据：SQLite，保存景点、票价维护数据、预算档位与路线模板等。
- 文化检索：本地 BGE 向量索引、关键词/向量混合召回、重排和来源检查。
- 模型：女娲智能体会话，以及兼容 Chat Completions 的模型接口。
- 外部服务：高德 Web 服务、JS 地图 API、RollingGo，需网络和凭据/授权。

## 3. 目录速览

```text
frontend/                         页面、聊天、地图、规划与探索志
prompts/                          系统提示词、女娲提示词与规划提示词
config/                           示例配置
data/examples/                    景点、预算、路线等样例
data/raw/                         原始资料及结构化知识样例
data/processed/                   默认业务库与索引目录
src/
  api.py                          Web 服务入口
  travel_api.py                   同源旅游接口
  amap_map_api.py                 网页地图配置与安全密钥代理
  mcp_server.py                   HTTP MCP：Streamable HTTP / SSE
  mcp_stdio_server.py             本地 stdio MCP
  san_guo_core/settings.py        .env 配置读取
  agent/                          意图、女娲会话、模型、回答策略、核查修订
  rag/                            BGE、混合检索、重排与来源检查
  ingest/                         文献筛选、提取、入库和业务初始化
  tools/                          旅游、高德、天气与酒店共用工具
  planning/                       文化路线与行程逻辑
scripts/                          检查与检索验证脚本
tests/                            后端测试
docs/                             专项说明、任务板与交接记录
```

## 4. Windows 本地安装与启动

### 4.1 创建独立环境

项目声明 Python **3.12 或以上**，当前联调使用 Python 3.12。以下路径按自己电脑替换。

仓库历史中存在被 Git 跟踪的 `.venv`，不建议直接使用克隆得到的环境。另建 `.venv-local`，不要提交虚拟环境。

```powershell
cd D:\agent_threekingdom
py -3.12 -m venv .venv-local
.\.venv-local\Scripts\Activate.ps1
python -m pip install -r requirements.docker.txt
python -m pip install -e .
```

`requirements.docker.txt` 是轻量基础依赖清单，不表示必须使用 Docker。真实 BGE 检索和 PDF 入库另需：

```powershell
python -m pip install sentence-transformers pypdf rank-bm25
```

`requirements.txt` 包含 Milvus 等可选依赖，不是 Windows 本地 Demo 的必选安装路径。已有可用环境无需重复创建。

### 4.2 配置 .env

在仓库根目录创建 `.env`，**已有文件不要覆盖**。`.env.example` 是参考模板，部分历史默认值与当前 BGE 方案不同。

真实文化检索推荐：

```dotenv
APP_ENV=dev
BUSINESS_DB_PATH=data/processed/business.sqlite3

VECTOR_BACKEND=local
EMBEDDING_BACKEND=bge
EMBEDDING_MODEL=D:/models/bge-large-zh
EMBEDDING_DIMENSION=1024
EMBEDDING_DEVICE=cpu
EMBEDDING_BATCH_SIZE=4
VECTOR_STORE_PATH=D:/rag/sanguo/index.json

LLM_BACKEND=mock
LLM_API_KEY=
```

模型目录和索引必须真实存在，且模型、维度与索引匹配。BGE 索引不能用 Hash 后端打开。未配置模型时，本地资料摘录等降级结果不代表远端模型生成。

仅检查界面和业务接口、暂时没有 BGE 资料包时，可使用以下轻量配置：

```dotenv
VECTOR_BACKEND=local
EMBEDDING_BACKEND=hash
EMBEDDING_DIMENSION=384
VECTOR_STORE_PATH=data/processed/demo-hash-index.json
LLM_BACKEND=mock
```

Hash 用于轻量联调，不等同于真实 BGE 文献检索效果。

### 4.3 初始化数据

**只建议新环境执行。** 业务初始化会通过 `INSERT OR REPLACE` 替换同 ID 样例记录；已有维护库先备份。

```powershell
python src/ingest/seed_business_db.py
```

轻量新环境可建立文本样例索引：

```powershell
python src/ingest/ingest_pipeline.py
```

**通用入库脚本会清空并重建当前配置的索引。不要对现用教师 PDF/BGE 索引执行它。** 已取得完整知识库时，直接配置索引路径即可。

### 4.4 同时启动前后端

```powershell
python -m uvicorn api:app --app-dir src --host 127.0.0.1 --port 8010
```

- 前端：`http://127.0.0.1:8010/`
- 健康检查：`http://127.0.0.1:8010/health`
- 接口文档：`http://127.0.0.1:8010/docs`

**一个命令提供前端和后端，无需另启前端开发服务器。** 不要双击 HTML 以 `file://` 打开，页面依赖同源接口。

BGE 首次加载可能较慢。修改 `.env` 后重启后端；修改静态前端后刷新，必要时 Ctrl+F5。演示时建议不加 `--reload`，避免重复加载模型。

历史 `scripts/start_teacher_rag.ps1` 固定旧索引、Python 路径且默认使用 8011，不作为最新版通用入口。

## 5. 女娲智能体与模型配置

在 `.env` 添加：

```dotenv
NUWAX_BASE_URL=https://agent.nuwax.com
NUWAX_API_KEY=替换为自己的智能体接口密钥
NUWAX_AGENT_ID=替换为数字智能体ID
NUWAX_SANDBOX_ID=替换为数字电脑ID
NUWAX_TIMEOUT_SECONDS=240
```

- 平台地址使用根地址，不是 `/app/` 页面链接。
- Agent ID 决定调用哪个智能体；电脑 ID 用于显式指定电脑，不是电脑名称或个人登录密钥。
- 电脑 ID 可留空，但不保证会话连接到本机 MCP，须通过真实工具执行记录确认。
- 女娲配置完整时网页优先调用女娲，否则走本地模型/资料路径。
- `/health` 的 `configured` 表示字段齐备，不代表网络、权限和 MCP 已实际联通。

平台系统提示词参考 [女娲系统提示词](prompts/nuwax_agent_system_prompt.md)。网页需求组装见 `src/agent/web_prompt.py` 和 `prompts/nuwax_user_prompt.md`。修改本地提示词不等于平台已发布的系统提示词自动更新。

不使用女娲时，可配置兼容模型：

```dotenv
LLM_BACKEND=deepseek
LLM_MODEL=deepseek-chat
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=替换为模型服务密钥
```

兼容模型地址应能追加 `/chat/completions`。模型密钥、女娲接口密钥和电脑登录密钥不是同一类凭据。

## 6. MCP 怎么启动

### 6.1 本地 NuwaClaw：推荐 stdio

在 **NuwaClaw → 配置 → MCP → JSON 模式**添加，路径替换成实际解释器：

```json
{
  "mcpServers": {
    "san-guo-travel-agent": {
      "command": "D:\\agent_threekingdom\\.venv-local\\Scripts\\python.exe",
      "args": ["D:\\agent_threekingdom\\src\\mcp_stdio_server.py"],
      "enabled": true,
      "env": {}
    }
  }
}
```

客户端启用后自动启动脚本。**不用手动另开 stdio，也不用再运行 HTTP MCP。** 手工启动 stdio 后等待输入不是网页服务，它没有浏览器端口。

配置写在客户端，`mcp_stdio_server.py` 是服务实现，两者不能互相替代。更新代码、模型或索引后停用再启用 MCP，在新会话测试。

### 6.2 URL 客户端：启动 HTTP MCP

```powershell
python src/mcp_server.py
```

- Streamable HTTP：`http://127.0.0.1:8000/mcp/`
- SSE：`http://127.0.0.1:8000/sse`

HTTP MCP 默认监听 `0.0.0.0:8000`，与网页 8010 是两个进程。两种 MCP 方式选一种即可；stdio 不用开放 8000。

容器访问 Windows 宿主机可使用 `http://host.docker.internal:8000/mcp/`。云端不能通过自己的 `127.0.0.1` 访问个人电脑；云端“保存并部署 MCP”与 NuwaClaw 本机启用是两件事。

本项目 HTTP MCP 不应直接作为已有公网鉴权的生产服务，公网发布需另外增加鉴权和访问控制。

### 6.3 工具分组

| 分类 | 工具 |
|---|---|
| 文化资料 | `retrieve_culture_knowledge`、`answer_travel_question` |
| 反思核查 | `review_culture_answer`、`review_travel_plan` |
| 景点与预算 | `list_scenic_spots`、`get_spot_ticket`、`estimate_hotel_budget`、`search_hotel_poi_request`、`plan_budget` |
| 文化行程 | `plan_cultural_route`、`get_nanchong_travel_catalog`、`plan_nanchong_itinerary` |
| 高德地点与道路 | `search_amap_places`、`get_amap_route` |
| 天气及道路参考 | `get_travel_weather`、`lookup_travel_city`、`get_road_route` |
| 酒店查询 | `get_hotel_service_status`、`search_rollinggo_hotels`、`get_rollinggo_hotel_detail` |

“已注册”不等于“已执行”，也不保证智能体每次自主调用。`answer_travel_question` 使用本地编排，不通过女娲适配器递归调用远端智能体。

## 7. 高德地图、交通与天气

```dotenv
AMAP_WEB_SERVICE_KEY=高德Web服务Key
AMAP_JS_API_KEY=高德Web端JS_API_Key
AMAP_JS_SECURITY_CODE=JS_API对应安全密钥
```

- Web 服务 Key：后端查地点、公交/驾车/步行路线及天气。
- JS API Key：浏览器加载高德地图 SDK。
- JS 安全密钥：由后端 `/_AMapService` 代理注入，不直接写入 HTML。

申请 Key 时平台类型需对应；同时检查服务权限、配额与安全设置。已有 FastAPI 代理，本地不必再安装 Nginx。

搜索城市和地点 → 确认起终点候选 → 选择交通方式 → 查询道路。返回轨迹后绘制道路；没有轨迹时不画直线冒充导航。

天气按实际返回的日期和天数展示，当前未展示 AQI。`get_road_route` 是独立 WGS84 道路参考入口，不能直接塞入高德 GCJ-02 坐标。

高德不是酒店交易或景区门票供应商。门票来自项目维护资料，酒店通过独立服务查询。

## 8. 酒店服务

本机安装并授权 RollingGo 后，配置：

```dotenv
ROLLINGGO_NODE_PATH=D:/nodejs/node.exe
ROLLINGGO_SKILL_DIR=C:/Users/你的用户名/.codex/skills/rollinggo-hotel-booking
```

需对应技能目录、Node.js 和当前电脑自己的登录授权。队友复制代码不等于取得你的授权，不复制或提交个人凭据。

当前为酒店搜索、房型和参考价格查询，**不下单、不支付、不代订、不锁价**。预算档位、演示费用和真实查询结果分别展示，失败时不伪造可售价格。

## 9. RAG 资料与嵌入代码

### 9.1 当前联调机资料

当前本机使用 BGE CPU、1024 维：

```text
模型：E:/bge-large-zh
现用索引：E:/codex_workplace/sanguo-rag/teacher-bge-v1-chenshou-library-20261006/index.json
本轮资料：D:/QQ/陈寿三国志_资料库_20261006/
入库清单：现用索引同目录的 chenshou-library-report.json
```

本轮验收快照：**570 条记录**，保留原 533 条，新增审核后的 11 份文献、37 段。不表示所有教师 PDF 或整个目录均已入库。

资料保留来源路径、哈希、文献归属和可取得的 PDF 页码/TXT 行号。论文观点与古籍记载分层，TXT 不伪造 PDF 页码。

### 9.2 主要入口

| 文件 | 用途 |
|---|---|
| `src/rag/bge_store.py` | 加载 BGE、计算向量、存取索引 |
| `src/ingest/teacher_pdfs.py` | 按审核清单提取教师 PDF、筛页、切块与入库 |
| `src/ingest/jinshu_text.py` | 陈寿传文本入库 |
| `src/ingest/sanguozhi_people.py` | 景点关联人物《三国志》选段补充 |
| `src/ingest/chenshou_library.py` | 本轮逐文件选段、哈希与边界检查、增量嵌入 |
| `src/ingest/ingest_pipeline.py` | 通用 TXT/MD/JSONL 入库，会重建当前索引 |

PDF 地址在入库脚本、清单和来源元数据中，不在 BGE 模型里；BGE 将选出的正文转换成向量。

本轮资料库导入示例（只适用于相应审核资料包）：

```powershell
$env:PYTHONPATH = "$PWD\src"
python -m ingest.chenshou_library --root "D:\QQ\陈寿三国志_资料库_20261006" --output "D:\rag\sanguo-new\index.json"
```

需已有匹配 BGE 原索引，输出必须是不存在的新文件。来源文件变动后应重新审核哈希与边界；这不是任意资料通用导入器。生成后验收，再修改 `VECTOR_STORE_PATH` 并重启 Web/MCP。

详见 [陈寿资料库入库说明](docs/CHENSHOU-LIBRARY-RAG.md)。

### 9.3 队友接手

1. 获取当前 dev，先保存未提交修改，不盲目执行 `reset --hard`。
2. 建立自己的环境和 `.env`，配置模型、索引、SQLite 路径。
3. 在允许分发的前提下取得同版模型、索引和清单；原 PDF 展示还需复制有权使用的原文件并适配路径。
4. 密钥与酒店授权由队友自行配置，不共用个人凭据。
5. 先检查网页和接口，再验证 MCP、文化检索与地图。

模型、索引、PDF 不会随 `git pull` 自动出现。来源元数据含个人绝对路径时，检索可能可用，但原 PDF 链接需另行适配。受版权保护的电子书、论文不能默认上传公开仓库。

## 10. 接口、测试与演示

| 接口 | 用途 |
|---|---|
| `GET /health` | 服务及配置状态，不替代连通性测试 |
| `POST /chat`、`POST /chat/stream` | 对话与流式事件 |
| `GET /api/travel/spots` | 城市景点资料 |
| `GET /api/travel/stories/chenshou-book-history` | 陈寿编书史 |
| `POST /api/travel/amap/places`、`/api/travel/amap/route` | 高德地点与道路 |
| `GET /api/travel/amap/map-config` | 地图加载配置，不返回 JS 安全密钥 |
| `POST /api/travel/travel-info` | 天气 |
| `POST /api/travel/hotels/search` | 酒店查询 |
| `POST /api/travel/budget/estimate` | 预算估算 |

更多参数见运行中的 `/docs`，以代码为准。

```powershell
Invoke-RestMethod http://127.0.0.1:8010/health
python -m unittest discover -s tests -p test_travel_api.py -v
node frontend/answer-format.test.cjs
node frontend/presentation-copy.test.cjs
```

部分后端测试是 pytest 风格，使用时先安装 pytest，不把 unittest 未收集的测试算作通过。部分历史浏览器测试固定访问 8002，不能直接用于判定 8010 故障。

推荐汇报顺序：

1. 陈寿编书史：展示人物、文献、地点和章节映射。
2. 文化问答：询问“陈寿故里碑有哪些争议？”，展示出处与不同观点。
3. 活动规划：填写条件，自动打开陈寿对话。
4. 地图：确认具体校区和万卷楼，展示高德道路方案。
5. 天气、住宿和预算：区分供应商查询与演示估算。
6. 探索志：展示本机阅读进度与方案保存。

## 11. 项目边界与协作

- Demo 可用固定景点、路线和费用参考，维护/估算不等于实时交易报价。
- 核查是有限规则与补检索机制，不保证每个结论正确；路线、预算没有全部自动经过同一套文化核查。
- 重排是检索排序，不单独等同于反思纠错；修订需要真实核查与补检索支撑。
- 浏览器本地进度不是跨设备长期记忆；后端会话缓存不是完整持久化记忆。
- 高德、天气、模型和酒店受网络、权限、配额、授权影响，演示前实际查询。
- 没有实现 12306 购票、OTA 订单、门票购买或完整实时旅行交易链路。
- 文化地点概览不是道路导航；实际交通地图由高德结果绘制。
- 游客文案使用公告、原文阅读或参考说明；后台数据状态保留，不改变原始资料的可信程度。
- 向外部模型发送文献内容前，应确认资料使用权限和隐私边界。
- 开发环境 CORS 较宽，公网部署需收窄来源，增加鉴权、限流及安全日志。
- 本机直接维护 dev；推送、合并、历史改写需协作者明确确认。不提交 .env、密钥或个人授权。

协作记录见 [任务板](docs/TASKS.md) 与 [交接记录](docs/HANDOFF.md)。
