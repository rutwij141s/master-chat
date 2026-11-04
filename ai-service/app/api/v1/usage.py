import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.db.models import UsageLog
from app.api.deps import get_current_user_id
from app.schemas.usage import UsageSummaryResponse, UsageLogItem

router_api = APIRouter()


@router_api.get("/usage", response_model=UsageSummaryResponse)
async def get_usage_metrics(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Retrieve token metrics and estimated cost tracking for the user."""
    # Aggregates
    summary_stmt = select(
        func.count(UsageLog.id).label("total_requests"),
        func.coalesce(func.sum(UsageLog.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("total_estimated_cost"),
    ).where(UsageLog.user_id == user_id)

    summary_res = await db.execute(summary_stmt)
    agg = summary_res.one()

    # Recent logs
    logs_stmt = (
        select(UsageLog)
        .where(UsageLog.user_id == user_id)
        .order_by(desc(UsageLog.created_at))
        .limit(limit)
    )
    logs_res = await db.execute(logs_stmt)
    logs = logs_res.scalars().all()

    return UsageSummaryResponse(
        user_id=user_id,
        total_requests=agg.total_requests,
        total_tokens=int(agg.total_tokens),
        prompt_tokens=int(agg.prompt_tokens),
        completion_tokens=int(agg.completion_tokens),
        total_estimated_cost=float(agg.total_estimated_cost),
        logs=logs,
    )
