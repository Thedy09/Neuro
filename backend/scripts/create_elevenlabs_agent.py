"""
Create the NEURO ElevenLabs Conversational AI agent and persist its agent ID.

Usage:
    python backend/scripts/create_elevenlabs_agent.py

Required:
    ELEVENLABS_API_KEY in the environment or in backend/.env
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_ENV = ROOT_DIR / "backend" / ".env"
FRONTEND_ENV = ROOT_DIR / ".env"
MOBILE_ENV = ROOT_DIR / "mobile" / ".env"

ELEVENLABS_AGENT_CREATE_URL = (
    "https://api.elevenlabs.io/v1/convai/agents/create?enable_versioning=true"
)

DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
DEFAULT_LLM = "gemini-2.0-flash"


NEURO_PROMPT = """# Personality
You are NEURO, an AI private banker for crypto natives.
You are analytical, calm, concise, and trustworthy.

# Environment
You speak with users inside a Solana DeFi dashboard.
The user may ask about vault risk, portfolio exposure, yield opportunities, or bridging assets to Solana.

# Tone
- Speak in short, clear sentences.
- Use numbers when available.
- Be transparent about risk and uncertainty.
- Do not pretend that simulated portfolio data is live.
- Ask for confirmation before financial actions.

# Goal
1. Help the user understand their portfolio and vault status.
2. Explain yield opportunities across Jito, Kamino, Drift, and MarginFi.
3. Help prepare cross-chain moves to Solana.
4. Use client tools when live dashboard context is needed.

This step is important. Never claim that a transaction has been executed unless the user has signed it in their wallet and the app confirms a signature."""


def read_env_value(path: Path, key: str) -> str:
    if not path.exists():
        return ""

    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return ""


def upsert_env_value(path: Path, key: str, value: str) -> None:
    lines: list[str] = []
    found = False

    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()

    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            found = True
            break

    if not found:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append(f"{key}={value}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_agent_payload() -> dict[str, Any]:
    return {
        "name": "NEURO X - AI Wealth Operating System",
        "conversation_config": {
            "agent": {
                "first_message": (
                    "Hello. I'm NEURO, your AI wealth operating system. "
                    "I can analyze yield, explain vault risk, and help prepare cross-chain moves to Solana. "
                    "What would you like to do?"
                ),
                "language": "en",
                "prompt": {
                    "prompt": NEURO_PROMPT,
                    "llm": DEFAULT_LLM,
                    "temperature": 0.45,
                    "tools": [
                        {
                            "type": "client",
                            "name": "get_yield_analysis",
                            "description": "Analyze yield opportunities across Solana DeFi protocols including Jito, Kamino, Drift, and MarginFi.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "risk_tolerance": {
                                        "type": "number",
                                        "description": "User risk tolerance score from 0 to 100.",
                                    }
                                },
                            },
                        },
                        {
                            "type": "client",
                            "name": "execute_cross_chain_move",
                            "description": "Prepare a bridge route from another chain to Solana. The app must still ask the user to sign.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "source_chain": {
                                        "type": "string",
                                        "description": "Source chain, for example ETH, BASE, ARB, POL, or BSC.",
                                    },
                                    "token": {
                                        "type": "string",
                                        "description": "Token symbol to bridge.",
                                    },
                                    "amount": {
                                        "type": "string",
                                        "description": "Amount in smallest token unit.",
                                    },
                                },
                                "required": ["source_chain", "token", "amount"],
                            },
                        },
                        {
                            "type": "client",
                            "name": "get_portfolio_risk",
                            "description": "Analyze portfolio risk using dashboard context and vault data.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "wallet_address": {
                                        "type": "string",
                                        "description": "Connected Solana wallet address.",
                                    }
                                },
                            },
                        },
                    ],
                },
            },
            "tts": {
                "voice_id": DEFAULT_VOICE_ID,
            },
        },
    }


def main() -> None:
    load_dotenv(BACKEND_ENV)

    api_key = os.getenv("ELEVENLABS_API_KEY") or read_env_value(BACKEND_ENV, "ELEVENLABS_API_KEY")
    if not api_key:
        raise SystemExit(
            "ELEVENLABS_API_KEY is missing. Add it to backend/.env, then rerun this script."
        )

    payload = build_agent_payload()

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            ELEVENLABS_AGENT_CREATE_URL,
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    agent_id = data.get("agent_id") or data.get("agentId") or data.get("id")
    if not agent_id:
        raise SystemExit(f"Agent created but no agent ID was returned: {data}")

    upsert_env_value(BACKEND_ENV, "ELEVENLABS_AGENT_ID", agent_id)
    upsert_env_value(FRONTEND_ENV, "VITE_ELEVENLABS_AGENT_ID", agent_id)
    upsert_env_value(MOBILE_ENV, "EXPO_PUBLIC_ELEVENLABS_AGENT_ID", agent_id)

    print(f"Created ElevenLabs agent: {agent_id}")
    print(f"Updated {BACKEND_ENV}")
    print(f"Updated {FRONTEND_ENV}")
    print(f"Updated {MOBILE_ENV}")


if __name__ == "__main__":
    main()
