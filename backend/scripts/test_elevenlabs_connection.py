"""
Vérifie que ELEVENLABS_API_KEY et ELEVENLABS_AGENT_ID permettent de joindre l'API ConvAI.

Usage (depuis NEURO X/backend) :
    python scripts/test_elevenlabs_connection.py

Sans clé : message d'aide et code 1.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def main() -> int:
    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    agent_id = (os.getenv("ELEVENLABS_AGENT_ID") or "").strip()

    if not api_key:
        print("ELEVENLABS_API_KEY manquant dans backend/.env")
        print("  → https://elevenlabs.io/app/settings/api-keys")
        print("  → Puis crée l’agent NEURO : python scripts/create_elevenlabs_agent.py")
        return 1

    if not agent_id:
        print("ELEVENLABS_AGENT_ID manquant dans backend/.env")
        print("  → Lance : python scripts/create_elevenlabs_agent.py")
        return 1

    url = f"https://api.elevenlabs.io/v1/convai/agents/{agent_id}"
    try:
        resp = httpx.get(
            url,
            headers={"xi-api-key": api_key},
            timeout=30.0,
        )
    except httpx.RequestError as e:
        print(f"Erreur réseau : {e}")
        return 1

    if resp.status_code != 200:
        print(f"API ElevenLabs HTTP {resp.status_code}")
        print(resp.text[:800])
        return 1

    data = resp.json()
    name = data.get("name") or agent_id
    print("OK — agent ConvAI joignable")
    print(f"  agent_id : {agent_id}")
    print(f"  name     : {name}")
    print("\nCôté navigateur : définis VITE_ELEVENLABS_AGENT_ID (ou via VoiceConfigModal) puis ouvre /voice ou le chat vocal.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
