import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"

    # Server
    AI_SERVICE_PORT: int = 8000
    AI_SERVICE_HOST: str = "0.0.0.0"

    # Database
    POSTGRES_USER: str = "masterchat"
    POSTGRES_PASSWORD: str = "masterchat_secure_pass"
    POSTGRES_DB: str = "masterchat_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql://masterchat:masterchat_secure_pass@localhost:5432/masterchat_db"
    ASYNC_DATABASE_URL: str = "postgresql+asyncpg://masterchat:masterchat_secure_pass@localhost:5432/masterchat_db"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: str = "redis://localhost:6379/0"

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    CHROMA_HOST: Optional[str] = None
    CHROMA_PORT: int = 8001

    # Security
    JWT_SECRET: str = "super_secret_jwt_encryption_key_change_in_production_32chars!"

    # LLM Providers
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_FALLBACK_MODEL: str = "gpt-4o-mini"

    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    ANTHROPIC_FALLBACK_MODEL: str = "claude-3-5-haiku-20241022"

    DEFAULT_MODEL_PROVIDER: str = "openai"

    # RAG / Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    RAG_CHUNK_SIZE: int = 800
    RAG_CHUNK_OVERLAP: int = 100
    RAG_TOP_K: int = 4

    # Observability
    ENABLE_LANGSMITH: bool = False
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_PROJECT: str = "masterchat"
    PROMETHEUS_METRICS: bool = True

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
