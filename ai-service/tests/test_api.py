import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(async_client: AsyncClient):
    resp = await async_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


@pytest.mark.asyncio
async def test_models_endpoint(async_client: AsyncClient):
    resp = await async_client.get("/api/v1/models")
    assert resp.status_code == 200
    models = resp.json()
    assert len(models) >= 2
    model_ids = [m["id"] for m in models]
    assert "gpt-4o" in model_ids
    assert "claude-3-5-sonnet-20241022" in model_ids


@pytest.mark.asyncio
async def test_chat_stream_endpoint(async_client: AsyncClient):
    headers = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}
    payload = {
        "message": "Hello AI assistant!",
        "model": "gpt-4o",
        "use_rag": False,
    }

    resp = await async_client.post("/api/v1/chat/stream", json=payload, headers=headers)
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")

    # Read stream chunks
    body = resp.text
    assert "data: " in body
    assert "token" in body or "done" in body
