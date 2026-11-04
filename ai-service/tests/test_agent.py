import pytest
from app.agents.tools import AgentTools
from app.agents.graph import router_node, build_agent_graph


def test_calculator_tool():
    # Valid math operations
    assert "25" in AgentTools.calculate("5 * 5")
    assert "16" in AgentTools.calculate("2^4")
    assert "12" in AgentTools.calculate("sqrt(144)")
    assert "42" in AgentTools.calculate("(10 + 4) * 3")

    # Invalid expression handling
    res = AgentTools.calculate("__import__('os').system('ls')")
    assert "error" in res.lower() or "not allowed" in res.lower()


def test_agent_router_classification():
    # RAG intent
    state_rag = {"user_input": "Summarize my uploaded notes", "use_rag": True}
    res_rag = router_node(state_rag)
    assert res_rag["route"] == "rag"

    # Math computation intent
    state_tool = {"user_input": "calculate 45 * 12 + 8", "use_rag": False}
    res_tool = router_node(state_tool)
    assert res_tool["route"] == "tool"

    # Web search intent
    state_web = {"user_input": "search web for latest news today", "use_rag": False}
    res_web = router_node(state_web)
    assert res_web["route"] == "web"

    # Direct conversation intent
    state_direct = {"user_input": "Hello! How are you?", "use_rag": False}
    res_direct = router_node(state_direct)
    assert res_direct["route"] == "direct"


@pytest.mark.asyncio
async def test_agent_graph_execution():
    graph = build_agent_graph()
    initial_state = {
        "user_id": "usr-test",
        "conversation_id": "conv-test",
        "messages": [],
        "user_input": "calculate 10 + 20",
        "model": "gpt-4o",
        "use_rag": False,
        "doc_ids": None,
        "route": "direct",
        "retrieved_context": "",
        "citations": [],
        "tool_result": None,
        "system_prompt": None,
        "response_text": "",
        "summary": "",
    }

    config = {"configurable": {"thread_id": "conv-test"}}
    final_state = await graph.ainvoke(initial_state, config=config)
    assert final_state["route"] == "tool"
    assert "30" in str(final_state.get("tool_result"))
