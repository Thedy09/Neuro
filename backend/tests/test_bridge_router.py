"""Tests for the bridge router endpoints, with the LI.FI service mocked."""

from fastapi.testclient import TestClient

from main import app
from services import lifi_service as lifi_mod


class _FakeLiFi:
    # Lifespan startup calls these on the singleton.
    async def initialize(self):
        return None

    async def close(self):
        return None

    async def get_executable_transaction(self, **kwargs):
        assert kwargs["from_address"] and kwargs["to_address"]
        return {
            "route_id": "r1",
            "bridge_name": "Across",
            "from_chain": "BASE",
            "to_chain": "SOL",
            "from_amount": "300000000",
            "to_amount": "299000000",
            "transaction_request": {"to": "0xabc", "data": "0xdead"},
            "next_step": "Sign and broadcast",
        }


def test_execute_returns_unsigned_tx(monkeypatch):
    monkeypatch.setattr(lifi_mod, "lifi_service", _FakeLiFi())
    # Router imported the singleton by reference at module load; patch there too.
    from routers import bridge as bridge_router

    monkeypatch.setattr(bridge_router, "lifi_service", _FakeLiFi())

    with TestClient(app) as client:
        r = client.post(
            "/api/v1/bridge/execute",
            json={
                "from_chain": "BASE",
                "from_token": "USDC",
                "amount": "300000000",
                "from_address": "0xfrom",
                "to_address": "SoLwallet",
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["transaction_request"] == {"to": "0xabc", "data": "0xdead"}
    assert body["bridge_name"] == "Across"


def test_supported_chains_listed():
    with TestClient(app) as client:
        r = client.get("/api/v1/bridge/chains")
    assert r.status_code == 200
    ids = {c["id"] for c in r.json()["supported_sources"]}
    assert {"ETH", "BASE", "ARB", "POL", "BSC"} <= ids
