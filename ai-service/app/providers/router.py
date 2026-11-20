import logging
import asyncio
from typing import AsyncIterator, List, Dict, Any, Tuple, Optional
from app.config import get_settings
from app.providers.providers import (
    BaseLLMProvider,
    OpenAIProvider,
    AnthropicProvider,
    GeminiProvider,
    XAIProvider,
    PerplexityProvider,
)

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
        elif "gemini" in requested or "google" in requested:
            return GeminiProvider(
                api_key=self.settings.GEMINI_API_KEY,
                model=model_name or self.settings.GEMINI_MODEL,
            )
        elif "grok" in requested or "xai" in requested:
            return XAIProvider(
                api_key=self.settings.XAI_API_KEY,
                model=model_name or self.settings.XAI_MODEL,
            )
        elif "sonar" in requested or "perplexity" in requested:
            return PerplexityProvider(
                api_key=self.settings.PERPLEXITY_API_KEY,
                model=model_name or self.settings.PERPLEXITY_MODEL,
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
        elif isinstance(failed_provider, AnthropicProvider):
            logger.info("Failing over from Anthropic to Gemini fallback")
            return GeminiProvider(
                api_key=self.settings.GEMINI_API_KEY,
                model=self.settings.GEMINI_FALLBACK_MODEL,
            )
        elif isinstance(failed_provider, GeminiProvider):
            logger.info("Failing over from Gemini to OpenAI fallback")
            return OpenAIProvider(
                api_key=self.settings.OPENAI_API_KEY,
                model=self.settings.OPENAI_FALLBACK_MODEL,
            )
        elif isinstance(failed_provider, XAIProvider):
            logger.info("Failing over from xAI to OpenAI fallback")
            return OpenAIProvider(
                api_key=self.settings.OPENAI_API_KEY,
                model=self.settings.OPENAI_FALLBACK_MODEL,
            )
        else:
            logger.info(f"Failing over from {failed_provider.provider_name} to OpenAI fallback")
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

        yield (
            f"> ⚠️ **Model Fallback Notice:** *Selected model `{primary.get_model_name()}` was unavailable ({str(exc)[:90]}). "
            f"Active backup responder: `{fallback.provider_name}` ({actual_model})*\n\n",
            actual_model,
        )

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

    async def stream_debate_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout_seconds: float = 25.0,
    ) -> AsyncIterator[Tuple[str, str]]:
        """
        Executes Multi-Model Debate Chat across all four AI models:
        1. Queries GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, and Claude 3.5 Haiku concurrently.
        2. Gathers their independent analyses and unique perspectives.
        3. Identifies common points, resolves conflicting viewpoints, and eliminates redundancy.
        4. Synthesizes a single, refined, consolidated final response streamed to the user.
        5. Handles timeouts or provider failures gracefully using available model outputs.
        """
        debate_candidates = [
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": OpenAIProvider(api_key=self.settings.OPENAI_API_KEY, model="gpt-4o"),
                "specialty": "Strategic Reasoning & In-Depth Multimodal Analysis",
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "provider": OpenAIProvider(api_key=self.settings.OPENAI_API_KEY, model="gpt-4o-mini"),
                "specialty": "Pragmatic Implementation & Efficiency",
            },
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "provider": AnthropicProvider(api_key=self.settings.ANTHROPIC_API_KEY, model="claude-3-5-sonnet-20241022"),
                "specialty": "Advanced Architectural Design & Deep Logic",
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "provider": AnthropicProvider(api_key=self.settings.ANTHROPIC_API_KEY, model="claude-3-5-haiku-20241022"),
                "specialty": "Rapid Analytical Precision & Fact Checking",
            },
        ]

        actual_model = "debate (4 models)"

        # 1. Concurrently query all 4 models with timeout and error shielding
        async def fetch_model_perspective(cand: Dict[str, Any]) -> Dict[str, Any]:
            try:
                text, _ = await asyncio.wait_for(
                    cand["provider"].generate_chat(
                        messages=messages,
                        system_prompt=system_prompt,
                        temperature=temperature,
                        max_tokens=min(max_tokens, 2048),
                    ),
                    timeout=timeout_seconds,
                )
                if text and text.strip():
                    return {
                        "id": cand["id"],
                        "name": cand["name"],
                        "specialty": cand["specialty"],
                        "text": text.strip(),
                        "ok": True,
                    }
            except Exception as e:
                logger.warning(f"Debate Chat: Candidate {cand['name']} ({cand['id']}) failed: {e}")
            return {
                "id": cand["id"],
                "name": cand["name"],
                "specialty": cand["specialty"],
                "text": None,
                "ok": False,
            }

        results = await asyncio.gather(*(fetch_model_perspective(c) for c in debate_candidates))
        successful = [r for r in results if r["ok"] and r["text"]]

        # 2. Fallback Handling: if no models responded, fall back to standard stream
        if not successful:
            logger.warning("Debate Chat: All models failed or timed out. Falling back to standard router.")
            async for token, used_model in self.stream_with_fallback(
                messages=messages,
                model_name="gpt-4o",
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                yield token, used_model
            return

        # If only 1 model responded, stream its perspective directly with attribution
        if len(successful) == 1:
            single = successful[0]
            yield f"> **Council Notice:** *Solo active responder:* **{single['name']}**\n\n", actual_model
            for chunk in single["text"].split(" "):
                yield chunk + " ", actual_model
            return

        # 3. Construct Consensus Synthesis Prompt
        perspectives_blocks = []
        participating_names = []
        for s in successful:
            participating_names.append(s["name"])
            perspectives_blocks.append(f"=== Perspective from {s['name']} (Specialty: {s['specialty']}) ===\n{s['text']}")

        all_perspectives = "\n\n".join(perspectives_blocks)
        user_query = messages[-1]["content"] if messages else "User question"

        synthesis_prompt = f"""You are the MasterChat Synthesis Engine presiding over a 4-model AI Debate Council.
The user asked:
\"\"\"{user_query}\"\"\"

The following {len(successful)} AI models independently debated this question and contributed their unique perspectives:
{all_perspectives}

YOUR MISSION:
Produce a single, refined, consolidated, and authoritative final response that represents the combined intelligence of the council.

Strict Synthesis Rules:
1. **Consensus & Best Insights:** Identify common agreements and incorporate the strongest, most accurate points from each model.
2. **Conflict Resolution:** If models disagree or present differing solutions, resolve the conflict logically, or clearly outline the nuanced trade-offs.
3. **Deduplication:** Aggressively eliminate duplicate sentences, repeated examples, and redundant filler. Every paragraph must add new value.
4. **Unified Voice:** Do NOT output separate sections like "Model 1 said... Model 2 said...". The response must read as ONE cohesive, polished, expertly reasoned response.
5. **Attribution:** Start with a clean Markdown blockquote:
> **Council Consensus:** *Synthesized insights from {', '.join(participating_names)}*

6. **Formatting:** Use elegant Markdown with clear structure, bold highlights, concise bullet points, and code blocks if applicable."""

        synthesis_messages = [
            {"role": "user", "content": synthesis_prompt},
        ]

        # 4. Stream the synthesized consolidated response token-by-token
        synthesizer_provider = self.get_provider("gpt-4o")
        try:
            stream = synthesizer_provider.stream_chat(
                messages=synthesis_messages,
                system_prompt="You are MasterChat, an enterprise AI synthesizing collective intelligence into clear, concise, actionable consensus.",
                temperature=0.5,
                max_tokens=max_tokens,
            )
            async for token in stream:
                yield token, actual_model
        except Exception as synth_err:
            logger.warning(f"Debate Chat: Synthesizer failed, falling back to top candidate: {synth_err}")
            best_candidate = successful[0]
            yield f"> **Council Consensus (Direct from {best_candidate['name']}):**\n\n", actual_model
            for chunk in best_candidate["text"].split(" "):
                yield chunk + " ", actual_model

    def list_models(self) -> List[Dict[str, Any]]:
        """Return catalog of available models and their explicit capabilities for UI and agent routing."""
        return [
            {
                "id": "debate",
                "name": "Debate Chat (4-Model Council)",
                "provider": "multi",
                "description": "Collaborative debate among all 4 AI models (GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, Claude 3.5 Haiku) consolidated into a single refined consensus response",
                "context_window": 128000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": True,
                    "audio_transcription": True,
                },
                "supported_features": [
                    "4-Model Consensus Synthesis",
                    "Multi-Perspective Analysis",
                    "Conflict Resolution & Deduplication",
                    "Document RAG & Web Search Grounding",
                ],
            },
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "openai",
                "description": "OpenAI flagship high-intelligence multimodal model with DALL-E 3 image generation",
                "context_window": 128000,
                "is_default": self.settings.DEFAULT_MODEL_PROVIDER == "openai",
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": True,
                    "audio_transcription": True,
                },
                "supported_features": [
                    "Web Search Grounding",
                    "Document RAG",
                    "Code Interpreter",
                ],
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "provider": "openai",
                "description": "Fast and lightweight OpenAI model with full multi-modal support",
                "context_window": 128000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": True,
                    "audio_transcription": True,
                },
                "supported_features": [
                    "Fast Chat & RAG",
                    "Web Search Grounding",
                ],
            },
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "provider": "anthropic",
                "description": "Anthropic premier intelligence model for deep reasoning, complex coding, and long context",
                "context_window": 200000,
                "is_default": self.settings.DEFAULT_MODEL_PROVIDER == "anthropic",
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": False,
                    "audio_transcription": False,
                },
                "supported_features": [
                    "Deep Analytical Reasoning",
                    "Advanced Code Synthesis",
                    "200K Long-Context RAG",
                    "Web Search Grounding",
                ],
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "provider": "anthropic",
                "description": "Ultra-fast response with high reasoning capability for quick analytical tasks",
                "context_window": 200000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": False,
                    "audio_transcription": False,
                },
                "supported_features": [
                    "Ultra-Fast Inference",
                    "Code & Logic Analysis",
                    "Document Analysis",
                ],
            },
            {
                "id": "gemini-2.5-flash-lite",
                "name": "Gemini 2.5 Flash Lite",
                "provider": "gemini",
                "description": "Google flagship next-gen multimodal AI with real-time speed and 1M token context window",
                "context_window": 1048576,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": True,
                    "audio_transcription": True,
                },
                "supported_features": [
                    "1M Context Window",
                    "Native Multimodal Vision",
                    "Real-Time Speed",
                    "Document RAG",
                ],
            },
            {
                "id": "gemini-2.5-pro",
                "name": "Gemini 2.5 Pro",
                "provider": "gemini",
                "description": "Google premier high-intelligence model with 2M token context for massive document analysis",
                "context_window": 2097152,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": True,
                    "audio_transcription": True,
                },
                "supported_features": [
                    "2M Ultra-Long Context",
                    "Deep Audio & Video Ingestion",
                    "Complex Multimodal Reasoning",
                ],
            },
            {
                "id": "grok-2",
                "name": "Grok 2",
                "provider": "xai",
                "description": "xAI flagship frontier model with state-of-the-art reasoning, truth-seeking analysis & coding",
                "context_window": 128000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": True,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": False,
                    "audio_transcription": False,
                },
                "supported_features": [
                    "Frontier Reasoning",
                    "Advanced Code Synthesis",
                    "Truth-Seeking Direct Analysis",
                ],
            },
            {
                "id": "sonar-pro",
                "name": "Perplexity Sonar Pro",
                "provider": "perplexity",
                "description": "Perplexity advanced online search model with multi-source factual verification and web synthesis",
                "context_window": 200000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": False,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": False,
                    "audio_transcription": False,
                },
                "supported_features": [
                    "Real-Time Web Intelligence",
                    "Live Citation Extraction",
                    "Fact Verification",
                ],
            },
            {
                "id": "sonar",
                "name": "Perplexity Sonar",
                "provider": "perplexity",
                "description": "Perplexity lightweight web-grounded search model for fast real-time factual inquiries",
                "context_window": 128000,
                "is_default": False,
                "capabilities": {
                    "text": True,
                    "vision": False,
                    "web_search": True,
                    "code_interpreter": True,
                    "rag": True,
                    "audio_speech": False,
                    "audio_transcription": False,
                },
                "supported_features": [
                    "Fast Search Retrieval",
                    "Web Grounding",
                ],
            },
        ]

    def get_model_capabilities(self, model_name: Optional[str] = None) -> Dict[str, bool]:
        """Look up capabilities map for a given model identifier."""
        req_id = (model_name or "").lower().strip()
        models = self.list_models()
        for m in models:
            if m["id"].lower() == req_id or (req_id and req_id in m["id"].lower()):
                return m.get("capabilities", {})

        # Default fallback: infer based on model vendor
        if "claude" in req_id or "anthropic" in req_id:
            return {
                "text": True,
                "vision": True,
                "web_search": True,
                "code_interpreter": True,
                "rag": True,
                "audio_speech": False,
                "audio_transcription": False,
            }
        elif "sonar" in req_id or "perplexity" in req_id:
            return {
                "text": True,
                "vision": False,
                "web_search": True,
                "code_interpreter": True,
                "rag": True,
                "audio_speech": False,
                "audio_transcription": False,
            }
        elif "grok" in req_id or "xai" in req_id:
            return {
                "text": True,
                "vision": True,
                "web_search": True,
                "code_interpreter": True,
                "rag": True,
                "audio_speech": False,
                "audio_transcription": False,
            }
        return {
            "text": True,
            "vision": True,
            "web_search": True,
            "code_interpreter": True,
            "rag": True,
            "audio_speech": True,
            "audio_transcription": True,
        }

    def supports_capability(self, model_name: Optional[str], capability: str) -> bool:
        """Check whether a model supports a specific capability."""
        caps = self.get_model_capabilities(model_name)
        return caps.get(capability, False)


router = ModelRouter()
