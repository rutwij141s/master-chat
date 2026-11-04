import pytest
from app.providers.openai_provider import OpenAIProvider
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.router import ModelRouter


@pytest.mark.asyncio
async def test_openai_mock_provider():
    provider = OpenAIProvider(api_key="mock-key", model="gpt-4o")
    messages = [{"role": "user", "content": "What is 2+2?"}]

    # Test non-streaming generate
    text, usage = await provider.generate_chat(messages)
    assert "gpt-4o" in text
    assert usage["total_tokens"] > 0

    # Test streaming
    tokens = []
    async for token in provider.stream_chat(messages):
        tokens.append(token)
    assert len(tokens) > 0
    assert "gpt-4o" in "".join(tokens)


@pytest.mark.asyncio
async def test_anthropic_mock_provider():
    provider = AnthropicProvider(api_key="mock-key", model="claude-3-5-sonnet-20241022")
    messages = [{"role": "user", "content": "Hello Claude"}]

    text, usage = await provider.generate_chat(messages)
    assert "claude-3-5-sonnet" in text
    assert usage["total_tokens"] > 0

    tokens = []
    async for token in provider.stream_chat(messages):
        tokens.append(token)
    assert len(tokens) > 0


@pytest.mark.asyncio
async def test_router_model_selection_and_fallback():
    router = ModelRouter()

    # Route based on model name
    openai_p = router.get_provider("gpt-4o")
    assert isinstance(openai_p, OpenAIProvider)

    anthropic_p = router.get_provider("claude-3-5-sonnet")
    assert isinstance(anthropic_p, AnthropicProvider)

    # Fallback resolution
    fallback = router.get_fallback_provider(openai_p)
    assert isinstance(fallback, AnthropicProvider)

    # Stream with fallback
    messages = [{"role": "user", "content": "Test prompt"}]
    tokens = []
    async for tok, model_name in router.stream_with_fallback(messages, model_name="gpt-4o"):
        tokens.append(tok)
    assert len(tokens) > 0
