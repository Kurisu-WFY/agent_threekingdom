from pathlib import Path
import json
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from ingest.teacher_pdfs import clean, quality_issue
from rag.bge_store import BGEVectorStore
from rag.vector_store import LocalVectorStore
from san_guo_core.models import KnowledgeChunk


class TeacherRagTests(unittest.TestCase):
    def test_disputed_sources_both_reach_context(self):
        from rag.hybrid_retriever import HybridRetriever
        from san_guo_core.models import RetrievalHit
        chunks = [KnowledgeChunk(id=str(i), title='陈寿故里', content='陈寿故里存在争议',
                  knowledge_type='text', source='论文', source_level='B',
                  category='dispute', document_id='a' if i < 6 else 'b') for i in range(7)]
        settings = SimpleNamespace(rerank_top_k=8, final_top_k=5, min_rerank_score=.2)
        store = SimpleNamespace(all_chunks=lambda: chunks)
        with patch('rag.hybrid_retriever.get_settings', return_value=settings), \
             patch('rag.hybrid_retriever.get_vector_store', return_value=store):
            retriever = HybridRetriever()
        hits = [RetrievalHit(chunk=c, vector_score=.9) for c in chunks[:6]]
        with patch.object(retriever, '_vector_search', return_value=hits), \
             patch.object(retriever, '_lexical_search', return_value=[]):
            result, _ = retriever.retrieve('陈寿故里')
        self.assertEqual({h.chunk.document_id for h in result}, {'a', 'b'})

    def test_quality_gate(self):
        self.assertEqual(quality_issue(''), 'empty_or_scanned_page')
        self.assertEqual(quality_issue('陈寿' * 100 + '\x00'), 'broken_text_layer')
        self.assertEqual(quality_issue('陈寿' * 100 + '\u0e01'), 'garbled_font_encoding')
        self.assertIsNone(quality_issue('陈寿' * 100))
        self.assertEqual(clean('陈 寿\n三 国 志'), '陈寿三国志')

    def test_provenance_roundtrip(self):
        chunk = KnowledgeChunk(id='x', title='论文', content='观点', knowledge_type='text',
                               source='论文，PDF第2页', source_level='B', pdf_page=2,
                               category='dispute', claim_type='author_interpretation')
        self.assertEqual(KnowledgeChunk.model_validate_json(chunk.model_dump_json()), chunk)

    def test_incompatible_indexes_rejected_without_loading_model(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / '1_Pooling').mkdir()
            (root / 'config.json').write_text('{"hidden_size": 1024}')
            (root / '1_Pooling/config.json').write_text('{}')
            (root / 'tokenizer.json').write_text('{}')
            (root / 'pytorch_model.bin').write_bytes(b'test')
            index = root / 'index.json'
            settings = SimpleNamespace(embedding_model=str(root), embedding_dimension=1024,
                                       embedding_device='cpu', embedding_batch_size=4)
            with patch('rag.bge_store.get_settings', return_value=settings):
                store = BGEVectorStore(index)
                index.write_text('[]')
                with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                    BGEVectorStore(index)
                index.write_text(json.dumps({'embedding': store.metadata, 'records': [{'vector': [1]}]}))
                with self.assertRaisesRegex(ValueError, 'dimension'):
                    BGEVectorStore(index)
                with self.assertRaisesRegex(ValueError, 'Hash backend'):
                    LocalVectorStore(index)
                settings.embedding_dimension = 384
                with self.assertRaisesRegex(ValueError, 'dimension must be'):
                    BGEVectorStore(index)
