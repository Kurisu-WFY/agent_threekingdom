from rag.chunking import chunk_by_knowledge_unit


def normalize_document(title: str, text: str, source: str) -> list[dict]:
    chunks = []
    for index, content in enumerate(chunk_by_knowledge_unit(text), start=1):
        chunks.append(
            {
                "id": f"{title}_{index}",
                "title": title,
                "content": content,
                "source": source,
                "source_level": "C",
                "knowledge_type": "text",
            }
        )
    return chunks

