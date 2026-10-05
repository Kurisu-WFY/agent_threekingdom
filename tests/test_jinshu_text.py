"""校验用户原文与译文分层，不伪造页码或移除传闻限定。"""
from ingest.jinshu_text import build_chunks, SOURCE
from tools.story_content import document_catalog


def test_original_only():
    chunks = build_chunks()
    original = SOURCE.read_text(encoding='utf-8').split('【原文】', 1)[1].split('【译文】', 1)[0]
    assert chunks and all(c.content in original for c in chunks)
    assert all(c.source_level == 'A' and c.pdf_page is None for c in chunks)
    assert all(c.category == 'primary_source' and '底本' in c.risk_note for c in chunks)
    assert all('丁廣' not in c.content and '范醾' not in c.content for c in chunks)
    assert any('六十五篇' in c.content for c in chunks)


def test_hearsay_retains_qualifier():
    chunks = [c for c in build_chunks() if c.claim_type == 'hearsay_record']
    assert chunks and all('或云' in c.content for c in chunks)
    assert all('不能断言' in c.risk_note for c in chunks)


def test_text_not_served_as_pdf():
    assert build_chunks()[0].document_id not in document_catalog()
