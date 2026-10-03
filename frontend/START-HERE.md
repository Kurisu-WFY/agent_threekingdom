# 最新接手增量 · 整站视觉规范（2026-09-19）

styles.css 已统一令牌、组件状态、可信度提示与响应式。后续页面先读 DESIGN-SYSTEM.md；保留既有令牌语义，新增颜色只在根令牌声明。新增 design-system.test.cjs。未新增依赖，未改变视图/会话核心逻辑。

---
# 最新接手增量 · 万卷史官陈寿（2026-09-19）

新增 chenshou-guide.js：常驻栏SVG四态、真实上下文、地图选章本地承接、完成盖章/撤销、当前故事压缩入口。三人物兴趣匹配与回答地点链接扩展，南充按市州示意定位。复用既有会话，不自动新建网络请求；史料不足留白。14组回归、桌面与375px验证；真实后端仍可能返回演示检索而非上下文压缩方案，详见HANDOFF末尾。旧模块/TravelApi关闭不变。

---
# 最新接手增量 · 需求20修正（2026-09-18）

已修阶段下标错位、张飞兴趣静默切角色/抢视图、render覆盖提示、mode恒大众和空模板重复占位。三讲解模式共用StoryProgress，发送映射为已核实的后端大众/亲子/学术，重试保留快照。StoryMap.setData非法包现在返回false并降级静态模板/保留界面。API-CONTRACT.md已重写九项契约，覆盖旧冲突说明；13组测试和桌面/375px检查通过，详见HANDOFF末尾。无新内容数据、接口/依赖或后端改动，travel-api仍关闭。

---
# 最新接手增量 · 我的三国探索志（2026-09-18）

新增journal.js与第四项主导航，复用showContentView。三卷书页来自StoryProgress与真实用户消息；问题最多200条保存此浏览器localStorage，删除当前会话联动、撤销可恢复；无后端同步。进度印章、节点足迹、人物/事件、问题/兴趣和有理由推荐均来自本地状态。十三组回归与桌面/375px验收通过，详情见HANDOFF末尾。

---
# 最新接手增量 · 人物视角（2026-09-18）

新增character-chat.js，三人物切换复用app.js会话。角色与章节快照在history，message保留原问题（避免关键词分流误触）。原回答无逐项来源时标未核验；可靠分层为兼容适配字段，真实后端尚缺。十二组测试及真实桌面/375px联调通过，详情见HANDOFF末尾。

---
# 最新接手增量 · 文化节点详情（2026-09-18）

新增cultural-node.js/node视图：首页建筑及地图选章进入。地图选章优先显示详情，不再自动请求AI；问陈寿仍显式调用。三模式保持故事/章节/地点与阅读位置，正史/演义/合理推断/实时信息分区。五种SVG加层次与阴影，无新图片。正文缺项不编造；数据协议见API-CONTRACT最后章节。十一组测试（新增cultural-node.test.cjs）及桌面/375px验收通过。唯一开发目录及后端边界不变，详情见HANDOFF最后记录。

---
# 最新接手增量 · 现实约束路线（2026-09-18）

故事详情/压缩选取已接入旧trip-form，经SGTChat.request复用/chat，在旧plan-view展示站点理由与章节取舍。支持局部重绘、错误重试、县级示意地图；本地已寻迹状态保持。十组回归（新增travel-modules.test.cjs）通过，真实后端和375px布局已验收。后端仍返回忽略约束的固定模板，前端明确标冲突，不能声称完整可执行规划；详见HANDOFF.md最后记录。四个/api/travel/*仍禁用，旧五面板保留。

---
# 最新接手增量 · 需求12（2026-09-17）

已实现故事线列表筛选、详情章节轴、浏览器本地进度、手选章节压缩与三讲解模式。用户确认继续模板和缺项提示，不编造完整故事内容。主导航现在为 welcome / map / story 三项；早先“两项”说明已过时。story-progress.js 在 stories.js 前加载，地图与列表/详情共用状态。测试为九组（新增 story-progress.test.cjs），运行所有 frontend/*.test.cjs。详情及取舍见 HANDOFF.md 最后需求12记录；唯一开发区和后端边界不变。

---
> 新对话请先读本文件，再读本目录 HANDOFF.md 最后「2026-09-17 三国故事地图交付」和 API-CONTRACT.md 的故事地图适配协议；仓库规则与任务板位于 D:/DSH Workspace/agent_threekingdom/AGENTS.md、docs/TASKS.md。只在 D:/DSH Workspace/agent_threekingdom/frontend 开发（主仓库，分支 `dev`）。先检查 git status / git log 与 http://127.0.0.1:8002/health，确认实际状态后等待新需求，不重复实现本轮功能，也不补造尚缺数据。
# 最新接手增量 · 2026-09-17 三国故事地图

本轮已完成故事图层、章节进度与文化节点卡，详见 HANDOFF.md 最后记录。story-map.js 叠加在 travel-map.js 上，复用 MapRouteCore；不得重写地图核心。后端适配口为 StoryMap.setData({story, places})，协议见 API-CONTRACT.md；所有缺后端数据继续标待确认，/api/travel/* 仍关闭。昭化古城/剑门关使用县级驻地示意，米仓道待定位，导航不可用。回归现为八组（新增 story-map.test.cjs），全部 JS 语法及八组测试已通过，桌面/375px 浏览器检查已完成。实际提交以 git log 为准。

---
# 最新接手增量 · 2026-09-17

首页已改为五条故事线模板发现入口，具体审查、文件变更和验证见 HANDOFF.md 最后记录。用户确认内容缺项先标待补充/待核验，不能自行编造章节、时长或坐标。新增 stories.js 在页面最后加载；通过 SGTJourney.ask 复用对话与草稿。story 详情走 showContentView，主导航仍为两项。

当前回归为七组：新增 stories.test.cjs；另外运行 landing/app/travel-api/map-route/travel-map/navigation.test.cjs 和全部 JS 语法检查。后端仍为演示资料服务，提问不等于已有完整故事匹配能力。只在 agent_threekingdom/frontend（分支 `dev`）继续；旧的 worktree 与冻结工作副本均已退役。

---

# 新对话接手指南 · 2026-09-16

## 最新增量（优先于下方历史基线说明）

2026-09-16 已完成智能体旅程工作台重构。接手时的 HEAD 是 b425db7，而不是旧提示中的 ec4e714；本轮提交请以实际 git log 为准，不回退到旧功能基线。

首页含四个可切换对话主题、同行/讲解偏好、文化线索卡、地图入口与回顾调整；草稿按主题在本页保留。主导航仍只有“与蜀汉对话 / 行旅地图”。app.js 负责可取消的视图入场过渡、滚动位置与焦点衔接；四川地图脚本和地理资源未改。具体修改、真实浏览器验收、后端限制见 HANDOFF.md 最后 2026-09-16 记录。

当前回归为六组，除下方五组外还需运行 `node frontend/navigation.test.cjs`。讲解偏好随消息文本传递，不代表已接入专门的人物对话或长期成长档案服务。

## 历史状态与目标

本项目面向川东北（南充、阆中、广元、剑阁）三国文化旅游。前端服务于后端智能体，原生 HTML/CSS/JS，无框架、无依赖安装、无构建步骤。最近用户要求已完成；本次仅整理交接，不新增功能。下一轮根据用户新反馈继续。

功能基线提交：`4485f1b`，分支 `feat/frontend-iteration-3`。交接文档随后另作 docs 提交；开始工作应读取实际 HEAD，不能重置回功能基线。2026-09-14 写本文前工作区干净。未 push、未合并。

## 唯一开发位置与边界

- **唯一工作目录**：`D:\DSH Workspace\agent_threekingdom`（**2026-09-20 已换成最新仓库的干净克隆**），
  分支 **`dev`**（= `origin/dev`）。仅改 `frontend/**`。
- 这是**完整克隆**：`docs/`、`AGENTS.md`、`src/` 都在同一个仓库里，而且**文档现在是已跟踪文件**——
  不再需要按主工作树绝对路径去找。
- 旧的三个 worktree（`sgt-frontend-iter3`、`sgt-merge-frontend`、`sgt-dev-integration`）**已删除**；
  旧工作副本整份保留在 `D:\DSH Workspace\agent_threekingdom-frozen-20260920`（**只作回滚，别在里面干活**）。
- 可以正常 `git status` / `git pull`（工作区是干净的）。`.venv` 仍被 git 跟踪，但克隆出来就是干净的——**别去动它**。
- 不改 src、deploy、data、prompts；不自行合并；⛔ **不推 master**（协调者 2026-09-20 明确），推送只到 `dev`。
- 公共文档现在是**已跟踪文件**：`AGENTS.md`、`docs/TASKS.md`、`docs/HANDOFF.md`、`docs/BACKEND-API.md`、
  `docs/BACKEND-API-REFERENCE.md`、`docs/FRONTEND-ISSUES.md`。按协作规则回填 TASKS/HANDOFF（与前端同仓，可一起提交）。
- 旧 AGENTS/交接里的 tip、"没有浏览器验收"等是历史状态，以本文件与 `frontend/HANDOFF.md` 最新记录为准。
- Git 不在 PATH：`C:\Program Files\Git\cmd\git.exe`。不要改全局 `safe.directory`。

## 已完成，勿重复实现

### 智能体优先首页（4485f1b）

主导航由七项收为“与蜀汉对话 / 行旅地图”。首页主标题“读懂三国，再出发”，直接提问框连接已有对话，三个轻量示例问题；地图辅助对话，不再铺开目的地、规划、预算等独立导航。原细分模块仍隐藏保留，不能未经检查删除其 DOM 或脚本依赖。

新增 landing.js：复用 app.js 的 send、toggleChat 和会话状态；已有请求进行中时新问题保存为草稿，避免重复请求。对话面板默认收起。首页为宣纸色、墨绿、朱红，剑门关拱形主图配阆中古城图片。图片本地存放 assets/，CC BY-SA 4.0；作者、来源和许可见 assets/CREDITS.md，页脚也有署名。Openverse/小红书没有获得可用页面、Pngtree 受限，未使用未经核实的图片。

### 地图与对话既有能力

21 市州、183 县级轮廓；100%–249% 市界，250% 起县界；县域内部可点击选中，不只点文字或驻地点。筛选适配市域，标注避让，右下角滑条显示缩放比例，滚轮/双指/拖动可用。成都只标红，不能恢复“省会”后缀。

b8beadc 修复高倍拖动边缘缺块（visibleBounds 考虑 SVG 留白）、禁止地图文字拖选、市县使用同源共享弧段减少接缝。不要退回逐县独立简化。地图只作位置示意，驻地不是景区入口，虚线是地名提及顺序，不是道路导航。

会话历史删除/撤销、请求隔离、失败重试、信任元数据容错已有回归。地图无坐标后端站点不能清空已识别地名路线。

## 运行、协议与真实限制

后端 Docker 容器 `sanguo-latest-api`（跑的是当前 `dev` 代码）；访问 http://127.0.0.1:8002/。主仓库的 `frontend/` 被只读挂载到 `/app/frontend`，修改后刷新即生效，缓存时 Ctrl+F5。宿主 8000 属于其他项目，不改端口。（旧的 8001 快照容器已于 2026-09-20 删除。）

/chat 响应多态：culture_qa 没有 route 键；budget_ticket 的 route 为 null；route_planning 才有路线对象。非 2xx、超时、非法 JSON 必须报错可重试。缺 message 应为422，前端空输入禁发。

后端景区站点缺 GCJ-02 坐标时保留地名示意并提示待定位，不猜景区坐标。未知价格 0 不解释为免费；data_status/updated_at/sources 缺失显示待核验，不伪造实时票价、天气、来源或数据状态。来源仅 http/https，C 级不能支撑史实。旧环境使用 mock 与演示知识，不能夸大为完整实时智能体。

travel-api.js 的 enabled=false 保持；四个 /api/travel 接口是待后端实现提案，不能擅自开启。后端缺口交人协调。

## 验证与文件导航

最近已通过五组回归和所有 frontend/*.js 语法检查：

```powershell
# Working directory: D:\DSH Workspace\agent_threekingdom
Get-ChildItem frontend/*.js | ForEach-Object { node --check $_.FullName }
node frontend/landing.test.cjs
node frontend/app.test.cjs
node frontend/travel-api.test.cjs
node frontend/map-route.test.cjs
node frontend/travel-map.test.cjs
```

浏览器：1280×900 与 375×812 首页图片加载正常，无横向溢出；实际提交“陈寿和南充有什么关系？”收到 culture_qa 回答，主框与对话不重叠；手机南充筛选9个县区，控制台未见错误。地图此前800%拖动及禁止文字选择已验收。性能仍有偶发长帧，不能宣称所有设备稳定60fps；/tests/map-performance.html 可用于复测。

截图目录：`C:/Users/Rocket/.codex/visualizations/2026/09/10/01a08c5d-b8c1-7301-a48c-fa4514c75077/`，文件 agent-home-desktop.png、agent-home-mobile.png、map-drag-seams-fixed.png。

- index.html、styles.css：首页结构与样式（新版样式在后部）。
- landing.js / landing.test.cjs：首页提问桥接与回归。
- app.js / app.test.cjs：对话、历史、重试、元数据。
- travel-map.js、map-route-core.js、相关 test.cjs：地图交互与路线。
- build-map.cjs、sichuan-*-boundaries.json、sichuan-map-geometry.json：已有离线几何生成资源；日常运行无需构建，不要无故重建。
- API-CONTRACT.md：接口约定；HANDOFF.md：完整历史与验收。

## 下一轮建议

先读本文和实际 git status/diff，再读主工作树 AGENTS.md、docs/TASKS.md 及前端 HANDOFF.md 最新段落。继续以智能体为中心，根据用户反馈调整视觉和对话体验，不恢复模块清单式首页。真正手机上的触摸体验与具体设备性能可按需求补验；没有待完成的本轮代码任务。

代码只提交 frontend/**，提交信息 `<type>(frontend): 描述`，收工更新 frontend/HANDOFF.md 和共享 TASKS/HANDOFF；不 push、不合并。若现场状态与本文不同，先查差异，保护用户的新改动。

## 2026-10-03 · 第十四批文化探索

基线 `feat/frontend-acceptance-20260929@9e90dc7`。陈寿迎接、故事与地图预览同框、推荐表单并排、详情左章节轴右正文+地图；地点区常展开，最终按协调者反馈恢复连续纵向滚动。验收与复跑见 `acceptance-culture-restructure/README.md`。没有保留上下两档分页代码。最新工作单禁止写根 AGENTS.md / docs，本轮交接仅写 frontend；共享进度由 DSH 回填。
