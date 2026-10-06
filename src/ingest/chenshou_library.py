"""审核选段后增量嵌入陈寿资料库，不按目录等级盲目导入，不覆盖旧库。"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from rag.bge_store import BGEVectorStore
from san_guo_core.models import KnowledgeChunk
from san_guo_core.settings import get_settings

ROOT = Path('D:/QQ/陈寿三国志_资料库_20261006')
# 行号对应已检查的抓取文本；断言及文件校验不符即拒绝导入。
SELECTION = [
    ('A_正史/晋书_卷082_陈寿传_识典HY2499.txt', '《晋书》卷八十二·陈寿传（识典底本）', 12, 14, 'A', 'primary_source', '陈寿字承祚', '余文章传于世。', '编书与生平；含或云传闻'),
    ('A_杂史/华阳国志_卷11_陈寿条_midpage.txt', '《华阳国志》卷十一·陈寿传', 9, 9, 'A', 'primary_source', '陳壽字承祚', '大較如此。', '生平与三国志编纂；与晋书有异文'),
    ('A_三国志/诸葛亮传附_表上诸葛氏集目录_全文_万松浦卷71.txt', '陈寿《表上诸葛氏集目录》', 73, 103, 'A', 'primary_source', '◇', '（《蜀志·诸葛亮传》）', '整理诸葛亮集；泰始十年上表；不是三国志全书成书年月'),
    ('A_三国志/蜀书33_后主传_评曰_国不置史.txt', '《三国志》卷三十三·后主传评曰', 9, 9, 'A', 'primary_source', '评曰：后主', '优劣著矣。', '国不置史；陈寿评语'),
    ('A_三国志/sgz35ping.txt', '《三国志》卷三十五·诸葛亮传评曰', 6, 6, 'A', 'primary_source', '评曰：诸葛亮', '欤！', '陈寿评价诸葛亮；治政与将略'),
    ('A_清人考史/十七史商榷_卷39_陈寿史皆实录.txt', '王鸣盛《十七史商榷》卷三十九·陈寿史皆实录', 11, 17, 'B', 'research', '陈寿史皆实录', '况三国志乎？', '索米、史德及诸葛亮评价；清人考辨，非正史正文'),
    ('A_清人考史/廿二史札记_陈寿论诸葛亮.txt', '赵翼《廿二史札记》·陈寿论诸葛亮', 11, 11, 'B', 'research', '陈寿论诸葛亮陈寿传', '尽时人之器能也。', '评价诸葛亮；仅选该条，清人论断须归属赵翼'),
    ('A_清人考史/唐庚_唐先生文集_辨蜀不置史原文_北宋原著.txt', '唐庚《唐先生文集》·辨蜀不置史', 12, 13, 'B', 'research', '陳壽曰', '妄矣。', '国不置史；宋人考辨，不作为陈寿原话'),
    ('A_清人考史/康輶纪行_唐庚辨国不置史_姚莹按语.txt', '姚莹《康輶纪行》·蜀不置史按语', 8, 8, 'B', 'research', '余按：', '又憑何書之？', '国不置史；只选姚莹按语，前文严重乱码不入库'),
    ('A_目录/隋书_经籍志二_三国志著录与正史类叙.txt', '《隋书》卷三十三·经籍志三国志著录', 15, 15, 'A', 'primary_source', '及三国鼎峙', '以备正史。', '著录与体例；范颖写法为该抓取底本文字'),
    ('A_当代学术/顾农_史家陈寿的一大错误_博览群书2010-4_少数意见.txt', '顾农《史家陈寿的一大错误》', 43, 51, 'B', 'dispute', '《三国志》的作者陈寿', '没有理他。', '索米争议的一种现代观点；不能因无法否认便确证；人名缺字未校勘'),
]
EXCLUDED = {
    'A_目录/四库全书总目_卷45_三国志提要_粤本.txt': '实际抓取正文不含对应三国志提要，拒绝按文件名推定内容',
    '其他目录及未选文件': '同文重复、与本轮主题无关、全文未取得、乱码或抓取过程件；不代表永不可用',
    'B_演义': '本轮先补史实及争议问答；未将演义映射为历史证据',
}


def build_chunks(root: Path = ROOT):
    root = root.resolve()
    entries = {row['path']: row for row in json.loads((root / '资料库索引_机器可读.json').read_text(encoding='utf-8'))['entries']}
    chunks, manifest, seen = [], [], set()
    for relative, title, start, end, level, category, begin, finish, topic in SELECTION:
        path = (root / relative).resolve()
        if not path.is_relative_to(root):
            raise ValueError('资料路径越界')
        row = entries[relative]
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if digest != row['sha256'] or not row['usable'] or row['type'] in ('failed', 'unclassified'):
            raise ValueError(f'资料校验失败：{relative}')
        lines = raw.decode('utf-8-sig').splitlines()
        text = '\n'.join(lines[start - 1:end]).strip()
        if begin not in text or finish not in text:
            raise ValueError(f'选段边界失败：{relative}')
        text = begin + text.split(begin, 1)[1]
        text = text.split(finish, 1)[0] + finish
        if any(item in text for item in ('下载APP', '登录后阅读', '首页', '下一篇', '我要投稿')):
            raise ValueError('选段混入导航')
        canonical = re.sub(r'\s+', '', text)
        if canonical in seen:
            raise ValueError('同批正文重复')
        seen.add(canonical)
        url_match = re.search(r'https?://[^\s)]+', row['source_url'])
        if not url_match:
            raise ValueError('缺少真实来源网址')
        url = url_match.group(0)
        risk = ('用户提供网页抓取选段，未逐字对照影印底本；保留异体字及缺字，不暗改原文。'
                '原典有传闻或不同记载，来源等级不代表叙事均已确证；现代楼阁与全书成书地点不能由人物传记证明。'
                + topic + '。')
        if category != 'primary_source':
            risk += '本段为作者观点或后世辨析，须注明作者，不能当作陈寿正史定论。'
        docid = 'chenshou_web_' + hashlib.sha256((url + title).encode()).hexdigest()[:24]
        # 小标题来自审核主题，繁体正文保持原样；跨段小窗有重叠，来源指向整段真实行号。
        before = len(chunks)
        for offset in range(0, len(text), 210):
            content = text[offset:offset + 250]
            chunks.append(KnowledgeChunk(
                id=f'{docid}_{digest[:10]}_{offset}', title=f'{title} · {topic}', content=content,
                source=f'{title}；来源：{url}；抓取文件第{start}—{end}行，选段偏移{offset}',
                source_level=level, category=category, knowledge_type='text', narrative_stage='读史',
                entities=['陈寿', '三国志'] + [name for name in ('诸葛亮', '王鸣盛', '赵翼', '唐庚', '姚莹', '顾农', '谯周') if name in title + topic],
                risk_note=risk, claim_type='primary_record_with_hearsay_caveat' if category == 'primary_source' else 'attributed_argument',
                document_id=docid, source_file=str(path), extraction_status='reviewed_excerpt_not_fully_proofread',
            ))
        manifest.append({'path': relative, 'sha256': digest, 'source_url': url, 'title': title,
                         'original_grade': row['grade'], 'project_level': level, 'category': category,
                         'source_lines': [start, end], 'selected_text': text, 'topic': topic,
                         'chunks': len(chunks) - before})
    return chunks, manifest


def ingest(output: Path, root: Path = ROOT):
    previous = Path(get_settings().vector_store_path).resolve()
    output = output.resolve()
    if output == previous or output.exists():
        raise FileExistsError('仅允许不存在的新索引路径，旧库保留')
    previous_bytes = previous.read_bytes()
    old = json.loads(previous_bytes)
    store = BGEVectorStore(output)
    if store.metadata != old.get('embedding'):
        raise ValueError('新旧嵌入模型身份不一致')
    chunks, manifest = build_chunks(root)
    if {chunk.id for chunk in chunks} & {record['chunk']['id'] for record in old['records']}:
        raise ValueError('已有相同资料，拒绝重复导入')
    store.records = old['records'][:]
    store.upsert(chunks)
    current = json.loads(output.read_text(encoding='utf-8'))
    by_id = {row['chunk']['id']: row for row in current['records']}
    if previous.read_bytes() != previous_bytes or not all(by_id[row['chunk']['id']] == row for row in old['records']):
        raise ValueError('旧索引或旧记录变化，拒绝交付')
    report = {'previous_index': str(previous), 'new_index': str(output), 'old_records_unchanged': True,
              'previous_records': len(old['records']), 'added_records': len(chunks),
              'total_records': len(current['records']), 'selected_documents': len(manifest),
              'selected': manifest, 'excluded': EXCLUDED}
    (output.parent / 'chenshou-library-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return {key: value for key, value in report.items() if key not in ('selected', 'excluded')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='陈寿资料库审核选段增量嵌入')
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(ingest(args.output, args.root), ensure_ascii=False, indent=2), flush=True)
