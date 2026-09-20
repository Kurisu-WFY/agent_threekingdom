# 后端接口协议 · BACKEND-API

> **用途**：前端 ↔ 后端的接口凭据。内容全部由 DSH 于 2026-09-12 **对着真实运行的后端实测**得到
> （后端 = 交付快照 `sgt-snapshot-4fcccad-827adc8`，容器 `sgt-snapshot-api`，http://localhost:8001）。
> 凡是标「实测」的都是抓下来的真实响应，不是推测；标「提案」的是前端需要、后端尚未实现的部分。
>
> 前端侧的对应提案见 `frontend/API-CONTRACT.md`（Codex 写），本文是它的**后端落地版 + 现状补全**。

---

## 一、已实现接口（实测）

### 1. `GET /health`

```json
{
  "status": "ok",
  "vector_backend": "local",
  "milvus_collection": "san_guo_culture_chunks",
  "redis": {
    "enabled": true,
    "available": false,
    "url": "redis://localhost:6379/0",
    "note": "Redis is optional for local demo. ..."
  }
}
```

- `status` 恒为 `"ok"`（服务能响应即正常）。
- `vector_backend`：`local` / `milvus`。当前部署用 `local`。
- `redis.available=false` 属正常（未接 Redis）。

### 2. `POST /chat`

**请求体**

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `message` | string | **是** | — | 用户输入 |
| `mode` | string | 否 | `"大众"` | 受众模式 |
| `history` | array | 否 | `[]` | `[{"role": "user\|assistant", "content": "..."}]` |

**实测的边界行为**

| 情况 | 结果 |
|---|---|
| 缺 `message` | **HTTP 422**（pydantic 校验拒绝），body 是 FastAPI 标准错误 |
| `message` 为空串 `""` | **HTTP 200**，落成 `culture_qa` |
| 带 `mode` / `history` | 200，正常工作 |

> ⚠️ 前端必须把 422 当错误处理，不能假定"永远 200"。

---

## 二、`/chat` 响应是**多态**的（实测，重要）

**这是最容易坑前端的点**：顶层字段随着 `intent` 变化，不是固定结构。

| `intent.intent` | 顶层字段 | 说明 |
|---|---|---|
| `route_planning` | `answer`, `intent`, `route`(对象), `hotel_poi_request` | 有路线 |
| `culture_qa` | `answer`, `intent`, `retrieval` | **完全没有 `route` 这个 key** |
| `budget_ticket` | `answer`, `intent`, `route` | **`route` 存在但值为 `null`** |

> 前端请一律用「先判 intent，再取字段」或可选链，**不要**假定 `route` 一定存在、也不要假定它是对象。

### 2.1 `intent`（三个意图都有）

```json
{ "intent": "route_planning", "confidence": 0.82, "reason": "命中路线/行程规划词。" }
```

`intent` 取值：`route_planning` / `culture_qa` / `budget_ticket`。
实测置信度：路线 0.82、文化问答 0.55（默认兜底）、预算票价 0.78。

### 2.2 `answer`（三个意图都有）

string。纯文本，**含换行**。文化问答最长（实测 1029 字符）。

### 2.3 `route`（仅 `route_planning` 是对象）

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
    "updated_at": "2026-09-12"
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
    }
  ],
  "selection_reason": "按城市、用户类型和时长接近度选择。"
}
```

**⚠️ `stops[]` 里没有坐标字段。** 这就是地图功能对不上的根因（见下节）。

### 2.4 `retrieval`（仅 `culture_qa`）

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

`coverage` 是 0–1 的召回覆盖率，`passed` 是召回质量是否达标。

### 2.5 `hotel_poi_request`（仅 `route_planning`）

```json
{
  "action": "call_external_mcp",
  "preferred_tools": ["baidu-maps-mcp", "amap-mcp-server"],
  "tool_purpose": "poi_search",
  "parameters": { "city": "南充", "keyword": "酒店", "near_spot": null },
  "note": "本地只封装调用意图；真实 POI 查询由 Agent 平台调用百度/高德 MCP。"
}
```

> 这是**给外部 MCP 的调用意图**，不是查询结果。前端不能把它当数据用。

---

## 三、前端需要、后端尚未实现（缺口清单）

按「卡住哪个前端功能」排序。

### 🔴 P0：`/chat` 的路线缺坐标 → 地图功能无法真正落地

- **现状**：`route.stops[]` 只有 `spot_id` / `name` / `city` / `address`，**没有经纬度**。
- **前端现状**：Codex 的地图只能靠「地名匹配本地 183 个县级驻地点」来画示意连线，
  而**驻地坐标不等于景区入口**，所以画出来的点是"示意"，不是真实景点位置。
- **建议后端补**（二选一，优先第一个）：

  **方案 A（推荐）**：在 `stops[]` 内直接补坐标

  ```json
  {
    "stop_order": 1,
    "name": "西山风景区·万卷楼",
    "coordinates": [106.0842, 30.8163],
    "coordinate_system": "GCJ-02"
  }
  ```

  **方案 B**：在 `/chat` 顶层新增

  ```json
  { "map_route": { "stops": [ { "name": "阆中市", "parent": "南充市" } ] } }
  ```

- **坐标系必须标注**：前端地图底图是 GCJ-02（高德/腾讯系）。
  若是 WGS84（GPS 原始）或 BD09（百度），**必须转换后给出**，否则点位会偏移几百米。
- `spot_id` 已有且稳定（如 `nanchong_xishan_wanjuanlou`），适合作为前端缓存的键。

### 🔴 P0：票价/酒店/时间类数据缺结构化的 `data_status` 与 `sources`

- **现状**：这类信息只存在于 `answer` 的**散文文本**里，例如实测返回
  「景区票价：西山风景区·万卷楼：0.0 - 0.0 CNY（manual_demo）」。
  结构化字段里**没有** `data_status`、`sources`、`updated_at`（`route.route.updated_at` 有，但 stops 没有）。
- **问题**：前端无法据此渲染"数据来源 / 是否实时 / 更新时间"的信任标识，
  也无法在 UI 上区分「维护数据」和「实时票价」。
- **建议后端补**：给含价格/时间/动态信息的记录加

  ```json
  {
    "data_status": "maintained",
    "updated_at": "2026-09-12T10:00:00+08:00",
    "sources": [
      { "title": "景区官网", "source_url": "https://...", "source_level": "B" }
    ]
  }
  ```

  `data_status` 取值约定：`sample` / `maintained` / `live` / `pending` / `stale`。
  金额未知用 `null`，**不要用 0**（现在实测返回的 `0.0 - 0.0 CNY` 就是"未知"被表达成了 0，前端会误显示为免费）。
  `source_level`：A/B/C，C 级不得用于史实结论。

### 🟡 P1：四个旅游模块接口尚未实现（前端已按提案写好、默认关闭）

Codex 在 `frontend/API-CONTRACT.md` 里提了 4 个接口，前端开关 `config.enabled: false`，
后端都没实现，目前前端显示"待接入"：

| 方法与地址 | 用途 |
|---|---|
| `GET /api/travel/spots?city=南充` | 景区列表 |
| `POST /api/travel/plans/preview` | 行程方案预览（按天分站） |
| `POST /api/travel/budget/estimate` | 预算估算（分项） |
| `POST /api/travel/travel-info` | 天气 / 交通等动态信息 |

统一返回约定（提案）：`{ "status": "ok|empty|unavailable", "message": "...", "data": {} }`。
出行条件对象字段：`city, date, days, people, group, transport, hotel_tier, rooms, notes`。

> 后端**不要为了讨好前端而伪造**这些数据：天气/班次必须走真实 MCP；拿不到就返回 `unavailable`。

### 🟡 P2：`/chat` 响应结构建议归一化（可选，但很省前端的事）

现在前端要为「`route` 可能不存在 / 可能是 null」写三种分支。若后端能保证：

```json
{ "intent": {...}, "answer": "...", "route": null, "retrieval": null, "hotel_poi_request": null }
```

即**顶层字段恒定、不适用时为 `null`**，前端代码能简单一大截。
（这是破坏性变更，需前后端一起改，所以标 P2。）

---

## 四、前端当前的容错约定（后端可据此设计）

- 非 2xx、超时（15 秒）、JSON 不合法 → 显示错误并可重试，**不伪装成成功**。
- 空数组 → 显示"无数据"状态，不生成假路线。
- 收到 `empty` → 不生成假数据；收到错误 → 保留原方案。
- 时间用带时区 ISO 8601；金额单位 CNY 元。
- 方案暂存在浏览器 `localStorage`（键 `sanguo.travel-plans.v1`，上限 20 条），**不是服务端存储**。
- 前端脚本加载顺序：`app.js` → `travel-api.js` → `travel-modules.js`；无打包步骤。

---

## 五、怎么自测（给后端）

```powershell
# 服务在跑（快照容器）
$env:PYTHONIOENCODING='utf-8'
& "C:\Python\Python311\python.exe" -c "import json,urllib.request;
d=json.dumps({'message':'南充一天三国文化路线'},ensure_ascii=False).encode();
r=urllib.request.Request('http://localhost:8001/chat',data=d,headers={'Content-Type':'application/json'});
print(json.dumps(json.loads(urllib.request.urlopen(r,timeout=60).read().decode()),ensure_ascii=False,indent=2))"
```

验收要点：
1. 三条意图的**顶层字段**是否符合第二节的表；
2. `route.stops[]` 是否带上 `coordinates` + `coordinate_system`；
3. 含价格/时间的记录是否带 `data_status` / `updated_at` / `sources`；
4. 未知金额是否为 `null` 而不是 `0`；
5. 缺 `message` 是否仍返回 422（而不是 500）。
