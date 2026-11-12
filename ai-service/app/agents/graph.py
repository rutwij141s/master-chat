import re
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
    """Determines execution path: direct answer, RAG retrieval, tool call, or web search."""
    user_input = state.get("user_input", "")
    use_rag = state.get("use_rag", False)
    doc_ids = state.get("doc_ids")

    # Document intent detection: auto-route to RAG if user refers to documents or asks to summarize
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

    # Math/Calculation intent
    calc_match = re.search(r"(?:calculate|eval|what is|compute)\s+([0-9\.\+\-\*\/\^\(\)\s]+)", user_input, re.IGNORECASE)
    if calc_match and any(op in calc_match.group(1) for op in ["+", "-", "*", "/", "^"]):
        return {"route": "tool"}

    # Web search intent
    search_keywords = ["search web", "look up", "current weather", "latest news", "stock price of", "search for"]
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

    # Deduplicate candidate chunks while preserving order
    seen_ids = set()
    final_candidates = []
    for c in candidate_chunks + mmr_chunks:
        if c["id"] not in seen_ids:
            seen_ids.add(c["id"])
            final_candidates.append(c)

    if not is_summary and final_candidates:
        # Cross-Encoder Rerank for specific queries
        reranked = reranker.rerank(query=query, chunks=final_candidates, top_k=4)
    else:
        # For summaries, sort by chunk_index to present a coherent narrative flow
        final_candidates.sort(key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
        reranked = final_candidates[:8]

    # Delimit context and format citations
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


async def web_search_node(state: AgentState) -> Dict[str, Any]:
    """Execute real-time web search."""
    user_input = state.get("user_input", "")
    # Extract search query
    clean_query = re.sub(r"(?i)(search web for|search for|look up|search web)", "", user_input).strip()
    result = await AgentTools.web_search(clean_query or user_input)
    return {"tool_result": f"Web Search Results for '{clean_query}':\n{result}"}


def synthesis_node(state: AgentState) -> Dict[str, Any]:
    """Constructs final augmented prompt and message sequence for LLM synthesis."""
    # State holds messages and injected contexts
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
        },
    )

    workflow.add_edge("direct_node", "synthesis_node")
    workflow.add_edge("rag_node", "synthesis_node")
    workflow.add_edge("tool_node", "synthesis_node")
    workflow.add_edge("web_search_node", "synthesis_node")
    workflow.add_edge("synthesis_node", END)

    # In-memory checkpointer for conversation workflow state
    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)


agent_workflow = build_agent_graph()
