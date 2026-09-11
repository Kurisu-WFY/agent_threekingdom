# 旅游模块接口交接（前端提案，后端尚未实现）

本轮只做前端，未修改 src、数据库或部署。现有 `/chat` 与 `/health` 保持原协议。

## 接入开关

`travel-api.js` 集中处理网络请求，默认 `config.enabled: false`，不会请求以下预留地址，而是返回 `unavailable`。同伴实现接口后将开关设为 true，并按实际路由调整 `baseUrl`（默认 `/api/travel`）。不在浏览器写模型密钥或数据库凭据。

前端脚本加载顺序：app.js → travel-api.js → travel-modules.js。无需依赖安装或打包。

## 通用返回

HTTP 200，JSON：`{ "status": "ok|empty|unavailable", "message": "用户可读信息", "data": {} }`。

- ok：提供下表结构的数据。empty：接口可用但无匹配结果。unavailable：能力未接入/暂不可用，data 可为 null。
- 非 2xx、超时（15 秒）、JSON 不合法显示错误，可再次点击重试。网络失败不会伪装成成功数据。
- 空数组显示无数据状态。
- 时间使用带时区的 ISO 8601；金额单位 CNY 元，未知金额用 null，不用 0。
- data_status：sample / maintained / live / pending / stale。每个含价格、时间或动态信息的记录需携带 updated_at 与 sources。
- sources 数组元素：`{ "title": "来源名称", "source_url": "https://...", "source_level": "A|B|C" }`。前端仅允许 http/https 来源链接。C 级不用于史实结论；来源分级由后端/资料维护人确定。

## 请求及响应 data

| 方法与地址 | 请求 | data |
|---|---|---|
| GET /spots?city=南充 | city 查询参数（URL编码） | `{ "spots": [{ "id":"...", "name":"...", "description":"...", "data_status":"maintained", "updated_at":"...", "sources":[] }] }` |
| POST /plans/preview | 下方出行条件对象 | `{ "title":"方案名称", "data_status":"maintained", "updated_at":"...", "days":[{"day":1,"stops":[{"name":"站点","stay_minutes":60,"note":"游览提醒"}]}], "sources":[] }` |
| POST /budget/estimate | 同一出行条件对象 | `{ "items":[{"label":"住宿","amount":null,"basis":"2间房×1晚；价格待接入","data_status":"pending","updated_at":null,"sources":[]}] }` |
| POST /travel-info | 同一出行条件对象 | `{ "items":[{"title":"天气/交通","summary":"查询结果","data_status":"live","updated_at":"...","sources":[]}] }` |

出行条件示例（字段名固定；数量为数字）：

```json
{
  "city": "南充",
  "date": "2026-10-01",
  "days": 2,
  "people": 2,
  "group": "朋友同行",
  "transport": "公共交通",
  "hotel_tier": "舒适型",
  "rooms": 1,
  "notes": "少走路"
}
```

天数 1–14，人数和房间数 1–50；后端仍须自行验证。当前住宿晚数按 days-1 展示，后端应明确预算 basis，不能默认每人一间房。交通/门票未提供时金额为 null，前端不计算完整旅行总价。

## 前端独立可用的部分

- 目的地选择、地图快捷入口、行程条件填写、按天草稿、调整条件。
- disabled 模式下生成的是明确标为“站点待接入”的草稿，绝不虚构景区、票价或天气。收到 empty 不生成假路线；收到错误保留原方案。
- 方案保存到当前浏览器 localStorage，键 `sanguo.travel-plans.v1`，最多20份；不是数据库保存，也不代表跨设备同步。复制采用剪贴板 API，失败提示手动复制。
- 来源组件用于景区、行程、预算、出行结果，无来源显示待核验。现有文化问答来源接入仍需另与 `/chat` 响应协议对齐。
- 更换目的地或当前方案时，旧请求结果不覆盖新选择；按钮等待时禁用。

## 验收

默认关闭接口：目的地/预算/出行显示待接入，表单可生成每日空站点草稿、保存、刷新后打开、复制。

开启接口：分别提供 ok、empty、unavailable、非2xx、非法JSON与超时响应；核对数据状态、来源链接、费用缺失项及重试。后端不可在 ok 里省略 spots/days/items。
