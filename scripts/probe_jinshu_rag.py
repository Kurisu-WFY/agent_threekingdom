"""通过真实标准输入输出MCP验证新增正史原文，不调用大模型或付费接口。"""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import timedelta

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def verify(index: Path):
    root = Path(__file__).resolve().parents[1]
    environment = dict(os.environ, PYTHONPATH=str(root / 'src'), PYTHONIOENCODING='utf-8',
                       VECTOR_STORE_PATH=str(index.resolve()), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1',
                       OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='4', MKL_NUM_THREADS='4')
    parameters = StdioServerParameters(command=sys.executable, args=['-B', str(root / 'src/mcp_stdio_server.py')], env=environment, cwd=str(root))
    results = []
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as session:
            print('开始MCP初始化', flush=True)
            await session.initialize()
            print('MCP初始化成功', flush=True)
            catalog = await session.list_tools()
            print('工具发现成功，开始检索', flush=True)
            assert any(tool.name == 'retrieve_culture_knowledge' for tool in catalog.tools)
            for query, expected in [
                ('《晋书》陈寿传原文：陈寿师从谁，籍贯是什么？', '师事同郡谯周'),
                ('《晋书》陈寿传原文如何记录撰诸葛亮集和三国志六十五篇？', '六十五篇'),
                ('《晋书》陈寿传原文：索米传闻是否以或云引出？', '或云丁仪'),
            ]:
                response = await session.call_tool('retrieve_culture_knowledge', {'query': query})
                assert not response.isError
                payload = json.loads(response.content[0].text)
                results.append({'query': query, 'expected_original_found': expected in payload['context'], **payload})
                (index.parent / 'jinshu-mcp-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
                assert expected in payload['context'], f'未召回预期原文：{query}'
                assert 'primary_source' in payload['context'] and '底本' in payload['context']
                print('真实MCP检索通过：' + query, flush=True)
    (index.parent / 'jinshu-mcp-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='新增陈寿传的真实MCP检索检查')
    parser.add_argument('index', type=Path)
    args = parser.parse_args()
    asyncio.run(verify(args.index))
