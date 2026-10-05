"""真实MCP分页检索与出处覆盖检查，仅使用本机知识库。"""
import asyncio
import json
import os
import sys
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from san_guo_core.settings import get_settings


async def verify():
    root = Path(__file__).resolve().parents[1]
    environment = dict(os.environ, PYTHONPATH=str(root / 'src'), PYTHONIOENCODING='utf-8',
                       HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1',
                       OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='4', MKL_NUM_THREADS='4')
    parameters = StdioServerParameters(command=sys.executable, args=['-B', str(root / 'src/mcp_stdio_server.py')],
                                      env=environment, cwd=str(root))
    results = []
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=120)) as session:
            await session.initialize()
            for query, expected in [
                ('陈寿故里碑有哪些争议？请结合原典和相关论文说明。', ['蔡东洲', '刘敏']),
                ('《晋书》陈寿传原文如何记录编撰三国志六十五篇？', ['六十五篇']),
                ('《三国志》王平原文：王平字什么，籍贯在哪里？', ['王平字子均']),
                ('《三国志》张飞原文：从阆中出兵伐吴的记载？', ['阆中']),
            ]:
                pages, references, contexts, offset = [], [], [], 0
                while True:
                    response = await session.call_tool('retrieve_culture_knowledge', {'query': query, 'offset': offset, 'page_size': 3})
                    assert not response.isError
                    payload = json.loads(response.content[0].text)
                    pages.append(payload)
                    references.extend(payload['references'])
                    contexts.append(payload['context'])
                    if not payload['has_more']:
                        break
                    assert payload['next_offset'] > offset
                    offset = payload['next_offset']
                assert len({ref['document_id'] for ref in references}) == len(references)
                combined = '\n'.join(contexts) + json.dumps(references, ensure_ascii=False)
                assert all(text in combined for text in expected), f'未返回必要依据：{query}'
                results.append({'query': query, 'references': references, 'pages': pages, 'passed': True})
                print('分页与出处覆盖通过：' + query, flush=True)
                print('实际文献：' + '；'.join(ref['title'] for ref in references), flush=True)
    output = Path(get_settings().vector_store_path).parent / 'document-evidence-check.json'
    output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    asyncio.run(verify())
