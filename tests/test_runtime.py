from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from api import ChatRequest
from san_guo_core.models import KnowledgeChunk
from rag.vector_store import LocalVectorStore


class RuntimeTests(unittest.TestCase):
    def test_package_exports_do_not_eager_load_backend_failures(self) -> None:
        from agent import AnswerChain, TravelAgentService, route_intent
        from rag import get_vector_store
        from tools import get_route_detail, list_route_templates, recommend_route

        self.assertTrue(AnswerChain)
        self.assertTrue(TravelAgentService)
        self.assertEqual(route_intent("test").intent, "culture_qa")
        self.assertTrue(get_vector_store())
        self.assertTrue(get_route_detail)
        self.assertTrue(list_route_templates)
        self.assertTrue(recommend_route)

    def test_chat_request_history_is_not_shared(self) -> None:
        a = ChatRequest(message="a")
        b = ChatRequest(message="b")
        a.history.append({"role": "user", "content": "x"})
        self.assertEqual(b.history, [])

    def test_local_vector_store_drop_existing_replaces_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            store = LocalVectorStore(Path(tmpdir) / "vector_store.json")
            first = KnowledgeChunk(
                id="first",
                title="A",
                content="one",
                knowledge_type="text",
                source="test",
                source_level="C",
            )
            second = KnowledgeChunk(
                id="second",
                title="B",
                content="two",
                knowledge_type="text",
                source="test",
                source_level="C",
            )
            store.upsert([first])
            store.upsert([second], drop_existing=True)
            ids = [record["chunk"]["id"] for record in store.records]
            self.assertEqual(ids, ["second"])

    def test_vector_store_falls_back_when_milvus_startup_fails(self) -> None:
        from rag.vector_store import LocalVectorStore, get_vector_store

        with patch("rag.vector_store.MilvusVectorStore", side_effect=OSError("locked")):
            store = get_vector_store()

        self.assertIsInstance(store, LocalVectorStore)


if __name__ == "__main__":
    unittest.main()
