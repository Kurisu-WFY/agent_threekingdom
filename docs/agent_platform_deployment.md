# Agent 平台接入说明

## 前提审查

你提到的平台是 `https://agent.nuwax.com/agent/33290972`。我不能直接看到你的后台配置和 token 权限，因此以下是通用接入方案，不声称已在你的账号里验证。

需要你确认：

- 平台是否支持 MCP SSE 地址。
- 平台是否支持本地命令式 MCP，如 `npx -y xxx`。
- 平台给你的 token 是平台 API token，还是某个模型供应商 token。
- 平台是否允许外部 Agent 调用你本地电脑的服务。如果不允许，本地 MCP 需要部署到服务器。

## token 怎么用

不要把 token 写进代码或提交到仓库。放到 `.env`：

```env
AGENT_PLATFORM_TOKEN=你的平台token
AGENT_PLATFORM_BASE_URL=https://agent.nuwax.com
LLM_API_KEY=你的模型token
LLM_BASE_URL=模型base_url
```

代码里只通过环境变量读取：

```python
from config import get_settings

settings = get_settings()
token = settings.agent_platform_token
```

## 本项目 MCP 服务

启动：

```bash
python src/mcp_server.py
```

默认：

```text
http://0.0.0.0:8000/sse
http://0.0.0.0:8000/messages
```

如果 Nuwax 支持远程 MCP，就在平台工具配置里填：

```text
MCP SSE URL: http://你的服务器IP:8000/sse
```

如果只是本地演示，可用内网穿透或部署到云服务器。不要把本机 `localhost` 地址直接填到云端平台，云端平台访问不到你的电脑。

## 平台编排建议

```text
用户问题
→ Nuwax Agent 意图判断
→ 文化问答：调用本项目 retrieve_culture_knowledge / answer_travel_question
→ 火车：调用 12306-mcp
→ 天气/POI：调用百度或高德 MCP
→ 酒店预算：调用本项目 estimate_hotel_budget
→ 景区票价：调用本项目 get_spot_ticket
→ 汇总回答，并标注来源/更新时间/不确定性
```

## 风险

- token 泄露会导致额度被刷或数据泄露。
- 平台 token 和模型 token 不是一回事，不要混用。
- MCP 服务暴露公网后要做鉴权或 IP 白名单。
- 免费/开源 MCP 可能因上游接口变动失效。
- 酒店预算表是估算，不代表实时可订价。

