"""三国旅游 MCP 服务的本地标准输入输出入口。

适用于可直接启动本地命令的 MCP 客户端，例如 Windows 版女娲客户端。
与 mcp_server.py 不同，此入口不开放网络端口，
而是通过标准输入和标准输出传输协议消息。
"""

import asyncio

from mcp.server.stdio import stdio_server

# 导入共用服务，确保流式 HTTP 与标准输入输出客户端使用同一套工具。
from mcp_server import server


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    # Windows数值库在协议读写线程启动前初始化，避免首次检索时才加载原生依赖。
    from san_guo_core.settings import get_settings
    settings = get_settings()
    if settings.embedding_backend.lower() == 'bge':
        from rag.bge_store import BGEVectorStore
        BGEVectorStore(settings.vector_store_path).model
    asyncio.run(main())
