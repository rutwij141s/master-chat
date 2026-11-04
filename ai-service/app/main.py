import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings
from app.db.session import init_db, async_engine
from app.api.v1 import api_v1_router
from app.rag.vectorstore import vector_store

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("masterchat.ai_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MasterChat AI Service...")
    # Initialize DB schema if running locally or tests
    try:
        await init_db()
        logger.info("Database schemas verified.")
    except Exception as e:
        logger.warning(f"Database connection note during startup: {e}")

    yield
    logger.info("Shutting down MasterChat AI Service...")
    await async_engine.dispose()


app = FastAPI(
    title="MasterChat AI Service",
    description="Multi-model conversational AI engine with streaming, document-grounded RAG, and LangGraph agents.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
if settings.PROMETHEUS_METRICS:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Include API router
app.include_router(api_v1_router, prefix="/api/v1")
# Also mount directly for direct calls
app.include_router(api_v1_router)


# Liveness & Readiness probes
@app.get("/health", tags=["system"])
async def health():
    """Liveness probe."""
    return {"status": "ok", "service": "ai-service", "version": "1.0.0"}


@app.get("/ready", tags=["system"])
async def readiness():
    """Readiness probe checking database and vector store connectivity."""
    db_ok = False
    chroma_ok = False
    try:
        async with async_engine.connect() as conn:
            await conn.execute("SELECT 1")
        db_ok = True
    except Exception as e:
        logger.warning(f"Readiness DB check: {e}")

    try:
        # Chroma client check
        vector_store.client.heartbeat()
        chroma_ok = True
    except Exception as e:
        logger.warning(f"Readiness Chroma check: {e}")

    return {
        "status": "ready" if (db_ok or settings.ENVIRONMENT == "development") else "degraded",
        "database": db_ok,
        "chroma": chroma_ok,
    }


# Global error handler - no stack traces leaked in responses
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request: {request.method} {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing your request.",
        },
    )
