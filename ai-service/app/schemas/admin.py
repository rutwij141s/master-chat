import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.usage import UsageLogItem


class ModelUsageMetric(BaseModel):
    model: str
    requests: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    cost_percentage: float = 0.0


class DailyUsageTrend(BaseModel):
    date: str
    requests: int
    tokens: int
    cost: float


class AdminOverviewResponse(BaseModel):
    total_cost: float
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    total_requests: int
    total_users: int
    active_users_30d: int
    total_documents: int
    total_conversations: int
    model_breakdown: List[ModelUsageMetric]
    daily_trends: List[DailyUsageTrend]


class UserAnalyticsItem(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: str = "user"
    created_at: datetime
    last_active: Optional[datetime] = None
    total_requests: int = 0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_estimated_cost: float = 0.0
    top_model: Optional[str] = None
    total_conversations: int = 0  # Aggregate count only; no message content access
    total_documents: int = 0      # Aggregate count only; no document content access


class AdminUsersResponse(BaseModel):
    users: List[UserAnalyticsItem]
    total_count: int
    page: int
    limit: int = 50


class UserDetailAnalyticsResponse(BaseModel):
    user: UserAnalyticsItem
    model_breakdown: List[ModelUsageMetric]
    recent_logs: List[UsageLogItem]
    privacy_shield: bool = True
    privacy_note: str = (
        "User chat messages, private conversation contents, and document texts are "
        "strictly protected and cannot be accessed or viewed by platform administrators."
    )


class UpdateUserRoleRequest(BaseModel):
    role: str
