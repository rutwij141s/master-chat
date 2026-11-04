from fastapi import APIRouter
from typing import List, Dict, Any
from app.providers.router import router

router_api = APIRouter()


@router_api.get("/models", response_model=List[Dict[str, Any]])
async def list_models():
    """Retrieve list of available LLM models and capabilities for UI selector."""
    return router.list_models()
