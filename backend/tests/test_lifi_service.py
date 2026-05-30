"""Tests for the LI.FI bridge service: route parsing, errors, and executable tx."""

import httpx
import pytest

from services.lifi_service import LiFiService, SOLANA_CHAIN_ID
from tests.conftest import make_mock_client


def _route_payload(with_inline_tx: bool = False):
    step = {
        "type": "cross",
        "tool": "across",
        "toolDetails": {"name": "Across"},
        "action": {
            "fromChainId": 8453,
            "toChainId": SOLANA_CHAIN_ID,
            "fromToken": {"symbol": "USDC"},
            "toToken": {"symbol": "USDC"},
        },
        "estimate": {
            "fromAmount": "300000000",
            "toAmount": "299000000",
            "executionDuration": 45,
        },
    }
    if with_inline_tx:
        step["transactionRequest"] = {"to": "0xabc", "data": "0xdead", "chainId": 8453}
    return {
        "routes": [
            {
                "id": "route-123",
                "fromAmount": "300000000",
                "toAmount": "299000000",
                "gasCostUSD": "1.20",
                "steps": [step],
            }
        ]
    }


async def _make_service(handler) -> LiFiService:
    svc = LiFiService()
    svc._client = make_mock_client(handler, base_url="https://li.quest/v1")
    return svc


async def test_get_best_route_parses_recommended():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/advanced/routes")
        return httpx.Response(200, json=_route_payload())

    svc = await _make_service(handler)
    route = await svc.get_best_route("BASE", "USDC", "300000000")

    assert route["route_id"] == "route-123"
    assert route["from_chain"] == "BASE"
    assert route["to_chain"] == "SOL"
    assert route["bridge_name"] == "Across"
    assert route["estimated_time_seconds"] == 45
    assert route["to_amount"] == "299000000"
    assert len(route["steps"]) == 1


async def test_unsupported_chain_raises_value_error():
    svc = await _make_service(lambda r: httpx.Response(200, json={"routes": []}))
    with pytest.raises(ValueError, match="Unsupported source chain"):
        await svc.get_best_route("DOGECHAIN", "USDC", "1000")


async def test_no_routes_raises_value_error():
    svc = await _make_service(lambda r: httpx.Response(200, json={"routes": []}))
    with pytest.raises(ValueError, match="No routes found"):
        await svc.get_best_route("BASE", "USDC", "300000000")


async def test_executable_requires_addresses():
    svc = await _make_service(lambda r: httpx.Response(200, json=_route_payload()))
    with pytest.raises(ValueError, match="from_address"):
        await svc.get_executable_transaction("BASE", "USDC", "300000000", "", "SoLwallet")
    with pytest.raises(ValueError, match="to_address"):
        await svc.get_executable_transaction("BASE", "USDC", "300000000", "0xfrom", "")


async def test_executable_uses_inline_tx_when_present():
    svc = await _make_service(lambda r: httpx.Response(200, json=_route_payload(with_inline_tx=True)))
    result = await svc.get_executable_transaction(
        "BASE", "USDC", "300000000", "0xfrom", "SoLwallet"
    )
    assert result["transaction_request"] == {"to": "0xabc", "data": "0xdead", "chainId": 8453}
    assert result["route_id"] == "route-123"
    assert result["bridge_name"] == "Across"


async def test_executable_resolves_step_transaction_when_missing():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/advanced/routes"):
            return httpx.Response(200, json=_route_payload(with_inline_tx=False))
        if request.url.path.endswith("/advanced/stepTransaction"):
            return httpx.Response(
                200, json={"transactionRequest": {"to": "0xstep", "data": "0xbeef"}}
            )
        return httpx.Response(404, json={})

    svc = await _make_service(handler)
    result = await svc.get_executable_transaction(
        "BASE", "USDC", "300000000", "0xfrom", "SoLwallet"
    )
    assert result["transaction_request"] == {"to": "0xstep", "data": "0xbeef"}


async def test_get_transaction_status_maps_fields():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/status")
        return httpx.Response(200, json={"status": "DONE", "substatus": "COMPLETED"})

    svc = await _make_service(handler)
    status = await svc.get_transaction_status("0xhash")
    assert status["status"] == "DONE"
    assert status["substatus"] == "COMPLETED"
