"""核对人物补库边界、原文溯源及不把景区关联当古代地点证据。"""
import re
import pymupdf
from ingest.sanguozhi_people import build_chunks, SOURCE


def test_page_provenance():
    chunks, coverage = build_chunks()
    with pymupdf.open(SOURCE) as document:
        for chunk in chunks:
            page = re.sub(r'\s+', ' ', document[chunk.pdf_page - 1].get_text()).strip()
            assert chunk.content in page
            assert chunk.source_level == 'A' and '未逐字校勘' in chunk.risk_note
            assert '不证明现代墓址' in chunk.risk_note
    assert len({chunk.id for chunk in chunks}) == len(chunks)
    assert len(coverage) == 10


def test_people_coverage():
    chunks, coverage = build_chunks()
    people = {name for section in coverage for name in section['people']}
    assert {'谯周', '王平', '霍峻', '张飞', '刘备', '诸葛亮', '姜维', '邓艾'} <= people
    text = '\n'.join(chunk.content for chunk in chunks)
    assert '王平字子均' in text and '留峻守葭萌城' in text and '谯周字允南' in text
    assert all('中华书局' not in chunk.source for chunk in chunks)
