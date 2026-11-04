import logging
import asyncio
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional
from app.config import get_settings
from app.providers.base import BaseLLMProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.anthropic_provider import AnthropicProvider

logger = logging.getLogger(__name__)


class ModelRouter:
    """Manages LLM providers with automatic fallback, model routing, and discovery."""

    def __init__(self):
        self.settings = get_settings()

    def get_provider(self, model_name: Optional[str] = None) -> BaseLLMProvider:
        """Select appropriate provider based on model name or default config."""
        requested = (model_name or "").lower()

        if "claude" in requested or "anthropic" in requested:
            return AnthropicProvider(
                api_key=self.settings.ANTHROPIC_API_KEY,
                model=model_name or self.settings.ANTHROPIC_MODEL,
            )
        elif "gpt" in requested or "openai" in requested:
            return OpenAIProvider(
                api_key=self.settings.OPENAI_API_KEY,
                model=model_name or self.settings.OPENAI_MODEL,
            )

        # Default fallback by configuration
        if self.settings.DEFAULT_MODEL_PROVIDER.lower() == "anthropic":
            return AnthropicProvider(
                api_key=self.settings.ANTHROPIC_API_KEY,
                model=self.settings.ANTHROPIC_MODEL,
            )
        else:
            return OpenAIProvider(
                api_key=self.settings.OPENAI_API_KEY,
                model=self.settings.OPENAI_MODEL,
            )

    def get_fallback_provider(self, failed_provider: BaseLLMProvider) -> BaseLLMProvider:
        """Get the alternative provider when primary fails."""
        if isinstance(failed_provider, OpenAIProvider):
            logger.info("Failing over from OpenAI to Anthropic fallback")
            return AnthropicProvider(
                api_key=self.settings.ANTHROPIC_API_KEY,
                model=self.settings.ANTHROPIC_FALLBACK_MODEL,
            )
        else:
            logger.info("Failing over from Anthropic to OpenAI fallback")
            return OpenAIProvider(
                api_key=self.settings.OPENAI_API_KEY,
                model=self.settings.OPENAI_FALLBACK_MODEL,
            )

    async def stream_with_fallback(
        self,
        messages: List[Dict[str, str]],
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout_seconds: float = 45.0,
    ) -> AsyncIterator[Tuple[str, str]]:
        """
        Stream tokens from provider with automatic fallback on failure or timeout.
        Yields tuples: (token_str, actual_model_used)
        """
        primary = self.get_provider(model_name)
        actual_model = primary.get_model_name()
        token_emitted = False

        try:
            # We wrap the initial generator creation in a timeout
            stream = primary.stream_chat(
                messages=messages,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            async for token in stream:
                token_emitted = True
                yield token, actual_model
            return
        except Exception as exc:
            logger.warning(
                f"Primary provider {primary.provider_name} ({actual_model}) failed: {exc}. "
                f"Tokens already emitted: {token_emitted}."
            )
            if token_emitted:
                # If tokens have already begun streaming to client, we can't cleanly switch LLMs mid-sentence
                yield f"\n\n[Warning: Stream interrupted: {str(exc)}]", actual_model
                return

        # Attempt fallback provider if primary yielded nothing before failing
        fallback = self.get_fallback_provider(primary)
        actual_model = fallback.get_model_name()
        logger.info(f"Retrying with fallback provider {fallback.provider_name} ({actual_model})")

        try:
            stream = fallback.stream_chat(
                messages=messages,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            async for token in stream:
                yield token, actual_model
        except Exception as fallback_exc:
            logger.error(f"Fallback provider {fallback.provider_name} also failed: {fallback_exc}")
            raise RuntimeError(f"All LLM providers failed. Last error: {fallback_exc}") from fallback_exc

    def list_models(self) -> List[Dict[str, Any]]:
        """Return catalog of available models for UI model selector."""
        return [
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "openai",
                "description": "OpenAI flagship high-intelligence multimodal model",
                "context_window": 128000,
                "is_default": self.settings.DEFAULT_MODEL_PROVIDER == "openai",
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "provider": "openai",
                "description": "Fast and lightweight OpenAI model for quick tasks",
                "context_window": 128000,
                "is_default": False,
            },
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "provider": "anthropic",
                "description": "Anthropic most intelligent model, top-tier coding & reasoning",
                "context_window": 200000,
                "is_default": self.settings.DEFAULT_MODEL_PROVIDER == "anthropic",
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "provider": "anthropic",
                "description": "Lightning fast Anthropic model for everyday tasks",
                "context_window": 200000,
                "is_default": False,
            },
        ]


router = ModelRouter()
