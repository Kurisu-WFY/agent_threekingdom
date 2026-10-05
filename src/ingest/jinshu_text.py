"""把用户提供的陈寿传原文加入独立BGE索引，原索引与译文均保持原样。"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from san_guo_core.models import KnowledgeChunk
from san_guo_core.settings import get_settings
from rag.bge_store import BGEVectorStore

SOURCE = Path(__file__).resolve().parents[2] / 'data/raw/primary_sources/晋书_陈寿传_用户提供.txt'
RISK = ('用户提供《晋书》卷八十二陈寿传转录，未注明底本或页码，未逐字校勘；'
        '正史文献等级不等于每条叙事均为已证事实。索米段以“或云”开头，是传闻记录，'
        '须与现代研究并列，不能断言陈寿索米。译文不作为原文证据；不证明万卷楼为全书成书地点。')
TOPICS = ['籍贯与师承', '编撰三国志与诸葛亮集：六十五篇', '索米传闻与史评争议',
          '仕途与荐举', '谯周告诫与卒年', '范頵请录陈寿遗书']


def build_chunks(path: Path = SOURCE) -> list[KnowledgeChunk]:
    text = path.read_text(encoding='utf-8')
    original = text.split('【原文】', 1)[1].split('【译文】', 1)[0].strip()
    digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
    chunks = []
    for paragraph, content in enumerate(original.splitlines(), 1):
        content = content.strip()
        if not content:
            continue
        # 不跨段切分；长段重叠保留上下文。短传闻段完整保留“或云”。
        for offset in range(0, len(content), 220):
            section = content[offset:offset + 260]
            chunks.append(KnowledgeChunk(
                id=f'jinshu_{digest[:16]}_paragraph{paragraph}_{offset}',
                title=f'《晋书》卷八十二·陈寿传（原文第{paragraph}段·{TOPICS[paragraph - 1]}）',
                content=section, knowledge_type='text', source=f'《晋书》卷八十二·陈寿传，用户转录原文第{paragraph}段',
                source_level='A', narrative_stage='读史', period='蜀汉—西晋',
                entities=[name for name in ['陈寿', '谯周', '张华', '诸葛亮', '三国志', '丁仪', '丁廙', '荀勖', '杜预', '范頵', '安汉'] if name in content] + [TOPICS[paragraph - 1]],
                category='primary_source', claim_type='hearsay_record' if '或云' in content else 'primary_record',
                source_file=str(path.resolve()), document_id=digest,
                extraction_status='user_transcription_edition_unverified', risk_note=RISK,
            ))
    return chunks


def ingest(output: Path) -> dict:
    previous = Path(get_settings().vector_store_path)
    output = output.resolve()
    if output == previous.resolve() or output.exists():
        raise FileExistsError('必须指定不存在的新索引路径；不覆盖旧库。')
    previous_bytes = previous.read_bytes()
    old = json.loads(previous_bytes)
    store = BGEVectorStore(output)
    if old.get('embedding') != store.metadata:
        raise ValueError('新旧模型身份不一致，不能复制旧向量。')
    store.records = old['records'][:]
    chunks = build_chunks()
    existing_ids = {record['chunk']['id'] for record in old['records']}
    if any(chunk.id in existing_ids for chunk in chunks):
        raise ValueError('当前索引已包含这份原文，不重复替换既有记录。')
    store.upsert(chunks, drop_existing=False)
    current = json.loads(output.read_text(encoding='utf-8'))
    by_id = {record['chunk']['id']: record for record in current['records']}
    assert all(by_id[record['chunk']['id']] == record for record in old['records']), '旧记录发生变化'
    assert previous.read_bytes() == previous_bytes, '旧索引发生变化'
    report = {'previous_index': str(previous), 'new_index': str(output),
              'previous_records': len(old['records']), 'added_records': len(chunks),
              'total_records': len(current['records']), 'original_index_unchanged': True,
              'translation_embedded': False, 'source_file': str(SOURCE),
              'source_sha256': chunks[0].document_id, 'edition_status': 'user_transcription_edition_unverified'}
    (output.parent / 'jinshu-ingest-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='陈寿传原文保留来源的增量嵌入')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(ingest(args.output), ensure_ascii=False, indent=2), flush=True)
