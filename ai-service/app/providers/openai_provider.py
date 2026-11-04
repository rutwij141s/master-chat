import asyncio
import logging
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional
from openai import AsyncOpenAI
from app.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    provider_name: str = "openai"

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        super().__init__(api_key=api_key, model=model)
        self.is_mock = not api_key or api_key.startswith("mock-") or api_key == "your_openai_api_key_here"
        if not self.is_mock:
            self.client = AsyncOpenAI(api_key=api_key)
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
            mock_text = f"Simulated OpenAI ({self.model}) response to: {prompt_last[:60]}... The system is running in live test mode."
            for word in mock_text.split(" "):
                yield word + " "
                await asyncio.sleep(0.04)
            return

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Tuple[str, Dict[str, int]]:
        if self.is_mock:
            prompt_last = messages[-1]["content"] if messages else "Hello"
            text = f"Simulated OpenAI ({self.model}) response to: {prompt_last}"
            return text, {"prompt_tokens": 15, "completion_tokens": 20, "total_tokens": 35}

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )

        content = response.choices[0].message.content or ""
        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }
        return content, usage
