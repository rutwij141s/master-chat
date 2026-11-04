from fastapi import APIRouter
from app.api.v1.chat import router_api as chat_router
from app.api.v1.documents import router_api as documents_router
from app.api.v1.conversations import router_api as conversations_router
from app.api.v1.models import router_api as models_router
from app.api.v1.usage import router_api as usage_router

api_v1_router = APIRouter()

api_v1_router.include_router(chat_router, tags=["chat"])
api_v1_router.include_router(documents_router, tags=["documents"])
api_v1_router.include_router(conversations_router, tags=["conversations"])
api_v1_router.include_router(models_router, tags=["models"])
api_v1_router.include_router(usage_router, tags=["usage"])
