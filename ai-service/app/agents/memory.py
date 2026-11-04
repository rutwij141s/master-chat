import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.models import Conversation, Message
from app.providers.router import router

logger = logging.getLogger(__name__)


class ConversationMemoryManager:
    """Manages sliding window memory, rolling summaries, and title generation."""

    def __init__(self, window_size: int = 10):
        self.window_size = window_size

    async def get_conversation_context(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Fetch conversation, rolling summary, and recent sliding window messages."""
        conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
        conv_res = await db.execute(conv_stmt)
        conversation = conv_res.scalar_one_or_none()

        if not conversation:
            return {"summary": "", "messages": [], "conversation": None}

        # Fetch messages ordered chronologically
        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        msg_res = await db.execute(msg_stmt)
        all_messages = msg_res.scalars().all()

        formatted_messages = [
            {"role": m.role, "content": m.content}
            for m in all_messages
        ]

        # Sliding window
        recent_messages = formatted_messages[-self.window_size :] if len(formatted_messages) > self.window_size else formatted_messages

        return {
            "conversation": conversation,
            "summary": conversation.summary or "",
            "messages": recent_messages,
            "total_count": len(all_messages),
        }

    async def update_rolling_summary(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        all_messages: List[Dict[str, str]],
        existing_summary: str,
    ) -> Optional[str]:
        """If message count grows beyond window, generate/update rolling summary."""
        if len(all_messages) <= self.window_size:
            return existing_summary

        try:
            # Generate summary of earlier messages
            messages_to_summarize = all_messages[:-self.window_size]
            prompt = (
                f"Previous summary: {existing_summary or 'None'}\n\n"
                f"Older messages:\n"
                + "\n".join(f"{m['role']}: {m['content'][:300]}" for m in messages_to_summarize[-4:])
                + "\n\nProvide a concise 2-3 sentence updated summary of key user preferences, topics, and decisions discussed."
            )

            provider = router.get_provider()
            new_summary, _ = await provider.generate_chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You are an expert conversation summarizer.",
                max_tokens=256,
            )

            stmt = (
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(summary=new_summary)
            )
            await db.execute(stmt)
            await db.commit()
            return new_summary
        except Exception as e:
            logger.warning(f"Could not update rolling summary: {e}")
            return existing_summary

    async def auto_generate_title(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_message: str,
        assistant_message: str,
    ) -> str:
        """Auto-generate a 3 to 6 word title for a new conversation."""
        try:
            prompt = (
                f"User message: {user_message[:300]}\n"
                f"Assistant reply: {assistant_message[:300]}\n\n"
                "Generate a concise, catchy 3 to 5 word title for this chat topic. "
                "Respond ONLY with the title text, without quotes or punctuation."
            )
            provider = router.get_provider()
            title_text, _ = await provider.generate_chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You are a concise title generator.",
                max_tokens=30,
            )
            clean_title = title_text.strip().replace('"', '').replace("'", "")[:60]
            if not clean_title:
                clean_title = user_message[:30] + "..."

            stmt = (
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(title=clean_title)
            )
            await db.execute(stmt)
            await db.commit()
            return clean_title
        except Exception as e:
            logger.warning(f"Failed to auto-generate title: {e}")
            fallback_title = user_message[:28] + ("..." if len(user_message) > 28 else "")
            return fallback_title


memory_manager = ConversationMemoryManager()
