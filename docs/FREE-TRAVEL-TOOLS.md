# 免费出行工具（非商业 Demo）

无需新增密钥，不修改 .env。新增3个工具与原来的8个共用同一 MCP：

- `get_travel_weather(city, travel_date?)`：南充/阆中/广元7日预报、当前空气质量模型估计；不把空气数据冒充出行日期预报。
- `lookup_travel_city(city)`：经四川省过滤的城市中心WGS84坐标，不是景区入口。
- `get_road_route(...)`：已核验WGS84起终点，walking/driving；无实时路况、无公交班次、无实时票价。返回道路吸附点及其距输入点距离。

## 女娲使用

保留 NuwaClaw 配置中的现有 Python 与 `src/mcp_stdio_server.py` 路径。停用再启用 `san-guo-travel-agent`，让旧子进程退出并重新载入工具；随后新建会话。预期工具总数11个。

向智能体发送：

> 请实际调用 san-guo-travel-agent 的 get_travel_weather，查询南充未来天气和当前空气质量。请报告工具是否成功，区分模型预报与实测；列出数据日期、查询时间、来源。不要用其他日期代替我指定的日期。

建议追加到女娲系统提示词（本地文件不会自动发布到女娲）：

> 需要南充、阆中、广元天气时调用 get_travel_weather；地点定位调用 lookup_travel_city，但城市中心不能当作景区入口。仅在起终点WGS84坐标有可靠依据时调用 get_road_route，禁止编造坐标或混用高德/百度坐标。说明道路路线不含实时路况，天气为空/超出预报范围时如实告知。空气质量是当前模型估计而非景区监测实测。引用来源，不把工具未返回的票价、酒店房态或班次编造成事实。

## 前端

重启Web后端，现有行程的天气与交通查询通过 `/api/travel/travel-info` 展示预报与空气质量。保留现有布局。道路工具另有同源 POST `/api/travel/road-route`，本轮未加地图路线绘制或坐标输入面板。

## 公共服务边界

- Open-Meteo 免费端点仅限非商业用途、无可用性保证，需要来源署名：https://open-meteo.com/en/pricing
- 空气质量来源/模型：https://open-meteo.com/en/docs/air-quality-api
- FOSSGIS OSRM 至多每秒一次请求，无重度使用；需署名与修图链接：https://routing.openstreetmap.de/about.html
- 本机API与MCP通过临时目录共享SQLite缓存/限流，天气/空气/路线缓存30分钟，城市定位24小时，最多500条。时间字段是原查询时间，不冒充上游更新时间。
- 多机部署不能靠本机限流满足全应用限制，必须改为共享限流或自建服务。不要用于公开高流量商业产品。
- 请求发送城市/起终点坐标到外部服务，不要输入住址等敏感位置；不发送聊天记录或密钥。
- Nominatim景点搜索本机连续超时，未接入；现有库中待核验坐标不自动用于路线。
