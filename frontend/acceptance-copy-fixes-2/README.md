# 第九批文案修复验收：C11–C18、C19–C21

11项已实施。权威问题及最小范围为 `frontend/COPY-AUDIT-20261003.md` §3；C19–C21由协调者直接采纳。本轮仅修改前端固定提示、摘要及字段标签，保留模型/后端回答原文、原始数据与第五至第八批成果。

基线：`d342f9c1fb784d610ed5eff37877a2523e2a013c`。产品最终提交：`bb0124a676bf30ece78697f08face4c4024f5e84`；分支：`feat/frontend-acceptance-20260929`。联调：`http://localhost:8002`。全部截图为真实浏览器原始JPEG字节及同名DOM，1920×1080，未转换或拼图。

## 逐条验收与回归映射

- [x] **C11**：已确认的住宿服务格式旁显示“住宿价格仅供估算，请以预订平台当天报价为准”和“元/晚/间”；原CNY/OTA及演示说明保留，路线演示旁另加实际出行核验提示。未知格式或币种不推断。看图 [03](03-C11-budget-final.jpg)、[11](11-C11-C16-route.jpg)；`app.test.cjs` C11断言覆盖预算/路线原文保留及未知币种。
- [x] **C12**：历史来源显示A=权威资料、B=较可靠资料、C=文学/传说，并提示C不能支撑史实结论。天气/空气来源独立显示“实时信息来源 · 需再核验”“模型预报、非现场实测”；来源链接、日期与核验提醒保留。看图 [05](05-C12-authoritative-source.jpg)、[14](14-C12-model-source.jpg)；`app.test.cjs`、`travel-modules.test.cjs` C12覆盖A/B/C及实时来源分离。
- [x] **C13**：故事地图图例改为“未标记完成的章节显示待探索”，保留“已寻迹”、本地记录及非到访边界。看图 [16](16-C13-final-legend.jpg)；`journal.test.cjs` C13断言。
- [x] **C14**：明确且唯一的游客时间用于固定推荐“已按一天考虑，可继续调整”，原回答的重复追问仍保留。修复评审发现的先前建议/历史背景误认，并支持“我有一天时间”“只有半天时间”。最终真实问答看图 [18](18-C14-final-confirmed-day.jpg)；`character-chat.test.cjs`覆盖明确半天/一天/两天、未给定、冲突、建议、历史背景及原文保留。
- [x] **C15**：摘要按服务返回的 `air_quality.units.pm2_5/pm10` 显示“PM2.5 浓度…μg/m³”等，保留“模型估计，非现场实测”；缺单位显示“单位待确认”，不补猜。看图 [13](13-C15-air-units.jpg)；`travel-modules.test.cjs` C15覆盖有单位、无单位及异常单位值。
- [x] **C16**：路线120分钟与景区90分钟分别显示“本次安排”“资料中的一般游览参考（仍需核验）”，数值不改。字段对应 `route_stops.stay_minutes` 与 `scenic_spots.recommended_duration_min` 已只读核对；缺值或非法值显示“时长含义待确认”。看图 [11](11-C11-C16-route.jpg)；`app.test.cjs` C16覆盖已知与缺失时长。
- [x] **C17**：故事来源summary及节点资料状态去除单条内部的重复核验词，分别列当前显示、待确认项、更新时间，保留驻地/入口/道路边界。最终看图 [19](19-C17-final-story-status.jpg)、[20](20-C17-final-node-location.jpg)；`stories.test.cjs`、`cultural-node.test.cjs` C17覆盖单条状态次数及三个信息项。各独立来源自身状态继续保留。
- [x] **C18**：文学空态写“尚未补充可核对的文学文本/版本出处”，标题“文学文本来源”，保留“不等于历史事实”；不增加情节或出处。最终看图 [21](21-C18-final-literary-empty.jpg)；`cultural-node.test.cjs` C18断言排除“未找到可靠记载/史料来源”。
- [x] **C19**：开头改“读史请核对依据”，动态信息出发前核验提醒保留。看图 [15](15-C19-final-trust.jpg)；`journal.test.cjs` C19断言。
- [x] **C20**：探索志两段近义边界合并为一段，保留本地/设备/账号、非实际到访、最近200条及删除/撤销说明；存储异常仍提示。看图 [12](12-C20-journal.jpg)、[聊天展开的最终探索志](23-layout-open-journal.jpg)；`journal.test.cjs` C20断言及既有探索志回归。
- [x] **C21**：可见文字与 `aria-label` 均为“陈寿正在整理回答，请稍候”，不承诺查阅史料等具体过程。最终真实等待看图 [17](17-C21-final-real-pending.jpg)及DOM；`app.test.cjs` C21逐字一致断言。

## 全局验证

- [x] [verification.json](verification.json)：24个JS语法检查、19组 `*.test.cjs` 全绿，产品版本为bb0124a。新增断言已在各实现提交正文列明；无新依赖、框架或测试分组。
- [x] [layout-checks.json](layout-checks.json)：文化探索/目的地/行旅地图/活动计划/探索志 × 聊天收起/展开，共10状态，页面宽度1920、无页面横向溢出。内部独立滚动区保留；截图22、23各含五种状态。
- [x] [console.json](console.json)：本轮真实浏览器Console零warn/error。
- [x] [resource-sha256.json](resource-sha256.json)：6个改动JS及index.html，共7个资源，本地与8002返回字节SHA256一致。
- [x] [scope-verification.json](scope-verification.json)：13个产品/回归文件均在frontend；AGENTS.md、docs/TASKS.md、docs/HANDOFF.md与开工哈希一致；本批目录以外的既存Git状态逐项一致，暂存区原为空。
- [x] [screenshot-manifest.json](screenshot-manifest.json)：31张1920×1080截图及同名DOM。图01首页提示未在首屏，改看15；02预算改看03；早期C14看10但最终以18为准；早期C17/C18看06–09，最终以19–21为准。未修改的预算/路线/天气分支03/05/11/13/14仍有效。
- [x] [review.json](review.json)：只读独立评审报告一个C14 Important问题，其余无报告项；已通过新增失败样本、修复及完整回归闭环。未进行第二次独立评审，不将实现者复验称为独立复审。
- [x] [cleanup.json](cleanup.json)：临时视口恢复、临时页关闭；没有网络/缓存/响应替换或阻断覆盖，没有删除既存方案或记录。

实现提交依次为 `f4f63ed`、`7fa7283`、`4a3d35c`、`bb0124a`。初次失败证据 `red.json`、初次全绿 `green-initial.json`；评审新增失败/补修全绿为 `review-red.json`、`review-green.json`。本目录另有计划、开工状态和浏览器可见文本报告。

## 证据限制

真实查询包括住宿预算、文化问答、南充一天路线、成都景区来源、南充天气/空气；没有伪造或替换后端响应。B/C有效结构化历史来源、聊天有效结构化来源、未知币种/单位/时长、冲突时间和历史背景的反例只有回归样本，未取得这些分支的真实浏览器证据。C21核验了可见文字与DOM辅助标签，未取得独立读屏器口播证据。

仅验收桌面1920×1080，响应式未实测。本轮不核验模型历史叙述、实际票价、天气数值、道路或现场事实。原回答即使包含错误线索或重复追问也保留；内容责任方的改写不属于本批。C11沿用已确认服务格式，C14仅识别明确的时间字段/游客陈述，复杂自然语言仍需要结构化条件。本批无未完成项或已知阻塞；不自动实施其他审计建议，不push/merge。
