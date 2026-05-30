"""Tests for the ElevenLabs service: tool defs, signed-URL guards, missing-key path."""

import httpx
import pytest

from config import settings
from services.elevenlabs_service import ElevenLabsService, elevenlabs_service


def _resp(payload, status=200):
    return httpx.Response(status, json=payload, request=httpx.Request("GET", "https://x"))


def test_agent_tools_shape():
    tools = elevenlabs_service.get_agent_tools()
    names = {t["name"] for t in tools}
    assert names == {"get_yield_analysis", "execute_cross_chain_move", "get_portfolio_risk"}
    for t in tools:
        assert t["type"] == "client"
        assert "parameters" in t and t["parameters"]["type"] == "object"


def test_signed_url_requires_key_and_agent(monkeypatch):
    # Neutralise any real key loaded from .env so the guard is exercised.
    monkeypatch.setattr(settings, "ELEVENLABS_API_KEY", "")
    with pytest.raises(ValueError, match="required"):
        ElevenLabsService.get_signed_conversation_url(agent_id="", api_key="")
    with pytest.raises(ValueError, match="required"):
        ElevenLabsService.get_signed_conversation_url(agent_id="agent_1", api_key="")


def test_signed_url_parses_response(monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        assert params["agent_id"] == "agent_1"
        assert headers["xi-api-key"] == "sk-test"
        return _resp({"signed_url": "wss://signed.example/ws"})

    monkeypatch.setattr("services.elevenlabs_service.httpx.get", fake_get)
    url = ElevenLabsService.get_signed_conversation_url(agent_id="agent_1", api_key="sk-test")
    assert url == "wss://signed.example/ws"


def test_signed_url_raises_when_missing_in_response(monkeypatch):
    def fake_get(url, params=None, headers=None, timeout=None):
        return _resp({"unexpected": "shape"})

    monkeypatch.setattr("services.elevenlabs_service.httpx.get", fake_get)
    with pytest.raises(ValueError, match="signed_url"):
        ElevenLabsService.get_signed_conversation_url(agent_id="agent_1", api_key="sk-test")


async def test_create_conversation_stream_yields_error_without_key():
    svc = ElevenLabsService()
    svc._api_key = ""
    events = [e async for e in svc.create_conversation_stream()]
    assert events == [{"type": "error", "content": "ElevenLabs API key not configured"}]
