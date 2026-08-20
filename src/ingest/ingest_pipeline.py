import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from san_guo_core.settings import get_settings
from san_guo_core.models import KnowledgeChunk
from ingest.validate_sources import classify_source
from rag.chunking import chunk_by_knowledge_unit
from rag.vector_store import get_vector_store


def load_jsonl(path: Path) -> list[KnowledgeChunk]:
    chunks = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.strip():
            chunks.append(KnowledgeChunk(**json.loads(line)))
    return chunks


def load_text_file(path: Path) -> list[KnowledgeChunk]:
    source_level = classify_source(path.name)
    chunks = []
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    for index, content in enumerate(chunk_by_knowledge_unit(text), 1):
        chunks.append(
            KnowledgeChunk(
                id=f"{path.stem}_{index:04d}",
                title=path.stem,
                content=content,
                knowledge_type="text",
                source=str(path),
                source_level=source_level,
                risk_note="由纯文本自动切分生成，入库前建议人工校对实体、叙事阶段和可信等级。",
            )
        )
    return chunks


def collect_chunks(raw_dir: Path) -> list[KnowledgeChunk]:
    chunks: list[KnowledgeChunk] = []
    for path in raw_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix == ".jsonl":
            chunks.extend(load_jsonl(path))
        elif path.suffix.lower() in {".txt", ".md"}:
            chunks.extend(load_text_file(path))
    return chunks


def build_index() -> int:
    settings = get_settings()
    chunks = collect_chunks(settings.raw_dir)
    if not chunks:
        if settings.source_doc_path.exists():
            chunks = load_text_file(settings.source_doc_path)
        else:
            sample = Path("data/examples/knowledge_chunks.sample.jsonl")
            chunks = load_jsonl(sample)
    store = get_vector_store()
    store.upsert(chunks, drop_existing=True)
    return len(chunks)


if __name__ == "__main__":
    count = build_index()
    print(f"Indexed {count} chunks")
