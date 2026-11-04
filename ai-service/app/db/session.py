import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.config import get_settings
from app.db.models import Base

settings = get_settings()

# Engine creation
# If ASYNC_DATABASE_URL is postgresql+asyncpg, use it. In test or isolated mode, sqlite+aiosqlite can be used.
async_db_url = settings.ASYNC_DATABASE_URL
sync_db_url = settings.DATABASE_URL

# Async engine
async_engine = create_async_engine(
    async_db_url,
    echo=settings.LOG_LEVEL.lower() == "debug",
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync engine (useful for Alembic or sync utilities)
sync_engine = create_engine(
    sync_db_url,
    pool_pre_ping=True,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables directly if needed (e.g., local dev or testing)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
