# 旅游模块接口交接（前端提案，后端尚未实现）

本轮只做前端，未修改 src、数据库或部署。现有 `/chat` 与 `/health` 保持原协议。

## 接入开关

`travel-api.js` 集中处理网络请求，默认 `config.enabled: false`，不会请求以下预留地址，而是返回 `unavailable`。同伴实现接口后将开关设为 true，并按实际路由调整 `baseUrl`（默认 `/api/travel`）。不在浏览器写模型密钥或数据库凭据。

前端脚本加载顺序：app.js → travel-api.js → travel-modules.js。无需依赖安装或打包。

## 通用返回

HTTP 200，JSON：`{ "status": "ok|empty|unavailable", "message": "用户可读信息", "data": {} }`。

- ok：提供下表结构的数据。empty：接口可用但无匹配结果。unavailable：能力未接入/暂不可用，data 可为 null。
- 非 2xx、超时（15 秒）、JSON 不合法显示错误，可再次点击重试。网络失败不会伪装成成功数据。
- 空数组显示无数据状态。
- 时间使用带时区的 ISO 8601；金额单位 CNY 元，未知金额用 null，不用 0。
- data_status：sample / maintained / live / pending / stale。每个含价格、时间或动态信息的记录需携带 updated_at 与 sources。
- sources 数组元素：`{ "title": "来源名称", "source_url": "https://...", "source_level": "A|B|C" }`。前端仅允许 http/https 来源链接。C 级不用于史实结论；来源分级由后端/资料维护人确定。

## 请求及响应 data

| 方法与地址 | 请求 | data |
|---|---|---|
| GET /spots?city=南充 | city 查询参数（URL编码） | `{ "spots": [{ "id":"...", "name":"...", "description":"...", "data_status":"maintained", "updated_at":"...", "sources":[] }] }` |
| POST /plans/preview | 下方出行条件对象 | `{ "title":"方案名称", "data_status":"maintained", "updated_at":"...", "days":[{"day":1,"stops":[{"name":"站点","stay_minutes":60,"note":"游览提醒"}]}], "sources":[] }` |
| POST /budget/estimate | 同一出行条件对象 | `{ "items":[{"label":"住宿","amount":null,"basis":"2间房×1晚；价格待接入","data_status":"pending","updated_at":null,"sources":[]}] }` |
| POST /travel-info | 同一出行条件对象 | `{ "items":[{"title":"天气/交通","summary":"查询结果","data_status":"live","updated_at":"...","sources":[]}] }` |

出行条件示例（字段名固定；数量为数字）：

```json
{
  "city": "南充",
  "date": "2026-10-01",
  "days": 2,
  "people": 2,
  "group": "朋友同行",
  "transport": "公共交通",
  "hotel_tier": "舒适型",
  "rooms": 1,
  "notes": "少走路"
}
```

天数 1–14，人数和房间数 1–50；后端仍须自行验证。当前住宿晚数按 days-1 展示，后端应明确预算 basis，不能默认每人一间房。交通/门票未提供时金额为 null，前端不计算完整旅行总价。

## 前端独立可用的部分

- 目的地选择、地图快捷入口、行程条件填写、按天草稿、调整条件。
- disabled 模式下生成的是明确标为“站点待接入”的草稿，绝不虚构景区、票价或天气。收到 empty 不生成假路线；收到错误保留原方案。
- 方案保存到当前浏览器 localStorage，键 `sanguo.travel-plans.v1`，最多20份；不是数据库保存，也不代表跨设备同步。复制采用剪贴板 API，失败提示手动复制。
- 来源组件用于景区、行程、预算、出行结果，无来源显示待核验。现有文化问答来源接入仍需另与 `/chat` 响应协议对齐。
- 更换目的地或当前方案时，旧请求结果不覆盖新选择；按钮等待时禁用。

## 验收

默认关闭接口：目的地/预算/出行显示待接入，表单可生成每日空站点草稿、保存、刷新后打开、复制。

开启接口：分别提供 ok、empty、unavailable、非2xx、非法JSON与超时响应；核对数据状态、来源链接、费用缺失项及重试。后端不可在 ok 里省略 spots/days/items。

## 对话联动地图（新增，可选 /chat 返回字段）

本地加载183个县级行政区驻地点与21个市州驻地点。发送含旅游语义的文本时，按地名提及顺序标点并连虚线；这只是可编辑的地点示意，不推断道路、距离、车程或最优顺序。非地名的旅游目的（如“看三国文化景点”）仍需要后端提供站点。

后端可在原 /chat JSON 中增加如下字段，按行程顺序返回 stops：

```json
{
  "map_route": {
    "stops": [
      { "name": "阆中市", "parent": "南充市" },
      { "name": "剑阁县", "parent": "广元市" }
    ]
  }
}
```

- 现有 `route.stops` 也支持。优先使用 `map_route.stops`。
- 景区级站点应提供 `coordinates: [经度, 纬度]` 和 `coordinate_system: "GCJ-02"`（与 DataV 底图一致）。数值必须合法且位于四川地理范围附近。不要把 WGS84 或 BD09 未转换坐标直接传入。
- 无坐标时只对完整名称/唯一别名匹配本地点位。驻地坐标不能当作景区入口；无法匹配的景点保留缺口，不连接跨过缺失站点的线段。
- 同名县区需传 parent 消歧。没有唯一结果就提示人工选择，不猜坐标。
- 路线绑定当前对话对象；切换/删除/撤销对话会同步路线。清除路线后迟到的回答不会重新绘制。
- 县级数据来源为 `https://geo.datav.aliyun.com/areas_v3/bound/{市州adcode}_full.json`，2026-09-11 获取。原始 adcode 仅用于该数据快照内部标识（供应方可能保留历史代码），不是经过最新行政区划核验的业务主键；业务接入时请另行校验行政代码及景区 POI。

## 前端已实现的降级（2026-09-12 实测补充）

后端目前仍未返回坐标（`route.stops[]` 里没有 `coordinates`），前端已按上一节实现降级，行为如下
（可用 `node map-route.test.cjs` 复核，或用仓库外回放脚本 `D:\DSH Workspace\.tmp-e2e\replay-map.cjs` 喂真实响应）：

1. 发送含旅游语义的文本时，先按**地名提及顺序**标点（`MapRouteCore.mentions`）。
2. 后端回答到达后（`MapRouteCore.resolveRoute`）：
   - 后端站点**有** `coordinates` + `coordinate_system: "GCJ-02"`（或名称唯一命中本地点位）
     → **以后端站点顺序为准**替换本地点位；
   - 后端站点**全都落不到位**（现在就是这种情况：景区名匹配不到县级驻地、又没有坐标）
     → **保留**按地名识别的点位，并把落不到位的站点记入 `backendStopsPending`，状态栏提示
     「后端返回的 N 个站点暂无 GCJ-02 坐标，落不到景区入口；已保留按地名识别的点位，坐标接入后自动对齐」。
     修复前这里是**直接清空地图**（实测：已定位点从 1 个变 0 个、视口还被重置），现已修掉。
3. 落不到位的站点在路线列表里显示为「待定位站点（此处不连接）」——**不会**用驻地坐标冒充景区入口，
   也**不猜**坐标，跨过缺口的线段不连接。
4. 后端一旦补上 `coordinates`，前端**不需要改代码**即自动对齐。已用「同一路线 + 补上 GCJ-02 坐标」的
   对照响应实测：修复后与冻结版行为**完全一致**（均为「后端返回的站点顺序 · 2 个已定位地点」）。

> 结论：后端只要按本文补 `coordinates` + `coordinate_system: "GCJ-02"`，以及价格类的
> `data_status` / `updated_at` / `sources`（未知金额用 `null` 而不是 `0`），前端侧**无需再改协议**。


## 2026-09-17 · 三国故事地图接入边界（前端已留入口，后端待确认）

### 当前运行状态

- 未启用任何 `/api/travel/*`，`travel-api.js` 仍 `enabled=false`。未猜测故事接口 URL，也未新增网络依赖。
- 新增 `window.StoryMap.setData({ story, places })`：由将来的 API 客户端在获取、映射数据后显式调用，返回 Promise；非法顶层/章节/地点结构抛 TypeError。当前没有自动调用方。
- `open(storyId)` 返回 Promise<boolean>；接受五个前端模板 ID 或已经 setData 注入的 ID。`exit()` 退出并恢复原地图视口、筛选和县区选择；既有路线对象保留，用户明确加入的故事地点也保留。
- `setData` 按 story.id 隔离覆盖；更新当前故事会重开图层并清空该故事本页进度（防止章节变更后错配）。它只更新故事地图数据及该地图进入的详情，不自动改写首页五个编辑模板。
- `SGTStoryUI.openStory(id, suppliedStory)` 支持地图把当前故事对象传入详情；`SGTStoryUI.icon(building)` 共用内联 SVG，不加载外部图片。

### 地图数据字段（不是已实现的 HTTP 协议）

| 对象 | 字段 | 缺失时行为 |
|---|---|---|
| story | id、title、chapters[] | id/title/chapters 为接入结构必填；无章节显示待确认 |
| chapter | name、placeId | 接入结构必填；数组顺序为幕序，不能依赖展示名称排序 |
| chapter | people[]、events[]、story、dataStatus、updatedAt、sources[] | 人物、事件、简述、史料和时间显示待确认；不生成史实 |
| place | id、name、building | id/name 为必填；building 支持 tower/shrine/pass/wall/road/book/person，未知形制回书卷 |
| place | coordinates:[lon,lat]、coordinate_system | 必须 GCJ-02，经度97–109、纬度26–35；缺失或不合格不作为景区坐标 |
| place | dataStatus、updatedAt、sources[] | 仅 maintained/live + 有时区且合法日期 + 至少一条带 http/https 链接的 A/B 来源才接受景区坐标；示例/pending/stale/C级不合格 |
| place | fallbackName、fallbackParent | 县区归属经后端确认后提供；用现有 MapRouteCore.structured 匹配县级驻地，不另造坐标。缺失/歧义就待定位 |
| source | title、source_url、source_level | 链接只允许 http/https；C 级仅作线索，不能支撑史实；不安全链接只显示文本 |

约定这里使用前端 camelCase 的 `dataStatus`/`updatedAt`；后端若用 `data_status`/`updated_at`，适配器须显式映射，不默认为已验证。示例数据中的经纬度没有沿用。

### 等数据库与后端后再接的部分

1. 五条故事的可靠章节内容、人物事件、各站理由、A/B 史料、维护时间。当前仅蜀道故事按用户指定的昭化古城→剑门关→米仓道展示三幕；顺序是产品模板，不是可执行行程。
2. 米仓道具体遗址及唯一县区；当前第三幕仍能查看、问陈寿和记录探索，但不画坐标、不连跨缺口线路，不能加入假位置。
3. 道路路线与导航：字段、提供方、入口坐标、交通方式及其数据状态待后端确认；目前不约定 URL 或启用解析器。UI 导航按钮禁用并标待确认；虚线只表示地名提及顺序，墨迹线只表示章节顺序，两者都不是道路。
4. 正史/演义的结构化对照、章节知识：当前按钮只复用 `/chat`，并非已有独立对照数据库；卡片上的资料仍待确认。
5. 进度持久化：现在仅本页内存、按故事隔离、用户手动标记可撤销；没有定位签到、登录同步、跨页持久化 API。后端需提供稳定章节 ID 与进度版本后另行接入。

### 与现有聊天、地图的关系

点击节点首次自动通过 `SGTJourney.ask` 提交章节上下文（含上一章、当前章与缺项说明）；同一章本页不重复自动发出，仍可点“问陈寿”。已有请求则追加草稿。章节文本以“【故事章节讲解】”开头，发送或稍后发送该草稿不会被地名识别误作新路线。明确的新行程问题识别到地名时会退出故事模式并沿用原地图行为。

几何、投影、缩放分级、共享弧段、拖动/双指/滚轮保持原实现。仅增加故事标签优先级、大印章的 labelLayout markerRadius 可选避让、节点点击分流与视口通知；普通标签不传 markerRadius 时布局保持原值。

## 需求12 更新：本地探索记录

上述“仅本页内存”已更新：story-progress.js 使用 sgt.story-progress.v1 保存浏览器本地记录，不调用后端。以 story.id 与章节 id/placeId/name 序列签名隔离；序列改变重置，同序列正文更新保留。StoryMap.setData 的章节变更因此重置本地进度，同章节更新保留。无账号或跨标签实时同步。

详情可选 chapter.reason（推荐理由）、chapter.role（叙事作用）与 story.constraints.transport/openTime/duration/budget；无值显示待补充/待核验。story.phase 为前端编辑分组，不代表史料事实。压缩不修改 chapters，仅记录 skipped 索引；全章完成才显示故事已寻迹。

## 2026-09-18 现实约束路线接入

trip-form已由关闭的createPlan预览调用改为SGTChat.request→现有/chat。约束与story章节选取/已完成状态作为message文本传入，非新增后端字段。只在intent.intent=route_planning且route.found=true、route.route为对象、stops有效非空时显示路线；其余显示可调整/重试反馈，保留旧方案。

真实后端未严格遵守半天时间/已完成节点过滤，且story.placeId与spot_id缺统一映射；需后端完善结构化约束与逐节点取舍。前端不模糊匹配推断史实关联，不伪造可执行性。未知价格0显示待核验。所有/api/travel/*仍enabled=false。

## 2026-09-18 文化节点详情资料适配

新cultural-node.js通过CulturalNode.open({place, chapter, story, index, point, exact, note, back})接收StoryMap已解析上下文；首页openPlace(placeId)从模板准确关联。place.city缺失待核验。新增字段不是后端已有接口，也未触发任何旅游API。

- chapter.story正文需chapter.narrative_type为record/inference/literature显式分类；chapter元数据支撑该正文。未分类旧story在新详情不显示为史实。
- chapter.history / romance / differences / compilation / relationships：{text, data_status或dataStatus, updated_at或updatedAt, sources[]}。
- chapter.disputes与inferences为上述record数组；两项及以上争议并列“存在不同说法”，inferences一律“合理推断·非史料原文”。differences须双方及自身均有合格依据才展示正文。
- record合格条件：maintained/live、带时区合法日期、至少一条A/B且http/https来源；否则不呈现为可靠正文。source显示title/source_url/source_level/data_status；不安全链接为文本，C级明确不足以支撑史实。
- place.travel.ticket/opening/weather分别为{amount或text, tool_source, data_status:'live', updated_at, sources[]}。缺工具名/元数据不显示为实时结果，票价<=0视为未知。历史资料与实时区独立，不共享更新时间。
- 三深度对同组资料作阅读组织，不虚构模式正文；AI自由回答仍仅在原对话中显示，不自动导入为证据。提示明确要求史料/文学/合理推断分段，实际回复有赖后端。


## 人物视角前端适配（2026-09-18，非新增接口）

仍POST /chat，message原用户问题，mode仍为既有大众受众模式；history中附用户角色的当前人物/风格/故事/章节/地点说明，历史消息前缀【人物视角：姓名】。附加规则不拼进message，避免触发后端关键词路由。

可选响应字段 `evidence_segments: [{type: "history|inference|romance", text, data_status, updated_at, sources: [{title,source_url,source_level,data_status}]}]` 仅为前端兼容适配提案；实际后端未提供，不请求其他接口。史料段须maintained/live、有效时区时间及至少一个maintained/live且A/B级的http(s)出处。C级不支撑史实。带演义字样的史料候选不得直接标可靠史实。缺元数据只显示缺项，不用原answer猜出处。

纯文本仅提取明确【合理推断】与【演义】段落作为未核验解读，不能提取“史料记载”冒充可靠证据。完整answer在未逐项核验展开区；来源未知保持待核验。此规则不保证后端遵循角色语气，不代表人物对话专用服务。


## 探索志本地数据（2026-09-18）

没有探索记录HTTP接口，不新增网络请求。`sgt.story-progress.v1`沿用StoryProgress；`sgt.journal.questions.v1`是最多200条`{id,text,persona,comparison,recordedAt}`本地问题。recordedAt是前端记入时间，不是推测的历史提问时间。保留用户提问，不归档AI答复或把其当史料。删除当前页会话会移除其问题，撤销恢复；旧页面未归档的历史无法追溯。刷新不恢复聊天，只恢复探索志问题。

来源字段缺失不补造解锁人物/事件；地理底图由TravelMap.getGeometry只读复用，位置由StoryMap.describePlace按原可靠坐标/县级示意规则返回。探索志查看本身不改故事进度或地图状态，显式点击地图入口才定位。
