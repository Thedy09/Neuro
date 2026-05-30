"""
NEURO Backend — LLM Service (optional)

Upgrades the text chat agent from pure keyword routing to a real LLM, while
keeping the deterministic DeFi tool execution that the product relies on.

Two responsibilities, both optional and both with safe fallbacks:

1. ``classify_intent`` — extract a structured intent + parameters from a user
   message. Used when keyword routing is ambiguous or to improve parameter
   extraction. Returns ``None`` if no LLM is configured or the call fails, so
   the caller falls back to the regex router.

2. ``compose_reply`` — turn the structured tool result into a natural,
   on-brand response. Returns ``None`` on any failure so the caller falls back
   to the fixed templates.

Providers (auto-detected, no extra dependencies — plain httpx):
- Anthropic Messages API when ``ANTHROPIC_API_KEY`` is set.
- Any OpenAI-compatible chat-completions endpoint via ``LLM_API_KEY`` +
  ``LLM_BASE_URL``.

If neither is configured, ``is_enabled`` is False and both methods short-circuit
to ``None`` — the agent behaves exactly as before.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from config import settings

logger = structlog.get_logger()

_VALID_INTENTS = {"cross_chain_move", "yield_analysis", "portfolio_risk", "general"}

_CLASSIFIER_SYSTEM = """You are the intent router for NEURO, a Solana DeFi assistant.
Classify the user's message into exactly one intent and extract parameters.

Intents:
- "cross_chain_move": user wants to bridge / move / transfer assets from another chain to Solana.
- "yield_analysis": user wants yield / APY / staking / earning recommendations.
- "portfolio_risk": user wants risk, exposure, or portfolio analysis.
- "general": anything else (greetings, capabilities, unclear).

For "cross_chain_move" also extract when present:
- source_chain: one of ETH, BASE, ARB, POL, BSC (default BASE if unspecified).
- token: one of USDC, USDT, ETH, SOL (default USDC).
- amount_human: the numeric amount the user said, as a number (default 300).

Respond with ONLY a compact JSON object, no prose:
{"intent": "...", "source_chain": "...", "token": "...", "amount_human": 0}
Omit keys that do not apply."""

_COMPOSER_SYSTEM = """You are NEURO, an AI private banker for crypto natives.
You are intelligent, futuristic, calm, concise, and trustworthy.
Given the user's message and the structured result of a DeFi tool, write a short
(2-4 sentence) reply. Be precise with the numbers provided — never invent figures.
Always be transparent about risk. Do not use markdown headers; plain prose with
optional inline bold is fine. End bridge confirmations by asking the user to confirm."""


class LLMService:
    """Thin, provider-agnostic LLM client with graceful degradation."""

    def __init__(self) -> None:
        self._timeout = httpx.Timeout(20.0, connect=8.0)

    # ── Provider detection ────────────────────────────────────────────────────

    @property
    def provider(self) -> str | None:
        if settings.ANTHROPIC_API_KEY:
            return "anthropic"
        if settings.LLM_API_KEY:
            return "openai"
        return None

    @property
    def is_enabled(self) -> bool:
        return self.provider is not None

    # ── Low-level completion ──────────────────────────────────────────────────

    async def _complete(self, system: str, user: str, *, max_tokens: int = 400) -> str | None:
        provider = self.provider
        if provider is None:
            return None
        try:
            if provider == "anthropic":
                return await self._complete_anthropic(system, user, max_tokens)
            return await self._complete_openai(system, user, max_tokens)
        except Exception as e:  # noqa: BLE001 — LLM is best-effort
            logger.warning("llm_completion_failed", provider=provider, error=str(e))
            return None

    async def _complete_anthropic(self, system: str, user: str, max_tokens: int) -> str | None:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.ANTHROPIC_MODEL,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            parts = data.get("content", [])
            text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
            return text.strip() or None

    async def _complete_openai(self, system: str, user: str, max_tokens: int) -> str | None:
        base = settings.LLM_BASE_URL.rstrip("/")
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                f"{base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "max_tokens": max_tokens,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                return None
            return (choices[0].get("message", {}).get("content") or "").strip() or None

    # ── High-level helpers ────────────────────────────────────────────────────

    async def classify_intent(self, message: str) -> dict[str, Any] | None:
        """Return ``{"intent": ..., ...params}`` or ``None`` to fall back to regex."""
        if not self.is_enabled:
            return None
        raw = await self._complete(_CLASSIFIER_SYSTEM, message, max_tokens=150)
        if not raw:
            return None
        parsed = _extract_json(raw)
        if not parsed:
            return None
        intent = parsed.get("intent")
        if intent not in _VALID_INTENTS:
            logger.warning("llm_intent_invalid", intent=intent)
            return None
        return parsed

    async def compose_reply(
        self, message: str, intent: str, tool_result: dict[str, Any]
    ) -> str | None:
        """Natural-language reply from a structured tool result, or ``None``."""
        if not self.is_enabled:
            return None
        user = (
            f"User message: {message}\n"
            f"Intent: {intent}\n"
            f"Tool result (JSON):\n{json.dumps(tool_result, ensure_ascii=False)}"
        )
        return await self._complete(_COMPOSER_SYSTEM, user, max_tokens=300)


def _extract_json(text: str) -> dict[str, Any] | None:
    """Best-effort: parse a JSON object, tolerating code fences / surrounding prose."""
    text = text.strip()
    if text.startswith("```"):
        # Strip ```json ... ``` fences.
        text = text.split("```", 2)[1] if text.count("```") >= 2 else text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        obj = json.loads(text[start : end + 1])
    except (json.JSONDecodeError, ValueError):
        return None
    return obj if isinstance(obj, dict) else None


# Singleton
llm_service = LLMService()
