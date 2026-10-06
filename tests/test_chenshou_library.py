"""审核入库边界、哈希、来源分层与导航排除；不加载嵌入模型。"""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ingest.chenshou_library import build_chunks


class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.content = 'SOURCE: https://example.test/book\n导航\n陈寿原文或云。结束。\n下一篇\n'
        (self.root / 'source.txt').write_text(self.content, encoding='utf-8')
        self.entry = {'path': 'source.txt', 'sha256': hashlib.sha256((self.root / 'source.txt').read_bytes()).hexdigest(),
                      'usable': True, 'type': 'scholarship', 'grade': 'A', 'source_url': 'https://example.test/book'}
        self.save_index()
        self.selection = [('source.txt', '作者考辨', 3, 3, 'B', 'research', '陈寿', '结束。', '索米争议')]
        self.patcher = patch('ingest.chenshou_library.SELECTION', self.selection)
        self.patcher.start()

    def save_index(self):
        (self.root / '资料库索引_机器可读.json').write_text(json.dumps({'entries': [self.entry]}), encoding='utf-8')

    def tearDown(self):
        self.patcher.stop()
        self.tmp.cleanup()

    def test_only_body_and_project_grade(self):
        chunks, manifest = build_chunks(self.root)
        self.assertEqual(chunks[0].content, '陈寿原文或云。结束。')
        self.assertEqual(chunks[0].source_level, 'B')
        self.assertEqual(chunks[0].category, 'research')
        self.assertIn('https://example.test/book', chunks[0].source)
        self.assertIsNone(chunks[0].pdf_page)
        self.assertEqual(manifest[0]['original_grade'], 'A')

    def test_changed_bytes_rejected(self):
        (self.root / 'source.txt').write_text(self.content + '修改', encoding='utf-8')
        with self.assertRaises(ValueError):
            build_chunks(self.root)

    def test_failed_row_rejected(self):
        self.entry['usable'] = False
        self.save_index()
        with self.assertRaises(ValueError):
            build_chunks(self.root)

    def test_missing_boundary_rejected(self):
        self.selection[0] = ('source.txt', '考辨', 2, 2, 'B', 'research', '陈寿', '结束。', '索米')
        with self.assertRaises(ValueError):
            build_chunks(self.root)


if __name__ == '__main__':
    unittest.main()
