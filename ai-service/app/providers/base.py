from abc import ABC, abstractmethod
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional


class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM Providers (OpenAI, Anthropic, etc.)."""

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
