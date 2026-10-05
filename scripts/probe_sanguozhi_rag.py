"""以真实标准输入输出MCP检索验证景点人物补库，不调用大模型。"""
import argparse
import asyncio
import json
import os
import sys
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify(index: Path):
    root = Path(__file__).resolve().parents[1]
    environment = dict(os.environ, PYTHONPATH=str(root / 'src'), PYTHONIOENCODING='utf-8',
                       VECTOR_STORE_PATH=str(index.resolve()), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1',
                       OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='4', MKL_NUM_THREADS='4')
    parameters = StdioServerParameters(command=sys.executable, args=['-B', str(root / 'src/mcp_stdio_server.py')],
                                      env=environment, cwd=str(root))
    checks = [
        ('《三国志》王平原文：王平字什么，籍贯在哪里？', '王平字子均'),
        ('《三国志》霍峻原文：谁留守葭萌城，他如何应对杨帛？', '留峻守葭萌城'),
        ('《三国志》谯周原文：谯周字什么，籍贯在哪里？', '谯周字允南'),
        ('《三国志》姜维原文：姜维退还守剑阁的记载是什么？', '剑阁'),
        ('《三国志》张飞原文：张飞领巴西太守，从阆中出兵伐吴的记载？', '阆中'),
    ]
    results = []
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as session:
            await session.initialize()
            for query, expected in checks:
                response = await session.call_tool('retrieve_culture_knowledge', {'query': query})
                payload = json.loads(response.content[0].text)
                found = not response.isError and expected in payload.get('context', '')
                results.append({'query': query, 'expected_found': found, **payload})
                (index.parent / 'sanguozhi-mcp-check.json').write_text(
                    json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
                print(('通过：' if found else '未通过：') + query, flush=True)
            assert all(item['expected_found'] for item in results), '部分原文未召回，请检查报告'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='景点人物补库的真实MCP检索检查')
    parser.add_argument('index', type=Path)
    asyncio.run(verify(parser.parse_args().index))
