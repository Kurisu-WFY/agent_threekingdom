# 前端 Major #2–#5 / Minor #6–#12 验收记录

状态：DONE。2026-10-07，本地 dev，1920×1080，Microsoft Edge 实页 `http://localhost:8002`。
本轮仅修改 `frontend/**`；开工前已有修改与未跟踪文件保留，不动后端、不推送。

| 问题 | 修复与复验 |
| --- | --- |
| Major #2 辅助文字 | 使用 `--muted` / `--text-sm`，14px；三处合成背景对比度从 3.30:1 提至 5.97:1。 |
| Major #3 表单边界 | 使用 `--line-strong`；input / select / textarea 默认与焦点边界均为 3.30:1，原为 1.40:1；保留焦点环。 |
| Major #4 阅读定位 | 新章标题 `tabindex=-1`，渲染后聚焦并滚动；三章分别点击、Enter，共六条路径，标题距面板顶约 24px。隐藏故事视图时不抢焦点。 |
| Major #5 地图键盘 | 一个 Tab 入口，内部 roving tabindex，方向键、Home/End、Enter/空格；保留县区下拉与章节列表。验证 Tab 离开、章节激活、县区激活及重绘恢复；缩放后焦点框仍贴合章节图标。 |
| Minor #6 内容宽度 | 条件卡居中，表单跟随内容宽；实测卡宽 1216px、表单宽 1182px，左右内余量各 17px。 |
| Minor #7 按钮间距 | `.chapter-actions` 使用 flex、换行与 `--space-2`，横纵 gap 均 8px。 |
| Minor #8 标题语义 | 活动 h1 → 区块 h2 → 子工具/酒店条目 h3，视觉字号单独设置并沿用令牌。 |
| Minor #9 回答反馈 | 取消逐行累积延迟，完整回答一次 160ms 淡入、延迟 0；长回答从首段展示，历史重绘与 reduced-motion 直接显示。 |
| Minor #10 酒店恢复 | 区分未授权、超时、网络失败与服务失败；未授权提供本机 RollingGo 授权指引，其余提供真实重试。可返回住宿条件，重试保留城市、日期与档位。 |
| Minor #11 游客文案 | “每间每晚约 200—380 元”，保留参考预算、尚非报价、需核验；已知开发待办改为出发前核验提示。仅处理展示层，原始回复、用户文字、代码、链接和其他货币保留。 |
| Minor #12 按下反馈 | 主按钮使用 1px 按下位移与令牌内阴影，焦点环保留；聊天发送按钮保留原居中 transform，仅加内阴影。reduced-motion 取消位移、保留静态反馈。 |

## Finish gate

- Frictionless：六条阅读路径、地图键盘进入/激活/离开、回答即时可见、酒店恢复操作通过。
- Quality Craft：本轮新增颜色、字号、间距与反馈使用设计令牌；目标文字 ≥4.5:1、表单边界 ≥3:1。逐条 before → after 截图复验，并目视核对最终表单、章节与地图焦点。
- Trustworthy：保留待核验、非实测、参考预算、尚非报价、需核验、不代订等边界；未授权没有展示虚构酒店或价格。
- JS 语法：30/30；测试文件：28/28，退出码全部为 0。覆盖现有聊天、地图、故事、活动恢复、天气等回归，并新增本轮关键断言。
- 桌面复验：欢迎、目的地、地图、活动、探索志、故事、章阅读、地点资料、方案空态与聊天，共十个状态；页面及可见面板横向溢出均 0px，Console / pageerror 零产品报错。
- 改动的九个生产资源：本地与 8002 HTTP 返回体 SHA256 全部相同，HTTP 200，见下表。
- 以开工时全仓库文件哈希为基线，验收确认本轮变更没有越出 `frontend/**`。
- 本轮临时 before/after 截图、浏览器夹具截图、JSON 与校验脚本在验收后清理；保留测试源码和本记录。既有他人取证目录保留。

复跑命令（在仓库根目录 PowerShell 中执行）：

```powershell
$node = 'C:\Program Files\nodejs\node.exe'
Get-ChildItem frontend -Recurse -File -Filter '*.js' | ForEach-Object {
  & $node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "语法检查失败：$($_.Name)" }
}
Get-ChildItem frontend -File -Filter '*.test.cjs' | ForEach-Object {
  & $node $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "测试失败：$($_.Name)" }
}
```

验收范围：本轮指定组件的 AA 指标及键盘行为，不作为全站 WCAG 认证。酒店授权、超时、网络失败与长回答使用明确标注的浏览器夹具，验证前端交互，不宣称取得实时报价或完成真实授权。活动请求意图分流 Blocker 留给后端；下一步由协调者 review 前端修改。

## 资源一致性

以下每一 SHA256 均同时匹配本地文件与 `http://localhost:8002/<资源名>`。

| 资源 | SHA256 |
| --- | --- |
| `answer-format.js` | `6d202bd1da5d40a3cb2165ee65c8705a8a2e5993d878541fd8ddd76a6ba06df8` |
| `app.js` | `3b91fc15aee71e7fa223ebe598d10fea51c86e813fbd4b53de410256e770c838` |
| `hotel-search.js` | `2495fb3f4a67272080b4fd0c221e2f99ab1fed2bfca5077be4b967d666f85c60` |
| `index.html` | `41eeb2072b6278fc937bacbf65cdbcf5831ee97c1491ef717e996cc6102bd288` |
| `stories.js` | `9589679ab06adf7fd6c70090def88dc0826a2dc1384eb2bf8a9e61e606501c59` |
| `story-map.js` | `2b040869e20afe8eba9b012da4f29600a3fa231e83c356051548e058ec85f221` |
| `styles.css` | `be485127ff163d3de5282aca8b40783270356486c74fa5fd22e443329e1a8efe` |
| `travel-api.js` | `64924bce571902bf211a3880a1c802a684137fa000bf7bc04b93f840e9cdbf48` |
| `travel-map.js` | `c7dda196cd6f8f702c2cdf92572705dd4258f9416c7e4d311c1d72c775a547a9` |
