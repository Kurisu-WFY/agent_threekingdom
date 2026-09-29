"""首批采用保守入库策略：保留来源，暂缓需文字识别或内容不完整的文献。"""
from __future__ import annotations
import argparse
import hashlib
import json
import logging
import re
import unicodedata
from pathlib import Path
from pypdf import PdfReader
from san_guo_core.models import KnowledgeChunk
from rag.vector_store import get_vector_store

# 内容已在源文件夹审查时核验，不自动提升来源可信等级。
APPROVED = {
    '文质辨洽': ('culture', '读史'),
    '《三国志》和陈寿的史识': ('research', '读史'),
    '史学家陈寿争议问题考辨': ('research', '寻源'),
    '“陈寿故里碑”引发的两个问题': ('dispute', '寻源'),
    '《陈寿故里碑》与陈寿故里': ('dispute', '寻源'),
    '陈寿《三国志》正统观新论': ('research', '读史'),
    '陈寿《三国志》的史识与史德': ('research', '读史'),
    '从《三国志》史评看陈寿的政治思想': ('research', '读史'),
    '《三国志》民族书写': ('research', '读史'),
    '基于FAHP': ('tourism_research', '传承'),
    '名人资源与旅游开发研究': ('tourism_research', '传承'),
    '四川三国文化旅游开发的战略思考': ('tourism_research', '传承'),
    '民族歌剧': ('modern_culture', '传承'),
}


def clean(text):
    text = unicodedata.normalize('NFKC', text).replace('\x82', '，')
    lines = []
    for line in text.splitlines():
        if re.search(r'中国知网|www\.cnki|DOI[:：]|E-?mail|电子信箱', line, re.I):
            continue
        if re.fullmatch(r'[\s\d—\-·|]+', line):
            continue
        lines.append(line.strip())
    text = '\n'.join(lines)
    text = re.sub(r'(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])', '', text)
    return re.sub(r'[ \t]+', ' ', text).strip()


def quality_issue(text):
    if len(text.strip()) < 80:
        return 'empty_or_scanned_page'
    if '\x00' in text or '\ufffd' in text:
        return 'broken_text_layer'
    if any('\u0e00' <= c <= '\u109f' for c in text):
        return 'garbled_font_encoding'
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--embed', action='store_true')
    args = parser.parse_args()
    logging.getLogger('pypdf').setLevel(logging.ERROR)
    args.output.mkdir(parents=True, exist_ok=True)
    chunks, manifest, seen = [], [], {}
    for path in sorted(args.folder.rglob('*.pdf')):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        row = {'file': str(path), 'sha256': digest, 'status': 'deferred', 'reason': '需要OCR/选章/去除同页他文/近重复审核', 'chunks': 0}
        manifest.append(row)
        if digest in seen:
            row.update(status='duplicate', reason=seen[digest])
            continue
        seen[digest] = path.name
        policy = next((v for prefix, v in APPROVED.items() if path.name.startswith(prefix)), None)
        if not policy:
            continue
        category, stage = policy
        row['category'] = category
        reader = PdfReader(path)
        row['pages'] = len(reader.pages)
        row['excluded_pages'] = []
        for page_number, page in enumerate(reader.pages, 1):
            raw = page.extract_text() or ''
            issue = quality_issue(raw)
            if issue:
                row['excluded_pages'].append({'page': page_number, 'reason': issue})
                continue
            text = clean(raw)
            # 参考文献用于追溯来源，不作为回答片段；原始 PDF 保持不变。
            text = re.split(r'参考文献|REFERENCES', text)[0]
            # 重叠切片限于同一页，避免跨页后来源页码错位。
            for offset in range(0, len(text), 300):
                content = text[offset:offset + 350].strip()
                if len(content) < 60 or len(re.findall(r'[\u4e00-\u9fff]', content)) / max(len(content), 1) < .35:
                    continue
                title = path.stem
                chunks.append(KnowledgeChunk(
                    id=f'teacher_{digest[:16]}_p{page_number}_{offset}', title=title,
                    content=content, knowledge_type='text', source=f'{title}，PDF第{page_number}页',
                    source_level='B' if category not in ('modern_culture', 'tourism_research') else 'C',
                    entities=[e for e in ['陈寿','三国志','南充','万卷楼','安汉','广安','诸葛亮'] if e in content],
                    narrative_stage=stage, category=category, claim_type='author_interpretation' if category!='modern_culture' else 'modern_adaptation',
                    document_id=digest, source_file=str(path), pdf_page=page_number,
                    extraction_status='text_extracted_not_fully_proofread',
                    risk_note='现代研究/报道，并非正史原文；作者观点需归属，争议须并列检索。提取未逐字人工校对；不作为实时旅游信息。',
                ))
                row['chunks'] += 1
        row.update(status='included' if row['chunks'] else 'deferred', reason='通过首批文本提取门槛；仍需史料与逐字校对')
        print(path.name, row['status'], row['chunks'], flush=True)
    (args.output / 'chunks.jsonl').write_text('\n'.join(c.model_dump_json() for c in chunks)+'\n', encoding='utf-8')
    (args.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Documents included={sum(r["status"]=="included" for r in manifest)}, chunks={len(chunks)}', flush=True)
    if args.embed:
        store = get_vector_store()
        if store.path.exists():
            raise FileExistsError('Use a fresh index path; existing index is never overwritten by this importer')
        store.upsert(chunks, drop_existing=True)
        print(f'Embedded {len(chunks)} chunks into {store.path}', flush=True)


if __name__ == '__main__':
    main()
