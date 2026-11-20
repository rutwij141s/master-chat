"""
Unified LLM Providers Module.
Consolidates all LLM model providers (OpenAI, Anthropic, Google Gemini, xAI Grok, Perplexity)
into a single cohesive provider architecture with streaming, token tracking, and simulated fallback.
"""

from abc import ABC, abstractmethod
import asyncio
import logging
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


# =========================================================================
# 1. Base LLM Provider
# =========================================================================
class BaseLLMProvider(ABC):
    """Abstract Base Class for all LLM Providers."""

    provider_name: str = "base"
    default_model: str = ""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model or self.default_model

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Yield tokens as they are streamed from the model."""
        pass

    @abstractmethod
    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Tuple[str, Dict[str, int]]:
        """Generate full response and return (text, usage_dict)."""
        pass

    def get_model_name(self) -> str:
        return self.model


# =========================================================================
# 2. OpenAI Provider (GPT-4o, GPT-4o Mini)
# =========================================================================
class OpenAIProvider(BaseLLMProvider):
    """OpenAI Flagship Provider."""
    provider_name: str = "openai"
    default_model: str = "gpt-4o"

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


# =========================================================================
# 3. Anthropic Provider (Claude 3.5 Sonnet, Claude 3.5 Haiku)
# =========================================================================
class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude Provider."""
    provider_name: str = "anthropic"
    default_model: str = "claude-3-5-sonnet-20241022"

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

        anthropic_messages = []
        for msg in messages:
            role = "assistant" if msg["role"] == "assistant" else "user"
            anthropic_messages.append({"role": role, "content": msg["content"]})

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": anthropic_messages,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if temperature is not None:
            kwargs["extra_body"] = {"temperature": temperature}

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            err_msg = str(e)
            if "invalid x-api-key" in err_msg or "authentication_error" in err_msg or "401" in err_msg:
                logger.warning(f"Anthropic API key invalid ({e}). Streaming notice and simulation.")
                prompt_last = messages[-1]["content"] if messages else "Hello"
                simulated_text = (
                    f"> ⚠️ **Anthropic Authentication Notice:** *Your `ANTHROPIC_API_KEY` was rejected by Anthropic (`invalid x-api-key`). "
                    f"Please update your key in `.env`. Responding in simulated Claude mode:*\n\n"
                    f"Hello! I am **Claude** ({self.model}). You asked: \"{prompt_last[:120]}\". "
                    f"Once a valid Anthropic API key is added, live Claude reasoning will stream directly."
                )
                for word in simulated_text.split(" "):
                    yield word + " "
                    await asyncio.sleep(0.03)
                return
            raise

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
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if temperature is not None:
            kwargs["temperature"] = temperature

        try:
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
        except Exception as e:
            err_msg = str(e)
            if "invalid x-api-key" in err_msg or "authentication_error" in err_msg or "401" in err_msg:
                prompt_last = messages[-1]["content"] if messages else "Hello"
                sim_text = (
                    f"> ⚠️ **Anthropic Notice:** *Your `ANTHROPIC_API_KEY` was rejected by Anthropic. "
                    f"Simulated response to: {prompt_last}*"
                )
                return sim_text, {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
            raise


# =========================================================================
# 4. Google Gemini Provider (Gemini 2.5 Flash Lite, Gemini 2.5 Pro)
# =========================================================================
class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini Provider.
    Connects to Google's official OpenAI-compatible endpoint:
    https://generativelanguage.googleapis.com/v1beta/openai/
    """
    provider_name: str = "gemini"
    default_model: str = "gemini-2.5-flash-lite"

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-flash-lite"):
        # Map deprecated model names or aliases to active Google models
        normalized_model = model or self.default_model
        if normalized_model in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"):
            normalized_model = "gemini-2.5-flash-lite"
        super().__init__(api_key=api_key, model=normalized_model)
        self.is_mock = not api_key or api_key.startswith("mock-") or api_key == "your_gemini_api_key_here"
        if not self.is_mock:
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
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
            mock_text = f"Simulated Google Gemini ({self.model}) response to: {prompt_last[:60]}... The system is running in live test mode."
            for word in mock_text.split(" "):
                yield word + " "
                await asyncio.sleep(0.04)
            return

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        try:
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
        except Exception as e:
            err_msg = str(e)
            # If model returned 404/429/503 and is not already flash-lite, retry with flash-lite
            if ("404" in err_msg or "429" in err_msg or "503" in err_msg) and self.model != "gemini-2.5-flash-lite":
                logger.info(f"Gemini model {self.model} returned {err_msg[:60]}, retrying with gemini-2.5-flash-lite")
                retry_resp = await self.client.chat.completions.create(
                    model="gemini-2.5-flash-lite",
                    messages=formatted_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                )
                async for chunk in retry_resp:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            raise

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Tuple[str, Dict[str, int]]:
        if self.is_mock:
            prompt_last = messages[-1]["content"] if messages else "Hello"
            text = f"Simulated Google Gemini ({self.model}) response to: {prompt_last}"
            return text, {"prompt_tokens": 15, "completion_tokens": 20, "total_tokens": 35}

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
            )
        except Exception as e:
            err_msg = str(e)
            if ("404" in err_msg or "429" in err_msg or "503" in err_msg) and self.model != "gemini-2.5-flash-lite":
                response = await self.client.chat.completions.create(
                    model="gemini-2.5-flash-lite",
                    messages=formatted_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=False,
                )
            else:
                raise

        content = response.choices[0].message.content or ""
        usage = {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0,
        }
        return content, usage


# =========================================================================
# 5. xAI Provider (Grok 2, Grok Beta)
# =========================================================================
class XAIProvider(BaseLLMProvider):
    """
    xAI (Grok) Provider.
    Connects to xAI's official OpenAI-compatible endpoint:
    https://api.x.ai/v1
    """
    provider_name: str = "xai"
    default_model: str = "grok-2"

    def __init__(self, api_key: Optional[str] = None, model: str = "grok-2"):
        super().__init__(api_key=api_key, model=model)
        self.is_mock = not api_key or api_key.startswith("mock-") or api_key == "your_xai_api_key_here"
        if not self.is_mock:
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://api.x.ai/v1",
            )
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
            mock_text = f"Simulated xAI Grok ({self.model}) response to: {prompt_last[:60]}... The system is running in live test mode."
            for word in mock_text.split(" "):
                yield word + " "
                await asyncio.sleep(0.04)
            return

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        try:
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
        except Exception as e:
            err_msg = str(e)
            if "Incorrect API key" in err_msg or "invalid-argument" in err_msg or "400" in err_msg or "401" in err_msg:
                logger.warning(f"xAI API authentication failed ({e}). Returning explicit notice and preview simulation.")
                prompt_last = messages[-1]["content"] if messages else "Hello"
                simulated_text = (
                    f"> ⚠️ **xAI Authentication Notice:** *Your `XAI_API_KEY` was rejected by xAI (`Incorrect API key provided`). "
                    f"Please verify or renew your key at https://console.x.ai in your `.env` file. "
                    f"Responding in Grok simulation mode:*\n\n"
                    f"Hello! I am **Grok 2 by xAI**. You asked: \"{prompt_last[:120]}\". "
                    f"Once your valid xAI API key is configured and saved in `.env`, live Grok reasoning will stream in real time."
                )
                for word in simulated_text.split(" "):
                    yield word + " "
                    await asyncio.sleep(0.03)
                return
            raise

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Tuple[str, Dict[str, int]]:
        if self.is_mock:
            prompt_last = messages[-1]["content"] if messages else "Hello"
            text = f"Simulated xAI Grok ({self.model}) response to: {prompt_last}"
            return text, {"prompt_tokens": 15, "completion_tokens": 20, "total_tokens": 35}

        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        try:
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
        except Exception as e:
            err_msg = str(e)
            if "Incorrect API key" in err_msg or "invalid-argument" in err_msg or "400" in err_msg or "401" in err_msg:
                prompt_last = messages[-1]["content"] if messages else "Hello"
                sim_text = (
                    f"> ⚠️ **xAI Authentication Notice:** *Your `XAI_API_KEY` was rejected by xAI (`Incorrect API key provided`). "
                    f"Please verify your key at https://console.x.ai.*"
                )
                return sim_text, {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
            raise


# =========================================================================
# 6. Perplexity Provider (Sonar Pro, Sonar)
# =========================================================================
class PerplexityProvider(BaseLLMProvider):
    """
    Perplexity Provider.
    Connects to Perplexity's official OpenAI-compatible endpoint:
    https://api.perplexity.ai
    """
    provider_name: str = "perplexity"
    default_model: str = "sonar-pro"

    def __init__(self, api_key: Optional[str] = None, model: str = "sonar-pro"):
        super().__init__(api_key=api_key, model=model)
        self.is_mock = not api_key or api_key.startswith("mock-") or api_key == "your_perplexity_api_key_here"
        if not self.is_mock:
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://api.perplexity.ai",
            )
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
            mock_text = f"Simulated Perplexity ({self.model}) response to: {prompt_last[:60]}... The system is running in live test mode."
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
            text = f"Simulated Perplexity ({self.model}) response to: {prompt_last}"
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
