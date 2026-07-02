"""Tests for on-chain Pro subscriptions: payment verification, persistence, endpoints."""

import time

import httpx
import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from services.pro_service import ProService, ProSubscriptionError, pro_service
from services.usage_service import UsageService
from tests.conftest import make_mock_client

TREASURY = "TreasuryWallet11111111111111111111111111111"
PAYER = "PayerWallet1111111111111111111111111111111"
SIGNATURE = "5" * 64


def _tx_result(
    source: str = PAYER,
    destination: str = TREASURY,
    lamports: int = 500_000_000,
    err=None,
    block_time: float | None = None,
):
    return {
        "blockTime": block_time if block_time is not None else time.time(),
        "meta": {"err": err},
        "transaction": {
            "message": {
                "instructions": [
                    {
                        "program": "system",
                        "parsed": {
                            "type": "transfer",
                            "info": {
                                "source": source,
                                "destination": destination,
                                "lamports": lamports,
                            },
                        },
                    }
                ]
            }
        },
    }


def _rpc_handler(result):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"jsonrpc": "2.0", "id": 1, "result": result})

    return handler


def _make_service(tmp_path, result) -> ProService:
    svc = ProService(store_path=tmp_path / "subs.json")
    svc._client_factory = lambda: make_mock_client(_rpc_handler(result))
    return svc


@pytest.fixture(autouse=True)
def _pro_settings(monkeypatch):
    monkeypatch.setattr(settings, "PRO_TREASURY_WALLET", TREASURY)
    monkeypatch.setattr(settings, "PRO_PRICE_SOL", 0.5)
    monkeypatch.setattr(settings, "PRO_DURATION_DAYS", 30)
    monkeypatch.setattr(settings, "PRO_WALLETS", [])


# ─── Verification ─────────────────────────────────────────────────────────────

async def test_valid_payment_activates_pro(tmp_path):
    svc = _make_service(tmp_path, _tx_result())
    result = await svc.verify_and_activate(PAYER, SIGNATURE)

    assert result["is_pro"] is True
    assert result["expires_at"] > time.time() + 29 * 24 * 3600
    assert svc.is_pro(PAYER) is True


async def test_payment_persists_across_instances(tmp_path):
    svc = _make_service(tmp_path, _tx_result())
    await svc.verify_and_activate(PAYER, SIGNATURE)

    reloaded = ProService(store_path=tmp_path / "subs.json")
    assert reloaded.is_pro(PAYER) is True


async def test_signature_cannot_be_reused(tmp_path):
    svc = _make_service(tmp_path, _tx_result())
    await svc.verify_and_activate(PAYER, SIGNATURE)
    with pytest.raises(ProSubscriptionError, match="already been used"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_insufficient_amount_rejected(tmp_path):
    svc = _make_service(tmp_path, _tx_result(lamports=100_000_000))  # 0.1 SOL < 0.5
    with pytest.raises(ProSubscriptionError, match="Insufficient payment"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_wrong_destination_rejected(tmp_path):
    svc = _make_service(tmp_path, _tx_result(destination="SomeoneElse111"))
    with pytest.raises(ProSubscriptionError, match="Insufficient payment"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_tx_not_found_rejected(tmp_path):
    svc = _make_service(tmp_path, None)
    with pytest.raises(ProSubscriptionError, match="not found"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_failed_tx_rejected(tmp_path):
    svc = _make_service(tmp_path, _tx_result(err={"InstructionError": [0, "Custom"]}))
    with pytest.raises(ProSubscriptionError, match="failed on-chain"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_old_tx_rejected(tmp_path):
    svc = _make_service(tmp_path, _tx_result(block_time=time.time() - 48 * 3600))
    with pytest.raises(ProSubscriptionError, match="too old"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_disabled_when_no_treasury(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PRO_TREASURY_WALLET", "")
    svc = _make_service(tmp_path, _tx_result())
    with pytest.raises(ProSubscriptionError, match="not enabled"):
        await svc.verify_and_activate(PAYER, SIGNATURE)


async def test_renewal_extends_from_current_expiry(tmp_path):
    svc = _make_service(tmp_path, _tx_result())
    first = await svc.verify_and_activate(PAYER, SIGNATURE)
    second = await svc.verify_and_activate(PAYER, "6" * 64)
    assert second["expires_at"] - first["expires_at"] == pytest.approx(
        30 * 24 * 3600, abs=5
    )


# ─── Quota integration ────────────────────────────────────────────────────────

async def test_onchain_pro_bypasses_voice_quota(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "VOICE_FREE_DAILY_REQUESTS", 1)

    svc = _make_service(tmp_path, _tx_result())
    await svc.verify_and_activate(PAYER, SIGNATURE)
    monkeypatch.setattr("services.usage_service.pro_service", svc)

    usage = UsageService()
    for _ in range(3):
        assert usage.check_and_increment(f"wallet:{PAYER}", PAYER)["allowed"] is True


# ─── Endpoints ────────────────────────────────────────────────────────────────

def test_pro_config_endpoint():
    with TestClient(app) as client:
        r = client.get("/api/v1/pro/config")
        assert r.status_code == 200
        body = r.json()
        assert body["enabled"] is True
        assert body["treasury_wallet"] == TREASURY
        assert body["price_sol"] == 0.5


def test_pro_status_endpoint_unknown_wallet(monkeypatch):
    monkeypatch.setattr(pro_service, "_subscriptions", {})
    with TestClient(app) as client:
        r = client.get("/api/v1/pro/status", params={"wallet_address": PAYER})
        assert r.status_code == 200
        assert r.json() == {"is_pro": False, "expires_at": None}


def test_pro_verify_endpoint_maps_errors_to_402(tmp_path, monkeypatch):
    monkeypatch.setattr(pro_service, "_client_factory", lambda: make_mock_client(_rpc_handler(None)))
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/pro/verify",
            json={"wallet_address": PAYER, "tx_signature": SIGNATURE},
        )
        assert r.status_code == 402
        assert "not found" in r.json()["detail"]
