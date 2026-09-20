# 后端接口总览 · BACKEND-API-REFERENCE

> **本文是「后端所有接口」的完整清单与字段说明**，覆盖 HTTP（Web API）与 MCP（工具服务）两个入口。
> 与 `docs/BACKEND-API.md` 的分工：那份是**前端对接协议 + 缺口清单**（偏“要什么”）；
> 本文是**接口字典**（偏“有什么、怎么调、返回什么”）。
>
> **口径（重要）**：
> - 标 **【实测】** 的字段/行为，都是 2026-09-20 对**运行中的容器**（`sgt-snapshot-api`，http://localhost:8001）
>   真实抓取的响应，不是推测。
> - 标 **【源码】** 的来自后端源码阅读（路径见文末索引）。
> - 标 **【未实测】** 的是读了源码但没有跑起来验证的（MCP 工具属于这类，原因见第 5 节）。
>
> **被测后端版本**：`origin/master @ 4fcccad`（= 交付快照 `sgt-snapshot-4fcccad-827adc8` 里那份后端）。
> 复现脚本：**`docs/tools/probe_api.py`**（仓库内自带；`--out` 指定证据 JSON 的输出目录）。
>
> 📌 **要动手改后端 → 先看 `docs/BACKEND-TODO.md`**（工作单：优先级 + 实测证据 + 改哪里 + 验收标准 + 自测命令）。
> 本文回答「**现在有什么、怎么调、返回什么**」，工作单回答「**该改哪里、改成什么样**」。
>
> ⚠️ **版本口径**：HTTP 部分是**对运行中的容器（= `4fcccad`）实测**；而 `origin/dev` 上
> **MCP 侧已经有新接口（工具 7 → 8 个）并新增 stdio 入口**，且这批改动**已经在 `dev` 分支里**
> （`frontend/`、`docs/` 也都在 `dev`），只是**尚未合进 `master`**。差异见 **5.2 节**。
> 远端 tip 会随提交前进，**别照抄 SHA**：用 `git log --oneline origin/dev` 看当前值。

---

## 0. 三十秒结论

| 事项 | 结论 |
|---|---|
| Web API 业务接口 | **只有 2 个**：`GET /health`、`POST /chat` |
| 静态前端 | `GET /` 起（整个 `frontend/` 目录被挂到根路径，`html=True`） |
| FastAPI 自带 | `/openapi.json`、`/docs`、`/redoc` **都可用**（没有被静态挂载吞掉） |
| MCP 工具 | **7 个**，走 SSE（`/sse` + `/messages`）；**不在 Web API 容器里**（实测 `GET /sse` → 404）。`origin/dev` 上已到 **8 个**，见 5.2 |
| 意图 | **4 条**：`route_planning` / `budget_ticket` / `history_vs_romance` / `culture_qa`（兜底） |
| 最大坑 | `/chat` 响应**多态**；`route` 有**三种形态**（对象 / `null` / **连 key 都没有的对象**） |
| 未实现但前端已提案 | 4 个 `/api/travel/*`（全部未实现，前端 `enabled=false` 关着） |

---

## 1. 服务拓扑（两个入口，别混）

```
① Web API（本容器跑的就是它）
   src/api.py  →  uvicorn api:app --host 0.0.0.0 --port 8000
   容器 sgt-snapshot-api，宿主映射 8001   ← 前端/浏览器对接的是这个
   业务接口：GET /health、POST /chat；另挂静态前端于 /
   启动命令（Dockerfile.backend 的 CMD）：
     python src/ingest/seed_business_db.py && python src/ingest/ingest_pipeline.py
       && exec uvicorn api:app --host 0.0.0.0 --port 8000 --app-dir src

② MCP Server（另一个入口，本容器不含）
   src/mcp_server.py  →  python src/mcp_server.py（uvicorn，同一端口号 8000）
   仓库自带 Docker 配置跑的就是它：容器名 san-guo-mcp，基底 langgenius/dify-api:1.16.0
   传输：SSE —— Route("/sse") + Mount("/messages")

③ MCP stdio 入口（**只在 origin/dev 上，尚未进 master**）
   src/mcp_stdio_server.py  →  python src/mcp_stdio_server.py（不开端口，协议走 stdin/stdout）
   复用 ② 的同一个 server 实例（工具集与 SSE 版一致），给能直接拉起本地命令的 MCP 客户端用
   （源码注释点名 Windows NuwaClaw 客户端）
```

**【实测】** 在 Web API 容器上请求 `/sse` → `404 {"detail":"Not Found"}`，
证明 MCP 端点**没有**挂在本容器里；要联调 MCP 得单独起 `san-guo-mcp`（见第 5 节）。

---

## 2. 接口清单总表

| # | 协议 | 方法与路径 | 用途 | 本容器可用 | 依据 |
|---|---|---|---|---|---|
| 1 | HTTP | `GET /health` | 健康检查 + 后端能力自述 | ✅ | 【实测】 |
| 2 | HTTP | `POST /chat` | 智能体入口（意图分流 → 文化问答/路线/预算） | ✅ | 【实测】 |
| 3 | HTTP | `GET /` | 前端页面（`frontend/index.html`） | ✅ | 【实测】 |
| 4 | HTTP | `GET /*`（静态资源） | `styles.css`、`*.js`、`*.json`、图片等 | ✅ | 【实测】 |
| 5 | HTTP | `GET /openapi.json` | FastAPI 自动生成的接口描述 | ✅ | 【实测】 |
| 6 | HTTP | `GET /docs` / `GET /redoc` | Swagger UI / ReDoc | ✅ | 【实测】 |
| 7 | MCP | `GET /sse` + `POST /messages` | MCP SSE 传输端点 | ❌（在 MCP 服务里） | 【实测】404 / 【源码】 |
| 8 | MCP | `tools/list` 下 7 个工具 | 见第 5 节 | ❌（同上） | 【源码】【未实测】 |
| — | HTTP | `GET /api/travel/spots`、`POST /api/travel/plans/preview`、`POST /api/travel/budget/estimate`、`POST /api/travel/travel-info` | 前端提案的旅游模块接口 | ❌ **未实现**（GET→404、POST→405） | 【实测】 |

---

## 3. HTTP 接口详解

### 3.1 `GET /health`

- **请求**：无参数、无 body。【实测】
- **响应**（200，`application/json`）——**实测原样**：

```json
{
  "status": "ok",
  "vector_backend": "local",
  "milvus_collection": "san_guo_culture_chunks",
  "redis": {
    "enabled": true,
    "available": false,
    "url": "redis://localhost:6379/0",
    "note": "Redis is optional for local demo. Use it for sessions, rate limits, and external MCP result cache in deployment."
  }
}
```

| 字段 | 类型 | 语义 | 坑 |
|---|---|---|---|
| `status` | string | 恒为 `"ok"`（能响应即正常） | 不是“依赖都健康”的意思 |
| `vector_backend` | string | `local` 或 `milvus` | 本部署是 `local`；不装 `pymilvus` 时不能是 `milvus` |
| `milvus_collection` | string | 集合名（本部署其实没用到） | 值是配置默认值，不代表真的连了 Milvus |
| `redis.enabled` | bool | **“redis 客户端是否构造成功”**，不是配置开关 | ⚠️ compose 里的 `REDIS_ENABLED=false` **完全无效**：`settings.py` 里没有这个字段（`extra="ignore"`）【源码】 |
| `redis.available` | bool | 真正 `ping()` 成功才为 `true` | 本部署 `false` 属正常，Redis 是可选项 |
| `redis.url` | string | 连接串 | 来自 `settings.redis_url` 默认值 |

- **【实测】** `POST /health` → `405 {"detail":"Method Not Allowed"}`。

### 3.2 `POST /chat`

#### 3.2.1 请求体

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `message` | string | **是** | — | 用户输入 |
| `mode` | string | 否 | `"大众"` | 受众模式（路由里只用于 `target_user` 兜底） |
| `history` | array\<object\<string,string\>\> | 否 | `[]` | 形如 `[{"role":"user","content":"…"}]` |

- 模型定义【源码】：`class ChatRequest(BaseModel): message: str; mode: str = "大众"; history: list[dict[str, str]] = Field(default_factory=list)`
- **【实测】** `extra` 字段被**忽略**（传 `unknown_field` 仍 200）；
  `history` 元素**缺 `content`** 也 200（`dict[str,str]` 不要求键齐全）。
- **注意**：`/chat` **没有定义响应模型**（handler 直接返回 `dict`），
  所以 `/openapi.json` 里 `/chat` 的 `responses` 只有 `200: Successful Response`，**没有响应 schema**；
  请求 schema 是有

#### 3.2.2 校验与边界行为（全部【实测】）

| 场景 | 结果 |
|---|---|
| 缺 `message` | **422**，`detail[0] = {"type":"missing","loc":["body","message"],"msg":"Field required"}` |
| `message` 类型错（如 `123`） | **422**，`detail[0].type = "string_type"` |
| `message` 为空串 `""` | **200**，落成 `culture_qa`（`answer` 69 字） |
| 传了多余字段 | **200**（忽略未知字段） |
| `history` 元素缺 `content` | **200** |
| `history` 带多轮 + `mode` | **200** |
| `GET /chat` | **404**（不是 405：GET 路由不存在，被静态挂载兜成 404） |
| JSON 不合法 / body 不是对象 | 422（FastAPI 标准校验错误） |

> 前端必须把 **422 当错误处理**，不能假定“永远 200”。

#### 3.2.3 ⚠️ 响应是**多态的**（最重要的一节）

顶层字段随 `intent.intent` 变化——**【实测】矩阵**：

| `intent.intent` | 顶层字段 | `route` | `retrieval` | 置信度（实测） |
|---|---|---|---|---|
| `route_planning` | `answer`, `intent`, `route`, `hotel_poi_request` | **对象** | 无此 key | 0.82 |
| `budget_ticket` | `answer`, `intent`, `route` | **`null`** | 无此 key | 0.78 |
| `history_vs_romance` | `answer`, `intent`, `retrieval` | **完全没有这个 key** | 对象 | 0.72 |
| `culture_qa` | `answer`, `intent`, `retrieval` | **完全没有这个 key** | 对象 | 0.55（**默认兜底值，不是真识别出来的**） |

> 📌 `history_vs_romance` 这条意图**以前的文档漏了**（本文补上）。它的行为与 `culture_qa` 一致：
> 有 `retrieval`、**没有 `route`**。

**消费姿势**：一律「先判 `intent.intent`，再取字段」，或用可选链；
**不要**假定 `route` 存在，也**不要**假定它是对象。

#### 3.2.4 `intent` 对象（四条意图都有）

```json
{ "intent": "route_planning", "confidence": 0.82, "reason": "命中路线/行程规划词。" }
```

**判定规则【源码】**（`src/agent/intent_router.py`，纯关键词、按顺序命中即返回）：

| 优先级 | 意图 | 置信度 | 触发词 | reason |
|---|---|---|---|---|
| 1 | `route_planning` | 0.82 | `路线` `行程` `怎么玩` `一日游` `半日` `两天` `规划` `游览` | 命中路线/行程规划词。 |
| 2 | `budget_ticket` | 0.78 | `预算` `票价` `门票` `酒店` `住宿` `多少钱` `费用` | 命中预算/票价/住宿词。 |
| 3 | `history_vs_romance` | 0.72 | `三国演义` `正史` `历史` `虚构` `真实` `区别` | 命中史实与演义辨析词。 |
| 4 | `culture_qa` | 0.55 | （都不命中时的**默认兜底**） | 默认进入三国文化问答。 |

- 关键词是**子串包含**判断：`"从南充出发，去阆中、剑阁，再到广元旅游"` 里没有路线词 →
  实测落成 `culture_qa`（**这是个真实的漏判**，前端已记录，见任务板 #8）。
- 口语化问法同样漏判：**【实测】**「陈寿跟南充有啥关系」→ `culture_qa`（这个期望一致）；
  但「怎么安排两天的三国之行」这类不带上述词的会被兜底。

#### 3.2.5 `answer`

- string，纯文本，**含换行**（`\n`）。**【实测】** 各意图长度：路线 169 字、文化问答 1029 字、
  预算票价 128 字、正史/演义 982 字。
- 由 `src/agent/answer_chain.py` 生成（`LLM_BACKEND=mock` 时是检索式模板输出）。

#### 3.2.6 `route`：**三种形态**（前端最容易踩）

**形态 A — `found: true`（正常路线）【实测】**：

```json
{
  "found": true,
  "route": {
    "route_id": "nanchong_one_day_story_route",
    "name": "陈寿笔下的蜀汉记忆·南充一日线",
    "city": "南充",
    "theme": "三国文化",
    "target_user": "大众",
    "duration_hours": 8.0,
    "transport_mode": "打车/公交",
    "summary": "以陈寿和地方蜀汉遗迹为主线……",
    "risk_note": "王平墓开放状态和讲解资料需核验。",
    "updated_at": "2026-09-20"
  },
  "stops": [
    {
      "stop_order": 1,
      "stay_minutes": 120,
      "reason": "用陈寿与《三国志》建立核心叙事。",
      "spot_id": "nanchong_xishan_wanjuanlou",
      "name": "西山风景区·万卷楼",
      "city": "南充",
      "address": "四川省南充市顺庆区西山风景区",
      "recommended_duration_min": 90,
      "open_time": "以景区当日公告为准"
    },
    { "stop_order": 2, "name": "鹤鸣山景区·王平墓", "...": "…" }
  ],
  "selection_reason": "按城市、用户类型和时长接近度选择。"
}
```

**形态 B — `found: false`（没匹配到路线）【实测】**：`route` 仍是对象，但**只有两个键**：

```json
{
  "found": false,
  "message": "未找到匹配路线，需维护 route_templates 和 route_stops。"
}
```

> ⚠️ 这种形态下 **`route.route` 和 `route.stops` 这两个 key 根本不存在**（不是 `null`！）。
> 触发示例：【实测】`{"message":"襄阳两天三国文化路线规划"}`（`襄阳` 没有路线模板）。
> `answer` 此时等于那句 `message`。

**形态 C — `null`**：`budget_ticket` 时 `route` 存在但值为 `null`。【实测】

| 子字段 | 类型 | 说明 | 坑 |
|---|---|---|---|
| `route.route.updated_at` | string(`YYYY-MM-DD`) | 模板更新时间 | ⚠️ **它是入库种子日期（= 容器重建当天）**，不是真实维护时间；`seed_business_db.py` 用 `date.today()` 兜底【源码】 |
| `stops[].stop_order` | int | 顺序 | — |
| `stops[].stay_minutes` | int | 建议停留 | — |
| `stops[].reason` | string | 为什么排这一站 | — |
| `stops[].spot_id` | string | 稳定主键（适合前端缓存键） | — |
| `stops[].recommended_duration_min` / `open_time` | int / string | 景区侧建议时长与开放时间（文本） | — |
| **`stops[].coordinates`** | — | **不存在** | 🔴 见第 6 节：**数据库里其实有 `lat`/`lng`，只是查询没取** |

#### 3.2.7 `retrieval`（仅 `culture_qa` / `history_vs_romance`）

**【实测】**：

```json
{
  "query": "陈寿和南充有什么关系",
  "total_candidates": 8,
  "final_hits": 5,
  "coverage": 1.0,
  "missing_entities": [],
  "warnings": [],
  "passed": true
}
```

- 模型 = `san_guo_core.models.RecallReport`【源码】。
- `coverage` 是 0–1 召回覆盖率；`passed` 是是否达标（阈值 `min_recall_coverage = 0.55`【源码】）。
- `missing_entities` / `warnings` 为数组，可空。

#### 3.2.8 `hotel_poi_request`（仅 `route_planning`）

**【实测】**：

```json
{
  "action": "call_external_mcp",
  "preferred_tools": ["baidu-maps-mcp", "amap-mcp-server"],
  "tool_purpose": "poi_search",
  "parameters": { "city": "南充", "keyword": "酒店", "near_spot": null },
  "note": "本地只封装调用意图；真实 POI 查询由 Agent 平台调用百度/高德 MCP。"
}
```

> ⚠️ **这是给外部 MCP 的“调用意图”，不是查询结果**。里面**没有**任何真实酒店数据，
> 前端不能拿它当数据渲染（把它当“我们准备去查酒店”的元信息即可）。

#### 3.2.9 `budget_ticket` 的 `answer` 是怎么拼出来的【源码】

`orchestrator._answer_budget()`：

1. **城市**：消息含 `阆中` → 阆中；含 `广元`/`剑门`/`昭化` → 广元；否则 **默认南充**。
2. **档位**：含 `经济` → 经济型；含 `品质`/`高端` → 品质型；否则 **默认舒适型**。
3. **酒店预算**：`plan_budget(city, tier, nights=1, rooms=1)` → 输出 `min - max CNY/晚/间`。
4. **门票**：**只**在这 6 个名字出现在消息里时才附加一行：
   `万卷楼` / `汉桓侯祠` / `张飞庙` / `剑门关` / `昭化古城` / `王平墓`。
   → 所以 **【实测】** 「阆中古城门票多少钱」只回酒店预算、**完全不提门票**（名字不在名单里）；
   而「南充舒适型酒店预算和万卷楼票价多少钱」会附加
   「景区票价：西山风景区·万卷楼：**0.0 - 0.0 CNY（manual_demo）**」。
5. 固定尾注：`说明：景区票价为维护数据；酒店和交通价格波动较大，正式服务应接入 OTA、地图和 12306 等实时工具。`

> 🔴 注意第 4 步的 `0.0 - 0.0`：数据库里 `spot_tickets.price_min/price_max` **就是 0.0**
> （【源码+实测】种子数据如此），含义是“未知/未核验”，但**表达成了 0** —— 前端照实显示会像“免费”。
> 按协议应改成 `null` 并带 `data_status`（见第 6 节）。

### 3.3 静态前端挂载：`GET /` 及静态资源

**【源码】** `src/api.py` 末尾：

```python
_frontend = Path(__file__).resolve().parent.parent / "frontend"
if _frontend.exists():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
```

- 目录存在才挂载（**没有 `frontend/` 时 `/` 会是 404**）。
- `html=True`：目录请求给 `index.html`；`/` → `frontend/index.html`。
- `app.mount` 是**最后注册**的，所以前面精确注册的路由（`/health`、`/chat`、`/docs`、`/openapi.json`、`/redoc`）
  **优先级更高、不会被静态吞掉**——**【实测】** 全部可访问，已确认。
- **【实测】** `GET /` → 200 `text/html; charset=utf-8`，36272 字节；
  `GET /styles.css` → 200 `text/css; charset=utf-8`，90217 字节。
  文件内容 = 当前挂载源目录（本环境是前端迭代 worktree）。
- **【实测】** 不存在的路径 → `404 {"detail":"Not Found"}`（StaticFiles 的 404 走了同样的 JSON 形状）。

### 3.4 自动文档端点

| 路径 | 实测结果 | 说明 |
|---|---|---|
| `GET /openapi.json` | 200 | 含 `paths`: `/health`、`/chat`；`components.schemas`: `ChatRequest`、`HTTPValidationError`、`ValidationError` |
| `GET /docs` | 200（Swagger UI） | 可直接在浏览器里点调试 |
| `GET /redoc` | 200 | ReDoc 版 |

`ChatRequest` 的 OpenAPI schema【实测抓取】：

```json
{
  "type": "object",
  "required": ["message"],
  "properties": {
    "message":  { "type": "string" },
    "mode":     { "type": "string", "default": "大众" },
    "history":  { "type": "array", "items": { "type": "object", "additionalProperties": { "type": "string" } } }
  }
}
```

> 因为没有响应模型，`/chat` 的响应结构**在 OpenAPI 里是空的** —— 想看返回什么，只能看本文档或实测。

### 3.5 CORS（【实测】）

| 场景 | 结果 |
|---|---|
| `OPTIONS /chat`（预检，带 `Origin` + `Access-Control-Request-Method`） | 200，响应头：`access-control-allow-origin: *`、`access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT`、`access-control-allow-headers: content-type`、`access-control-max-age: 600` |
| `POST /chat`（带 `Origin`） | 200，响应头带 `access-control-allow-origin: *` |
| `POST /chat`（不带 `Origin`） | 200，**不带** `access-control-allow-*`（正常：CORS 头只在跨域请求时加） |

**【源码】** `allow_origins=["*"]`, `allow_credentials=False`, `allow_methods=["*"]`, `allow_headers=["*"]`
—— 本地开发放开，**正式部署应收窄为具体前端域名**（源码注释也这么写）。

---

## 4. 错误与状态码约定（汇总）

| 状态码 | 出现场景 | 响应体形状 |
|---|---|---|
| 200 | 正常；也包括 `message=""` 这种“能处理但没内容”的情况 | 见第 3.2 节 |
| 404 | 路径不存在（`/sse`、任意未注册路径、`GET /chat`） | `{"detail":"Not Found"}` |
| 405 | 方法不对（如 `POST /health`） | `{"detail":"Method Not Allowed"}` |
| 405 | **对静态挂载下不存在的路径用非 GET/HEAD 方法**（如 `POST /api/travel/plans/preview`）—— Starlette `StaticFiles` 对非 GET/HEAD 直接 405【实测】 | `{"detail":"Method Not Allowed"}` |
| 422 | 请求体校验失败（缺 `message`、类型错、body 非法 JSON） | `{"detail":[{"type","loc","msg","input",...}]}` |
| 500 | 目前**未观测到**；业务异常会直接冒泡成 500（没有全局异常处理器）【源码】 |

---

## 5. MCP 接口 ·【源码】【未实测】

### 5.1 本容器 / `4fcccad` 的 7 个工具

**为什么未实测**：MCP 服务由**另一个入口**提供（`python src/mcp_server.py`，仓库自带 Docker 配置的容器 `san-guo-mcp`），
本环境跑的是 Web API 容器，实测 `GET /sse` → 404，所以这 7 个工具本轮只做了源码核对，没有实际调用。

**传输**：SSE。`Route("/sse", …)` 建流 + `Mount("/messages", …)` 收消息【源码】。

| # | 工具名 | 作用 | 必需参数 | 可选参数 | 实现 |
|---|---|---|---|---|---|
| 1 | `retrieve_culture_knowledge` | 检索三国文化/陈寿/《三国志》/川东北景区知识，返回 rerank 后的上下文与召回报告 | `query` | `intent` | `HybridRetriever().retrieve()` |
| 2 | `answer_travel_question` | 走完整 Agent 编排（意图识别 → 检索 → 召回检查 → 受控回答） | `message` | — | `TravelAgentService().answer()` |
| 3 | `list_scenic_spots` | 列出已维护的川东北三国景区，可按城市过滤 | — | `city` | `list_scenic_spots(city)` |
| 4 | `get_spot_ticket` | 查景区门票维护数据（价格区间、来源、`data_status`） | `spot_name_or_id` | — | `get_spot_ticket()` |
| 5 | `estimate_hotel_budget` | 按城市/档位/晚数/房间数估算酒店预算（**不查实时价**） | `city` | `tier`(默认 舒适型)、`nights`、`rooms` | `estimate_hotel_budget()` |
| 6 | `search_hotel_poi_request` | 生成调用百度/高德 MCP 查酒店 POI 的**参数**（不执行查询） | `city` | `near_spot`、`keyword`(默认 酒店) | `search_hotel_poi_request()` |
| 7 | `plan_budget` | 酒店档位 + 已知路费 → 行程预算估算 | `city` | `hotel_tier`、`nights`、`rooms`、`train_budget` | `plan_budget()` |

**返回形状**【源码】：`as_text(...)` 把结果 `json.dumps(ensure_ascii=False, indent=2)` 包成一个
`TextContent`（`type: "text"`）。即：**MCP 工具返回的是 JSON 字符串，不是对象**。

主要返回结构（由 `src/tools/travel_business_tools.py` 决定）：

| 工具 | 返回字段（要点） |
|---|---|
| `retrieve_culture_knowledge` | `{context: string, recall_report: RecallReport}` |
| `answer_travel_question` | 与 `POST /chat` 的响应结构**完全一致**（同一个 `TravelAgentService.answer`） |
| `list_scenic_spots` | `list[dict]`，行 = `scenic_spots` 表整行（含 `spot_id/name/city/address/lat/lng/theme_json/relation_level/recommended_duration_min/open_time/ticket_source_status/source_url/updated_at`） |
| `get_spot_ticket` | 命中：`{found:true, spot_id, name, city, ticket_name, price_min, price_max, currency, booking_url, source_type, source_url, updated_at, data_status, notes}`；无票价时追加 `warning`；未命中：`{found:false, message}` |
| `estimate_hotel_budget` | `{found:true, city, tier, price_min, price_max, currency, nights, rooms, total_min, total_max, source_type, updated_at, warning}`；未命中：`{found:false, message}` |
| `search_hotel_poi_request` | `{action:"call_external_mcp", preferred_tools:[…], tool_purpose:"poi_search", parameters:{city,keyword,near_spot}, note}` |
| `plan_budget` | `{found:true, city, hotel:{…}, train_budget, estimated_total_min, estimated_total_max, generated_at, warning}`；酒店未命中时**直接返回酒店的 `{found:false, message}`** |
| 未知名 | `{error: "Unknown tool: <name>"}` |

**外部 MCP 依赖登记**（`external_tool_registry` 表，3 条，【实测 DB】）：

| tool_name | provider | purpose | 时效规则 | 风险 |
|---|---|---|---|---|
| `12306-mcp` | Joooook/12306-mcp | 火车票查询 | 实时查询 | 依赖开源 MCP 可用性与 12306 页面/接口变化 |
| `baidu-maps-mcp` | Baidu Maps | POI/地理编码/路线 | 按调用实时 | 需要百度地图开发者 Key 和额度 |
| `amap-mcp-server` | Amap | POI/地理编码/天气/路线 | 按调用实时 | 需要高德开放平台 Key 和额度 |

### 5.2 `origin/dev` 上已有的接口变化（**尚未进 master，未实测**）

`origin/dev @ 546cabf` 相对 `4fcccad` 的后端改动（**源码比对**得出，没跑起来验证）：

**① MCP 工具 7 → 8 个**（`src/mcp_server.py`：172 → 262 行）——新增 `plan_cultural_route`：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `city` | string | ✅ | 目的地，如南充、阆中、广元 |
| `duration_hours` | number | — | 可游览小时数，如 4、8、16 |
| `group_type` | string(enum) | — | `亲子` / `大众` / `学术`（游客类型 / 叙事深度） |
| `interests` | array\<string\> | — | 兴趣，如 陈寿、蜀汉人物、军事地理、亲子研学 |
| `transport_mode` | string | — | 出行方式，如 步行、打车、自驾 |

返回：最匹配的三国文化 Demo 路线，**并带每站的历史叙事理由**。

**② `answer_travel_question` 入参扩展**：新增 `mode`（enum `亲子`/`大众`/`学术`，默认大众）与
`history`（先前对话，元素 `{role, content}`）——即 MCP 侧也能传受众模式与多轮历史。

**③ 新增 stdio 传输入口** `src/mcp_stdio_server.py`（27 行，见第 1 节 ③）：不开网络端口，
复用同一个 `server` 实例，故**工具集与 SSE 版完全一致**。
（源码注释写的是 "preserves the exact same **seven** tools"，而该分支实际已是 8 个 —— 注释没跟着更新。）

**④ `/chat` 的路线行为可能已变**：`src/planning/route_planner.py` 相对 4fcccad **+31 行**，
`route_planning` 的站点选择/约束逻辑可能不同 —— **在 dev 上实测之前，不要把本文第 3.2.6 节的路线样例当成 dev 的行为断言**。

**⑤ 提示词与文档**：`prompts/system_prompt.md`、`prompts/answer_prompt.md` 有改动，
新增 `prompts/nuwax_agent_system_prompt.md`（32 行）；`README.md` +41 行。

> 结论：**master 仍是 `4fcccad`**，前端与联调当前对接的就是它；dev 上这些 MCP 新接口
> 要等合进 master（或单独部署 `san-guo-mcp`）才可用。

### 5.3 `dev` 上 `/chat` 的 `route_planning` **新增了顶层字段**（2026-09-20 对"最新仓库容器"实测）

`dev` 的 `src/planning/route_planner.py` 已经让路线响应多返回三个字段 ——
**本文第 3.2.3 节的多态矩阵是 `4fcccad` 的（4 个键），`dev` 上 `route_planning` 实际是 7 个键**：

| 新增字段 | 实测值 | 说明 |
|---|---|---|
| `planning_preferences` | `{"city":"南充","duration_hours":8,"target_user":"大众","interests":[],"transport_mode":"打车/公交"}` | **后端已经会解析**用户在句子里表达的时长/人群/交通/兴趣（例："南充**半天**…" → `duration_hours: 4`） |
| `notice` | `"路线顺序和停留时间来自 Demo 模板；实时交通、天气、营业时间和导航需接入地图/天气服务后确认。"` | 面向用户的**诚实提示**，前端可直接展示 |
| `data_status` | `"demo_template"` | ⚠️ **这个值不在已拍板的 5 值词表里**（应为 `sample` 等，见 `docs/BACKEND-TODO.md` P0-2）。前端对它**安全降级**：`app.js` 的 `Object.hasOwn(statuses, …)` 判定失败 → 显示"回答 · 待核验"，**不会露出原串、也不会报错** |

**注意两件事**（都在最新容器上复测过）：
1. `planning_preferences.duration_hours` 已经正确解析成 4，但返回的**模板仍是 8/16 小时** ——
   即"**约束能解析、还没生效**"（`docs/BACKEND-TODO.md` P1-1）。
2. `stops[]` **仍然没有坐标**（P0-1 未修）。

---

## 6. 数据契约与缺口（**前端/后端联调的关键**）

### 6.1 🔴 P0：`stops[]` 没有坐标 —— 但**数据库里其实有**

- **现象【实测】**：`/chat` 的 `route.stops[]` 没有任何坐标字段。
- **真相【源码 + 实测 DB】**：
  - `scenic_spots` 表**有 `lat`、`lng` 列且已填值**，实测数据：

    | spot_id | name | lat | lng |
    |---|---|---|---|
    | `nanchong_xishan_wanjuanlou` | 西山风景区·万卷楼 | 30.792 | 106.067 |
    | `nanchong_langzhong_huanhouci` | 阆中古城·汉桓侯祠（张飞庙） | 31.577 | 105.965 |
    | `nanchong_hemingshan_wangpingmu` | 鹤鸣山景区·王平墓 | 30.78 | 106.11 |
    | `guangyuan_jianmen_shudao` | 剑门蜀道剑门关旅游景区 | 32.214 | 105.57 |

  - 但取站点用的 SQL（`get_route_detail`）**只 SELECT 了**
    `rs.stop_order, rs.stay_minutes, rs.reason, s.spot_id, s.name, s.city, s.address, s.recommended_duration_min, s.open_time`
    —— **`s.lat`、`s.lng` 没被取出来**，所以坐标在最后一步被丢掉。
- **因此后端修法很小**（1 处 SQL + 1 处组装）：
  `get_route_detail` 增加 `s.lat, s.lng`，在 `stops[]` 里输出
  `coordinates: [lng, lat]`（注意**经度在前**）与 `coordinate_system`。
- ⚠️ **坐标系必须核实后再标**：DB 里的值只到小数点后 3 位（≈百米级），来源与坐标系（WGS84 / GCJ-02）**没有标注**。
  前端底图是 GCJ-02（高德/腾讯系），标错会让点位偏几百米。
- 前端侧已就绪：一旦有 `coordinates` + `coordinate_system: "GCJ-02"`，地图**自动按后端顺序对齐**（已实测对照）。

### 6.2 🔴 P0：价格类缺结构化 `data_status`/`sources`/`updated_at`，且未知金额写成 `0`

> ✅ **词表已拍板（协调者 2026-09-20）：`sample` / `maintained` / `live` / `pending` / `stale`** ——
> **全项目唯一口径**，前端 `app.js` / `travel-modules.js` / `story-map.js` 已按这套硬编码实现。
> 数据库里现有的 `manual_demo` / `manual_demo_table` / `manual_fixed` 需按
> **`docs/BACKEND-TODO.md` P0-2 的映射表**迁移；前端只在 `maintained`/`live`
> **且** `updated_at` 带时区、`sources[]` 含 A/B 来源时才视为"可靠数据"。

- **现象【实测】**：`/chat` 的 `budget_ticket` 只把价格写在 `answer` 散文里，结构化字段里没有状态/来源/更新时间。
- **真相【实测 DB】**：

  | 表 | 字段 | 实测值 | 问题 |
  |---|---|---|---|
  | `spot_tickets` | `price_min`/`price_max` | 万卷楼 `0.0`/`0.0`；王平墓 `0.0`/`30.0`；剑门关 `90.0`/`120.0` | **未知被写成 0**（万卷楼实际是“未知/可能免费待核”，不是 0 元） |
  | `spot_tickets` | `data_status` | 全部 `"manual_demo"` | **不在协议允许集**（`sample / maintained / live / pending / stale`）里 |
  | `spot_tickets` | `source_url` / `booking_url` | 全部空串 | **没有来源链接** |
  | `hotel_budget_tiers` | `source_type` | `manual_demo_table` | 同上，非协议取值 |
  | `scenic_spots` | `ticket_source_status` | `manual_demo` | 同上 |

  > 协议允许集是 `sample | maintained | live | pending | stale`（见 `docs/BACKEND-API.md`）；
  > 实际库里用的是 `manual_demo` / `manual_demo_table` / `manual_fixed` —— **两边要统一**。

- **建议**：未知金额用 `null`；每条含价格/时间/动态信息的记录带
  `data_status` + `updated_at`（带时区 ISO8601）+ `sources[]({title, source_url, source_level})`。

### 6.3 🟡 P1：四个旅游模块接口**未实现**

`GET /api/travel/spots`、`POST /api/travel/plans/preview`、`POST /api/travel/budget/estimate`、
`POST /api/travel/travel-info` —— **全部未实现**。**【实测】**：GET 那个返回 `404`，
三个 POST 返回 **`405`**（不是 404 —— 请求落进了根路径的静态挂载，而 Starlette `StaticFiles`
对非 GET/HEAD 一律 405）。前端已按提案写好并**用 `config.enabled=false` 关着**，
提案见 `frontend/API-CONTRACT.md`。约定：统一返回 `{status: "ok|empty|unavailable", message, data}`。

### 6.4 🟡 P2：`/chat` 顶层字段建议归一化

现在前端要为「`route` 可能没这个 key / 可能是 `null` / 可能是 `{found:false}`」写三种分支。
若后端保证**顶层字段恒定、不适用时为 `null`**，前端能简单一大截（破坏性变更，需前后端一起改）。

### 6.5 数据库里已建表但**没有接口**（未来扩展点）【实测 DB】

| 表 | 行数 | 现在有没有接口 |
|---|---|---|
| `travel_plans`（行程持久化） | 0 | ❌ 无接口（前端目前存 localStorage） |
| `user_sessions`（会话/偏好） | 0 | ❌ 无接口 |
| `tool_call_logs`（工具调用日志） | 0 | ❌ 无接口 |
| `knowledge_chunk_metadata` | 0 | ❌ 无接口 |
| `source_documents`（来源文档） | 0 | ❌ 无接口 |

---

## 7. 已知限制（别当真数据用）

- `LLM_BACKEND=mock`：文化问答是**检索式模板输出**，不是真大模型；接真模型需配 `LLM_API_KEY`。
- 知识库只有 **8 条演示知识**（`data/raw/demo_knowledge.jsonl`）；【实测】`coverage=1.0` 是因为样本太少。
- 业务库是**演示数据**：5 个景区、5 条票价、9 条酒店档位、3 条路线模板、5 个路线站点。
- **票价/酒店均为人工维护的演示数据，非实时**；`source_url` 全空。
- `route.route.updated_at`、`spot_tickets.updated_at` 等 = **入库种子日期**（`date.today()` 兜底），
  会随容器重建变化，**不代表真实维护时间**。
- 演示数据里的 `lat`/`lng` 只到 3 位小数（≈百米级），且**未标坐标系**；不能直接当景区入口精确坐标。
- Redis 未接（`available=false`）不影响主流程。

---

## 8. 自测命令（可复制）

```powershell
$py = "C:\Python\Python311\python.exe"
$env:PYTHONIOENCODING = "utf-8"

# 健康检查
& $py -c "import json,urllib.request;print(json.dumps(json.loads(urllib.request.urlopen('http://127.0.0.1:8001/health',timeout=15).read().decode()),ensure_ascii=False,indent=2))"

# 四条意图（把 message 换掉即可）
& $py -c "import json,urllib.request;d=json.dumps({'message':'南充一天三国文化路线'},ensure_ascii=False).encode();r=urllib.request.Request('http://127.0.0.1:8001/chat',data=d,headers={'Content-Type':'application/json'});o=json.loads(urllib.request.urlopen(r,timeout=60).read().decode());print(o['intent'],sorted(o))"

# 缺 message 必须是 422（不是 200/500）
& $py -c "import json,urllib.request,urllib.error;d=b'{}';r=urllib.request.Request('http://127.0.0.1:8001/chat',data=d,headers={'Content-Type':'application/json'});
try: urllib.request.urlopen(r,timeout=15)
except urllib.error.HTTPError as e: print('HTTP',e.code,e.read().decode()[:80])"

# 自动文档
start http://localhost:8001/docs        # Swagger UI
& $py -c "import json,urllib.request;print(list(json.loads(urllib.request.urlopen('http://127.0.0.1:8001/openapi.json',timeout=15).read().decode())['paths']))"
```

一键全量探针（本次文档所用，仓库内自带）：`& $py "$repo\docs\tools\probe_api.py" --base http://localhost:8002`

---

## 9. 源码索引（要改哪里）

| 想改什么 | 文件 |
|---|---|
| HTTP 接口本身（新增路由、静态挂载、CORS） | `src/api.py` |
| 意图判定关键词与置信度 | `src/agent/intent_router.py` |
| 分流与响应组装（多态从哪来） | `src/agent/orchestrator.py` |
| 受控回答生成 | `src/agent/answer_chain.py`、`src/agent/response_policy.py` |
| 路线选择与 `answer` 拼接 | `src/planning/route_planner.py` |
| 景区/票价/酒店/路线 SQL（**坐标丢在这一步**） | `src/tools/travel_business_tools.py` |
| 检索与召回报告 | `src/rag/hybrid_retriever.py`、`recall_checker.py` |
| MCP 工具定义与传输 | `src/mcp_server.py` |
| 请求/响应模型与召回报告模型 | `src/san_guo_core/models.py` |
| 配置项与召回阈值 | `src/san_guo_core/settings.py` |
| 演示数据入库（含 `date.today()` 兜底） | `src/ingest/seed_business_db.py` |
| 表结构 | `src/db.py` |

---

## 10. 相关文档

| 文档 | 定位 |
|---|---|
| `docs/BACKEND-API.md` | 前端对接协议：实测现状 + **缺口清单**（要什么） |
| **本文** | **全部接口字典**：清单 + 字段 + 边界 + 错误（有什么） |
| `frontend/API-CONTRACT.md` | 前端侧提案（4 个旅游接口 + `map_route`）+ 已实现的降级 |
| `AGENTS.md` | 协作上下文、分工、命令 |
| `docs/TASKS.md` | 任务板（谁在做什么） |
