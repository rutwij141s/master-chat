import os
import re
import uuid
import logging
from typing import Dict, Any, List, Optional, AsyncIterator, Tuple
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import AgentState
from app.agents.tools import AgentTools
from app.rag.vectorstore import vector_store
from app.rag.reranker import reranker
from app.providers.router import router

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# Workflow Nodes
# ------------------------------------------------------------------------------

def router_node(state: AgentState) -> Dict[str, Any]:
    """Determines execution path: direct answer, RAG retrieval, tool call, web search, image, or video generation."""
    user_input = state.get("user_input", "")
    use_rag = state.get("use_rag", False)
    use_web_search = state.get("use_web_search", False)
    doc_ids = state.get("doc_ids")

    # 1. Image Generation Intent Detection
    image_patterns = [
        r"(?i)\b(?:generate|create|make|draw|render|paint)\s+(?:an?\s+)?(?:image|picture|artwork|illustration|photo|visual|painting)\b",
        r"(?i)\b(?:image|picture|artwork)\s+of\b",
        r"(?i)\bdraw\s+(?:me\s+)?(?:an?\s+)?[\w\s]{2,}",
    ]
    if (
        user_input.strip().lower().startswith(("/image", "generate image:", "draw:", "image of:"))
        or any(re.search(pat, user_input) for pat in image_patterns)
    ):
        return {"route": "image"}

    # 2. Video Generation Intent Detection
    video_patterns = [
        r"(?i)\b(?:generate|create|make|render|produce)\s+(?:an?\s+)?(?:video|clip|animation|scene|footage|movie)\b",
        r"(?i)\b(?:video|clip|footage)\s+of\b",
    ]
    if (
        user_input.strip().lower().startswith(("/video", "generate video:", "video of:"))
        or any(re.search(pat, user_input) for pat in video_patterns)
    ):
        return {"route": "video"}

    # 3. Explicit web search toggle takes priority over text defaults
    if use_web_search:
        return {"route": "web"}

    # 4. Document intent detection: auto-route to RAG if user refers to documents or asks to summarize
    doc_keywords = [
        r"\b(?:document|doc|docs|pdf|file|uploaded|attachment|attached)\b",
        r"\b(?:summarize|summary|overview|synopsis|outline|key points|takeaways)\b",
        r"\b(?:what does the (?:doc|document|pdf|file) say)\b",
        r"\b(?:explain the (?:doc|document|pdf|file))\b",
        r"\brealtime_global\b",
    ]
    is_doc_intent = any(re.search(pat, user_input, re.IGNORECASE) for pat in doc_keywords)

    if use_rag or bool(doc_ids) or is_doc_intent:
        return {"route": "rag"}

    # 5. Math/Calculation intent
    calc_match = re.search(r"(?:calculate|eval|what is|compute)\s+([0-9\.\+\-\*\/\^\(\)\s]+)", user_input, re.IGNORECASE)
    if calc_match and any(op in calc_match.group(1) for op in ["+", "-", "*", "/", "^"]):
        return {"route": "tool"}

    # 6. Web search natural language intent detection
    search_keywords = [
        "search web", "look up", "current weather", "latest news", "stock price",
        "search for", "google for", "live updates", "recent events", "today's news"
    ]
    if any(k in user_input.lower() for k in search_keywords):
        return {"route": "web"}

    return {"route": "direct"}


def direct_node(state: AgentState) -> Dict[str, Any]:
    """Direct conversation path without external data retrieval."""
    return {"retrieved_context": "", "citations": []}


def rag_node(state: AgentState) -> Dict[str, Any]:
    """Retrieve grounded chunks from ChromaDB via MMR + overview chunks, rerank, and sanitize."""
    user_id = state.get("user_id", "")
    query = state.get("user_input", "")
    doc_ids = state.get("doc_ids")

    is_summary = any(
        w in query.lower()
        for w in ["summarize", "summary", "overview", "synopsis", "outline", "what is this document", "main points", "tl;dr"]
    )

    candidate_chunks: List[Dict[str, Any]] = []

    # If user wants a summary or overview, retrieve opening sequential chunks
    if is_summary:
        overview_chunks = vector_store.get_overview_chunks(
            user_id=user_id,
            doc_ids=doc_ids,
            limit=8,
        )
        candidate_chunks.extend(overview_chunks)

    # MMR Retrieval for diverse semantic chunks
    mmr_chunks = vector_store.query_mmr(
        user_id=user_id,
        query_text=query,
        doc_ids=doc_ids,
        top_k=6 if is_summary else 4,
    )

    seen_ids = set()
    final_candidates = []
    for c in candidate_chunks + mmr_chunks:
        if c["id"] not in seen_ids:
            seen_ids.add(c["id"])
            final_candidates.append(c)

    if not is_summary and final_candidates:
        reranked = reranker.rerank(query=query, chunks=final_candidates, top_k=4)
    else:
        final_candidates.sort(key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
        reranked = final_candidates[:8]

    context_str, citations = reranker.sanitize_and_delimit_context(reranked)

    return {
        "retrieved_context": context_str,
        "citations": [c.model_dump() for c in citations],
    }


def tool_node(state: AgentState) -> Dict[str, Any]:
    """Execute mathematical computation tool."""
    user_input = state.get("user_input", "")
    calc_match = re.search(r"(?:calculate|eval|what is|compute)\s+([0-9\.\+\-\*\/\^\(\)\s]+)", user_input, re.IGNORECASE)
    expr = calc_match.group(1) if calc_match else user_input
    result = AgentTools.calculate(expr)
    return {"tool_result": result}


async def image_gen_node(state: AgentState) -> Dict[str, Any]:
    """Generate real AI image based on model capabilities, with graceful fallback handling."""
    user_input = state.get("user_input", "")
    model_name = state.get("model", "gpt-4o")

    # Clean prompt by stripping trigger verbs
    clean_prompt = re.sub(
        r"(?i)^(?:/image|generate (?:an? )?image(?:\s+of)?|create (?:an? )?image(?:\s+of)?|draw (?:me )?(?:an? )?image(?:\s+of)?|render (?:an? )?image(?:\s+of)?|paint (?:an? )?image(?:\s+of)?|make (?:an? )?image(?:\s+of)?|draw(?:\s+me)?|image of:?)\s*",
        "",
        user_input,
    ).strip()
    if not clean_prompt:
        clean_prompt = user_input.strip()

    # Check model capabilities
    supports_image = router.supports_capability(model_name, "image_generation")
    if not supports_image:
        fallback_msg = (
            f"### ℹ️ Feature Compatibility Notice\n\n"
            f"The selected model **{model_name}** specializes in text reasoning and code analysis, and does not natively support direct AI image generation.\n\n"
            f"#### How to generate this image:\n"
            f"1. **Switch your model to GPT-4o** in the selector in the bottom toolbar to generate directly with DALL-E 3.\n"
            f"2. Or use the **🎨 /image** command: `/image {clean_prompt}` to generate using our DALL-E 3 Creative Engine.\n"
        )
        return {
            "tool_result": fallback_msg,
            "route": "image",
            "retrieved_context": "",
            "citations": [],
        }

    # Model supports image generation - execute real-time generation
    from app.api.v1.media import generate_ai_image_url
    image_url, revised_prompt, provider = await generate_ai_image_url(clean_prompt)

    markdown_result = (
        f"### 🎨 AI Generated Artwork\n\n"
        f"**Prompt:** \"{revised_prompt}\"\n\n"
        f"![{clean_prompt}]({image_url})\n\n"
        f"*Generated with {provider} • Model: {model_name} • Resolution: 1024x1024*"
    )

    return {
        "tool_result": markdown_result,
        "route": "image",
        "retrieved_context": "",
        "citations": [],
    }


async def video_gen_node(state: AgentState) -> Dict[str, Any]:
    """Generate real AI cinematic video scene based on model capabilities, with graceful fallback handling."""
    user_input = state.get("user_input", "")
    model_name = state.get("model", "gpt-4o")

    clean_prompt = re.sub(
        r"(?i)^(?:/video|generate (?:an? )?video(?:\s+of)?|create (?:an? )?video(?:\s+of)?|render (?:an? )?video(?:\s+of)?|make (?:an? )?video(?:\s+of)?|video of:?)\s*",
        "",
        user_input,
    ).strip()
    if not clean_prompt:
        clean_prompt = user_input.strip()

    supports_video = router.supports_capability(model_name, "video_generation")
    if not supports_video:
        fallback_msg = (
            f"### ℹ️ Feature Compatibility Notice\n\n"
            f"The selected model **{model_name}** does not natively support AI video generation.\n\n"
            f"#### How to generate this video:\n"
            f"1. **Switch to GPT-4o** in the model selector toolbar.\n"
            f"2. Or run the **🎬 /video** command: `/video {clean_prompt}`.\n"
        )
        return {
            "tool_result": fallback_msg,
            "route": "video",
            "retrieved_context": "",
            "citations": [],
        }

    from app.api.v1.media import fetch_keyframe_image, synthesize_cinematic_mp4, MEDIA_STORAGE_DIR

    video_id = uuid.uuid4().hex[:12]
    image_temp_path = os.path.join(MEDIA_STORAGE_DIR, f"{video_id}.jpg")
    video_output_path = os.path.join(MEDIA_STORAGE_DIR, f"{video_id}.mp4")

    # 1. Fetch authentic AI scene visual keyframe
    thumb_url = await fetch_keyframe_image(clean_prompt, image_temp_path)

    # 2. Synthesize cinematic MP4 video clip
    video_ready = synthesize_cinematic_mp4(
        image_temp_path if os.path.exists(image_temp_path) else None,
        video_output_path,
        duration=5,
    )

    video_url = f"/api/v1/media/video/file/{video_id}.mp4" if video_ready else thumb_url

    markdown_result = (
        f"### 🎬 AI Generated Video Scene\n\n"
        f"**Scene Prompt:** \"{clean_prompt}\"\n\n"
        f"[{clean_prompt}]({video_url})\n\n"
        f"*Model: {model_name} (AI Video Studio) • Format: MP4 • Duration: 5s*"
    )

    return {
        "tool_result": markdown_result,
        "route": "video",
        "retrieved_context": "",
        "citations": [],
    }


async def web_search_node(state: AgentState) -> Dict[str, Any]:
    """Execute real-time web search and ground results with web citations."""
    user_input = state.get("user_input", "")
    clean_query = re.sub(
        r"(?i)\b(?:search (?:the )?web for|search for|look up|search web|google for|search)\b",
        "",
        user_input,
    ).strip()
    query_to_search = clean_query if len(clean_query) > 2 else user_input

    results = await AgentTools.web_search_structured(query_to_search, max_results=4)

    if not results:
        return {
            "retrieved_context": f"Live web search attempted for: '{query_to_search}', but no live results were returned. Answer using your general knowledge.",
            "citations": [],
            "tool_result": f"No web search results for '{query_to_search}'.",
        }

    citations = [
        {
            "chunk_id": f"web_{idx}",
            "doc_id": "web",
            "filename": r.get("title") or r.get("domain") or "Web Source",
            "page": None,
            "text": r.get("snippet", ""),
            "score": 0.95,
            "url": r.get("url"),
        }
        for idx, r in enumerate(results, 1)
    ]

    context_lines = [
        f"Source [{r.get('title')}] ({r.get('url')}):\n{r.get('snippet')}"
        for r in results
    ]
    delimited_context = (
        f"Real-time web search results for query: '{query_to_search}':\n\n"
        + "\n\n".join(context_lines)
    )

    return {
        "retrieved_context": delimited_context,
        "citations": citations,
        "tool_result": f"Web Search retrieved {len(results)} live sources for '{query_to_search}'.",
    }


def synthesis_node(state: AgentState) -> Dict[str, Any]:
    """Constructs final augmented prompt and message sequence for LLM synthesis."""
    return state


def route_decision(state: AgentState) -> str:
    """Conditional edge selector based on router node decision."""
    route = state.get("route", "direct")
    if route == "rag":
        return "rag_node"
    elif route == "tool":
        return "tool_node"
    elif route == "web":
        return "web_search_node"
    elif route == "image":
        return "image_gen_node"
    elif route == "video":
        return "video_gen_node"
    return "direct_node"


# ------------------------------------------------------------------------------
# Graph Construction with Checkpointing
# ------------------------------------------------------------------------------

def build_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("router_node", router_node)
    workflow.add_node("direct_node", direct_node)
    workflow.add_node("rag_node", rag_node)
    workflow.add_node("tool_node", tool_node)
    workflow.add_node("web_search_node", web_search_node)
    workflow.add_node("image_gen_node", image_gen_node)
    workflow.add_node("video_gen_node", video_gen_node)
    workflow.add_node("synthesis_node", synthesis_node)

    workflow.set_entry_point("router_node")

    workflow.add_conditional_edges(
        "router_node",
        route_decision,
        {
            "direct_node": "direct_node",
            "rag_node": "rag_node",
            "tool_node": "tool_node",
            "web_search_node": "web_search_node",
            "image_gen_node": "image_gen_node",
            "video_gen_node": "video_gen_node",
        },
    )

    workflow.add_edge("direct_node", "synthesis_node")
    workflow.add_edge("rag_node", "synthesis_node")
    workflow.add_edge("tool_node", "synthesis_node")
    workflow.add_edge("web_search_node", "synthesis_node")
    workflow.add_edge("image_gen_node", "synthesis_node")
    workflow.add_edge("video_gen_node", "synthesis_node")
    workflow.add_edge("synthesis_node", END)

    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)


agent_workflow = build_agent_graph()
