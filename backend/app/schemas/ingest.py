from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from app.schemas.item import ItemResponse


class IngestRequest(BaseModel):
    type: Literal["note", "url"] = Field(..., description="Type of content: 'note' or 'url'")
    title: Optional[str] = Field(None, description="Optional custom title")
    content: Optional[str] = Field(None, description="Text body for plain note")
    url: Optional[str] = Field(None, description="Web URL to scrape")

    @field_validator("content")
    @classmethod
    def validate_content_if_note(cls, v, info):
        values = info.data
        if values.get("type") == "note" and (not v or not v.strip()):
            raise ValueError("Content is required when type is 'note'")
        return v

    @field_validator("url")
    @classmethod
    def validate_url_if_url(cls, v, info):
        values = info.data
        if values.get("type") == "url":
            if not v or not v.strip():
                raise ValueError("URL is required when type is 'url'")
            if not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("URL must start with http:// or https://")
        return v


class IngestResponse(BaseModel):
    success: bool = True
    data: ItemResponse
    message: str
