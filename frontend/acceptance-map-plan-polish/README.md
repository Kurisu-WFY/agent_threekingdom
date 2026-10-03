# 第十二批验收与交接（2026-10-03）

起点：`066b15b`，分支 `feat/frontend-acceptance-20260929`。代码提交：`1808120 fix(frontend): compact map and planner with inline three-day weather`。只修改/提交 frontend/**；未 push / merge。AGENTS.md 与 docs 原有修改均未纳入，依本轮明确范围要求，进度与交接保存在此目录。

- [x] 1 地图两段长说明压缩；驻地非入口、虚线非导航、轮廓与坐标来源保留。首屏地图可见比例 87.17%（改前约79%）。
- [x] 2 带入活动计划与全省视图等控件同排，墨绿实底区分；选南充带入目的地仍有效。
- [x] 3 天气内联活动计划，手动查询北京时间今天起三天；整数温度范围、状况、AQI 均取真实服务字段。旧天气入口也进入内联区，不改活动出发日期，不自动发请求。
- [x] 4 原创纸墨山景 SVG：晴、多云、阴、雨、雪、雾、雷雨与未知。代码缺失/不在官方分类表时显示“状况未取得”，不由降雨概率推测。
- [x] 5 八项字段收为两列、44px 高；保持必填/选填、人数1–50与原方案生成/保存/复制/地图行为。

## 天气诊断与边界

真实浏览器无拦截查询：南充、广元成功，2026-10-03～05 三天温度/状况/AQI 均取得。绵阳返回 `status: unavailable`，服务说明“当前支持南充、阆中、广元”。这是后端城市支持范围问题；未改后端，也未用其他城市天气替代。页面保留失败、原始原因与重新查询按钮。详见 weather-diagnosis.json、live-weather.json 和 live-绵阳.png。

现有同源服务返回7日温度与 PM 浓度，但无 weather_code / AQI。前端仅在它成功返回合法 WGS84 城市坐标后，向同一 Open-Meteo 来源补查 daily.weather_code 与 hourly.us_aqi。实际浏览器四次补查均 HTTP200，响应原文存 live-weather.json。无需密钥，依赖外部服务连通；某项补查失败时保留已成功数据，标明未取得与重试。

AQI 明确采用 **US 标准**，每天显示该日已返回小时预报的峰值；不是 PM 浓度、不是中国 AQI 标准，也不是现场实测。源温度数据未修改，仅在展示时四舍五入为整数；原始服务说明、来源、缓存查询时间折叠保留。天气仍为模型预报，城市中心不代表景区入口。[天气状况字段依据](https://open-meteo.com/en/docs)、[空气质量字段依据](https://open-meteo.com/en/docs/air-quality-api)。

## 验证证据

- all-tests.json：25 个 *.js 执行 node --check；22 个 *.test.cjs 全部实际执行、exitCode=0。测试重写的第十一批证据均恢复开工时字节，preservedPreviousEvidence=true。
- browser-green.json：真实 Edge/Chromium，1920×1080；12组断言涵盖五项要求、字段缺失、独立补查失败、主请求/补查请求过期隔离、旧入口、聊天开关时页面与面板均无横向溢出、Console/pageerror=0。
- live-weather.json：真实天气请求无拦截/无夹具；南充与广元成功，绵阳失败边界；Console/pageerror=0。预报物理准确性与景区现场实测证据未取得。
- resource-sha256.json：8 个改动资源本地与 http://localhost:8002 字节 SHA256 一致。
- code-review.md：独立只读复核无产品阻断项；截图动画/滚动问题已修正并重拍。
- before-map.png / before-planner.png 为改前；map-final.png / planner-three-days.png 为改后。**planner-three-days.png 用明确标注的协议渲染夹具展示晴/雨/阴三种图标，不是真实天气。** live-南充.png / live-广元.png / live-绵阳.png 才是真实查询截图。browser-red.json 是调试时失败记录；最终结论以 green 与 all-tests 为准。

## 复跑

从仓库根用 PowerShell 执行：

```powershell
node frontend/acceptance-map-plan-polish/verify-all.cjs
node frontend/acceptance-map-plan-polish/verify-live.cjs
node frontend/acceptance-map-plan-polish/verify-resources.cjs
```

浏览器运行器使用本机已安装 Edge 和 Codex bundled Playwright，不修改环境。真实服务数据会随查询时间变化；绵阳断言反映本批后端当前支持范围，后端若扩城应同步更新断言。

下一步交接：本批五项已完成。工作树仍保留开工前已有 AGENTS/docs/第十一批验收修改，不要混入提交，不要回退。后端支持绵阳属于协调者/后端范围；本轮前端已经可重试、如实显示失败。DSH 可按上述命令独立复核并自行维护启动文档。
