"""本机真实stdio协议验证核查工具；不调用远端模型或交易服务。"""
import asyncio
import json
import os
import sys
from datetime import timedelta
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify():
    root = Path(__file__).resolve().parents[1]
    environment = dict(os.environ, PYTHONPATH=str(root / 'src'), PYTHONIOENCODING='utf-8',
                       HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1',
                       OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='4', MKL_NUM_THREADS='4')
    parameters = StdioServerParameters(command=sys.executable, args=['-B', str(root / 'src/mcp_stdio_server.py')],
                                      env=environment, cwd=str(root))
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as session:
            await session.initialize()
            names = {tool.name for tool in (await session.list_tools()).tools}
            assert {'review_culture_answer', 'review_travel_plan'} <= names
            response = await session.call_tool('review_culture_answer',
                {'query': '陈寿故里碑有哪些争议？', 'draft': '故里碑证明陈寿出生在广安。蔡东洲。'})
            assert not response.isError
            data = json.loads(response.content[0].text)
            assert data['references'] and data['status'] == 'needs_revision'
            assert 'overstated_birthplace' in {issue['code'] for issue in data['issues']}
            print('真实知识库与MCP：故里碑不当断言检出；实际出处返回。')
            response = await session.call_tool('review_travel_plan',
                {'plan': {'segments': [{'minutes': 270}], 'costs': [210]},
                 'available_minutes': 240, 'budget_limit': 200})
            assert not response.isError
            data = json.loads(response.content[0].text)
            assert data['status'] == 'needs_revision' and len(data['issues']) == 2
            print('真实MCP：时间超限、费用超限均检出。')


if __name__ == '__main__':
    asyncio.run(verify())
