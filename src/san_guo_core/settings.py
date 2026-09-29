from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "dev"
    amap_web_service_key: str | None = None
    data_dir: Path = Path("data")
    raw_dir: Path = Path("data/raw")
    processed_dir: Path = Path("data/processed")

    vector_backend: str = "milvus"
    embedding_backend: str = "hash"
    embedding_model: str = "BAAI/bge-large-zh-v1.5"
    embedding_dimension: int = Field(default=384, ge=1)
    embedding_device: str = "cpu"
    embedding_batch_size: int = Field(default=4, ge=1)
    vector_store_path: Path = Path("data/processed/vector_store.json")
    milvus_lite_uri: Path = Path("data/processed/milvus_lite.db")
    milvus_collection: str = "san_guo_culture_chunks"
    business_db_path: Path = Path("data/processed/business.sqlite3")
    source_doc_path: Path = Path("data/raw/source.md")
    redis_url: str = "redis://localhost:6379/0"

    llm_backend: str = "mock"
    llm_model: str = "deepseek-chat"
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    nuwax_base_url: str = "https://agent.nuwax.com"
    nuwax_api_key: str | None = None
    nuwax_agent_id: str = ""
    nuwax_sandbox_id: str = ""
    nuwax_timeout_seconds: int = Field(default=240, ge=10, le=600)

    recall_top_k: int = Field(default=30, ge=1)
    rerank_top_k: int = Field(default=8, ge=1)
    final_top_k: int = Field(default=5, ge=1)
    min_vector_score: float = Field(default=0.15, ge=0)
    min_rerank_score: float = Field(default=0.20, ge=0)
    min_recall_coverage: float = Field(default=0.55, ge=0, le=1)

    agent_platform_token: str | None = None
    agent_platform_base_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
