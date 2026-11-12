import json
import uuid
import logging
from typing import AsyncIterator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db, AsyncSessionLocal
from app.db.models import Conversation, Message, UsageLog
from app.api.deps import get_current_user_id
from app.schemas.chat import ChatStreamRequest, ChatStreamChunk, ChatCitation
from app.agents.graph import agent_workflow
from app.agents.memory import memory_manager
from app.providers.router import router

logger = logging.getLogger(__name__)
router_api = APIRouter()


async def stream_generator(
    req: ChatStreamRequest,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_msg_id: uuid.UUID,
    is_new_conversation: bool,
) -> AsyncIterator[str]:
    """Asynchronous Server-Sent Events generator streaming agent tokens, citations, and completion state."""
    full_response_text = ""
    citations_emitted = []
    actual_model_used = req.model or "gpt-4o"
    prompt_tokens = 0
    completion_tokens = 0

    try:
        # Load conversation memory context
        async with AsyncSessionLocal() as db:
            context_data = await memory_manager.get_conversation_context(db, conversation_id)
            history_messages = context_data.get("messages", [])
            rolling_summary = context_data.get("summary", "")

        # Initial state for LangGraph workflow
        initial_state = {
            "user_id": str(user_id),
            "conversation_id": str(conversation_id),
            "messages": history_messages,
            "user_input": req.message,
            "model": req.model or "default",
            "use_rag": req.use_rag,
            "use_web_search": req.use_web_search,
            "doc_ids": [str(d) for d in req.doc_ids] if req.doc_ids else None,
            "route": "direct",
            "retrieved_context": "",
            "citations": [],
            "tool_result": None,
            "system_prompt": req.system_prompt,
            "response_text": "",
            "summary": rolling_summary,
        }

        # Execute LangGraph router and retrieval nodes
        config = {"configurable": {"thread_id": str(conversation_id)}}
        final_state = await agent_workflow.ainvoke(initial_state, config=config)

        # 1. Emit Citations if available
        if final_state.get("citations"):
            citations_emitted = final_state["citations"]
            citation_chunk = ChatStreamChunk(
                type="citation",
                citations=[ChatCitation(**c) for c in citations_emitted],
            )
            yield f"data: {json.dumps(citation_chunk.model_dump())}\n\n"

        # 2. Construct messages for synthesis LLM
        system_instructions = (
            "You are an expert AI assistant. Provide direct, beautifully structured, and accurate responses.\n"
            "Use Markdown formatting with tables, bullet points, and code blocks where helpful."
        )
        if final_state.get("retrieved_context"):
            system_instructions += (
                "\n\nYou have direct access to reference documents and live retrieved information in the prompt context.\n"
                "Ground your answers thoroughly in these references. Include hyperlinks or reference citations where helpful, "
                "synthesize a detailed, well-structured response with key sections, bullet points, and main takeaways based strictly on the factual content provided."
            )
        if final_state.get("summary"):
            system_instructions += f"\n\nContext summary of earlier discussion:\n{final_state['summary']}"

        augmented_system_prompt = req.system_prompt or system_instructions

        messages_for_llm = []
        # Append recent history
        for m in history_messages[-6:]:
            messages_for_llm.append({"role": m["role"], "content": m["content"]})

        # Augment with tool or RAG grounding if present
        user_content = req.message
        if final_state.get("retrieved_context"):
            user_content = f"{final_state['retrieved_context']}\n\nUser Question: {req.message}"
        elif final_state.get("tool_result"):
            user_content = f"Tool Output:\n{final_state['tool_result']}\n\nBased on this tool output, answer the user request: {req.message}"

        messages_for_llm.append({"role": "user", "content": user_content})

        # Estimate prompt tokens
        prompt_tokens = sum(len(m["content"]) // 4 for m in messages_for_llm)

        # 3. Stream tokens with provider fallback
        async for token, used_model in router.stream_with_fallback(
            messages=messages_for_llm,
            model_name=req.model,
            system_prompt=augmented_system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens or 4096,
        ):
            actual_model_used = used_model
            full_response_text += token
            completion_tokens += 1
            token_chunk = ChatStreamChunk(
                type="token",
                token=token,
                model=used_model,
            )
            yield f"data: {json.dumps(token_chunk.model_dump())}\n\n"

        # 4. Save assistant response and update memory in DB
        async with AsyncSessionLocal() as db:
            asst_msg_id = uuid.uuid4()
            asst_msg = Message(
                id=asst_msg_id,
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                content=full_response_text,
                model=actual_model_used,
                tokens=completion_tokens,
                sources=citations_emitted if citations_emitted else None,
            )
            db.add(asst_msg)

            # Record usage and cost
            cost_per_1k = 0.005 if "claude" in actual_model_used or "gpt-4o" in actual_model_used else 0.0005
            est_cost = ((prompt_tokens + completion_tokens) / 1000.0) * cost_per_1k
            usage_log = UsageLog(
                id=uuid.uuid4(),
                user_id=user_id,
                conversation_id=conversation_id,
                model=actual_model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens,
                estimated_cost=est_cost,
            )
            db.add(usage_log)
            await db.commit()

            # Auto-generate title if this is the first turn
            new_title = None
            if is_new_conversation:
                new_title = await memory_manager.auto_generate_title(
                    db=db,
                    conversation_id=conversation_id,
                    user_message=req.message,
                    assistant_message=full_response_text,
                )

            # Emit final completion state
            done_chunk = ChatStreamChunk(
                type="done",
                conversation_id=str(conversation_id),
                message_id=str(asst_msg_id),
                title=new_title,
                model=actual_model_used,
                usage={
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                    "estimated_cost": est_cost,
                },
            )
            yield f"data: {json.dumps(done_chunk.model_dump())}\n\n"

    except Exception as e:
        logger.exception("Error during chat stream execution")
        err_chunk = ChatStreamChunk(
            type="error",
            error=str(e),
        )
        yield f"data: {json.dumps(err_chunk.model_dump())}\n\n"


@router_api.post("/chat/stream")
async def chat_stream(
    req: ChatStreamRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream tokens from conversational agent via Server-Sent Events (SSE).
    """
    is_new = False
    conv_id = req.conversation_id

    if not conv_id:
        # Create new conversation
        is_new = True
        conv_id = uuid.uuid4()
        new_conv = Conversation(
            id=conv_id,
            user_id=user_id,
            title="New Chat",
        )
        db.add(new_conv)
        await db.commit()
    else:
        # Verify conversation ownership
        stmt = select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user_id,
        )
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Conversation not found")

    # Persist user message immediately
    user_msg_id = uuid.uuid4()
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=req.message,
        tokens=len(req.message) // 4,
    )
    db.add(user_msg)
    await db.commit()

    return StreamingResponse(
        stream_generator(
            req=req,
            user_id=user_id,
            conversation_id=conv_id,
            user_msg_id=user_msg_id,
            is_new_conversation=is_new,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
