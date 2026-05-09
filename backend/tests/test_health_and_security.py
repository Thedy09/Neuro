"""Smoke tests for health endpoint and production webhook/WebSocket guards."""

from fastapi.testclient import TestClient

from config import settings
from main import app


def test_health_ok():
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["service"] == "neuro-api"


def test_quicknode_webhook_rejected_when_secret_missing_non_debug(monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "QUICKNODE_WEBHOOK_SECRET", "")
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/webhooks/quicknode/deposit",
            json={"matchedTransactions": []},
        )
        assert r.status_code == 503


def test_quicknode_webhook_skips_verify_when_debug_without_secret(monkeypatch):
    monkeypatch.setattr(settings, "DEBUG", True)
    monkeypatch.setattr(settings, "QUICKNODE_WEBHOOK_SECRET", "")
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/webhooks/quicknode/deposit",
            json={"matchedTransactions": []},
        )
    assert r.status_code == 200


def test_agent_voice_capabilities_returns_shapes():
    with TestClient(app) as client:
        r = client.get("/api/v1/agent/voice/capabilities")
        assert r.status_code == 200
        body = r.json()
        assert "voice_ready" in body
        assert "tool_definitions_available" in body
