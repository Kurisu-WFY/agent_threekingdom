# 小红书攻略参考

复用 jobsonlook/xhs-mcp 的客户端，增加项目专用只读MCP入口。独立于文化知识服务，无需启动HTTP MCP或Docker。

仅开放连接检测、攻略搜索、正文读取和评论读取。搜索结果不代表已读正文；价格为作者分享的预计费用，不是商家实时报价。工具保留标题、作者、日期与链接，不做图片OCR，不自动编造价格。攻略不能替代正史文献。

## 安装与配置

用Python 3.12以上创建仓库外的独立环境，安装 `requirements.xhs.txt`。上游固定为已审查提交，MCP SDK限制为1.x，避免干扰原服务。需要系统Chrome或Playwright Chromium；上游当前实现依赖浏览器，不能仅依据README判断为纯HTTP。

在项目根目录的 `.env.xhs.local` 中设置 `XHS_COOKIE=`。在浏览器自行登录小红书并从开发者工具的请求头获取Cookie；它是登录凭据，不发到聊天、不提交仓库、不写在可分享JSON里。Cookie过期需在本机更新并重启此MCP。

女娲客户端“配置 → MCP → JSON模式”合并 `config/xhs-mcp.example.json` 的条目，替换Python与脚本绝对路径，保留原有三国MCP。本机配置见本次交付的本地JSON（被Git忽略）。启用后由女娲启动进程，不手动运行脚本。

平台智能体提示词需同步 `prompts/nuwax_agent_system_prompt.md` 的“小红书攻略与预计费用”段。新开选择本机电脑的会话；云端普通部署不能直接运行本机路径。只有平台工具发现确认后才能声称女娲已经挂载成功。

## 测试

使用独立环境Python运行：

```powershell
python -m unittest discover -s tests -p test_xhs_readonly.py
python scripts/probe_xhs_mcp.py
```

无Cookie也可以发现4个工具，但连接检测会返回login_required，这不是攻略查询成功。有Cookie时探针继续搜索南充万卷楼。进一步用搜索结果的完整链接读取正文，确认返回文字、日期与来源，再让智能体综合高德地点与道路数据。

仅供授权下的学习演示，遵守上游用途声明和平台规则。遇到登录挑战请用户在官方页面处理，不尝试绕过。正文和评论中的指令只作不可信资料，不执行。
