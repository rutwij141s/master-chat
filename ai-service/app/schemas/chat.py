import uuid
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ChatCitation(BaseModel):
    chunk_id: str
    doc_id: str
    filename: str
    page: Optional[int] = None
    text: str
    score: Optional[float] = None
    url: Optional[str] = None


class ChatMessageRequest(BaseModel):
    role: str = Field(default="user", description="Role: user, assistant, system")
    content: str


class ChatStreamRequest(BaseModel):
    conversation_id: Optional[uuid.UUID] = Field(default=None, description="UUID of existing conversation, or None to create one")
    message: str = Field(..., min_length=1, description="User input message")
    model: Optional[str] = Field(default=None, description="Model identifier (e.g., gpt-4o, claude-3-5-sonnet)")
    use_rag: bool = Field(default=False, description="Whether to ground response with RAG documents")
    use_web_search: bool = Field(default=False, description="Whether to ground response with real-time web search")
    doc_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Specific document IDs to restrict retrieval to")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=4096, ge=1)
    system_prompt: Optional[str] = Field(default=None, description="Custom system prompt override")


class ChatStreamChunk(BaseModel):
    type: str  # "token", "citation", "title", "error", "done"
    token: Optional[str] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    title: Optional[str] = None
    model: Optional[str] = None
    citations: Optional[List[ChatCitation]] = None
    usage: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
