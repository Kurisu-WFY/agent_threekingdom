"""用实际stdio MCP检索新资料及原有景点资料；不调用远端模型。"""
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
    checks = [
        ('陈寿《表上诸葛氏集目录》何时上表，原文如何记载？', ['泰始十年', '二十四篇']),
        ('陈寿索米传闻有哪些争议？王鸣盛和顾农的观点是什么？', ['王鸣盛', '顾农']),
        ('陈寿国不置史如何理解？唐庚和姚莹有什么不同观点？', ['唐庚', '姚莹']),
        ('《华阳国志》陈寿传原文如何记载三国志成书？', ['华阳国志', '吳平後']),
        ('《晋书》陈寿传原文有哪些著作？古国志和益都耆旧传？', ['古国志五十篇', '益都耆旧传十篇']),
        ('《三国志》王平原文记载籍贯在哪里？', ['王平字子均']),
    ]
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as session:
            await session.initialize()
            for query, expected in checks:
                contexts, references, offset = [], [], 0
                for page in range(20):
                    response = await session.call_tool('retrieve_culture_knowledge', {'query': query, 'offset': offset, 'page_size': 5})
                    if response.isError:
                        raise AssertionError('MCP工具返回错误')
                    result = json.loads(response.content[0].text)
                    contexts.append(result['context'])
                    references.extend(result['references'])
                    if not result['has_more']:
                        break
                    if result['next_offset'] <= offset:
                        raise AssertionError('分页未前进')
                    offset = result['next_offset']
                else:
                    raise AssertionError('分页未结束')
                combined = '\n'.join(contexts) + json.dumps(references, ensure_ascii=False)
                if not all(word in combined for word in expected):
                    raise AssertionError('未返回必要原文或观点：' + query)
                print('真实MCP检索通过：' + query, flush=True)


if __name__ == '__main__':
    asyncio.run(verify())
