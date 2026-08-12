import json
from pathlib import Path

from pymilvus import DataType, MilvusClient

from config import get_settings
from domain import KnowledgeChunk
from rag.embeddings import HashEmbeddingModel


class LocalVectorStore:
    def __init__(self, path: Path):
        self.path = path
        self.embedding_model = HashEmbeddingModel()
        self.records: list[dict] = []
        self.load()

    def load(self) -> None:
        if self.path.exists():
            self.records = json.loads(self.path.read_text(encoding="utf-8"))

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.records, ensure_ascii=False, indent=2), encoding="utf-8")

    def upsert(self, chunks: list[KnowledgeChunk]) -> None:
        existing = {record["chunk"]["id"]: record for record in self.records}
        for chunk in chunks:
            embedding_text = chunk.title + "\n" + chunk.content + "\n" + " ".join(chunk.entities)
            existing[chunk.id] = {
                "chunk": chunk.model_dump(),
                "vector": self.embedding_model.embed(embedding_text),
            }
        self.records = list(existing.values())
        self.save()

    def all_chunks(self) -> list[KnowledgeChunk]:
        return [KnowledgeChunk(**record["chunk"]) for record in self.records]


class MilvusVectorStore:
    def __init__(self):
        self.settings = get_settings()
        self.uri = str(self.settings.milvus_lite_uri)
        Path(self.uri).parent.mkdir(parents=True, exist_ok=True)
        self.collection_name = self.settings.milvus_collection
        self.embedding_model = HashEmbeddingModel(dimension=self.settings.embedding_dimension)
        self.client = MilvusClient(uri=self.uri)

    def create_collection(self, drop_existing: bool = False) -> None:
        if self.collection_name in self.client.list_collections():
            if not drop_existing:
                return
            self.client.drop_collection(self.collection_name)

        schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=False)
        schema.add_field(field_name="id", datatype=DataType.VARCHAR, is_primary=True, max_length=256)
        schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=self.settings.embedding_dimension)
        schema.add_field(field_name="content", datatype=DataType.VARCHAR, max_length=8192)
        schema.add_field(field_name="title", datatype=DataType.VARCHAR, max_length=512)
        schema.add_field(field_name="metadata", datatype=DataType.JSON)

        index_params = MilvusClient.prepare_index_params()
        index_params.add_index(field_name="vector", index_type="AUTOINDEX", metric_type="COSINE")

        self.client.create_collection(
            collection_name=self.collection_name,
            schema=schema,
            index_params=index_params,
        )

    def upsert(self, chunks: list[KnowledgeChunk], drop_existing: bool = False) -> None:
        self.create_collection(drop_existing=drop_existing)
        if not chunks:
            return
        ids = [chunk.id for chunk in chunks]
        try:
            self.client.delete(collection_name=self.collection_name, ids=ids)
        except Exception:
            pass
        rows = []
        for chunk in chunks:
            embedding_text = chunk.title + "\n" + chunk.content + "\n" + " ".join(chunk.entities)
            rows.append(
                {
                    "id": chunk.id,
                    "vector": self.embedding_model.embed(embedding_text),
                    "content": chunk.content,
                    "title": chunk.title,
                    "metadata": chunk.model_dump(),
                }
            )
        self.client.insert(collection_name=self.collection_name, data=rows)

    def search(self, query: str, limit: int, min_score: float) -> list[dict]:
        self.create_collection()
        if not self.client.get_collection_stats(self.collection_name).get("row_count"):
            return []
        self.client.load_collection(collection_name=self.collection_name)
        query_vector = self.embedding_model.embed(query)
        results = self.client.search(
            collection_name=self.collection_name,
            data=[query_vector],
            anns_field="vector",
            limit=limit,
            output_fields=["content", "title", "metadata"],
            search_params={"metric_type": "COSINE"},
        )
        hits = []
        for item in results[0]:
            score = float(item.get("distance", 0) or 0)
            if score < min_score:
                continue
            entity = item.get("entity", {})
            metadata = entity.get("metadata") or {}
            hits.append({"chunk": KnowledgeChunk(**metadata), "score": score})
        return hits

    def all_chunks(self) -> list[KnowledgeChunk]:
        self.create_collection()
        stats = self.client.get_collection_stats(self.collection_name)
        row_count = int(stats.get("row_count", 0) or 0)
        if row_count == 0:
            return []
        self.client.load_collection(collection_name=self.collection_name)
        rows = self.client.query(
            collection_name=self.collection_name,
            filter="",
            output_fields=["metadata"],
            limit=row_count,
        )
        return [KnowledgeChunk(**row["metadata"]) for row in rows]


def get_vector_store():
    settings = get_settings()
    if settings.vector_backend.lower() == "milvus":
        return MilvusVectorStore()
    return LocalVectorStore(settings.vector_store_path)
