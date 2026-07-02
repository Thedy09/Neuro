"""Tests for the freemium voice quota service and the /voice quota endpoints."""

from fastapi.testclient import TestClient

from config import settings
from main import app
from services.usage_service import UsageService, usage_service


# ─── UsageService unit tests ──────────────────────────────────────────────────

def test_quota_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 0)
    svc = UsageService()
    result = svc.check_and_increment("ip:1.2.3.4")
    assert result["allowed"] is True
    assert result["remaining"] == -1


def test_quota_decrements_then_blocks(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 2)
    svc = UsageService()

    first = svc.check_and_increment("ip:1.2.3.4")
    assert first["allowed"] is True
    assert first["remaining"] == 1

    second = svc.check_and_increment("ip:1.2.3.4")
    assert second["allowed"] is True
    assert second["remaining"] == 0

    third = svc.check_and_increment("ip:1.2.3.4")
    assert third["allowed"] is False
    assert third["remaining"] == 0


def test_quota_is_per_identity(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)
    svc = UsageService()
    assert svc.check_and_increment("ip:1.1.1.1")["allowed"] is True
    assert svc.check_and_increment("ip:1.1.1.1")["allowed"] is False
    assert svc.check_and_increment("ip:2.2.2.2")["allowed"] is True


def test_pro_wallet_bypasses_quota(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)
    monkeypatch.setattr(settings, "PRO_WALLETS", ["ProWallet111"])
    svc = UsageService()
    for _ in range(5):
        result = svc.check_and_increment("wallet:ProWallet111", "ProWallet111")
        assert result["allowed"] is True
        assert result["is_pro"] is True


def test_daily_rollover_resets_counts(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)
    svc = UsageService()
    assert svc.check_and_increment("ip:1.2.3.4")["allowed"] is True
    assert svc.check_and_increment("ip:1.2.3.4")["allowed"] is False
    svc._day = "1970-01-01"  # simulate day change
    assert svc.check_and_increment("ip:1.2.3.4")["allowed"] is True


# ─── Endpoint tests ───────────────────────────────────────────────────────────

def test_voice_usage_endpoint(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 5)
    monkeypatch.setattr(usage_service, "_counts", {})
    with TestClient(app) as client:
        r = client.get("/api/v1/agent/voice/usage")
        assert r.status_code == 200
        body = r.json()
        assert body["limit"] == 5
        assert body["remaining"] == 5
        assert body["is_pro"] is False


def test_voice_tts_blocked_when_quota_exhausted(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)
    monkeypatch.setattr(settings, "ELEVENLABS_API_KEY", "")
    monkeypatch.setattr(usage_service, "_counts", {})
    with TestClient(app) as client:
        # First call consumes the quota (503: no API key, but quota was spent first).
        r1 = client.post("/api/v1/agent/voice/tts", json={"text": "hello"})
        assert r1.status_code == 503

        r2 = client.post("/api/v1/agent/voice/tts", json={"text": "hello"})
        assert r2.status_code == 429
        assert "NEURO Pro" in r2.json()["detail"]


def test_voice_signed_url_pro_wallet_not_limited(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)
    monkeypatch.setattr(settings, "PRO_WALLETS", ["ProWallet111"])
    monkeypatch.setattr(settings, "ELEVENLABS_API_KEY", "")
    monkeypatch.setattr(usage_service, "_counts", {})
    with TestClient(app) as client:
        for _ in range(3):
            r = client.post(
                "/api/v1/agent/voice/signed-url",
                json={"wallet_address": "ProWallet111"},
            )
            # 503 (no API key) proves the quota gate was passed, never 429.
            assert r.status_code == 503
