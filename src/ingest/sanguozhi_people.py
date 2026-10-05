"""按景点关联人物补入可提取文字的《三国志》，保留PDF定位与版本风险。"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from rag.bge_store import BGEVectorStore
from san_guo_core.models import KnowledgeChunk
from san_guo_core.settings import get_settings

SOURCE = Path('E:/Download/三国志.pdf')
# 范围边界取自PDF真实原文；结束标记不进入当前人物段落。
SECTIONS = [
    ('先主传', 677, '先主姓刘', 691, '后主讳', ['刘备'], ['成都武侯祠', '昭化古城']),
    ('诸葛亮传', 700, '诸葛亮传', 712, '关张马黄赵传', ['诸葛亮'], ['成都武侯祠', '剑门关']),
    ('关张马黄赵传', 712, '关张马黄赵传', 719, '庞统法正传', ['关羽', '张飞', '马超', '黄忠', '赵云'], ['汉桓侯祠', '成都武侯祠']),
    ('庞统法正传', 719, '庞统法正传', 725, '许麋孙简伊秦传', ['庞统', '法正'], ['昭化古城', '成都武侯祠']),
    ('霍峻传段', 753, '霍峻字', 754, '王连字', ['霍峻', '霍弋'], ['昭化古城', '葭萌']),
    ('谯周传段', 767, '谯周字', 772, '郤正字', ['谯周'], ['万卷楼', '陈寿师承']),
    ('王平传段', 782, '王平字', 783, '张嶷字', ['王平'], ['鹤鸣山景区·王平墓']),
    ('姜维传段', 791, '姜维，字', 796, '邓张宗杨传', ['姜维'], ['剑门关', '昭化古城']),
    ('邓艾传段', 622, '邓艾字', 630, '钟会字', ['邓艾'], ['剑门关', '蜀汉灭亡']),
    ('黄权传段', 777, '黄权，字', 778, '李恢字', ['黄权'], ['昭化古城', '葭萌']),
]
RISK = ('用户提供的电子文本PDF，出版底本未核定，存在异体字和转录错误，未逐字校勘。'
        '保留原文和注的标记；注释、引书和传闻不能一概归为陈寿正文或已证事实。'
        '古代人物记载不证明现代墓址、祠庙、楼阁或景区位置；不提供实时旅游信息。')


def build_chunks(path: Path = SOURCE):
    import pymupdf
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    chunks, coverage = [], []
    with pymupdf.open(path) as document:
        for title, start, begin, finish, end, people, places in SECTIONS:
            pages = [(number, document[number - 1].get_text()) for number in range(start, finish + 1)]
            if begin not in pages[0][1] or end not in pages[-1][1]:
                raise ValueError(f'篇章边界未匹配：{title}，拒绝静默导入错误范围')
            pages[0] = (start, pages[0][1].split(begin, 1)[1])
            pages[0] = (start, begin + pages[0][1])
            pages[-1] = (finish, pages[-1][1].split(end, 1)[0])
            count_before = len(chunks)
            for number, raw in pages:
                content = re.sub(r'\s+', ' ', raw).strip()
                if not content:
                    continue
                # 不跨PDF页切分，附重叠文本，页码始终可回溯。
                for offset in range(0, len(content), 210):
                    excerpt = content[offset:offset + 250]
                    chunks.append(KnowledgeChunk(
                        id=f'sanguozhi_{digest[:16]}_{hashlib.sha256(title.encode()).hexdigest()[:8]}_p{number}_{offset}',
                        title=f'《三国志》{title} · PDF第{number}页', content=excerpt,
                        source=f'《三国志》{title}，用户电子文本PDF第{number}页（底本待校勘）',
                        source_level='A', knowledge_type='text', category='primary_source',
                        claim_type='primary_text_with_annotation_markers',
                        extraction_status='text_extracted_edition_unverified', risk_note=RISK,
                        document_id=digest, source_file=str(path.resolve()), pdf_page=number,
                        entities=people, period='汉末—三国', narrative_stage='读史',
                    ))
            coverage.append({'section': title, 'people': people, 'related_places': places,
                             'pdf_pages': [start, finish], 'chunks': len(chunks) - count_before})
    if len({chunk.id for chunk in chunks}) != len(chunks):
        raise ValueError('范围重叠造成重复片段，拒绝导入')
    return chunks, coverage


def ingest(output: Path):
    previous = Path(get_settings().vector_store_path).resolve()
    output = output.resolve()
    if output == previous or output.exists():
        raise FileExistsError('仅允许写入不存在的新索引，保留当前工作库')
    previous_bytes = previous.read_bytes()
    old = json.loads(previous_bytes)
    store = BGEVectorStore(output)
    if store.metadata != old.get('embedding'):
        raise ValueError('嵌入模型身份不一致')
    chunks, coverage = build_chunks()
    if {chunk.id for chunk in chunks} & {row['chunk']['id'] for row in old['records']}:
        raise ValueError('已有相同资料，拒绝重复入库')
    store.records = old['records'][:]
    store.upsert(chunks)
    current = json.loads(output.read_text(encoding='utf-8'))
    by_id = {row['chunk']['id']: row for row in current['records']}
    assert all(by_id[row['chunk']['id']] == row for row in old['records'])
    assert previous.read_bytes() == previous_bytes
    report = {'previous_index': str(previous), 'new_index': str(output),
              'previous_records': len(old['records']), 'added_records': len(chunks),
              'total_records': len(current['records']), 'old_records_unchanged': True,
              'source_sha256': chunks[0].document_id, 'coverage': coverage,
              'scanned_zhonghua_edition_embedded': False, 'risk_note': RISK}
    (output.parent / 'sanguozhi-ingest-report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='补充景点关联人物正史原文')
    parser.add_argument('--output', type=Path, required=True)
    print(json.dumps(ingest(parser.parse_args().output), ensure_ascii=False, indent=2), flush=True)
