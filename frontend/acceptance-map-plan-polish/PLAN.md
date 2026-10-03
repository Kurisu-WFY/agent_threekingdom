# 第十二批：行旅地图与活动计划

Spec: 本轮用户工作单。起点 066b15b，沿用当前 live 挂载分支；仅 frontend/**，1920×1080，不 push/merge。交接位于本目录，依本轮禁止修改 docs 的要求不更新仓库外启动文档。

设计：沿用现有纸色、墨绿、朱红与宋体；地图交接按钮采用墨绿实底。活动计划采用左侧两列紧凑字段、右侧天气查询的有界双栏；八项字段不再横向铺满。天气三日并排，图标为原创纸墨山景 SVG，来源与原始说明折叠收纳。

- [x] RED：新增 map-plan-polish.test.cjs，在真实 Chromium 上覆盖五项视觉/交互要求；weather-outlook-core.test.cjs 覆盖北京时间、三日缺口、整数温度、WMO 状况及每日 AQI 峰值；travel-api.test.cjs 覆盖补查接口与合法坐标边界。
- [x] 地图：首页说明各压缩成一行；轮廓/坐标来源及虚线非导航边界保留；map-plan 移入 map-tools，保持原带入逻辑。
- [x] 活动表单：index.html + styles.css 改双栏、表单两列；必填/选填、人数范围与原提交行为保留。
- [x] 内联天气：天气区移入 planner-view；旧 travel 导航别名指向活动计划天气区，不再独立页面；手动查询，出发日期不筛掉今天起三天。
- [x] 天气数据：保留现有 TravelApi 同源查询与城市定位；只在服务成功并返回合法 WGS84 城市坐标后，用同一 Open-Meteo 服务补 weather_code 和 hourly us_aqi（3 天、Asia/Shanghai）；独立失败保留已取得数据，不捏造代码/AQI。每日 AQI 显示返回小时的峰值，注明 US 标准/模型预报。
- [x] 原创 weather-icons.svg：晴、多云、阴、雨、雪、雾、雷雨、未知；标签与图标来自已返回的 WMO 状况，不用降雨概率推断晴雨。
- [x] GREEN：原测试同步更新独立天气页约定，其余前批回归保留；真实浏览器验证南充、广元成功与绵阳失败，额外验证补查失败、旧请求隔离、缺日期/字段、边界日期与表单合法性。
- [x] 收尾：全部 JS syntax、全部 *.test.cjs、资源 SHA256、1920×1080 无溢出/产品 Console 报错、只读独立复核；只提交本轮路径，证据与交接入本目录。

初始诊断：同源 /api/travel/travel-info 返回绵阳 unavailable、南充与广元 ok；现有后端不返回 weather_code/AQI。官方天气与空气补查分别实测 HTTP 200。不修改后端支持城市清单，也不对失败城市自动套用其他城市天气。

官方字段依据：[天气及 WMO 状况代码](https://open-meteo.com/en/docs)、[空气质量 hourly us_aqi / 时区](https://open-meteo.com/en/docs/air-quality-api)。

验收需特别检查：模型 AQI 与 PM 浓度不混淆；零度/零 AQI 与缺失区分；旧缓存日期不替代今天；查询中更换城市旧响应不覆盖；聊天打开时双栏不溢出；现有第十一批验收 artifacts 已有修改，测试后恢复开工时字节，不纳入本轮提交。
