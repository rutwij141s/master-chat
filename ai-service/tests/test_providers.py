import pytest
from app.providers.providers import (
    OpenAIProvider,
    AnthropicProvider,
    GeminiProvider,
    XAIProvider,
    PerplexityProvider,
)
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
async def test_gemini_mock_provider():
    provider = GeminiProvider(api_key="mock-key", model="gemini-2.0-flash")
    messages = [{"role": "user", "content": "Hello Gemini"}]

    text, usage = await provider.generate_chat(messages)
    assert "gemini-2.0-flash" in text
    assert usage["total_tokens"] > 0

    tokens = []
    async for token in provider.stream_chat(messages):
        tokens.append(token)
    assert len(tokens) > 0


@pytest.mark.asyncio
async def test_xai_mock_provider():
    provider = XAIProvider(api_key="mock-key", model="grok-2")
    messages = [{"role": "user", "content": "Hello Grok"}]

    text, usage = await provider.generate_chat(messages)
    assert "grok-2" in text
    assert usage["total_tokens"] > 0


@pytest.mark.asyncio
async def test_perplexity_mock_provider():
    provider = PerplexityProvider(api_key="mock-key", model="sonar-pro")
    messages = [{"role": "user", "content": "Search the web"}]

    text, usage = await provider.generate_chat(messages)
    assert "sonar-pro" in text
    assert usage["total_tokens"] > 0


@pytest.mark.asyncio
async def test_router_model_selection_and_fallback():
    router = ModelRouter()

    # Route based on model name across all 5 providers
    openai_p = router.get_provider("gpt-4o")
    assert isinstance(openai_p, OpenAIProvider)

    anthropic_p = router.get_provider("claude-3-5-sonnet")
    assert isinstance(anthropic_p, AnthropicProvider)

    gemini_p = router.get_provider("gemini-2.0-flash")
    assert isinstance(gemini_p, GeminiProvider)

    xai_p = router.get_provider("grok-2")
    assert isinstance(xai_p, XAIProvider)

    perplexity_p = router.get_provider("sonar-pro")
    assert isinstance(perplexity_p, PerplexityProvider)

    # Fallback resolution
    fallback = router.get_fallback_provider(openai_p)
    assert isinstance(fallback, AnthropicProvider)

    # Stream with fallback
    messages = [{"role": "user", "content": "Test prompt"}]
    tokens = []
    async for tok, model_name in router.stream_with_fallback(messages, model_name="gpt-4o"):
        tokens.append(tok)
    assert len(tokens) > 0
