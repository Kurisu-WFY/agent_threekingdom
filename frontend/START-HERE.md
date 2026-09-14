# 新对话接手指南 · 2026-09-14

## 当前状态与目标

本项目面向川东北（南充、阆中、广元、剑阁）三国文化旅游。前端服务于后端智能体，原生 HTML/CSS/JS，无框架、无依赖安装、无构建步骤。最近用户要求已完成；本次仅整理交接，不新增功能。下一轮根据用户新反馈继续。

功能基线提交：`4485f1b`，分支 `feat/frontend-iteration-3`。交接文档随后另作 docs 提交；开始工作应读取实际 HEAD，不能重置回功能基线。2026-09-14 写本文前工作区干净。未 push、未合并。

## 唯一开发位置与边界

- 唯一工作目录：`D:\DSH Workspace\sgt-frontend-iter3`，仅改 `frontend/**`。
- 这是稀疏检出的 git worktree，只有 frontend 是正常现象。
- 主工作树 `D:\DSH Workspace\agent_threekingdom` 是冻结基线且有大量 .venv 改动。不要在那里切分支、pull、提交或清理 .venv。
- 不改 src、deploy、data、prompts，不自行合并，不 push，不改 Docker 配置。
- 公共文档是主工作树的未跟踪文件：AGENTS.md、docs/TASKS.md、docs/HANDOFF.md、docs/BACKEND-API.md。可以按协作规则回填 TASKS/HANDOFF，但不要把它们混入前端提交。
- 旧 AGENTS/交接中的 tip 和“没有浏览器验收”等是历史状态，以本文件和 frontend/HANDOFF.md 后面的记录为准。
- Git 不在 PATH：`C:\Program Files\Git\cmd\git.exe`。命令必须在迭代 worktree 执行，可加 `-c safe.directory='D:/DSH Workspace/sgt-frontend-iter3'`。不要改全局 safe.directory。
- 如沙箱仅允许主工作树写入，应申请工具级提权写指定迭代目录；不要因此在冻结目录开发。

## 已完成，勿重复实现

### 智能体优先首页（4485f1b）

主导航由七项收为“与蜀汉对话 / 行旅地图”。首页主标题“读懂三国，再出发”，直接提问框连接已有对话，三个轻量示例问题；地图辅助对话，不再铺开目的地、规划、预算等独立导航。原细分模块仍隐藏保留，不能未经检查删除其 DOM 或脚本依赖。

新增 landing.js：复用 app.js 的 send、toggleChat 和会话状态；已有请求进行中时新问题保存为草稿，避免重复请求。对话面板默认收起。首页为宣纸色、墨绿、朱红，剑门关拱形主图配阆中古城图片。图片本地存放 assets/，CC BY-SA 4.0；作者、来源和许可见 assets/CREDITS.md，页脚也有署名。Openverse/小红书没有获得可用页面、Pngtree 受限，未使用未经核实的图片。

### 地图与对话既有能力

21 市州、183 县级轮廓；100%–249% 市界，250% 起县界；县域内部可点击选中，不只点文字或驻地点。筛选适配市域，标注避让，右下角滑条显示缩放比例，滚轮/双指/拖动可用。成都只标红，不能恢复“省会”后缀。

b8beadc 修复高倍拖动边缘缺块（visibleBounds 考虑 SVG 留白）、禁止地图文字拖选、市县使用同源共享弧段减少接缝。不要退回逐县独立简化。地图只作位置示意，驻地不是景区入口，虚线是地名提及顺序，不是道路导航。

会话历史删除/撤销、请求隔离、失败重试、信任元数据容错已有回归。地图无坐标后端站点不能清空已识别地名路线。

## 运行、协议与真实限制

后端 Docker 容器 sgt-snapshot-api；访问 http://127.0.0.1:8001/。前端由迭代目录只读挂载到 /app/frontend，修改后刷新即生效，缓存时 Ctrl+F5。最近一次联调在 2026-09-13 成功；新会话需重新检查运行状态，不把上次健康当作当前事实。宿主 8000 属于其他项目，不改端口。

/chat 响应多态：culture_qa 没有 route 键；budget_ticket 的 route 为 null；route_planning 才有路线对象。非 2xx、超时、非法 JSON 必须报错可重试。缺 message 应为422，前端空输入禁发。

后端景区站点缺 GCJ-02 坐标时保留地名示意并提示待定位，不猜景区坐标。未知价格 0 不解释为免费；data_status/updated_at/sources 缺失显示待核验，不伪造实时票价、天气、来源或数据状态。来源仅 http/https，C 级不能支撑史实。旧环境使用 mock 与演示知识，不能夸大为完整实时智能体。

travel-api.js 的 enabled=false 保持；四个 /api/travel 接口是待后端实现提案，不能擅自开启。后端缺口交人协调。

## 验证与文件导航

最近已通过五组回归和所有 frontend/*.js 语法检查：

```powershell
# Working directory: D:\DSH Workspace\sgt-frontend-iter3
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
