from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )

    session_id: int | None = None


class ChatSource(BaseModel):
    source_number: int
    document_id: int
    chunk_id: int
    title: str
    department: str
    category: str
    version: str
    chunk_index: int


class ChatResponse(BaseModel):
    session_id: int
    answer: str
    sources: list[ChatSource]


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: list[ChatSource] | None = None
    created_at: datetime


class ChatSessionDetailResponse(BaseModel):
    session: ChatSessionResponse
    messages: list[ChatMessageResponse]