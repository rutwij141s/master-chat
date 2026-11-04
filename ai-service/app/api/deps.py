import uuid
from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> uuid.UUID:
    """Extract and validate the authenticated user ID passed by the Go Gateway."""
    if not x_user_id:
        # Default mock user ID for direct API calls or development
        return uuid.UUID("00000000-0000-0000-0000-000000000001")
    try:
        return uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-User-Id header format",
        )


async def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Retrieve the current user from the database or create test user if missing."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        # If user doesn't exist yet, auto-provision the default test user
        user = User(
            id=user_id,
            email=f"user_{str(user_id)[:8]}@masterchat.ai",
            password_hash="mock_hash_for_gateway_auth",
            full_name="MasterChat User",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
