import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class UsageLogItem(BaseModel):
    id: uuid.UUID
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    created_at: datetime

    class Config:
        from_attributes = True


class UsageSummaryResponse(BaseModel):
    user_id: uuid.UUID
    total_requests: int
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    total_estimated_cost: float
    logs: List[UsageLogItem]
