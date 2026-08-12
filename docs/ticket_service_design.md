# 景区票务服务设计

## 先纠正一个前提

多数景区不会直接给个人开发者开放“官方票务 API”。真实项目里更常见的是：

1. 景区/文旅局提供官方接口或政务数据接口。
2. 景区使用第三方票务 SaaS，合作后获得接口。
3. 没有接口，运营后台人工维护票价、开放时间和购票链接。
4. 用搜索/抓取只做“发现官方页面”，不能直接把抓到的票价当最终事实。

因此本项目应把票务做成“数据源适配器”，而不是写死某个平台。

## 推荐架构

```text
用户问票价/路线预算
→ TicketToolRouter
→ OfficialApiAdapter
→ AdminTableAdapter
→ SearchOfficialPageAdapter
→ 结果标准化
→ 过期检查
→ 返回给 Agent
```

## 标准数据结构

```json
{
  "spot_id": "wanjuanlou",
  "spot_name": "万卷楼",
  "ticket_items": [
    {
      "name": "成人票",
      "price": 5,
      "currency": "CNY",
      "valid_date": "2026-08-09",
      "refund_policy": "以官方页面为准"
    }
  ],
  "open_time": "待核实",
  "booking_url": "https://official.example.com",
  "source_type": "official_api | admin_table | official_page | third_party",
  "source_url": "https://official.example.com",
  "updated_at": "2026-08-09T10:00:00+08:00",
  "confidence": "high | medium | low",
  "warnings": []
}
```

## 数据源优先级

1. `official_api`：景区、文旅局、官方票务系统接口。
2. `admin_table`：运营人员维护的数据表，必须有来源 URL 和更新时间。
3. `official_page`：官方页面抓取，需要 URL 白名单。
4. `third_party`：携程、去哪儿、美团等，只能作为价格参考或购票跳转，不宜作为“官方票价”。

## 过期策略

- 天气：超过 1 小时应重新查。
- 余票/火车票：超过 5 分钟应重新查。
- 景区票价：超过 7 天应提示“可能已变化”；节假日活动票价应当天核实。
- 开放时间/演出时间：超过 24 小时应提示核实。

## Agent 回答规则

- 有官方 API/官方页：可以说“官方信息显示”。
- 只有后台表：说“当前维护数据为”。
- 只有第三方平台：说“第三方平台显示”，不要说“官方票价”。
- 多源价格不一致：返回差异，建议以官方购票页为准。
- 无来源或过期：不报确定价格，只提示“需要实时核实”。

## 首期实现建议

Demo 阶段不要追求接携程。先做三件事：

1. 建 `spot_ticket_sources.json`，维护每个景区的官方购票页、咨询电话、更新时间。
2. 用百度/高德 MCP 查天气、POI 和路线。
3. 用 SerpApi/Fetch 只抓白名单官方页面，不抓第三方平台。

## 酒店费用怎么办

酒店价格受入住日期、周末、节假日、房型、入住人数、取消政策影响很大。早期 Demo 不抓实时酒店价格，只做预算档位估算。

推荐 MVP 做法：

```text
用户输入入住日期、退房日期、人数、预算档位、住宿偏好
→ 用百度/高德 MCP 查询目的地附近酒店 POI
→ 用人工维护的城市住宿预算档位估算费用
→ 标注来源、查询时间和不确定性
```

预算输出建议：

```text
经济型：按 P25 或最低可用样本估算
舒适型：按中位数估算
品质型：按 P75 或高评分样本估算
```

不纳入候选：

- `openbnb-org/mcp-server-airbnb`：虽然 star >= 100，但 Airbnb 已停止中国大陆境内房源业务，不适合南充、阆中、广元住宿预算。
- `stayingapi/hotel-api`：功能很贴近酒店实时价格，README 写明支持 Booking.com、Google Hotels 等统一 schema 和 native MCP，但 GitHub 只有 1 star，不符合当前筛选条件。
- `pulsemcp/mcp-servers` 的 `serpapi-hotels`：可以查 Google Hotels，但仓库只有 76 stars，不符合当前筛选条件。

真实业务建议：

1. Demo：用百度/高德 MCP 查酒店 POI，用人工维护的“南充/阆中/广元酒店预算档位表”估算费用。
2. 早期上线：对接高德/百度 POI 找酒店位置，酒店价格仍用后台维护档位。
3. 商业上线：接 OTA 酒店开放平台或供应商接口，否则无法保证可订、可退、实时价格。

Agent 必须提示：

- 酒店价格是实时波动价格。
- 展示的是预算估算，不是锁价。
- 实际价格以跳转平台或酒店官方页面为准。

## POI 是什么

POI 是 Point of Interest，中文通常叫“兴趣点”。在地图业务里，一个 POI 就是一个可被搜索、定位和展示的地点。

本项目常见 POI：

- 景区：万卷楼、剑门关、昭化古城
- 酒店：某某酒店、民宿、客栈
- 交通：火车站、汽车站、停车场
- 餐饮：餐馆、小吃店

百度/高德 MCP 查酒店 POI 的价值：

- 找到景区附近有哪些酒店
- 判断酒店离景点多远
- 判断是否适合步行、打车或自驾
- 生成“住哪里更方便”的建议

它不能稳定解决的问题：

- 实时房价
- 是否有房
- 是否可取消
- 是否含早
