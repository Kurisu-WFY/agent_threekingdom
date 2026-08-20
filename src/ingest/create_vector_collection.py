import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from san_guo_core.settings import get_settings
from rag.vector_store import MilvusVectorStore


def main() -> None:
    settings = get_settings()
    store = MilvusVectorStore()
    store.create_collection(drop_existing=False)
    print(f"Milvus collection ready: {settings.milvus_collection}")
    print(f"Milvus uri: {settings.milvus_lite_uri}")
    print(f"Embedding dimension: {settings.embedding_dimension}")


if __name__ == "__main__":
    main()
