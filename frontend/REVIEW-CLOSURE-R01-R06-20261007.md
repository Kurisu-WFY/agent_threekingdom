# 第二轮收口交付 · R01–R06

本轮只修六条问题；仅 frontend/**。仍在本地 dev，未提交、推送、合并或改动后端/docs。上一轮及开工已有改动保留。以下为 Codex 实现与自测，不是 DeepSeek v4.1 Flash 独立验收结论。

| 条目 | 修复与验证 |
|---|---|
| R06 | 不再以非空回答或意图判断成功。只有完整 route.found + route 对象 + 非空可渲染 stops，或已有 plan.days[].stops[] 结构才 valid；费用/检索摘录不冒充方案。文化问答、条件不足、未知格式、不完整结构均 other-answer，保留原回答与恢复操作。真实南充一天模板已取得并正常 valid。 |
| R01 | 已展开清单另有即时状态：旧请求快照 · 条件已改变；原快照内容不改写。时间、人数、备注、城市、章节取舍变化均已回归；重新整理仍按最近实际请求的条件与状态，不能把当前未发送条件贴成原请求。 |
| R02 | 外层 .meta 与标签允许换行和收缩，trust-info 不越界、不隐藏核验原文。真实服务回答的核验区域 scrollWidth=clientWidth=537px；目视全文直接可读。 |
| R04 | 无匹配/未知回答显示“尚未收到活动方案，请查看服务原回答”；费用、摘录、完整路线模板、结构化活动分别准确描述。模板及活动成功提示仍明确时间与可行性待核验。 |
| R03 | 初始化即调用条件标签渲染；无故事“返回目的地”，带故事“返回故事”，分别进入 destinations/story，已真实页面点击验证。 |
| R05 | 道路主说明只显示确认的地点名称和已返回地址；响应无地址时沿用同次搜索候选返回地址，不补造地址。原 POI 编码位于默认收起的“查询详情”；内部查询 ID 未变。候选选择、查询参数、改城清除确认 ID、旧结果保持与未关联状态回归通过。真实高德搜索与道路也已验证。 |

## 本轮文件

- `frontend/amap-planner.js`
- `frontend/design-system.test.cjs`
- `frontend/fixes.browser.cjs`
- `frontend/index.html`
- `frontend/styles.css`
- `frontend/travel-modules.js`
- `frontend/travel-modules.test.cjs`
- `frontend/review-fixes.test.cjs`：新增六条行为回归，服务夹具只在测试上下文注入。
- `frontend/review-live.browser.cjs`：真实同源 /chat 模板、真实高德地点/道路、资源 SHA256 和桌面视图验证，无构造服务响应。
- 本文件：保留验证摘要及可复跑方式。

旧回归的“纯文字即成功”用例改为明确结构化计划夹具，继续验证原回答、保存/复制、证据、迟到结果与旧方案保留；不是删除测试。旧 .meta 单行断言按 R02 改为换行。原 fixes.browser.cjs 的两处成功夹具同步为结构化计划，避免旧脚本仍依赖错误的成功判定。

## 实际验证

- 全部 30 个 *.js 的 node --check 通过；28/28 组 *.test.cjs 通过（原27组 + 本轮1组，内含6个浏览器场景）；0失败。
- 六条新浏览器场景 6/6；1920×1080，页面脚本错误/Console error均0。
- 真实页面八个主视图 × 伴行收起/展开 = 16组；document.scrollWidth ≤ 1920，面板 scrollWidth ≤ clientWidth，页面脚本错误/Console error均0。
- 真实 /chat 请求“南充一天三国文化路线”：intent=route_planning、route.found=true，前端valid，保留路线模板/时间及现实可行性待核验提示。
- 真实高德确认“南充站 · 铁欣路1号”到“西山风景区万卷楼景区 · 火花街道玉屏路6号”；主说明无POI编码，展开详情保留B033100HZZ/B0331005E8。供应商查询结果不等于现场交通核验。
- 识图目视核对真实核验说明换行、真实道路名称/地址/详情，以及文化问答、条件不足、未知格式、不完整结构四张非方案反馈；均无误标成功、截断或隐藏原文。
- git diff --check -- frontend 通过；开工文件哈希逐一比对，frontend 外没有本轮改动。
- 没有运行375响应式或UI整体改版验收；既有回归自带的视口检查沿用，不增加相应实现范围。没有修改后端、依赖、.venv、数据或部署。

实际命令（PowerShell，仓库根目录）：

```powershell
$node = 'C:\Users\Rocket\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
# 临时全量runner扫描所有 .js 并运行所有 .test.cjs，同时恢复旧测试会写入的证据目录。
& $node 'C:\Users\Rocket\.codex\tmp\frontend-r01-r06-20261007\verify.cjs'
& $node 'frontend/review-fixes.test.cjs'
& $node 'frontend/review-live.browser.cjs'
& 'C:\Program Files\Git\cmd\git.exe' diff --check -- frontend
```

临时全量runner及截图/JSON在目视核对后按工作单要求清理；没有清理上一轮证据或原有未跟踪目录。保留可复跑的新测试脚本。复跑全部测试可用现有 `node frontend/acceptance-layout/verify-all.cjs`（该入口会写一份临时 verification.json，检查后清理自己生成的文件）；复跑本轮脚本会重新建立仓库外取证目录。

改动资源本地/8002 SHA256（均 HTTP 200、逐字节一致）：

| 资源 | 本地及服务SHA256 |
|---|---|
| index.html | `f87315e04d4ffcee16f9b3f59fd53b62f9f7616b039c062f4d409b0347256600` |
| styles.css | `d76ca1099610df7d4b67aca502d32edd3ba22281ae4ef5a5c670e317c9bbde5c` |
| travel-modules.js | `2dbadb256628e114e91101389a3018960df2493b5b26f73d04ec6866b74fbe89` |
| amap-planner.js | `b7b0d4355cb56bb11bfab8ebf76dc6fbcbc03ae9ce0764550cccdd61cbee1af9` |

## 独立复核入口

在 http://localhost:8002、1920×1080：先看活动页默认返回标签；带故事后核对返回；生成后保留原回答并分别构造三类非方案，检查恢复入口；清单展开后逐项改条件；展开陈寿检查实际核验文本；确认真实高德起终点后检查名称/地址与可展开编码，再改城检查旧结果关联。未知格式只落非方案；结构化模板仍需核验，不代表可执行交通或实际到访。独立验收尚待协调者安排。

可粘贴TASKS/HANDOFF：

> R01–R06六条已实施并完成Codex自测，待独立复核。仅frontend/**，未提交/推送。30 JS语法、28组回归通过；1920主视图16组合无横向溢出、脚本错误0；4个改动资源字节一致。真实模板与高德道路已核对；不明确的回答保持非方案及恢复操作。临时截图/JSON目视后清理，原有工作与证据保留。详情 frontend/REVIEW-CLOSURE-R01-R06-20261007.md。

## 最终边界检查

逐文件哈希核对：本轮 7 个已有文件改变、3 个新增文件，全部在 frontend/；没有删除原有文件，frontend 外原有字节和 git 状态保持。HEAD仍为 dev@dc2a445，未提交/推送。仅本轮相关状态（其余原有状态保持）：

```text
 M frontend/amap-planner.js
 M frontend/design-system.test.cjs
 M frontend/index.html
 M frontend/styles.css
 M frontend/travel-modules.js
 M frontend/travel-modules.test.cjs
?? frontend/REVIEW-CLOSURE-R01-R06-20261007.md
?? frontend/fixes.browser.cjs
?? frontend/review-fixes.test.cjs
?? frontend/review-live.browser.cjs
```
