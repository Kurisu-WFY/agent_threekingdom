# 南充出行草案（2026-09-28）

打开 http://127.0.0.1:8010/?v=outing#outing ，填写公共出发地点、半日/一日/两日、交通方式；选地点并生成。两日以北湖片区住宿候选为落脚点，住宿需自行确认。

## 已实现与边界

- REST GET `/api/travel/nanchong/catalog`、POST `/api/travel/nanchong/plan`；MCP `get_nanchong_travel_catalog`、`plan_nanchong_itinerary` 共用同一逻辑。
- 万卷楼、北湖公园两处地点，逐段去程、转场、返程/到住宿点的百度地图URI链接。链接免API Key，不代表服务器已取得路线、班次或耗时；点击后需要确认同名地点和入口。交通耗时仍未知，不宣称时间可行、最优路线或实时导航。
- 停留90/60分钟、餐饮休息30/60分钟是编辑安排，不是来源中的官方时长。两日草案较宽松，不是完整全城景区推荐。
- 北湖宾馆仅候选，公开页有名称地址；没有房价/空房接口，不代订。
- 用户自填住宿/餐饮/交通额度；门票未知，总价为空。半日餐饮按1个出行日额度算，超限只比较已知小计。
- 原有天气、空气、WGS84道路查询位于下方折叠区。聊天布局未变。
- 女娲回答原文跳转保留；只导入明确的城市、日期和受支持的结构化站点，不从模型散文推断坐标或预算。

## 女娲接入

重载 NuwaClaw 的 san-guo-travel-agent MCP，重新建立会话；工具总数应为13。无须另启 HTTP MCP。将以下规则补入平台系统提示词（本地文件不会自动发布到平台）：

> 南充市内实际出行规划，先确认出发公共地点、半日/一日/两日、交通方式、人数；调用 get_nanchong_travel_catalog 查看可用地点，调用 plan_nanchong_itinerary 生成草案。只使用返回的地点ID；预算参数仅填用户明确提供的额度，不编造报价。展示逐段地图链接、住宿候选、未知费用、未确认交通时间。不要把预算小计说成总价或宣称已预订。交通与开放时间未确认，不声称行程可行。前端用户点击“查看出行方案”进入出行页，再确认表单生成；不要假装散文自动变成已校验导航。

示例参数：`{"origin":"南充站","days":2,"mode":"transit","people":2,"rooms":1,"places":["wanjuanlou","beihu"],"hotel_per_room":200,"meals_per_person_day":60,"transport_total":100}`。

## 资料

- https://www.amap.com/place/B0331005E8 万卷楼名称、玉屏路6号；页面行政街道组合待核验，未写入精确入口坐标。
- https://ditu.amap.com/place/B033101SWG 北湖公园，文化路369号。
- https://hotels.ctrip.com/hotels/1808103.html 北湖宾馆，文化路301号；不采集评价/图片/实时价格。
- https://lbsyun.baidu.com/docs/webapi?title=mapadjustment/uri/helloworld 百度地图URI调起文档。

以上页面核对日2026-09-28，并不代表设施信息最后更新时间。地点资料为C级出行参考，不能支撑历史论证。
