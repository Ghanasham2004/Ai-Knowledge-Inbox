from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ItemBase(BaseModel):
    id: str
    type: str = Field(..., description="'note' or 'url'")
    title: str
    source_url: Optional[str] = None
    chunk_count: int = 0
    status: str = Field(..., description="'pending', 'processing', 'ready', or 'failed'")
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class ItemResponse(ItemBase):
    raw_content: Optional[str] = None
    cleaned_content: Optional[str] = None


class ItemListResponse(BaseModel):
    success: bool = True
    total: int
    items: List[ItemResponse]
