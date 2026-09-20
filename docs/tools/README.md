# docs/tools · 联调与验收小工具

> 这些脚本原先散在 `D:\DSH Workspace\.tmp-e2e\`（仓库外），队友**克隆下来拿不到**，所以移进仓库。
> **路径已改成相对本仓库**（脚本自己定位仓库根），换机器也不用改代码。
>
> 依赖：只用标准库（Python 3.11+），**不需要额外 pip 安装**；`.cjs` 那个需要 Node（仓库前端本来就要 Node）。

| 脚本 | 用途 | 用法 |
|---|---|---|
| `probe_api.py` | **接口全量探针**：`/health`、四条意图 + 多态字段、边界（缺 `message`→422、空串、`/sse`）、`/docs`、`/openapi.json`、CORS、静态资源 | `python docs/tools/probe_api.py --base http://localhost:8002` |
| `inspect_db.py` | **查看业务库**（SQLite）：表结构、行数、以及 `data_status`/票价等实际取值 —— 排查"数据到底存了什么" | `python docs/tools/inspect_db.py` |
| `measure_frontend.py` | **前端体积与请求数**：首屏脚本/样式/图片大小、运行期地图数据体积、最大文件排行 | `python docs/tools/measure_frontend.py` |
| `replay_frontend_map.cjs` | **不用浏览器回放地图逻辑**：用最小 DOM 桩加载真实 `travel-map.js`，喂实测 `/chat` 响应，打印地图状态与已定位点数 | `node docs/tools/replay_frontend_map.cjs docs/../frontend response.json` |

## 典型用法

```powershell
# 1) 后端接口全量自测（容器 8002，或你本地起的 8010/8011 都行）
python docs\tools\probe_api.py --base http://localhost:8002

# 2) 改完 data/** 或 seed 后，确认库里到底写进了什么
python docs\tools\inspect_db.py

# 3) 前端：量体积 / 看地图逻辑有没有退化
python docs\tools\measure_frontend.py
node docs\tools\replay_frontend_map.cjs frontend
```

`probe_api.py` 与 `inspect_db.py` 会把原始响应另存为 JSON（`--out` 指定目录，默认当前目录），方便贴进交接记录当证据。

## 说明

- 这些脚本**只读**，不改仓库、不改数据（`probe_api.py` 只发 GET/POST 查询请求）。
- 容器里跑的是哪份代码？用 `/health` + 下面这条确认：
  ```powershell
  & docker exec sanguo-latest-api sha256sum src/api.py frontend/index.html
  # 与仓库同名文件比对 sha256 是否一致
  ```
