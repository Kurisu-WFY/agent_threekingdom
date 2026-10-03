# 第十四批 · 文化探索重构验收

2026-10-03；开工 `feat/frontend-acceptance-20260929@9e90dc7`。可看版联调 http://localhost:8002。

实现提交：`249f761`，`refactor(frontend): 重整陈寿带领的文化探索入口`；验收与交接单独小步提交。

最终布局按协调者最新反馈恢复连续纵向滚动；“从地点了解三国”常展开，放在故事与推荐下方。上下两档切页、轨道与滚轮拦截均已移除。陈寿迎接、两条入口、共用地图和详情两栏保留。

## 逐项

- [x] 0 首屏陈寿立像 SVG、“我是陈寿，带你游川东北的三国”与“读史、看地点，再规划行程”。
- [x] 1 移除首屏“选择故事线”、阶段 tab 与大段折叠人物/行程引导；直接展示主题。
- [x] 2 五条故事横滑、章节横滑预览与四川 SVG 同一 box；卡片先更新预览，“查看故事详情”另行进入。
- [x] 3 左“跟着故事线走”、右“让陈寿推荐”在 1920 首屏并排。
- [x] 4 几天、出发地、兴趣、人物陈寿/诸葛亮/张飞进入同一现有对话请求；可只填条件、不填自由文本。
- [x] 5 五个建筑节点与三个文化卡保留并常展开；文化节点 SVG 生成未改。
- [x] 6 一个四川轮廓 DOM 组件在目录/详情之间移动；选故事显示“进入故事地图”，取消选择显示“打开四川地图”；行旅地图保持五 tab 独立入口。
- [x] 7 详情左章节轴、右正文与地图；保持桌面阅读宽度。
- [x] 最新反馈：恢复连续滚动，鼠标滚轮可停在中间任意位置，没有两档分页组件。

### 现有资料边界

五主题仅蜀道寻踪有三章，其他四条没有章节。原 StoryMap.open 拒绝无章节故事，本轮保留此逻辑。此类主题按钮旁明示“地图入口先打开普通四川地图”，点击后退出故事模式并明示“尚未开启故事模式”。蜀道寻踪进入原故事模式。不制造章节、史料或坐标。

陈寿聊天、故事数据/章节逻辑、地图几何计算、文化节点 SVG、探索志未改；不改模型回复原文。史料待核验、驻地示意不代表景区入口、探索记录不代表实际到访等边界保留。

## 验收与复跑

- `node frontend/acceptance-culture-restructure/verify-all.cjs`：递归全部 25 个 JS 逐个 node --check、22 个 test.cjs 逐个运行；结果与命令输出在 test-results.json。旧聊天/天气测试包含标注夹具，不冒充真实服务。
- `node frontend/acceptance-culture-restructure/browser-verify.cjs`：实际 8002、Edge Chromium、1920×1080。首屏、横滑、预览、详情/SVG 往返、故事地图、普通地图、缺章节回退、常展开地点区、节点返回、连续滚动和真实推荐请求通过。各被测文档/panel 无横向溢出；观察范围 Console error=[]、pageerror=[]。结果在 browser-green.json。
- `node frontend/acceptance-culture-restructure/verify-resources.cjs`：四个改动网页资源原字节 SHA256 与 8002 全部一致，见 resource-hashes.json。
- 稳定帧截图：culture-initial.png、culture-selected.png、culture-scroll-midpoint.png、story-detail.png、story-map.png、culture-places.png、recommendation-conditions.png、recommendation-chat.png、culture-places-chat.png。
- 推荐真实发送至 `/chat/stream`，JSON 保存发送条件；未取得模型回答内容正确性的本轮验收证据。发送成功不代表回复满足 2 天等条件，不改回复原文。
- browser-red.json / failure.png：首轮采集脚本误监听 `/chat`，实际请求为 `/chat/stream`，脚本超时；修正监听后绿。不是产品没有发请求。preview-initial.png 是早期布局截图，以 culture-initial.png 为准。

## 审查与范围

独立只读审查发现隐藏意图切换使推荐草稿无可见返回入口，已红→绿补“返回行程推荐”，恢复各主题草稿。人物/回顾准备动作仍只准备输入，不自动请求。两页试版被用户撤回后，最终使用原连续滚动，无分页裁切问题。

只提交本轮明确 frontend 文件；不 push / merge / 强推，不安装依赖。工作区原有 docs、audit 与旧批次验收材料不纳入提交。旧测试会自写截图/JSON，早期直接运行曾刷新旧产物；最终 verify-all 在 finally 恢复运行前原字节。

最新工作单禁止改根 AGENTS.md 与 docs；本轮更新 frontend/START-HERE.md、frontend/HANDOFF.md，共享启动文档请 DSH 回填。未取得移动/响应式验收；范围仅桌面 1920×1080。
