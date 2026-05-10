"""
NEURO Backend — Agent Router
AI conversational agent endpoints with WebSocket support
"""

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel, Field
import httpx
import structlog

from config import settings
from services.agent_service import neuro_agent
from services.elevenlabs_service import ElevenLabsService, elevenlabs_service

logger = structlog.get_logger()
router = APIRouter()


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    wallet_address: str | None = Field(default=None)
    session_id: str | None = Field(default=None)


class AgentChatResponse(BaseModel):
    response: str
    intent: str | None = None
    action: dict | None = None
    session_id: str


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(request: AgentChatRequest):
    """Send a message to the NEURO AI agent."""
    result = await neuro_agent.process_message(
        message=request.message,
        wallet_address=request.wallet_address,
        session_id=request.session_id,
    )
    return AgentChatResponse(**result)


@router.websocket("/ws/{session_id}")
async def agent_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time AI agent communication."""
    if settings.AGENT_WS_TOKEN:
        supplied = websocket.query_params.get("token", "")
        if supplied != settings.AGENT_WS_TOKEN:
            await websocket.close(code=1008)
            logger.warning("agent_ws_rejected_bad_token", session_id=session_id)
            return

    await websocket.accept()
    logger.info("agent_ws_connected", session_id=session_id)

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            wallet = data.get("wallet_address")

            if not message:
                await websocket.send_json({"error": "Empty message"})
                continue

            # Stream response
            await websocket.send_json({"type": "thinking", "content": "Processing..."})

            result = await neuro_agent.process_message(
                message=message,
                wallet_address=wallet,
                session_id=session_id,
            )

            await websocket.send_json({
                "type": "response",
                "content": result["response"],
                "intent": result.get("intent"),
                "action": result.get("action"),
            })

    except WebSocketDisconnect:
        logger.info("agent_ws_disconnected", session_id=session_id)
    except Exception as e:
        logger.error("agent_ws_error", error=str(e), session_id=session_id)
        await websocket.close(code=1011, reason=str(e))


class VoiceSignedUrlRequest(BaseModel):
    """Optional override; defaults to server ELEVENLABS_AGENT_ID."""

    agent_id: str | None = Field(default=None, max_length=128)


@router.post("/voice/signed-url")
async def voice_signed_url(body: VoiceSignedUrlRequest):
    """
    Returns a short-lived signed WebSocket URL so the browser can connect to ConvAI
    without embedding the ElevenLabs API key. Required for private agents.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ELEVENLABS_API_KEY is not configured on the server",
        )

    override = (body.agent_id or "").strip()
    agent_id = override or (settings.ELEVENLABS_AGENT_ID or "").strip()

    if not agent_id:
        raise HTTPException(
            status_code=400,
            detail="agent_id required in request body or set ELEVENLABS_AGENT_ID in backend/.env",
        )

    try:
        signed = ElevenLabsService.get_signed_conversation_url(
            agent_id=agent_id,
            api_key=settings.ELEVENLABS_API_KEY,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except httpx.HTTPStatusError as e:
        detail = e.response.text[:500] if e.response else str(e)
        raise HTTPException(
            status_code=502,
            detail=(
                f"ElevenLabs API error {e.response.status_code if e.response else ''}: {detail}"
            ),
        ) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"ElevenLabs request failed: {e}") from e

    return {"signed_url": signed}


class VoiceTtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    voice_id: str | None = Field(default=None, max_length=64)
    model_id: str | None = Field(default=None, max_length=64)


@router.post("/voice/tts")
async def voice_tts(body: VoiceTtsRequest):
    """
    Server-side ElevenLabs Text-To-Speech.
    Returns an audio/mpeg stream so mobile clients can play it directly
    without ever seeing the API key.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ELEVENLABS_API_KEY is not configured on the server",
        )

    voice_id = (body.voice_id or "JBFqnCBsd6RMkjVDRZzb").strip()
    model_id = (body.model_id or "eleven_turbo_v2_5").strip()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": body.text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": 0.45,
                        "similarity_boost": 0.75,
                        "style": 0.25,
                        "use_speaker_boost": True,
                    },
                },
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"ElevenLabs request failed: {e}") from e

    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs TTS error {resp.status_code}: {detail}",
        )

    return Response(content=resp.content, media_type="audio/mpeg")


@router.post("/voice/stt")
async def voice_stt(
    file: UploadFile = File(..., description="Audio file (m4a, wav, mp3, ogg)"),
    language_code: str | None = Form(default=None),
):
    """
    Server-side ElevenLabs Scribe Speech-To-Text.
    Returns the transcript so the mobile client never needs the API key.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ELEVENLABS_API_KEY is not configured on the server",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    files = {
        "file": (file.filename or "audio.m4a", raw, file.content_type or "audio/m4a"),
    }
    data: dict[str, str] = {"model_id": "scribe_v1"}
    if language_code:
        data["language_code"] = language_code

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                files=files,
                data=data,
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"ElevenLabs request failed: {e}") from e

    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs STT error {resp.status_code}: {detail}",
        )

    payload = resp.json()
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="Empty transcript from ElevenLabs")

    return {
        "text": text,
        "language_code": payload.get("language_code"),
        "language_probability": payload.get("language_probability"),
    }


@router.get("/voice/capabilities")
async def voice_capabilities():
    """ElevenLabs configuration reachable server-side (browser voice still talks to ElevenLabs directly)."""
    tools = elevenlabs_service.get_agent_tools()
    return {
        "elevenlabs_api_configured": bool(settings.ELEVENLABS_API_KEY),
        "elevenlabs_agent_configured": bool(settings.ELEVENLABS_AGENT_ID),
        "voice_ready": bool(settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_AGENT_ID),
        "tool_definitions_available": len(tools),
    }


@router.get("/tools")
async def list_agent_tools():
    """List available AI agent tools."""
    return {
        "tools": [
            {
                "name": "get_yield_analysis",
                "description": "Analyze yield opportunities across Solana DeFi protocols",
            },
            {
                "name": "execute_cross_chain_move",
                "description": "Bridge assets from another chain to Solana and deposit into vault",
            },
            {
                "name": "get_portfolio_risk",
                "description": "Analyze portfolio risk metrics and exposure",
            },
        ]
    }
