"""
NEURO Backend — ElevenLabs Conversational AI Service
Voice-ready agent with streaming WebSocket support
"""

import json
from typing import Any, AsyncGenerator

import httpx
import structlog
import websockets

from config import settings

logger = structlog.get_logger()


class ElevenLabsService:
    """ElevenLabs WebSocket streaming agent for voice DeFi interaction."""

    AGENT_SYSTEM_PROMPT = """You are NEURO, an AI private banker for crypto natives.
Your personality:
- Intelligent and analytical
- Futuristic but grounded
- Calm and measured
- Concise — no unnecessary words
- Trustworthy — always transparent about risks

You help users:
1. Bridge assets across chains to Solana
2. Analyze yield opportunities (Jito, Kamino, Drift, MarginFi)
3. Manage vault risk scores
4. Optimize DeFi portfolio allocation

Always respond with specific numbers and data.
When confirming actions, state the exact amounts, routes, and timing."""

    WS_URL = "wss://api.elevenlabs.io/v1/convai/conversation"

    def __init__(self):
        self._api_key = settings.ELEVENLABS_API_KEY
        self._agent_id = settings.ELEVENLABS_AGENT_ID

    @staticmethod
    def get_signed_conversation_url(*, agent_id: str, api_key: str | None = None) -> str:
        """
        WebSocket auth for private agents: signed URL from ElevenLabs (never expose api key in browser).
        See https://elevenlabs.io/docs/eleven-agents/libraries/web-sockets
        """
        key = (api_key or settings.ELEVENLABS_API_KEY or "").strip()
        aid = (agent_id or "").strip()
        if not key or not aid:
            raise ValueError("API key and agent_id are required for a signed WebSocket URL")

        resp = httpx.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": aid},
            headers={"xi-api-key": key},
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        url = data.get("signed_url") or data.get("url")
        if not url or not isinstance(url, str):
            raise ValueError("ElevenLabs response did not include signed_url")
        return url

    async def create_conversation_stream(
        self,
        tools: list[dict] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Open a WebSocket connection to ElevenLabs Conversational AI.
        Yields streaming response chunks.
        """
        if not self._api_key:
            logger.warning("elevenlabs_api_key_missing")
            yield {"type": "error", "content": "ElevenLabs API key not configured"}
            return

        headers = {"xi-api-key": self._api_key}

        try:
            async with websockets.connect(
                f"{self.WS_URL}?agent_id={self._agent_id}",
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=10,
            ) as ws:
                logger.info("elevenlabs_ws_connected")

                # Send initial configuration
                config = {
                    "type": "conversation_initiation_client_data",
                    "conversation_initiation_client_data": {
                        "conversation_config_override": {
                            "agent": {
                                "prompt": {
                                    "prompt": self.AGENT_SYSTEM_PROMPT,
                                },
                                "first_message": (
                                    "Hello. I'm NEURO, your AI wealth operating system. "
                                    "I can bridge assets, analyze yield, and manage your vault. "
                                    "What would you like to do?"
                                ),
                            },
                        },
                    },
                }

                if tools:
                    config["conversation_initiation_client_data"][
                        "conversation_config_override"
                    ]["agent"]["tools"] = tools

                await ws.send(json.dumps(config))

                # Stream responses
                async for message in ws:
                    data = json.loads(message)
                    msg_type = data.get("type", "")

                    if msg_type == "audio":
                        yield {
                            "type": "audio",
                            "audio": data.get("audio", {}).get("chunk", ""),
                            "alignment": data.get("audio", {}).get("alignment"),
                        }

                    elif msg_type == "agent_response":
                        yield {
                            "type": "text",
                            "content": data.get("agent_response", {}).get(
                                "agent_response", ""
                            ),
                        }

                    elif msg_type == "client_tool_call":
                        tool_name = data.get("client_tool_call", {}).get(
                            "tool_name", ""
                        )
                        tool_params = data.get("client_tool_call", {}).get(
                            "parameters", {}
                        )
                        yield {
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "parameters": tool_params,
                            "tool_call_id": data.get("client_tool_call", {}).get(
                                "tool_call_id", ""
                            ),
                        }

                    elif msg_type == "conversation_initiation_metadata":
                        yield {
                            "type": "metadata",
                            "conversation_id": data.get(
                                "conversation_initiation_metadata_event", {}
                            ).get("conversation_id", ""),
                        }

                    elif msg_type == "ping":
                        pong = {"type": "pong", "event_id": data.get("ping_event", {}).get("event_id")}
                        await ws.send(json.dumps(pong))

        except websockets.exceptions.ConnectionClosed as e:
            logger.warning("elevenlabs_ws_closed", code=e.code, reason=e.reason)
            yield {"type": "disconnected", "reason": str(e)}
        except Exception as e:
            logger.error("elevenlabs_ws_error", error=str(e))
            yield {"type": "error", "content": str(e)}

    async def send_tool_result(
        self,
        ws: Any,
        tool_call_id: str,
        result: str,
    ) -> None:
        """Send tool execution result back to ElevenLabs agent."""
        message = {
            "type": "client_tool_result",
            "tool_call_id": tool_call_id,
            "result": result,
            "is_error": False,
        }
        await ws.send(json.dumps(message))

    def get_agent_tools(self) -> list[dict]:
        """Define tools available to the ElevenLabs agent."""
        return [
            {
                "type": "client",
                "name": "get_yield_analysis",
                "description": "Analyze yield opportunities across Solana DeFi protocols including Jito, Kamino, Drift, and MarginFi",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "risk_tolerance": {
                            "type": "number",
                            "description": "Risk tolerance score from 0-100",
                        },
                    },
                },
            },
            {
                "type": "client",
                "name": "execute_cross_chain_move",
                "description": "Bridge assets from another chain to Solana via LI.FI",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "source_chain": {
                            "type": "string",
                            "description": "Source chain: ETH, BASE, ARB, POL, BSC",
                        },
                        "token": {
                            "type": "string",
                            "description": "Token symbol to bridge",
                        },
                        "amount": {
                            "type": "string",
                            "description": "Amount in smallest unit",
                        },
                    },
                    "required": ["source_chain", "token", "amount"],
                },
            },
            {
                "type": "client",
                "name": "get_portfolio_risk",
                "description": "Analyze portfolio risk metrics including stablecoin exposure, chain concentration, and volatility",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "wallet_address": {
                            "type": "string",
                            "description": "Solana wallet address",
                        },
                    },
                },
            },
        ]


# Singleton
elevenlabs_service = ElevenLabsService()
