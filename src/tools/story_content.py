"""将审阅后的阅读章节对应到本机已入库文献，不生成虚构史实。"""
from __future__ import annotations

import json
import hashlib
from functools import lru_cache
from pathlib import Path
from san_guo_core.settings import get_settings

CONTENT = Path(__file__).resolve().parents[2] / 'data/content/chenshou-book-history.json'


def document_catalog():
    """只认索引文献与摘要核验过的补充清单，不接受任意文件路径；补充展示不等于向量入库。"""
    path = Path(get_settings().vector_store_path)
    return _catalog(str(path), path.stat().st_mtime_ns if path.is_file() else 0, CONTENT.stat().st_mtime_ns)


@lru_cache(maxsize=2)
def _catalog(path, modified, content_modified):
    if not modified:
        return {}
    payload = json.loads(Path(path).read_text(encoding='utf-8'))
    documents = {}
    for record in payload.get('records', []):
        chunk = record.get('chunk', {})
        key = chunk.get('document_id')
        if key and chunk.get('source_file'):
            documents.setdefault(key, {'title': chunk.get('title'), 'path': chunk['source_file'], 'pages': set()})['pages'].add(chunk.get('pdf_page'))
    # 精选正文可引用尚未向量化的PDF，但只从已有可信目录读取清单中的文件并核对摘要。
    roots = {Path(document['path']).parent for document in documents.values()}
    for item in json.loads(CONTENT.read_text(encoding='utf-8')).get('supplemental_documents', []):
        filename = item['filename']
        if Path(filename).name != filename or not filename.endswith('.pdf'):
            continue
        for root in roots:
            candidate = root / filename
            if not candidate.is_file() or hashlib.sha256(candidate.read_bytes()).hexdigest() != item['document_id']:
                continue
            from pypdf import PdfReader
            try:
                pages = len(PdfReader(str(candidate)).pages)
            except Exception:
                continue
            documents[item['document_id']] = {'title': item['title'], 'path': str(candidate), 'pages': set(range(1, pages + 1))}
            break
    return documents


def get_story_content():
    payload = json.loads(CONTENT.read_text(encoding='utf-8'))
    payload.pop('supplemental_documents', None)
    documents = document_catalog()
    all_sources = []
    def resolve(record):
        references = record.pop('references', [])
        sources = []
        for ref in references:
            matches = [key for key in documents if key.startswith(ref['document_id'])]
            if len(matches) != 1 or ref['pdf_page'] not in documents[matches[0]]['pages']:
                continue
            key = matches[0]
            sources.append({**ref, 'document_id': key, 'data_status': 'maintained',
                            'source_url': f'/api/travel/sources/{key}/pdf#page={ref["pdf_page"]}',
                            'title': f'{ref["title"]} · PDF第{ref["pdf_page"]}页'})
        record.update(sources=sources, data_status='maintained' if references and len(sources) == len(references) else 'pending',
                      updated_at=payload['story']['updatedAt'])
        record['dataStatus'] = record['data_status']
        record['updatedAt'] = record['updated_at']
        all_sources.extend(sources)
    for chapter in payload['story']['chapters']:
        resolve(chapter)
        for field in ('compilation', 'relationships', 'history', 'romance', 'differences'):
            if isinstance(chapter.get(field), dict):
                resolve(chapter[field])
        for field in ('disputes', 'inferences'):
            for record in chapter.get(field, []):
                resolve(record)
    for place in payload['places']:
        if isinstance(place.get('overview'), dict):
            resolve(place['overview'])
    payload['story']['sources'] = all_sources
    return {'status': 'ok', 'data': payload, 'message': '现代研究阅读章节；不是古代行走路线。'}
