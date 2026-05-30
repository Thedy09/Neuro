"""Tests for the optional LLM service: provider detection, JSON parsing, fallback."""

import httpx

from config import settings
from services.llm_service import LLMService, _extract_json


# ─── JSON extraction ──────────────────────────────────────────────────────────


def test_extract_json_plain():
    assert _extract_json('{"intent": "yield_analysis"}') == {"intent": "yield_analysis"}


def test_extract_json_with_code_fence():
    raw = '```json\n{"intent": "general"}\n```'
    assert _extract_json(raw) == {"intent": "general"}


def test_extract_json_with_surrounding_prose():
    raw = 'Sure! Here you go: {"intent": "portfolio_risk"} hope that helps'
    assert _extract_json(raw) == {"intent": "portfolio_risk"}


def test_extract_json_invalid_returns_none():
    assert _extract_json("not json at all") is None
    assert _extract_json("[1, 2, 3]") is None  # array, not object


# ─── Provider detection / disabled behaviour ──────────────────────────────────


def test_disabled_when_no_keys(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(settings, "LLM_API_KEY", "")
    svc = LLMService()
    assert svc.is_enabled is False
    assert svc.provider is None


def test_anthropic_preferred(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant")
    monkeypatch.setattr(settings, "LLM_API_KEY", "sk-openai")
    assert LLMService().provider == "anthropic"


def test_openai_when_only_llm_key(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(settings, "LLM_API_KEY", "sk-openai")
    assert LLMService().provider == "openai"


async def test_classify_intent_returns_none_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(settings, "LLM_API_KEY", "")
    svc = LLMService()
    assert await svc.classify_intent("bridge 100 usdc") is None
    assert await svc.compose_reply("hi", "general", {}) is None


async def test_classify_intent_validates_against_known_intents(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant")
    svc = LLMService()

    async def fake_complete(system, user, max_tokens=400):
        return '{"intent": "not_a_real_intent"}'

    monkeypatch.setattr(svc, "_complete", fake_complete)
    assert await svc.classify_intent("whatever") is None


async def test_classify_intent_happy_path(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant")
    svc = LLMService()

    async def fake_complete(system, user, max_tokens=400):
        return '{"intent": "cross_chain_move", "source_chain": "ARB", "amount_human": 250}'

    monkeypatch.setattr(svc, "_complete", fake_complete)
    result = await svc.classify_intent("move 250 from arbitrum")
    assert result["intent"] == "cross_chain_move"
    assert result["source_chain"] == "ARB"


async def test_failed_completion_falls_back_to_none(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant")
    svc = LLMService()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "upstream"})

    # Patch the anthropic call to use a mock transport that errors.
    async def fake_anthropic(system, user, max_tokens):
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages")
            resp.raise_for_status()
            return "unreachable"

    monkeypatch.setattr(svc, "_complete_anthropic", fake_anthropic)
    # _complete swallows the HTTPStatusError and returns None.
    assert await svc.classify_intent("bridge 100 usdc") is None
