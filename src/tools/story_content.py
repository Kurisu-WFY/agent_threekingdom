"""将审阅后的阅读章节对应到本机已入库文献，不生成虚构史实。"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from san_guo_core.settings import get_settings

CONTENT = Path(__file__).resolve().parents[2] / 'data/content/chenshou-book-history.json'


def document_catalog():
    """只认当前配置索引中的文献，不接受用户提供的任意文件路径。"""
    path = Path(get_settings().vector_store_path)
    return _catalog(str(path), path.stat().st_mtime_ns if path.is_file() else 0)


@lru_cache(maxsize=2)
def _catalog(path, modified):
    if not modified:
        return {}
    payload = json.loads(Path(path).read_text(encoding='utf-8'))
    documents = {}
    for record in payload.get('records', []):
        chunk = record.get('chunk', {})
        key = chunk.get('document_id')
        if key and chunk.get('source_file'):
            documents.setdefault(key, {'title': chunk.get('title'), 'path': chunk['source_file'], 'pages': set()})['pages'].add(chunk.get('pdf_page'))
    return documents


def get_story_content():
    payload = json.loads(CONTENT.read_text(encoding='utf-8'))
    documents = document_catalog()
    all_sources = []
    for chapter in payload['story']['chapters']:
        sources = []
        for ref in chapter.pop('references'):
            matches = [key for key in documents if key.startswith(ref['document_id'])]
            if len(matches) != 1 or ref['pdf_page'] not in documents[matches[0]]['pages']:
                continue
            key = matches[0]
            sources.append({**ref, 'document_id': key, 'data_status': 'maintained',
                            'source_url': f'/api/travel/sources/{key}/pdf#page={ref["pdf_page"]}',
                            'title': f'{ref["title"]} · PDF第{ref["pdf_page"]}页'})
        chapter.update(sources=sources, data_status='maintained', updated_at=payload['story']['updatedAt'])
        # 任一引用未解析时，不将该章作为可核验正文交给界面。
        if len(sources) < (2 if chapter['id'] == 'hometown-evidence' else 1):
            chapter['data_status'] = 'pending'
        chapter['dataStatus'] = chapter['data_status']
        chapter['updatedAt'] = chapter['updated_at']
        all_sources.extend(sources)
    payload['story']['sources'] = all_sources
    return {'status': 'ok', 'data': payload, 'message': '现代研究阅读章节；不是古代行走路线。'}
