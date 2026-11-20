import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, cast, Date, and_

from app.db.session import get_db
from app.db.models import User, UsageLog, Conversation, Document
from app.api.deps import admin_required
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminUsersResponse,
    UserAnalyticsItem,
    UserDetailAnalyticsResponse,
    ModelUsageMetric,
    DailyUsageTrend,
    UpdateUserRoleRequest,
)
from app.schemas.usage import UsageLogItem

router_api = APIRouter(dependencies=[Depends(admin_required)])


@router_api.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    days: Optional[int] = Query(None, description="Filter metrics by recent days, e.g. 1, 7, 30. Omit for all time."),
    db: AsyncSession = Depends(get_db),
):
    """
    Platform-wide aggregate usage, token analytics, and financial expense monitoring.
    Maintains user privacy: strictly aggregates financial and computational metrics without exposing chat contents.
    """
    time_filter = []
    if days and days > 0:
        since = datetime.utcnow() - timedelta(days=days)
        time_filter.append(UsageLog.created_at >= since)

    # 1. Total usage aggregates
    usage_stmt = select(
        func.count(UsageLog.id).label("total_requests"),
        func.coalesce(func.sum(UsageLog.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("total_cost"),
    )
    if time_filter:
        usage_stmt = usage_stmt.where(*time_filter)
    usage_res = await db.execute(usage_stmt)
    usage_agg = usage_res.one()

    total_cost = float(usage_agg.total_cost)

    # 2. Total registered users & active users in past 30 days
    users_stmt = select(func.count(User.id))
    users_res = await db.execute(users_stmt)
    total_users = users_res.scalar_one()

    active_since = datetime.utcnow() - timedelta(days=30)
    active_stmt = select(func.count(func.distinct(UsageLog.user_id))).where(UsageLog.created_at >= active_since)
    active_res = await db.execute(active_stmt)
    active_users = active_res.scalar_one()

    # 3. Documents and Conversations count (aggregate counts only)
    docs_stmt = select(func.count(Document.id))
    docs_res = await db.execute(docs_stmt)
    total_docs = docs_res.scalar_one()

    convs_stmt = select(func.count(Conversation.id))
    convs_res = await db.execute(convs_stmt)
    total_convs = convs_res.scalar_one()

    # 4. Model usage breakdown
    model_stmt = (
        select(
            UsageLog.model,
            func.count(UsageLog.id).label("requests"),
            func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt_tokens"),
            func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("completion_tokens"),
            func.coalesce(func.sum(UsageLog.total_tokens), 0).label("total_tokens"),
            func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("estimated_cost"),
        )
        .group_by(UsageLog.model)
        .order_by(desc("estimated_cost"))
    )
    if time_filter:
        model_stmt = model_stmt.where(*time_filter)
    model_res = await db.execute(model_stmt)
    model_rows = model_res.all()

    model_breakdown: List[ModelUsageMetric] = []
    for row in model_rows:
        cost = float(row.estimated_cost)
        pct = (cost / total_cost * 100.0) if total_cost > 0 else 0.0
        model_breakdown.append(
            ModelUsageMetric(
                model=row.model,
                requests=int(row.requests),
                prompt_tokens=int(row.prompt_tokens),
                completion_tokens=int(row.completion_tokens),
                total_tokens=int(row.total_tokens),
                estimated_cost=cost,
                cost_percentage=round(pct, 2),
            )
        )

    # 5. Daily trends (past 14 days)
    daily_stmt = (
        select(
            cast(UsageLog.created_at, Date).label("log_date"),
            func.count(UsageLog.id).label("requests"),
            func.coalesce(func.sum(UsageLog.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("cost"),
        )
        .group_by("log_date")
        .order_by(desc("log_date"))
        .limit(14)
    )
    daily_res = await db.execute(daily_stmt)
    daily_rows = daily_res.all()
    daily_trends = [
        DailyUsageTrend(
            date=str(r.log_date),
            requests=int(r.requests),
            tokens=int(r.tokens),
            cost=round(float(r.cost), 5),
        )
        for r in daily_rows
    ]

    return AdminOverviewResponse(
        total_cost=round(total_cost, 5),
        total_tokens=int(usage_agg.total_tokens),
        prompt_tokens=int(usage_agg.prompt_tokens),
        completion_tokens=int(usage_agg.completion_tokens),
        total_requests=int(usage_agg.total_requests),
        total_users=int(total_users),
        active_users_30d=int(active_users),
        total_documents=int(total_docs),
        total_conversations=int(total_convs),
        model_breakdown=model_breakdown,
        daily_trends=daily_trends,
    )


@router_api.get("/users", response_model=AdminUsersResponse)
async def list_admin_users(
    search: Optional[str] = Query(None, description="Search user email or name"),
    role: Optional[str] = Query(None, description="Filter by role: admin, user, or all"),
    sort_by: str = Query("cost", description="Sort by: cost, tokens, requests, recent"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve user accounts with usage analytics, token consumption, and financial expenditures.
    PRIVACY SAFEGUARD: Excludes all message text, conversation titles, and conversation contents.
    """
    # Base user query
    base_filter = []
    if search:
        term = f"%{search.strip()}%"
        base_filter.append(or_(User.email.ilike(term), User.full_name.ilike(term)))
    if role and role.lower() != "all":
        base_filter.append(User.role == role.lower())

    # Total count query
    count_stmt = select(func.count(User.id))
    if base_filter:
        count_stmt = count_stmt.where(*base_filter)
    total_count = (await db.execute(count_stmt)).scalar_one()

    # Pre-aggregate usage metrics per user
    usage_sub = (
        select(
            UsageLog.user_id,
            func.count(UsageLog.id).label("requests_cnt"),
            func.coalesce(func.sum(UsageLog.total_tokens), 0).label("tokens_cnt"),
            func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt_cnt"),
            func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("completion_cnt"),
            func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("cost_val"),
            func.max(UsageLog.created_at).label("last_active_ts"),
        )
        .group_by(UsageLog.user_id)
        .subquery()
    )

    # Conversation count per user (strictly count only, NO content!)
    conv_sub = (
        select(
            Conversation.user_id,
            func.count(Conversation.id).label("conv_cnt"),
        )
        .group_by(Conversation.user_id)
        .subquery()
    )

    # Document count per user (strictly count only, NO content!)
    doc_sub = (
        select(
            Document.user_id,
            func.count(Document.id).label("doc_cnt"),
        )
        .group_by(Document.user_id)
        .subquery()
    )

    # Main combined query
    query = (
        select(
            User.id,
            User.email,
            User.full_name,
            User.role,
            User.created_at,
            func.coalesce(usage_sub.c.requests_cnt, 0).label("total_requests"),
            func.coalesce(usage_sub.c.tokens_cnt, 0).label("total_tokens"),
            func.coalesce(usage_sub.c.prompt_cnt, 0).label("prompt_tokens"),
            func.coalesce(usage_sub.c.completion_cnt, 0).label("completion_tokens"),
            func.coalesce(usage_sub.c.cost_val, 0.0).label("total_estimated_cost"),
            usage_sub.c.last_active_ts.label("last_active"),
            func.coalesce(conv_sub.c.conv_cnt, 0).label("total_conversations"),
            func.coalesce(doc_sub.c.doc_cnt, 0).label("total_documents"),
        )
        .outerjoin(usage_sub, User.id == usage_sub.c.user_id)
        .outerjoin(conv_sub, User.id == conv_sub.c.user_id)
        .outerjoin(doc_sub, User.id == doc_sub.c.user_id)
    )

    if base_filter:
        query = query.where(*base_filter)

    # Sorting
    if sort_by == "cost":
        query = query.order_by(desc("total_estimated_cost"), desc(User.created_at))
    elif sort_by == "tokens":
        query = query.order_by(desc("total_tokens"), desc(User.created_at))
    elif sort_by == "requests":
        query = query.order_by(desc("total_requests"), desc(User.created_at))
    elif sort_by == "recent":
        query = query.order_by(desc("last_active"), desc(User.created_at))
    else:
        query = query.order_by(desc("total_estimated_cost"), desc(User.created_at))

    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    # Collect user IDs to find top models in batch
    user_ids = [r.id for r in rows]
    top_models: dict = {}
    if user_ids:
        # Find top model for each user
        model_counts_stmt = (
            select(
                UsageLog.user_id,
                UsageLog.model,
                func.count(UsageLog.id).label("m_count"),
            )
            .where(UsageLog.user_id.in_(user_ids))
            .group_by(UsageLog.user_id, UsageLog.model)
            .order_by(UsageLog.user_id, desc("m_count"))
        )
        m_res = await db.execute(model_counts_stmt)
        for m_row in m_res.all():
            if m_row.user_id not in top_models:
                top_models[m_row.user_id] = m_row.model

    items: List[UserAnalyticsItem] = []
    for r in rows:
        items.append(
            UserAnalyticsItem(
                id=r.id,
                email=r.email,
                full_name=r.full_name,
                role=r.role,
                created_at=r.created_at,
                last_active=r.last_active,
                total_requests=int(r.total_requests),
                total_tokens=int(r.total_tokens),
                prompt_tokens=int(r.prompt_tokens),
                completion_tokens=int(r.completion_tokens),
                total_estimated_cost=round(float(r.total_estimated_cost), 5),
                top_model=top_models.get(r.id),
                total_conversations=int(r.total_conversations),
                total_documents=int(r.total_documents),
            )
        )

    return AdminUsersResponse(
        users=items,
        total_count=int(total_count),
        page=page,
        limit=limit,
    )


@router_api.get("/users/{user_id}", response_model=UserDetailAnalyticsResponse)
async def get_admin_user_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Detailed user analytics: per-model breakdown and usage logs.
    Strict privacy protection: Chat content and message history are never returned.
    """
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Aggregates for user
    agg_stmt = select(
        func.count(UsageLog.id).label("requests"),
        func.coalesce(func.sum(UsageLog.total_tokens), 0).label("tokens"),
        func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt"),
        func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("comp"),
        func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("cost"),
        func.max(UsageLog.created_at).label("last_active"),
    ).where(UsageLog.user_id == user_id)
    agg_res = await db.execute(agg_stmt)
    agg = agg_res.one()

    # Conversation count
    c_stmt = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
    total_convs = (await db.execute(c_stmt)).scalar_one()

    # Document count
    d_stmt = select(func.count(Document.id)).where(Document.user_id == user_id)
    total_docs = (await db.execute(d_stmt)).scalar_one()

    # Per-model breakdown
    m_stmt = (
        select(
            UsageLog.model,
            func.count(UsageLog.id).label("requests"),
            func.coalesce(func.sum(UsageLog.prompt_tokens), 0).label("prompt"),
            func.coalesce(func.sum(UsageLog.completion_tokens), 0).label("comp"),
            func.coalesce(func.sum(UsageLog.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(UsageLog.estimated_cost), 0.0).label("cost"),
        )
        .where(UsageLog.user_id == user_id)
        .group_by(UsageLog.model)
        .order_by(desc("cost"))
    )
    m_res = await db.execute(m_stmt)
    m_rows = m_res.all()

    user_cost = float(agg.cost)
    model_breakdown = [
        ModelUsageMetric(
            model=r.model,
            requests=int(r.requests),
            prompt_tokens=int(r.prompt),
            completion_tokens=int(r.comp),
            total_tokens=int(r.tokens),
            estimated_cost=round(float(r.cost), 5),
            cost_percentage=round((float(r.cost) / user_cost * 100.0) if user_cost > 0 else 0.0, 2),
        )
        for r in m_rows
    ]

    # Recent usage logs (50 items max)
    logs_stmt = (
        select(UsageLog)
        .where(UsageLog.user_id == user_id)
        .order_by(desc(UsageLog.created_at))
        .limit(50)
    )
    logs_res = await db.execute(logs_stmt)
    recent_logs = logs_res.scalars().all()

    user_item = UserAnalyticsItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at,
        last_active=agg.last_active,
        total_requests=int(agg.requests),
        total_tokens=int(agg.tokens),
        prompt_tokens=int(agg.prompt),
        completion_tokens=int(agg.comp),
        total_estimated_cost=round(float(agg.cost), 5),
        top_model=model_breakdown[0].model if model_breakdown else None,
        total_conversations=int(total_convs),
        total_documents=int(total_docs),
    )

    return UserDetailAnalyticsResponse(
        user=user_item,
        model_breakdown=model_breakdown,
        recent_logs=recent_logs,
        privacy_shield=True,
    )


@router_api.put("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    req: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Promote or demote a user role ('admin' or 'user')."""
    role = req.role.strip().lower()
    if role not in ("admin", "user"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'user'",
        )

    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = role
    await db.commit()

    return {"success": True, "user_id": str(user_id), "role": role}
