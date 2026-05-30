"""
NEURO Backend — Live DeFi Data Service

Fetches live APY / TVL metrics for the Solana yield protocols surfaced by the
agent (Jito, Kamino, Drift, MarginFi) from each protocol's public API.

Design goals:
- **Live when reachable, never broken.** Every protocol fetch is isolated and
  falls back to a curated static baseline if the upstream API is slow, down, or
  changes shape. The agent always gets a full, well-formed protocol list.
- **Cheap.** Results are cached in-process with a short TTL so a burst of chat
  requests hits the upstream APIs at most once per `CACHE_TTL_SECONDS`.
- **Concurrent.** All protocols are fetched in parallel.

The static baselines double as the schema contract: each protocol always exposes
`protocol`, `type`, `asset`, `apy`, `risk_level`, `risk_score`, `liquidity_score`,
`tvl`, `recommendation`, and `source` ("live" | "fallback").
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable

import httpx
import structlog

logger = structlog.get_logger()

CACHE_TTL_SECONDS = 120
_HTTP_TIMEOUT = httpx.Timeout(8.0, connect=4.0)


# ─── Static baselines (also the response schema contract) ─────────────────────

_BASELINES: dict[str, dict[str, Any]] = {
    "Jito": {
        "protocol": "Jito",
        "type": "Liquid Staking",
        "asset": "SOL",
        "apy": 7.1,
        "risk_level": "Low",
        "risk_score": 15,
        "liquidity_score": 98,
        "tvl": "$2.1B",
        "recommendation": "Conservative pick. Reliable yield with high liquidity.",
    },
    "Kamino": {
        "protocol": "Kamino",
        "type": "USDC Vault",
        "asset": "USDC",
        "apy": 8.2,
        "risk_level": "Low",
        "risk_score": 20,
        "liquidity_score": 95,
        "tvl": "$890M",
        "recommendation": "Best risk-adjusted return for stablecoin exposure.",
    },
    "Drift": {
        "protocol": "Drift",
        "type": "USDC-SOL LP",
        "asset": "USDC-SOL",
        "apy": 12.4,
        "risk_level": "Medium",
        "risk_score": 45,
        "liquidity_score": 82,
        "tvl": "$320M",
        "recommendation": "Higher yield suitable for medium risk tolerance.",
    },
    "MarginFi": {
        "protocol": "MarginFi",
        "type": "Lending",
        "asset": "USDC",
        "apy": 6.8,
        "risk_level": "Low",
        "risk_score": 12,
        "liquidity_score": 97,
        "tvl": "$650M",
        "recommendation": "Most conservative. Lending with highest liquidity.",
    },
}

# Stable order the agent expects.
_ORDER = ["Jito", "Kamino", "Drift", "MarginFi"]


def _baseline(name: str) -> dict[str, Any]:
    """A fresh fallback copy tagged as such."""
    return {**_BASELINES[name], "source": "fallback"}


def _coerce_apy(value: Any) -> float | None:
    """Accept fractional (0.071) or percentage (7.1) APY and normalise to percent."""
    try:
        apy = float(value)
    except (TypeError, ValueError):
        return None
    if apy <= 0:
        return None
    # Heuristic: values <= 1 are fractions (0.071 -> 7.1%).
    if apy <= 1:
        apy *= 100
    # Guard against absurd values from a malformed response.
    if apy > 1000:
        return None
    return round(apy, 2)


def _format_tvl(value: Any) -> str | None:
    """Render a raw USD number as a compact $X.YB / $XYZM string."""
    try:
        tvl = float(value)
    except (TypeError, ValueError):
        return None
    if tvl <= 0:
        return None
    if tvl >= 1e9:
        return f"${tvl / 1e9:.1f}B"
    if tvl >= 1e6:
        return f"${tvl / 1e6:.0f}M"
    return f"${tvl / 1e3:.0f}K"


# ─── Per-protocol live fetchers ───────────────────────────────────────────────
#
# Each fetcher returns a partial dict of fields to override on the baseline
# (typically {"apy": ..., "tvl": ...}). Raising or returning {} keeps the
# baseline for that protocol.


async def _fetch_jito(client: httpx.AsyncClient) -> dict[str, Any]:
    # Public staking metrics endpoint exposes the JitoSOL APY.
    resp = await client.get("https://www.jito.network/api/getJitoStakingMetrics/")
    resp.raise_for_status()
    data = resp.json()
    out: dict[str, Any] = {}
    apy = _coerce_apy(data.get("apy") or data.get("staking_apy"))
    if apy is not None:
        out["apy"] = apy
    tvl = _format_tvl(data.get("tvl") or data.get("total_sol_staked_usd"))
    if tvl is not None:
        out["tvl"] = tvl
    return out


async def _fetch_kamino(client: httpx.AsyncClient) -> dict[str, Any]:
    # Kamino main-market USDC reserve supply APY.
    resp = await client.get(
        "https://api.kamino.finance/kamino-market/"
        "7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6Js6CCnpdGCb/reserves/metrics"
    )
    resp.raise_for_status()
    data = resp.json()
    reserves = data if isinstance(data, list) else data.get("reserves", [])
    for r in reserves:
        symbol = (r.get("symbol") or r.get("tokenSymbol") or "").upper()
        if symbol == "USDC":
            apy = _coerce_apy(r.get("supplyApy") or r.get("supplyInterestApy"))
            if apy is not None:
                return {"apy": apy}
    return {}


async def _fetch_drift(client: httpx.AsyncClient) -> dict[str, Any]:
    # Drift insurance-fund / borrow-lend rate for the USDC spot market (index 0).
    resp = await client.get(
        "https://data.api.drift.trade/rateHistory",
        params={"marketIndex": 0, "marketType": "spot"},
    )
    resp.raise_for_status()
    data = resp.json()
    records = data.get("rateHistory") or data.get("data") or []
    if records:
        latest = records[-1] if isinstance(records, list) else records
        apy = _coerce_apy(latest.get("depositApy") or latest.get("apy"))
        if apy is not None:
            return {"apy": apy}
    return {}


async def _fetch_marginfi(client: httpx.AsyncClient) -> dict[str, Any]:
    # MarginFi public bank metrics; pick the USDC lending APY.
    resp = await client.get("https://app.marginfi.com/api/banks")
    resp.raise_for_status()
    data = resp.json()
    banks = data if isinstance(data, list) else data.get("banks", [])
    for b in banks:
        symbol = (b.get("tokenSymbol") or b.get("symbol") or "").upper()
        if symbol == "USDC":
            apy = _coerce_apy(b.get("lendingRate") or b.get("depositApy") or b.get("apy"))
            if apy is not None:
                return {"apy": apy}
    return {}


_FETCHERS: dict[str, Callable[[httpx.AsyncClient], Awaitable[dict[str, Any]]]] = {
    "Jito": _fetch_jito,
    "Kamino": _fetch_kamino,
    "Drift": _fetch_drift,
    "MarginFi": _fetch_marginfi,
}


class DefiDataService:
    """Live DeFi metrics with TTL cache and per-protocol fallback."""

    def __init__(self) -> None:
        self._cache: list[dict[str, Any]] | None = None
        self._cached_at: float = 0.0
        self._lock = asyncio.Lock()
        # Injectable for tests / custom transports.
        self._client_factory: Callable[[], httpx.AsyncClient] = (
            lambda: httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True)
        )

    def _cache_fresh(self) -> bool:
        return (
            self._cache is not None
            and (self._now() - self._cached_at) < CACHE_TTL_SECONDS
        )

    @staticmethod
    def _now() -> float:
        return time.monotonic()

    async def _resolve_one(
        self, client: httpx.AsyncClient, name: str
    ) -> dict[str, Any]:
        base = _baseline(name)
        fetcher = _FETCHERS.get(name)
        if fetcher is None:
            return base
        try:
            override = await fetcher(client)
        except Exception as e:  # noqa: BLE001 — never let one protocol break the list
            logger.warning("defi_live_fetch_failed", protocol=name, error=str(e))
            return base
        if not override:
            return base
        merged = {**base, **override, "source": "live"}
        logger.info("defi_live_fetch_ok", protocol=name, apy=merged.get("apy"))
        return merged

    async def get_protocols(self, *, force_refresh: bool = False) -> list[dict[str, Any]]:
        """
        Return the yield-protocol list in stable order, live where reachable.

        Cached for ``CACHE_TTL_SECONDS``. Concurrency-safe: overlapping callers
        share a single upstream refresh.
        """
        if not force_refresh and self._cache_fresh():
            return [dict(p) for p in self._cache]  # defensive copy

        async with self._lock:
            # Re-check after acquiring the lock (another caller may have refreshed).
            if not force_refresh and self._cache_fresh():
                return [dict(p) for p in self._cache]

            try:
                async with self._client_factory() as client:
                    results = await asyncio.gather(
                        *(self._resolve_one(client, name) for name in _ORDER)
                    )
            except Exception as e:  # noqa: BLE001
                logger.warning("defi_data_refresh_failed", error=str(e))
                results = [_baseline(name) for name in _ORDER]

            self._cache = results
            self._cached_at = self._now()
            live = sum(1 for p in results if p.get("source") == "live")
            logger.info("defi_data_refreshed", live=live, total=len(results))
            return [dict(p) for p in results]


# Singleton
defi_data_service = DefiDataService()
