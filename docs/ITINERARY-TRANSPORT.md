# 行程中的交通时间

南充行程规划的网页接口和 MCP 工具共用同一套高德查询逻辑，不再只生成地图跳转地址。

## 使用方法

配置 `AMAP_WEB_SERVICE_KEY` 后调用 `plan_nanchong_itinerary`，提供出发地点和 `mode`（公交 `transit`、驾车 `driving`、步行 `walking`）。两个目的地的高德地点 ID 来自现有地图目录。

起点搜索仅自动接受唯一同名地点。多个校区、入口或模糊匹配会返回候选；通过 `search_amap_places` 确认后，传入 `origin_poi_id`。两日方案还会解析候选宾馆，无法唯一匹配时保留该路段缺口。

## 返回字段

- 每段 `minutes`：高德预计秒数向上取整的分钟；空值不代表零分钟。
- `data_status`：`amap_estimate` 为已查询的估计；`needs_confirmation` 需要确认地点；`unavailable` 未取得有效耗时；`same_place` 表示同一个高德地点。
- 每段 `url`：查询成功后指向项目高德出行页，携带起终点 ID 与交通方式；未查询成功时保留原名称地图链接。
- 每日 `transport_minutes`、`total_minutes`、`remaining_minutes`：只有全部路段有耗时时才给出完整合计。
- `known_transport_minutes`、`unknown_leg_count`、`minimum_total_minutes`：保留部分查询的结果，不把缺项算成零。
- `time_feasible`：时间预算判断；有缺口且已知部分未超时则为空。已知部分已经超时则为 false。

总时间为交通 + 编辑建议的游览时间 + 餐饮休息。半日预算240分钟，一日480分钟，两日分别计算；这不是营业时段判断、实时公交到站或未来路况保证。程序采用每段第一条有效耗时方案，不宣称完成全局路线最优化。出行日期仍保留在请求中，高德当前查询不代表该日期的班次。

## 部署生效

重启网页后端；女娲客户端停用再启用本地 MCP 并新建会话。平台系统提示词同步 `prompts/nuwax_agent_system_prompt.md`；网页请求自动使用仓库用户提示词。无需手动另开 stdio 服务。

此工具仅覆盖南充既有双景点目录。跨城或其他景点需先确认高德地点 ID，再逐段使用 `get_amap_route`，由智能体按相同规则汇总，不用城市中心代替具体目的地。
