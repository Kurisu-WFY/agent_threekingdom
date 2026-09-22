# 女娲智能体接入网页（2026-09-21）

## 已接通的代码路径

网页普通对话 → 同源 `/chat/stream` → 后端 `NuwaxClient` → 女娲会话 API。
女娲能否调用本机 MCP，仍取决于平台执行会话选中的电脑、客户端在线状态和 MCP 配置。

- API Key 只留在后端。浏览器保存随机会话标识，不接触平台会话数字 ID。
- 同一对话继续使用原会话；新建对话独立。流式显示回答、平台执行进度，并保留失败/重试状态。
- 景区列表等 `/api/travel/*` 不变。带 `route_preferences` 的规划表单仍走原结构化路线接口，不把模型自然语言冒充地图节点。
- MCP 的 `answer_travel_question` 保留原本地调用链，不套用女娲会话适配器，避免 Agent → MCP → 同一 Agent 递归。

## 本机配置与启动

在仓库根 `.env` 配置；不要把 Key 发到聊天或提交 Git：

```dotenv
NUWAX_BASE_URL=https://agent.nuwax.com
NUWAX_AGENT_ID=33298303
NUWAX_API_KEY=替换为有权调用该智能体的API密钥
NUWAX_SANDBOX_ID=替换为平台实际的数字电脑ID
NUWAX_TIMEOUT_SECONDS=240
```

`NUWAX_BASE_URL` 不是 `/app/33298303` 页面地址。`NUWAX_SANDBOX_ID` 不是智能体 ID、电脑显示名称、个人连接密钥或 `NUWAX_SAVED_KEY`。不能从“我的电脑4132”名称推断 ID 为 4132。
若不知道数字 ID，可暂时留空；此时不保证平台自动选中本机。非数字值会被忽略并显示告警。

本机现有 Python 已装依赖，PowerShell 从仓库根启动：

```powershell
Set-Location D:\agent_threekingdom
& 'C:\Program Files\Python312\python.exe' -B -m uvicorn api:app --host 127.0.0.1 --port 8010 --app-dir D:\agent_threekingdom\src
```

已有 8010 服务时不要重复启动。修改 `.env` 后重启对应后端进程，浏览器新建对话；不要重置 Docker 或删除数据。
打开 http://127.0.0.1:8010/ ，进入“与蜀汉对话”。使用本机 NuwaClaw + stdio MCP 时，无需另开 HTTP MCP 8000 服务。

## 当前验收结果与下一步

### 2026-09-22 实测更新（覆盖下方昨日离线结论）

- 启动本机 8010 API 和 `E:\nuwaxclaw\NuwaClaw\NuwaClaw.exe` 后，简单真实问答返回“连接成功”。没有修改 `.env` 或平台配置。
- 从真实网页输入并发送南充景点查询，页面显示万卷楼、王平墓和人工样例数据说明；平台 PROCESSING 记录包含 `san-guo-travel-agent__list_scenic_spots` FINISHED。无浏览器 mock。
- 经网页使用的同源 `/chat/stream` 请求文化检索，平台记录先 FAILED 后 FINISHED；智能体报告首次超时、重试后 `total_candidates=63`、`final_hits=5`、`passed=true`。回答列出蔡东洲 p1、刘敏 p3、杨小平 p2/p6/p7。此处命中数/页码来自平台回答，未通过本适配器暴露原始 MCP result 逐字段核对，不能等同全文事实校验。
- 当前默认电脑绑定能调用本地 MCP；数字 sandboxId **不是当前运行成功的必要条件**。无效值仍被忽略并告警；如果今后换电脑或多电脑使用，需核实实际绑定。
- 用户可保持 NuwaClaw 在线，在 http://127.0.0.1:8010/ 直接提问。不需再启动 Docker。
- 已知遗留：RAG 冷启动可能超时；平台返回的自定义过程标签/Markdown 表格目前以安全文本显示，且多次 PROCESSING 事件会重复显示进度。正文可读与调用成功已验证，但富文本排版和事件去重尚待优化。

### 2026-09-21 历史记录

- 26 项 Python 回归、16 组前端回归通过，覆盖会话隔离、非法 ID、流式分块、中文 UTF-8、LF/CRLF、超时/未完成响应等。
- 真实网页请求已到平台；平台返回“智能体客户端已离线”，页面显示失败与重试按钮。**尚未验证本次网页经 API 调用本机 MCP 成功。**
- 本次检查没有发现运行中的 NuwaClaw 进程；本机配置的电脑 ID 仍非数字。需要用户打开并登录客户端，确认“我的电脑”在线及本地 MCP 测试通过，并确认 API 使用的电脑。
- 上线后先发“只回复连接成功，不调用工具”；再要求实际调用 `list_scenic_spots(city="南充")`；最后检索“陈寿故里碑有哪些争议”，核对来源和 PDF 页码。以实际平台工具执行记录为准，不以模型说“已调用”作为证据。
- BGE 首次启动可能较慢。超时后先查平台是否仍在执行，避免连续重试堆积任务。

## 边界

这是本机单进程联调版本。会话映射在后端内存保留最多 24 小时、256 个；重启后需新建对话，网页刷新不恢复对话。多 worker/多用户部署需要共享会话存储、用户鉴权、限流和收窄 CORS，当前只监听 127.0.0.1，不应直接暴露公网。
`/health` 的“已配置”不等于已验证在线；平台返回的 PROCESSING 名称是执行进度，不保证每条都是 MCP 调用。模型回答中的来源/票价仍需核验。
