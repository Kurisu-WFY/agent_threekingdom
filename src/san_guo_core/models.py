from typing import Literal
from datetime import date
from pydantic import BaseModel, Field


SourceLevel = Literal["A", "B", "C"]
NarrativeStage = Literal["寻源", "读史", "探迹", "传承", "未分类"]


class NanchongPlanRequest(BaseModel):
    """Allowances are user inputs, never provider quotes."""
    origin: str = Field(min_length=1, max_length=120, pattern=r"\S")
    days: Literal[0.5, 1, 2] = 1
    travel_date: date | None = None
    mode: Literal["walking", "driving", "transit"] = "transit"
    people: int = Field(default=1, ge=1, le=50)
    rooms: int = Field(default=1, ge=1, le=50)
    places: list[Literal["wanjuanlou", "beihu"]] = Field(default_factory=lambda: ["wanjuanlou", "beihu"], min_length=1, max_length=2)
    hotel_per_room: float | None = Field(default=None, ge=0, le=100000, allow_inf_nan=False)
    meals_per_person_day: float | None = Field(default=None, ge=0, le=100000, allow_inf_nan=False)
    transport_total: float | None = Field(default=None, ge=0, le=1000000, allow_inf_nan=False)
    budget_limit: float | None = Field(default=None, ge=0, le=1000000, allow_inf_nan=False)


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
    document_id: str = ""
    source_file: str = ""
    pdf_page: int | None = None
    category: str = ""
    claim_type: str = ""
    extraction_status: str = ""


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
