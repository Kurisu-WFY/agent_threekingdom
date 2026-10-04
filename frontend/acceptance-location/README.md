# 浏览器定位补充验收 · 2026-10-05

执行协调者补充裁决，替代原 L3-3。基点 `dev / a41e2e6`；布局阶段与本补充合起来已完成本批前端工作单。只提交 frontend，不 push。

## 行为与逐条证据

| 要求 | 实施与证据 | 临时截图 |
| --- | --- | --- |
| 一处定位 | 仅活动表单出发地旁 `use-my-location`；道路仍用原 POI 搜索确认。浏览器断言一处按钮、无高德定位插件请求 | authorized.png |
| 成功 | 原生 navigator.geolocation，授权夹具填“我的位置（近似）”，精度49.2向上取整±50米；缺精度如实提示；单元夹具读取经纬度即报错 | authorized.png、authorized-chat.png |
| 失败 | 拒绝/失败/超时/不可用均显示“未取得定位，可手动填写出发地”，保留原文字、按钮可重试，手填仍可用 | denied.png、denied-chat.png |
| 无自动查询 | 八场景点击后页面新增网络请求均0，无自动方案/天气/道路/酒店。只读精度，不读/存/发坐标，无转换、无地图打点 | 上述截图配合请求断言 |
| 主动生成 | 授权成功后另行点生成，受控 SGTJourney.ask 捕获仅 origin 文字与现有需求字段，无经纬度/精度；未宣称真实后端回答 | 浏览器捕获断言 |
| 异步一致性 | 后续手填、超时、恢复保存方案都取消迟到定位；成功后恢复方案清旧精度；恢复通知不触发 input、不改保存方案状态 | restored / restored-success 页面夹具 |

固定说明逐字校验：

> 定位由浏览器在本机完成，不会向服务器发送你的位置；生成方案时仅将“我的位置（近似）”作为出发地文字随需求发送。

原224个静态id全部保留且唯一，新增4个定位id；既有诚实文案不改。定位成功派发原有 input 事件以使旧活动请求失效，不提交表单。

## 实跑范围

- 26/26 JS语法、26/26 *.test.cjs 全绿（原布局25项 + 新定位1项）；旧出发地标签断言按显式 for/id 关联调整，未删测试。
- 定位10项浏览器检查：原生API授权位置夹具、拒绝、失败、超时、手填竞态、在途恢复、成功后恢复、不可用、4资源SHA、Console/Page零报错。各场景1920×1080聊天开关无横向溢出。
- 布局脚本10项全绿：八视图×聊天开关16组、n8-n9/n10-n17、真实常驻地图/一次SDK、224id、各块布局；Console/Page errors=[]。布局6个已跟踪资源 + 本批新增browser-location.js，合计7资源本地=HTTP。
- 独立只读审查：定位迟到覆盖方案（Important）及残留精度（Minor）均先RED→GREEN修复，真实页面受控回调独立复验关闭；最终无Critical/Important/Minor。独立26JS/24项不写材料测试全绿。
- 授权是 Playwright 明确位置/权限夹具；错误及竞态是回调夹具；未申请或取得实际设备位置。为准确测定位副作用，定位专用脚本在隔离context中抑制进入planner的既有底图初始化；真实地图/瓦片由布局脚本单独实跑。
- 授权/拒绝聊天双态稳定截图已目视确认；截图和JSON验收后清理，只保留README与复验脚本。

## 本批4资源SHA256

| 文件 | 本地与HTTP一致的SHA256 |
| --- | --- |
| index.html | 209e4a548db9d4c907f718842ecd1df575208b8c13caf3372b6f870fc3a696d7 |
| styles.css | 21f98d1918bed5c2d9054e107062819b39c62eff3fb7ad0de0ad5607ee03a8a0 |
| browser-location.js | f3fe9223f947533f648f7657cfdb7b54c67cbfd090877f1d10593c259b619b29 |
| travel-modules.js | 7dcfca8ea46a08a2e2b137a3fa1c9bed9f44a4a2032e1ef3f3e880cb8a9afee0 |

## 复验

```powershell
node frontend/acceptance-layout/verify-all.cjs
node frontend/acceptance-layout/browser-checks.cjs
node frontend/acceptance-location/browser-checks.cjs
```

使用现有localhost:8002/msedge，不启停服务。脚本生成临时截图/JSON，目视检查后清理两个本批验收目录的PNG/JSON。原天气/酒店测试资料恢复原字节；不清理他人audit或旧批次资料。
