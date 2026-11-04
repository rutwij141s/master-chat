import asyncio
import logging
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional
from anthropic import AsyncAnthropic
from app.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class AnthropicProvider(BaseLLMProvider):
    provider_name: str = "anthropic"

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20241022"):
        super().__init__(api_key=api_key, model=model)
        self.is_mock = not api_key or api_key.startswith("mock-") or api_key == "your_anthropic_api_key_here"
        if not self.is_mock:
            self.client = AsyncAnthropic(api_key=api_key)
        else:
            self.client = None

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        if self.is_mock:
            prompt_last = messages[-1]["content"] if messages else "Hello"
            mock_text = f"Simulated Claude ({self.model}) response to: {prompt_last[:60]}... The system is running in live test mode."
            for word in mock_text.split(" "):
                yield word + " "
                await asyncio.sleep(0.04)
            return

        # Format messages for Anthropic (only 'user' and 'assistant' roles allowed)
        anthropic_messages = []
        for msg in messages:
            role = "assistant" if msg["role"] == "assistant" else "user"
            anthropic_messages.append({"role": role, "content": msg["content"]})

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Tuple[str, Dict[str, int]]:
        if self.is_mock:
            prompt_last = messages[-1]["content"] if messages else "Hello"
            text = f"Simulated Claude ({self.model}) response to: {prompt_last}"
            return text, {"prompt_tokens": 18, "completion_tokens": 25, "total_tokens": 43}

        anthropic_messages = []
        for msg in messages:
            role = "assistant" if msg["role"] == "assistant" else "user"
            anthropic_messages.append({"role": role, "content": msg["content"]})

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = await self.client.messages.create(**kwargs)
        content = ""
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

        usage = {
            "prompt_tokens": response.usage.input_tokens if response.usage else 0,
            "completion_tokens": response.usage.output_tokens if response.usage else 0,
            "total_tokens": (response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0,
        }
        return content, usage
