"""Tests for the NEURO agent: intent detection, amount parsing, and routing."""

import pytest

from services import agent_service
from services.agent_service import (
    NeuroAgent,
    _human_to_smallest_unit,
    _parse_human_amount_from_message,
    detect_intent,
    get_yield_analysis,
)


# ─── Intent detection ─────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "message,expected",
    [
        ("Bridge 500 USDC from Base to Solana", "cross_chain_move"),
        ("move my eth over", "cross_chain_move"),
        ("What's the best yield right now?", "yield_analysis"),
        ("show me apy options", "yield_analysis"),
        ("analyze my portfolio risk", "portfolio_risk"),
        ("hello there", "general"),
    ],
)
def test_detect_intent(message, expected):
    intent, _ = detect_intent(message)
    assert intent == expected


def test_bridge_params_extracted():
    intent, params = detect_intent("bridge 250 usdc from arbitrum")
    assert intent == "cross_chain_move"
    assert params["source_chain"] == "ARB"
    assert params["token"] == "USDC"
    # 250 USDC -> 6 decimals
    assert params["amount_smallest_unit"] == "250000000"


def test_parse_human_amount():
    assert _parse_human_amount_from_message("send 42.5 usdc") == 42.5
    assert _parse_human_amount_from_message("send some money", default_human=300.0) == 300.0


def test_human_to_smallest_unit_decimals():
    assert _human_to_smallest_unit(1, "USDC") == "1000000"
    assert _human_to_smallest_unit(1, "SOL") == "1000000000"
    assert _human_to_smallest_unit(1, "ETH") == "1000000000000000000"


# ─── Yield analysis with mocked live data ─────────────────────────────────────


class _FakeDefi:
    def __init__(self, protocols):
        self._protocols = protocols

    async def get_protocols(self, force_refresh: bool = False):
        return [dict(p) for p in self._protocols]


async def test_get_yield_analysis_ranks_by_risk_adjusted_apy(monkeypatch):
    protocols = [
        {"protocol": "A", "type": "x", "asset": "USDC", "apy": 6.0, "risk_level": "Low",
         "risk_score": 10, "liquidity_score": 90, "tvl": "$1B", "recommendation": "safe", "source": "live"},
        {"protocol": "B", "type": "y", "asset": "USDC", "apy": 20.0, "risk_level": "High",
         "risk_score": 90, "liquidity_score": 50, "tvl": "$1M", "recommendation": "risky", "source": "live"},
    ]
    monkeypatch.setattr(agent_service, "defi_data_service", _FakeDefi(protocols))

    # Low risk tolerance filters out the High-risk protocol.
    data = await get_yield_analysis(risk_tolerance=20)
    assert all(p["risk_level"] == "Low" for p in data["protocols"])
    assert data["recommended"]["protocol"] == "A"
    assert data["data_freshness"] == "live"


# ─── process_message routing (LLM disabled) ───────────────────────────────────


class _DisabledLLM:
    is_enabled = False

    async def classify_intent(self, message):
        return None

    async def compose_reply(self, *a, **k):
        return None


async def test_process_message_yield_uses_template_without_llm(monkeypatch):
    protocols = [
        {"protocol": "Kamino", "type": "USDC Vault", "asset": "USDC", "apy": 8.2,
         "risk_level": "Low", "risk_score": 20, "liquidity_score": 95, "tvl": "$890M",
         "recommendation": "best", "source": "fallback"},
    ]
    monkeypatch.setattr(agent_service, "defi_data_service", _FakeDefi(protocols))
    monkeypatch.setattr(agent_service, "llm_service", _DisabledLLM())

    agent = NeuroAgent()
    result = await agent.process_message("what's the best yield?")
    assert result["intent"] == "yield_analysis"
    assert result["action"]["type"] == "yield"
    assert "Kamino" in result["response"]
    assert result["session_id"]


async def test_process_message_general_help(monkeypatch):
    monkeypatch.setattr(agent_service, "llm_service", _DisabledLLM())
    agent = NeuroAgent()
    result = await agent.process_message("hi")
    assert result["intent"] == "general"
    assert result["action"] is None
    assert "Bridge assets" in result["response"]


async def test_session_id_is_stable_across_turns(monkeypatch):
    monkeypatch.setattr(agent_service, "llm_service", _DisabledLLM())
    agent = NeuroAgent()
    first = await agent.process_message("hi")
    sid = first["session_id"]
    second = await agent.process_message("hello again", session_id=sid)
    assert second["session_id"] == sid
    assert len(agent._sessions[sid]) == 4  # 2 user + 2 assistant
