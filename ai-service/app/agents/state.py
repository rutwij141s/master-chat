import uuid
from typing import List, Dict, Any, Optional, TypedDict


class AgentState(TypedDict):
    """LangGraph state representation for conversation orchestrations."""
    user_id: str
    conversation_id: str
    messages: List[Dict[str, str]]
    user_input: str
    model: str
    use_rag: bool
    doc_ids: Optional[List[str]]
    route: str  # "direct" | "rag" | "tool" | "web"
    retrieved_context: str
    citations: List[Dict[str, Any]]
    tool_result: Optional[str]
    system_prompt: Optional[str]
    response_text: str
    summary: str
