"""通过真实标准输入输出协议验证工具发现与只读登录状态，不打印凭据。"""
from __future__ import annotations

import asyncio
from datetime import timedelta
import json
from pathlib import Path
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def payload(result) -> dict:
    if result.structuredContent is not None:
        return result.structuredContent
    for block in result.content:
        if block.type == "text":
            try:
                return json.loads(block.text)
            except (ValueError, TypeError):
                pass
    raise AssertionError("工具没有返回可解析的结果")


async def main() -> None:
    root = Path(__file__).resolve().parents[1]
    params = StdioServerParameters(command=sys.executable, args=[str(root / "src/xhs_readonly_mcp.py")], cwd=str(root))
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=90)) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("只读工具：", ", ".join(t.name for t in tools.tools))
            assert len(tools.tools) == 4
            assert not any("post" in t.name for t in tools.tools)
            result = await session.call_tool("check_xhs_connection", {})
            connection = payload(result)
            print("连接检测：", json.dumps(connection, ensure_ascii=False))
            assert not result.isError
            if connection.get("status") == "ok":
                result = await session.call_tool("search_travel_notes", {"keywords": "南充 万卷楼 攻略", "limit": 3})
                print("攻略搜索：", json.dumps(payload(result), ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
