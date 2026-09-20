# 前端内容与接口契约（需求20，2026-09-18）

2026-09-20 本机联调更新：用户授权接入后端，`travel-api.js` 已启用。四个 `/api/travel/*` 地址已实现：景区、路线预览、住宿预算使用业务演示库，天气交通明确返回 unavailable，不代表实时服务已接通。下文“待实现/默认关闭”为前端交接时的历史基线；以本段及 `docs/LOCAL-INTEGRATION.md` 为准。

`POST /chat` 新增可选 `route_preferences`（Preferences + excluded_place_ids）；有该字段时按结构化城市、天数和排除站点规划，不再由整段表单文案猜城市。date 接受空串/null；days 支持0.5–14。预算可选 amount_min/amount_max 为演示区间，未知单价仍为null。未补齐的故事正文、证据、坐标不自动生成。

## 1. 故事线与章节

**前端已准备好什么**：适配点为 `stories.js` 的 `SGT_STORIES`、`SGTStoryUI.openStory(id, suppliedStory)` 与 `story-progress.js`。筛选直接读取每条 `story.phase`，不依赖数组下标。首页只展示真实存在的字段，缺项集中为“主题模板 · 内容待接入，史料待核验”。这是内容状态，不是请求失败。

**后端需要提供什么**：没有约定故事HTTP地址；获取后须由调用方映射为下列前端对象，再在渲染前提供。动态地图注入见第3项，不自动改写首页目录。

| 层级 | 字段与形状 | 必填与约束 |
|---|---|---|
| story | `id:string, title:string, phase:string` | id/title非空、id稳定且唯一；phase为寻源/读史/探秘/传承，缺失或未知只进入“全部” |
| story | `coreQuestion:string, summary:string, people:string[], events:string[], durationHours:number|null, areas:string[]` | 内容可缺，数组使用空数组；时长若提供须正有限数，不把null当0小时 |
| story | `dataStatus, updatedAt, sources[]` | 对应第5项；缺省pending/null/[]，不能声明已核实 |
| story | `chapters:chapter[]` | 静态模板允许[]，有序数组决定幕序；地图注入须非空 |
| chapter | `order:number, name:string, placeId:string` | order为正整数，按数组顺序提供；name/placeId非空，placeId须引用地点ID |
| chapter | `people:string[], events:string[], story:string, reason:string, role:string` | 正文、推荐理由和叙事作用不可推测补齐；解锁人物/事件仅来自已完成章节的对应数组 |
| chapter | `dataStatus, updatedAt, sources[]` | 同第5项；正文的分类及证据要求另见第6项 |

可选现实约束：`constraints:{transport,openTime,duration,budget}`，均为显示用文本，不意味着可执行路线。camelCase元数据是目录/章节现有约定；后端snake_case需显式映射。

**不可用时的降级行为**：缺正文不拼百科，空模板不堆逐字段占位；保留主题名、已提供的章节数、统一状态及探索入口。无章节禁用章节开始操作，不制造完成记录。验收：删除/调序/新增故事不改变其他ID的phase；未知phase在全部可见；空模板没有人物、事件、来源和坐标假值；真实3章仍显示。

## 2. 地点节点

**前端已准备好什么**：`stories.js:SGT_PLACES`、`SGTStoryUI.icon(building)`、`CulturalNode.openPlace(id)` 与 `StoryMap.describePlace(place,chapter)`。五种建筑只使用内联SVG，节点详情接收 `{place,chapter,story,index,point,exact,note,back}`，不另请求地点接口。

**后端需要提供什么**：`{id:string,name:string,city:string,building:'tower|shrine|pass|wall|road',coordinate_system:'GCJ-02',coordinates:[lon,lat]|null,dataStatus,updatedAt,sources:Source[]}`。id/name非空、id唯一、building必填且为五值之一。只有可靠且位于经度97–109/纬度26–35的GCJ-02数值坐标才可落点；坐标记录还须maintained/live、带时区的合法更新时间及A/B http(s)来源。`updatedAt`也是坐标核验必需字段，不能省略。可选`fallbackName/fallbackParent`只能填已确认的县区及市州名称，供现有县级驻地唯一匹配，不能猜。

**不可用时的降级行为**：缺city及元数据显示待核验；无合格坐标只用已确认县区驻地并标“位置示意 / 待定位”，连县区都不确定时不画点、不连跨缺口线。WGS84/BD09不直接当GCJ-02。验收：错坐标系、越界、无更新时间、C级来源均不能成为精确点；米仓道保持待定位；静态空坐标不被接口示例覆盖。

## 3. 地图适配口

**前端已准备好什么**：`story-map.js:StoryMap.setData({story,places}) -> Promise<boolean>`。仅显式调用；深拷贝并整体验证后安装按ID隔离的覆盖数据。`open(id)`进入故事地图，`exit()`恢复原视口/筛选；进度按稳定章节序列签名保存，同序列正文更新保留进度。

**后端需要提供什么**：第1/2项形状；story.id/title非空、chapters非空数组，每章name/placeId非空且指向本次places；places中id/name非空、building合法、id不重复。people/events/areas/sources/disputes/inferences若提供必须是数组；分层record若提供须是对象且sources须数组。禁止循环对象。安全来源/精确坐标还有后续证据检查，不因通过结构校验就算核验成功。

**不可用时的降级行为**：返回false，不抛结构异常使页面停止。对应ID有静态模板时移除覆盖并恢复该模板；未知ID没有静态模板时保留当前内容，显示资料待接入。拒绝半份数据，不清空旧地图。验收：非法顶层、空章节、缺地点引用、重复ID、无效building、错误sources类型均降级；有效结构但不可靠坐标仍按第2项不画错点。此口只更新地图及地图打开的详情，不是首页/探索志目录热更新接口。

## 4. 路线与站点坐标

**前端已准备好什么**：旧`#trip-form`通过`SGTChat.request`调用`POST /chat`；`travel-modules.js`只在`intent.intent==='route_planning'`且`route.found===true`、route.route为对象、stops有效非空时替换方案。`culture_qa`可以没有route键，`budget_ticket`的route可为null，均保留旧方案。`map-route-core.js:structured/resolveRoute`提供结构化坐标解析及旧点位保留。

**后端需要提供什么**：`route:{found:boolean,route:{route_id,name,city,theme,target_user,duration_hours,transport_mode,summary,risk_note,updated_at},stops:Stop[],selection_reason:string}`；Stop为`{stop_order,stay_minutes,reason,spot_id,name,city,address,recommended_duration_min,open_time,coordinates?:[lon,lat],coordinate_system?:'GCJ-02'}`。站名非空，时间为正有限数或null；坐标须按第2项范围及坐标系约定且有可靠出处。可选`map_route:{stops:[{name,parent,coordinates?,coordinate_system?}]}`由同一核心解析，parent用于同名县区消歧。真实后端目前没有站点坐标，placeId与spot_id也未统一，不能模糊推断章节归属。

**不可用时的降级行为**：保持现有县级驻地/待定位行为。对话地图经核心解析优先接受合法结构化位置，全部无法定位时保留先前地名点；方案页`TravelMap.showPlan`当前按地址/城市解析县级驻地，本轮没有改为精确景点导航。缺坐标不跨缺口连线，缺reason/时间/开放时间/risk_note/updated_at显示待核验。验收：三类intent正确，非2xx/超时/非法JSON可重试；无坐标路线不清空已有地名路线。时间与已完成节点约束目前后端仍可能忽略，UI必须标冲突，不宣称可执行。

## 5. 通用可信元数据

**前端已准备好什么**：`character-chat.js:reliable/provenance`、`cultural-node.js:evidence/provenance`以及旧模块来源组件。来源使用textContent，不注入HTML；链接经URL解析只放行http/https；C级明确提示不能支撑史实。旧模块的来源信息只作展示，不能据此认定史实可靠。

**后端需要提供什么**：`{data_status:'sample|maintained|live|pending|stale',updated_at:带时区ISO8601字符串,sources:[{title:string,source_url:string,source_level:'A|B|C',data_status:同一状态枚举}]}`。允许未提供值时为null/[]，不能以空值伪装已核验。用于史实的record须maintained/live、合法时区时间，至少一条有http(s)链接且A/B级、maintained/live的来源；人物回答还要求来源标题非空。来源等级和维护状态由资料负责人提供，前端不自动升格。目录/地点使用dataStatus/updatedAt，节点record兼容这两种命名。

**不可用时的降级行为**：缺元数据是待核验；不安全链接仅保留来源文本，C级只能线索。即使段落自称“史料记载”也不能绕过校验。地图坐标的现有资格检查是地点记录maintained/live+有效时间+A/B安全链接，不等同于史实正文校验；补源时仍需完整Source字段。验收：C级、pending/stale来源、缺时区/非法日期、javascript链接均不能放行史实正文；不伪造更新时间或出处。

## 6. 分层正文与正史／演义

**前端已准备好什么**：`character-chat.js:answer/reliable`接受可选`/chat`响应字段`evidence_segments`。**当前真实后端没有返回该字段**。文化节点详情的现有适配点是chapter上的record字段，不能宣称两者自动互换。

**后端需要提供什么**：`evidence_segments:[{type:'history|inference|romance',text:string,data_status,updated_at,sources:Source[]}]`，正文非空，元数据见第5项。history只有reliable通过才呈现为史料；inference明确合理推断，romance明确演义、非亲历。文化节点通过`chapter.history/romance/differences/compilation/relationships:{text,data_status,updated_at,sources[]}`接入；`disputes/inferences`为同样record数组。若使用chapter.story，须另给`narrative_type:'record|inference|literature'`及章节元数据；不能把未分类正文当史实。后端若仅有segments，需要调用方按含义显式映射到这些节点字段，不能从标题猜。

**不可用时的降级行为**：可靠材料不足显示“当前资料中未找到可靠记载”。纯文本只提取明确【合理推断】/【演义】为未核验解读，原answer在“未逐项核验”展开区；不从原文编造来源。节点双方与差异record均有依据才显示差异，两条及以上争议并列来源；无材料不能断言没有争议。验收：未知type不进入史实；C级history被拦截；推断与演义各有独立标记；正文缺失不生成填空内容。

## 7. 讲解模式、人物与会话

**前端已准备好什么**：`app.js:ask(text,history,mode)`，`character-chat.js:getMode/setMode/backendMode`，`StoryProgress.get(story).mode`是已关联故事的唯一模式源。陈寿栏、故事详情、已打开节点共用状态；未关联故事的节点仍使用节点本页模式。请求发出时保存mode快照，失败重试不因之后切换而换模式。人物只影响角色说明，不能替代讲解模式。

**后端需要提供什么**：现有`POST /chat`请求`{message:string,mode:string,history:[{role:'user|assistant',content:string}]}`。只读核实依据：主工作树及运行快照的`src/api.py:ChatRequest.mode`为`str='大众'`，没有枚举；快照`src/agent/orchestrator.py`透传mode；`src/agent/answer_chain.py:MODE_RULES`实际只识别大众/亲子/学术，未知字符串回退大众。主工作树`docs/BACKEND-API.md`的请求表同样写mode:string。故映射为`大众体验版→大众、亲子故事版→亲子、学术探索版→学术`，不把界面全称直接发送。未修改后端代码。

**不可用时的降级行为**：未选择模式默认大众；输入空白禁发，HTTP错误/超时/非法JSON沿用可重试状态。人物、故事和模式描述放history，不把“两天”等提示拼入人物提问的message干扰意图识别。LLM不可用或召回不足时后端可能走兜底，mode正确不保证总能得到不同文风。验收：两处模式读写同一StoryProgress，三种请求值正确，切换后重试沿用原值，章节/地点/完成状态不变。

人物兴趣“我想了解张飞”匹配主题并预选阆中，不自动换人物或切主视图；回答提供进入主题、查看阆中与切张飞按钮。固定说明与每会话切换提示分开，render不吞提示。对照类别由CharacterChat.isComparison统一判断，探索志优先使用请求已记录的characterAction。

## 8. 实时旅游接口（尚未实现）

**前端已准备好什么**：`travel-api.js`封装listSpots/createPlan/estimateBudget/getTravelInfo，默认enabled:false。`travel-modules.js`保留目的地、方案、预算、出行面板和重试入口；当前trip-form规划走/chat，**不会因为写出preview契约就改回未实现接口**。请求默认15秒超时，错误不伪装成成功。

**后端需要提供什么**：统一JSON `{status:'ok|empty|unavailable',message:string,data:object|null}`；ok必须有正确数组，empty表示确实无数据，unavailable表示未接入。每条资料及实时记录的data_status、updated_at必填；未知更新时间可null并标待核验，不能声称live。sources必须采用第5项。时间带时区，金额单位CNY；未知金额必须null，不能0。

| 接口 | 请求 | status=ok时的data形状 |
|---|---|---|
| `GET /api/travel/spots` | query `city:string`，URL编码 | `{spots:[{id,name,description,data_status,updated_at,sources}]}` |
| `POST /api/travel/plans/preview` | Preferences | `{title,data_status,updated_at,sources,days:[{day:正整数,stops:[{name,stay_minutes:正数或null,note}]}]}` |
| `POST /api/travel/budget/estimate` | Preferences | `{items:[{label,amount:正数或null,basis,data_status,updated_at,sources}]}` |
| `POST /api/travel/travel-info` | Preferences | `{items:[{title,summary,tool_source,data_status,updated_at,sources}]}` |

Preferences为`{city:string,date:'YYYY-MM-DD',days:number,people:number,group:string,transport:string,hotel_tier:string,rooms:number,notes:string}`。旧适配保留days 1–14；故事约束表单另有origin/explanation/budget_min/budget_max，days限定0.5/1/2，人数房间1–50、预算非负且下限不大于上限。后端实现preview若要接半天，应显式支持0.5，不能以旧契约吞掉约束。

文化节点现有旅游record是`place.travel.ticket/opening/weather:{amount或text,tool_source,data_status,updated_at,sources}`，每种有独立更新时间与工具来源，live和完整证据才作实时显示。旧travel-info列表主要显示summary/元数据/sources，后端应把工具身份写进来源与summary，工具专列若需展示再评审，不能声称已自动渲染新字段。

**不可用时的降级行为**：关闭开关不发以上请求，返回unavailable，UI“待接入”。非2xx/超时/非法JSON显示错误供重试，空数组显示无数据；amount缺失、null、0、负数都显示待核验，绝不显示免费，不计算含未知项的完整总额。验收：默认无任何/api/travel网络请求；开启须由人决定，分别测试ok/empty/unavailable/超时/非法JSON、缺数组、null/0费用及旧响应不覆盖新选择。

## 9. 本地探索与能力边界

**前端已准备好什么**：探索志仅本地状态，**本轮没有后端接口，也不预留账号同步**。`sgt.story-progress.v1`以story.id和章节签名保存手动进度；`sgt.journal.questions.v1`最多200条`{id,text,persona,comparison,recordedAt}`，来自实际用户消息，recordedAt是本地记入时间。`sanguo.travel-plans.v1`最多20份本地方案。刷新不会恢复完整会话。

**后端需要提供什么**：本轮没有探索接口接入工作。未来若要账号同步，应另立需求、约定身份/冲突/删除语义，不在此猜URL。四个旅游接口实现后由人review并决定何时开启；不能自行把enabled改true。无新人物服务、长期人物记忆、GPS签到、实时道路导航，只有现有/chat。

**不可用时的降级行为**：存储损坏/被禁用时明确仅本页记录，不补造历史；删除本页会话同步移除其问题，撤销恢复。章节没有people/events时解锁计数为0，并说明字段待接入；不将切换人物当解锁。验收：空状态可开始探索，本地提示可见，换设备不宣称同步，章节完成撤销与问题删除/撤销均真实影响探索志，缺坐标不产生地图足迹。
