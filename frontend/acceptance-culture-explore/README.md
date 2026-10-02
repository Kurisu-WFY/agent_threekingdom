# 文化探索信息层级重整 · 可看版本与验收

工作区 `D:\DSH Workspace\agent_threekingdom`，分支 `feat/frontend-acceptance-20260929`，基线 `c6d60df`；联调 http://localhost:8002。仅1920×1080，原生HTML/CSS/JS，无新依赖。本版本供协调者目视确认，技术验收不替代主观设计裁决。

## 改了什么

真实走查发现原首页的八个大区块连续堆叠，问答、表单、文化卡与地图各自成为大入口，用户需要先理解整页才能选择。原内容滚动高度约4040px（02-before-stories）。

- 首屏明确说明“选主题、读章节、看地点、向陈寿追问”，唯一红色主行动为“选一条故事线开始”。
- Hero和故事目录保持常显，实景照片作为辅景，保留五个故事与筛选。故事缺章节提示仍在，没有把主题模板包装成完整路线。
- 故事预览收进“预览章节与地图”；其余归为“有问题？问陈寿”“从眼前的地点读三国”“先看看四川的地点”三条次级路径。
- 原有内容全部保留，按需展开。默认内容高度约1025px；没有声称展开后长内容消失或所有入口全塞进首屏。
- 文化卡片的“写下想问的话”、回顾入口会自动展开表单并聚焦；折叠、模式切换不清除草稿。原请求协议、地图、五tab与节点来源没有重写。

代码仅改 [index.html](<D:/DSH Workspace/agent_threekingdom/frontend/index.html>)、[styles.css](<D:/DSH Workspace/agent_threekingdom/frontend/styles.css>)、[landing.js](<D:/DSH Workspace/agent_threekingdom/frontend/landing.js>) 与其既有回归。CSS限定在welcome；样式和landing引用更新版本号，避免普通刷新沿用旧资源。

## 验收逐条勾选

- [x] **首屏能指认用途与主行动**：20-delivery-home展示说明、故事主行动与目录；主行动实点滚到故事区。按钮实测高约48.8px。最终“是否顺眼/符合协调者预期”仍待目视确认。
- [x] **八个原区块功能入口全部可达**：见下面逐项证据表。原DOM id零删除、无重复（dom-contract.json）；不能仅凭该静态检查宣称实点通过，实点另列。
- [x] **主次分明的可看版已实现**：红色主行动与故事目录常显，次级入口为安静的原生展开行；默认四组收起，键盘Enter可展开/收起（19-secondary-paths / interaction-checks.json）。
- [x] **五tab与状态不回归**：目的地、活动计划、探索志、行旅地图、文化探索逐一实点；只有对应tab选中，view-label分别匹配。故事详情为“文化探索 · 故事详情”、建筑为“文化探索 · 文化节点”、地图为“行旅地图”。
- [x] **全部JS语法/回归通过**：递归24个*.js（根22、子目录2）与19个*.test.cjs全部退出码0，最终结果见verification.json。新增折叠表单准备回归先以“prepare must reveal the collapsed journey form”失败，再实现展开，最终全套通过。
- [x] **1920×1080无横向溢出**：五tab与聊天开合实测document/body=1920；内容、welcome、故事/建筑/表单盒子的scrollWidth不超过clientWidth，见browser-layouts.json。
- [x] **Console零产品报错**：本轮浏览器日志error列表为[]，见console-errors.json；覆盖本轮页面加载、折叠、入口、问答与tab操作，不扩张为所有异常场景无错。
- [x] **改动产品资源本地与HTTP SHA256一致**：index.html、styles.css、landing.js三项一致，见resource-sha256.json；不是比较截图或转码后的字符串。
- [x] **截图/JSON随frontend入库**：本目录全部提交，20张JPEG均1920×1080，见screenshot-sizes.json。旧audit/audit-ia/audit-interaction及UI/UX审计不顺手暂存。
- [ ] **协调者最终目视确认**：尚未取得；主观层级设计是否解决“看得头痛”由协调者判断。

## 八个原区块的实际入口

| 原区块 | 现在位置与操作 | 本轮实际结果 / 证据 |
|---|---|---|
| Hero + 实景图 | 文化探索默认首屏 | 20-delivery-home；主说明和主行动可见，照片仍有来源与真实图像 |
| 故事选择 + 筛选 | 常显故事目录→蜀道寻踪卡 | 06-story-detail，实际进入故事详情；五主题、筛选仍在DOM和渲染中，未把四个缺章节主题开放成空地图 |
| 故事预览 + SVG + 地图入口 | 展开“预览章节与地图” | 07-preview→08-preview-map，当前选中蜀道故事，预览SVG与按钮可达且实际进入故事地图 |
| 陈寿文化向导 | 展开“有问题？问陈寿”→我喜欢的人物 | 09-chenshou-entry，实际发送并收到回答；18-actual-answers / interaction-checks.json记录回答数量 |
| 旅程表单 + 偏好 + 灵感 | 同一展开组→我有几天/从哪里出发 | 10-journey-form、13-character-form、14-form-submit；收起重开保留草稿、模式切换恢复草稿、文化问题真实提交并收到回答。偏好与三个灵感chip保留，本轮未再次发送全部灵感问题 |
| 建筑节点 | 展开“从眼前的地点读三国”→读懂万卷楼 | 11-building-node，打开万卷楼节点；返回文化探索且原分组保持可用。五建筑卡仍在，但未逐建筑重复询问 |
| 三文化线索卡 | 同一地点展开组内 | 12-culture-cards；“写下想问的话”自动展开陈寿表单，人物模式聚焦输入（13）；“循着陈寿去了解”真实发送收到回答；“听听两种讲述”在前一问等待时进入对话草稿（15），不宣称该对照问题已取得回答 |
| 行旅地图邀请 | 展开“先看看四川的地点”→展开四川地图 | 16-map-invitation→17-geography-map，实际进入行旅地图，标签正确 |

## 证据索引与阶段

- **20-delivery-home.jpg**：最终交付首屏，四组默认收起。**19-secondary-paths.jpg**：稍向下即可看见三条次级路径。
- 01-before-home / 02-before-stories：原版取证；02记录稳定的原滚动高度。
- 03-first-version：初次结构预览，浏览器尚沿用旧样式缓存，**不作为最终样式验收**。
- 04-after-home：中间样式版本；05-final-home和20-delivery-home为最终产品样式，首屏相同。
- 06–18：故事、预览、地图、问答、表单、建筑与文化卡的实点截图，操作说明见browser-reports.json。
- browser-reports.json：每张截图的视口、view-label、滚动范围和区块位置。截图为真实视口图，未拼接、裁剪或伪造。
- interaction-checks.json：八个区块入口索引、草稿/焦点/键盘观察及证据限制。
- browser-layouts.json / console-errors.json：五tab、两种聊天布局与Console记录。
- verification.json / resource-sha256.json / dom-contract.json：全量回归/语法、服务字节与原DOM id保留检查。
- PLAN.md：实现决定与收工记录；docs-preservation.json记录本轮中段两份既存docs哈希，用于收工对比，不假称开工时已计算哈希。

## 限制与下一步

只验桌面1920×1080，未做响应式、触屏、实体双指或行政界线对照。本轮没有实施上一轮UX报告中的其他建议，没有重做第五批地图；M4-3既存相交问题保留。问答返回内容只用来验证入口链，未认证史实、票价、天气或其他后端内容。

本地探索志新增本轮测试问题；没有删除已有记录。普通收起不丢草稿已实测，但跨页刷新后对话仅本页的既有边界仍成立。本轮临时测试会话刷新结束，未清理既存探索资料。

提交仅frontend，不push/merge/强推；不修改docs，保留既有未提交回填和未跟踪审计资料。下一步：协调者查看8002与20-delivery-home，确认主路径方向后再决定是否细化视觉或更换主行动。

## 本地提交记录

- `a07293f`：重整文化探索主次入口层级，四个代码/回归文件。
- 验收材料为后一条独立提交，提交号见本目录对应的Git日志；两条提交都仅包含frontend。
