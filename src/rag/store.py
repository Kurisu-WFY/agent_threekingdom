from __future__ import annotations

try:
    from .vector_store import (
        LocalVectorStore,
        MilvusVectorStore,
        get_vector_store,
    )
except ImportError:
    from vector_store import LocalVectorStore, MilvusVectorStore, get_vector_store


__all__ = ["LocalVectorStore", "MilvusVectorStore", "get_vector_store"]
