from __future__ import annotations

import hashlib
import json
import math
from functools import lru_cache
from pathlib import Path

from san_guo_core.models import KnowledgeChunk
from san_guo_core.settings import get_settings

QUERY_PREFIX = "为这个句子生成表示以用于检索相关文章："


@lru_cache(maxsize=1)
def load_model(path: str, device: str):
    import torch
    from sentence_transformers import SentenceTransformer
    torch.set_num_threads(4)
    model = SentenceTransformer(path, device=device, local_files_only=True, trust_remote_code=False)
    model.max_seq_length = 512
    return model


class BGEVectorStore:
    def __init__(self, path: Path):
        s = get_settings()
        model_path = Path(s.embedding_model).resolve()
        if not model_path.is_dir():
            raise ValueError("BGE requires an existing local model directory")
        # Config and weight identity; original weights remain in their directory.
        fingerprint = hashlib.sha256()
        for name in ('config.json', '1_Pooling/config.json', 'tokenizer.json'):
            fingerprint.update((model_path / name).read_bytes())
        weights = model_path / 'pytorch_model.bin'
        stat = weights.stat()
        fingerprint.update(f'{stat.st_size}:{stat.st_mtime_ns}'.encode())
        dimension = json.loads((model_path / 'config.json').read_text())['hidden_size']
        if s.embedding_dimension != dimension:
            raise ValueError(f'BGE dimension must be {dimension}; rebuild into a separate index')
        self.path = Path(path)
        self.metadata = {'backend': 'bge', 'model_path': str(model_path), 'fingerprint': fingerprint.hexdigest(),
                         'dimension': dimension, 'normalized': True, 'query_prefix': QUERY_PREFIX}
        self.records = []
        self.settings = s
        if self.path.exists():
            data = json.loads(self.path.read_text(encoding='utf-8'))
            if not isinstance(data, dict) or data.get('embedding') != self.metadata:
                raise ValueError('Embedding identity mismatch: cannot mix BGE and legacy/hash indexes')
            self.records = data['records']
            if any(len(r['vector']) != dimension or not all(math.isfinite(v) for v in r['vector']) for r in self.records):
                raise ValueError('Invalid index vector dimension or non-finite values')

    @property
    def model(self):
        return load_model(self.metadata['model_path'], self.settings.embedding_device)

    def upsert(self, chunks, drop_existing=False):
        chunks = list(chunks)
        if not chunks:
            return
        # Check length rather than silently truncating source paragraphs.
        texts = [c.title + '\n' + c.content for c in chunks]
        for text in texts:
            if len(self.model.tokenizer.encode(text)) > 512:
                raise ValueError('Chunk exceeds BGE token limit; split before indexing')
        vectors = self.model.encode(texts, batch_size=self.settings.embedding_batch_size,
                                    normalize_embeddings=True, show_progress_bar=True).tolist()
        if len(vectors) != len(chunks) or any(
            len(v) != self.metadata['dimension'] or not all(math.isfinite(x) for x in v)
            for v in vectors
        ):
            raise ValueError('Encoder returned invalid vector count, dimension or values')
        existing = {} if drop_existing else {r['chunk']['id']: r for r in self.records}
        for chunk, vector in zip(chunks, vectors):
            existing[chunk.id] = {'chunk': chunk.model_dump(), 'vector': vector}
        self.records = list(existing.values())
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.building.json')
        temporary.write_text(json.dumps({'embedding': self.metadata, 'records': self.records}, ensure_ascii=False), encoding='utf-8')
        temporary.replace(self.path)

    def search(self, query, limit, min_score):
        if not self.records:
            return []
        import numpy as np
        vector = self.model.encode(QUERY_PREFIX + query, normalize_embeddings=True)
        matrix = np.asarray([r['vector'] for r in self.records], dtype=np.float32)
        scores = matrix @ vector
        return [{'chunk': KnowledgeChunk(**self.records[i]['chunk']), 'score': float(scores[i])}
                for i in scores.argsort()[::-1][:limit] if scores[i] >= min_score]

    def all_chunks(self):
        return [KnowledgeChunk(**r['chunk']) for r in self.records]
