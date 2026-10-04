# 布局改造阶段验收 · 2026-10-05

基点 `dev / 41ffaa3`。本阶段交付 L1/L2、L3 布局与常驻地图、L5；**整单尚未完成：两处用户定位及定位测试待契约确认**。只改/提交本批 frontend，不 push/merge；既有 AGENTS/docs 与旧 audit 材料不变。

## 逐块证据

| 工作单 | 实施与已取得证据 | 临时截图 |
| --- | --- | --- |
| L1 | 整宽规则5列、聊天3列保留；当前40%地点列实际2列、5张建筑卡、SVG90px；窄列为2+2+1三行（按工作单明确repeat(2)） | L1-buildings.png |
| L2 | story-discovery整宽第一行；journey-desk/culture-places同一第二行，实测宽度比1.5；三条线索默认收起，全部原文保留；journey-trust在grid下方整宽 | L2-home.png、welcome-chat.png |
| L3布局 | planner-inputs左540px / outing-view右剩余宽，天气和住宿依次跨两列；字段两列、现有道路两套表单和草案返回机制保持 | L3-planner.png、planner-chat.png |
| L3地图 | amap-map-region取消hidden，移出道路工具details，工具折叠也可见；真实SDK与瓦片加载；默认center=[105.9,31.65]，zoom=8（9时360px高不包含南充/广元，按工作单“可微调”缩小一级）；重复进入SDK/config均仅1次，清候选保留底图 | L3-map.png |
| L3天气/住宿 | 4天卡片同一行（明确协议夹具，非实测天气）；酒店按高档型显示未接入，没有酒店名称或虚构价格 | L3-weather-hotels-fixture.png |
| L5 | journal-reading/map宽度比11/9且同排，records跨两列收底；空态原文、默认折叠、展开记忆、问题200条上限保持 | L5-journal.png、journal-chat.png |

截图与JSON均是本批临时取证，目视验收后清理；复验脚本与本 README 保留。

## 验证范围

- 原HTML的224个 id 在真实页面全部保留且恰好1个；诚实提示原文字句保留。新增测试不删旧测试。
- 25/25 JS语法、25/25 *.test.cjs通过（原24项 + 新 layout-map 生命周期夹具1项）。现有map-plan-polish“进入活动计划不自动查询天气”仍通过。
- 真实 localhost:8002 / Edge Chromium / 1920×1080 / Asia/Shanghai；welcome/story/destinations/map/planner/plan/journal/node × 聊天开关16组，文档及活动面板均无横向溢出；Console/Page errors=[]。
- n8-n9 / n10-n17脚本实际执行通过；本批5个已跟踪改动网页资源SHA256本地=HTTP。
- 新地图夹具先RED（没有enter），实现后GREEN；重复进入/清空后地图保留/路线与POI覆盖物/旧#outing深链启动次序均覆盖。旧深链与zoom微调各有RED→GREEN记录。
- 独立只读审查未发现Critical/Important/Minor；独立25JS语法及23项不生成材料的test全绿，另2项浏览器测试由主执行者实跑。未取得独立浏览器重跑证据。
- 未测试真实用户位置、定位拒绝/授权、定位坐标路线；未宣称定位已交付。未重新取得真实天气/酒店数据，天气4天仅用于横排协议夹具。

## 定位待确认：具体证据与下一步

当前key可加载AMap.Geolocation并创建实例，getCurrentPosition存在；本阶段**未申请用户实际位置**，不把“插件可加载”写作“真实定位成功”。参考[高德定位官方教程](https://developer.amap.com/api/javascript-api-v2/guide/services/geolocation)。

核对后端 `src/tools/amap_tools.py`：当前 `/api/travel/amap/route` 只收 `origin_id`/`destination_id`/`mode`，不能直接发GCJ-02坐标。禁止把坐标字符串伪装成POI id，禁止自行更改后端。格式化地址定位需要高德定位服务，工作单指定“坐标仅在你主动查询道路路线时发送”的隐私句与此冲突。已异步询问协调者允许如实说明并先按POI搜索确认流程交付，还是采用仅浏览器定位/坐标路线等待后端适配；截至本阶段交接未收到回答。此项须确认后继续，不凭超时视作同意。

## 复验

```powershell
node frontend/acceptance-layout/verify-all.cjs
node frontend/acceptance-layout/browser-checks.cjs
```

脚本默认使用现有localhost:8002和本机msedge，不启动/重启服务。verify-all恢复两个旧测试目录原有材料；生成本批verification.json。browser-checks生成截图和browser-evidence.json，其中资源网络记录仅保存host/path、不记录key/query。

## 最终资源SHA256

10项浏览器检查全部通过。高德瓦片响应已记录为200，稳定帧目视检查通过；广元/南充处于地图上下边缘，center纬度微调至31.65以留出标签位置。

| 文件 | 本地与HTTP一致的SHA256 |
| --- | --- |
| frontend/amap-map.js | 9b9aefad85d26b64834d81b6feff962b94426497a1c231f3190ec37a4713e86e |
| frontend/app.js | 696c1b6830ab2fff0d5b1bd886a38c7eed1830239d8ee3e08f31671e3726d8cd |
| frontend/index.html | 7c3e19d97d013efab5905629e5da402c526febbd1dbade2fef682f7a20285bd8 |
| frontend/journal.js | 7ea66b8c228c2cba43909f2a48eab7e86644aea485c340ce625685f37849251f |
| frontend/styles.css | 9fa3a793683e8fb3a82854b347d87d04cb7815206084719a816ffb8840305f81 |
