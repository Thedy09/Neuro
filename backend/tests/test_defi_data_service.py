"""Tests for the live DeFi data service: parsing, caching, and per-protocol fallback."""

import httpx

from services.defi_data_service import DefiDataService, _coerce_apy, _format_tvl
from tests.conftest import make_mock_client


# ─── Pure helpers ─────────────────────────────────────────────────────────────


def test_coerce_apy_normalises_fraction_and_percent():
    assert _coerce_apy(0.071) == 7.1  # fraction -> percent
    assert _coerce_apy(7.1) == 7.1  # already percent
    assert _coerce_apy("8.25") == 8.25


def test_coerce_apy_rejects_garbage():
    assert _coerce_apy(None) is None
    assert _coerce_apy(0) is None
    assert _coerce_apy(-5) is None
    assert _coerce_apy(99999) is None  # absurd
    assert _coerce_apy("not-a-number") is None


def test_format_tvl_compacts_numbers():
    assert _format_tvl(2_100_000_000) == "$2.1B"
    assert _format_tvl(890_000_000) == "$890M"
    assert _format_tvl(50_000) == "$50K"
    assert _format_tvl(0) is None
    assert _format_tvl("bad") is None


# ─── Service behaviour ────────────────────────────────────────────────────────


def _all_handler_404(request: httpx.Request) -> httpx.Response:
    return httpx.Response(503, json={"error": "down"})


async def test_falls_back_when_all_upstreams_fail():
    svc = DefiDataService()
    svc._client_factory = lambda: make_mock_client(_all_handler_404)

    protocols = await svc.get_protocols(force_refresh=True)

    names = {p["protocol"] for p in protocols}
    assert names == {"Jito", "Kamino", "Drift", "MarginFi"}
    # Every protocol falls back to the static baseline, fully formed.
    assert all(p["source"] == "fallback" for p in protocols)
    assert all({"apy", "risk_level", "tvl", "recommendation"} <= p.keys() for p in protocols)


async def test_live_jito_apy_overrides_baseline():
    def handler(request: httpx.Request) -> httpx.Response:
        if "jito.network" in str(request.url):
            return httpx.Response(200, json={"apy": 0.0925, "tvl": 2_500_000_000})
        return httpx.Response(503, json={})

    svc = DefiDataService()
    svc._client_factory = lambda: make_mock_client(handler)

    protocols = await svc.get_protocols(force_refresh=True)
    jito = next(p for p in protocols if p["protocol"] == "Jito")

    assert jito["source"] == "live"
    assert jito["apy"] == 9.25  # 0.0925 normalised
    assert jito["tvl"] == "$2.5B"
    # Other protocols still fall back cleanly.
    assert next(p for p in protocols if p["protocol"] == "Drift")["source"] == "fallback"


async def test_results_are_cached(monkeypatch):
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(503, json={})

    svc = DefiDataService()
    svc._client_factory = lambda: make_mock_client(handler)

    await svc.get_protocols(force_refresh=True)
    first = calls["n"]
    assert first > 0

    # Second call within TTL must not hit upstream again.
    await svc.get_protocols()
    assert calls["n"] == first


async def test_returned_list_is_defensive_copy():
    svc = DefiDataService()
    svc._client_factory = lambda: make_mock_client(_all_handler_404)
    a = await svc.get_protocols(force_refresh=True)
    a[0]["apy"] = -999
    b = await svc.get_protocols()
    assert b[0]["apy"] != -999
