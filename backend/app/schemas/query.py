from pydantic import BaseModel, Field
from typing import List, Optional


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language question to query over inbox")
    top_k: int = Field(default=4, ge=1, le=10, description="Number of relevant chunks to retrieve")


class CitationItem(BaseModel):
    citation_id: int
    item_id: str
    title: str
    source_type: str
    source_url: Optional[str] = None
    chunk_index: int
    chunk_text: str
    similarity_score: float


class QueryResponse(BaseModel):
    success: bool = True
    query: str
    answer: str
    citations: List[CitationItem]
    model: str
    is_mock: bool = False
