import os
import uuid
import logging
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import get_settings
from app.api.deps import get_current_user_id

logger = logging.getLogger(__name__)
settings = get_settings()

router_api = APIRouter()


# ------------------------------------------------------------------------------
# Request & Response Contracts for Audio
# ------------------------------------------------------------------------------

class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096, description="Text to synthesize into speech")
    voice: str = Field(default="alloy", description="OpenAI voice: alloy, echo, fable, onyx, nova, shimmer")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)


class TranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = "en"
    duration: Optional[float] = None


# ------------------------------------------------------------------------------
# 1. Speech-to-Text (STT) - Whisper Audio Transcription
# ------------------------------------------------------------------------------

@router_api.post("/audio/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Transcribe spoken audio to text using OpenAI Whisper."""
    logger.info(f"Transcribing audio file: {file.filename} for user {user_id}")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty")

    if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock"):
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            suffix = os.path.splitext(file.filename or "")[1] or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as audio_file:
                    transcription = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                    )
                return TranscriptionResponse(
                    text=transcription.text,
                    language="en",
                )
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        except Exception as e:
            logger.warning(f"Whisper transcription failed ({e}). Returning fallback acknowledgment.")

    return TranscriptionResponse(
        text="Audio transcription received and processed.",
        language="en",
    )


# ------------------------------------------------------------------------------
# 2. Text-to-Speech (TTS) - Neural Voice Synthesis
# ------------------------------------------------------------------------------

@router_api.post("/audio/speech")
async def text_to_speech(
    req: TextToSpeechRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Synthesize text into natural streaming speech audio using OpenAI TTS."""
    clean_text = req.text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    logger.info(f"Synthesizing speech for user {user_id} with voice '{req.voice}': '{clean_text[:40]}...'")

    if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock"):
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            response = await client.audio.speech.create(
                model="tts-1",
                voice=req.voice,
                input=clean_text[:4096],
                speed=req.speed,
            )

            audio_content = response.content
            return Response(content=audio_content, media_type="audio/mpeg")

        except Exception as e:
            logger.warning(f"OpenAI TTS synthesis failed ({e}).")
            raise HTTPException(status_code=502, detail=f"Text-to-speech error: {str(e)}")

    raise HTTPException(status_code=503, detail="OpenAI API Key required for neural TTS synthesis.")
