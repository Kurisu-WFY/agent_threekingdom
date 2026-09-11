from typing import Literal
from pydantic import BaseModel, Field


SourceLevel = Literal["A", "B", "C"]
NarrativeStage = Literal["寻源", "读史", "探迹", "传承", "未分类"]


class KnowledgeChunk(BaseModel):
    id: str
    title: str
    content: str
    knowledge_type: Literal["person", "event", "place", "text", "comparison", "route", "service"]
    entities: list[str] = Field(default_factory=list)
    location: str = ""
    period: str = ""
    narrative_stage: NarrativeStage = "未分类"
    audience: list[str] = Field(default_factory=list)
    source: str
    source_level: SourceLevel
    risk_note: str = ""
    version: str = "v1"


class RetrievalHit(BaseModel):
    chunk: KnowledgeChunk
    vector_score: float = 0.0
    lexical_score: float = 0.0
    source_score: float = 0.0
    rerank_score: float = 0.0
    matched_query: str = ""
    recall_warnings: list[str] = Field(default_factory=list)


class RecallReport(BaseModel):
    query: str
    total_candidates: int
    final_hits: int
    coverage: float
    missing_entities: list[str]
    warnings: list[str]
    passed: bool
