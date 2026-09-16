"""Local stdio entry point for the San Guo travel MCP server.

Use this when an MCP client can start a local command directly (for example,
the Windows NuwaClaw client).  Unlike ``mcp_server.py``, this entry point does
not open a network port: protocol messages travel through stdin/stdout.
"""

import asyncio

from mcp.server.stdio import stdio_server

# Importing the shared server preserves the exact same seven tools for both
# Streamable HTTP and stdio clients.
from mcp_server import server


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
