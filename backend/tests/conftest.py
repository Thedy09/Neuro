"""Shared test fixtures and HTTP mocking helpers (no live network in tests)."""

from typing import Callable

import httpx
import pytest


def make_mock_client(handler: Callable[[httpx.Request], httpx.Response], **kwargs) -> httpx.AsyncClient:
    """An httpx.AsyncClient whose requests are served by ``handler`` in-process."""
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), **kwargs)


@pytest.fixture
def json_response():
    """Helper to build a JSON httpx.Response for a MockTransport handler."""

    def _build(payload, status_code: int = 200) -> httpx.Response:
        return httpx.Response(status_code, json=payload)

    return _build
