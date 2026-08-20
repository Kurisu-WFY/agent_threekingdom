from __future__ import annotations

from importlib import import_module
from typing import Any


__all__ = ["HybridRetriever", "format_context", "get_vector_store"]

_EXPORTS = {
    "HybridRetriever": (".hybrid_retriever", "HybridRetriever"),
    "format_context": (".hybrid_retriever", "format_context"),
    "get_vector_store": (".vector_store", "get_vector_store"),
}


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module 'rag' has no attribute {name!r}")
    module_name, attribute_name = _EXPORTS[name]
    value = getattr(import_module(module_name, __name__), attribute_name)
    globals()[name] = value
    return value
