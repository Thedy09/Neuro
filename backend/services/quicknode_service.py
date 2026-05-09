"""
NEURO Backend — QuickNode Streams Service
Solana webhook monitoring for vault deposit tracking
"""

import httpx
import structlog
from typing import Any

from config import settings

logger = structlog.get_logger()


class QuickNodeService:
    """QuickNode Streams integration for monitoring Solana vault events."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._ws_connections: dict[str, Any] = {}

    async def initialize(self):
        """Initialize HTTP client for QuickNode API."""
        headers = {}
        if settings.QUICKNODE_STREAM_TOKEN:
            headers["Authorization"] = f"Bearer {settings.QUICKNODE_STREAM_TOKEN}"

        self._client = httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(15.0, connect=5.0),
        )
        logger.info("quicknode_service_initialized")

    async def close(self):
        """Cleanup resources."""
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("QuickNode service not initialized")
        return self._client

    async def process_deposit_event(self, payload: dict) -> dict:
        """
        Process incoming QuickNode Streams deposit event.

        Expected payload structure from QuickNode Streams:
        {
            "matchedTransactions": [...],
            "context": { "slot": ..., "block_time": ... }
        }
        """
        matched = payload.get("matchedTransactions", [])

        if not matched:
            logger.debug("no_matched_transactions")
            return {"processed": False}

        for tx in matched:
            signature = tx.get("signature", "")
            meta = tx.get("meta", {})
            logs = meta.get("logMessages", [])

            # Look for NEURO vault deposit events in logs
            deposit_event = None
            for log in logs:
                if "DepositTracked" in log or "deposit_tracking" in log:
                    deposit_event = log
                    break

            if deposit_event:
                # Parse deposit details from transaction
                pre_balances = meta.get("preBalances", [])
                post_balances = meta.get("postBalances", [])
                amount = 0
                if pre_balances and post_balances:
                    amount = abs(post_balances[0] - pre_balances[0])

                account_keys = tx.get("transaction", {}).get("message", {}).get("accountKeys", [])
                vault_address = account_keys[1] if len(account_keys) > 1 else ""

                logger.info(
                    "vault_deposit_detected",
                    signature=signature,
                    amount=amount,
                    vault=vault_address,
                )

                return {
                    "processed": True,
                    "signature": signature,
                    "amount": amount,
                    "vault_address": vault_address,
                    "slot": payload.get("context", {}).get("slot"),
                    "block_time": payload.get("context", {}).get("block_time"),
                }

        return {"processed": False}

    async def process_account_change(self, payload: dict) -> dict:
        """
        Process account data change webhook.
        Detects risk score updates and other vault mutations.
        """
        matched = payload.get("matchedAccounts", [])

        if not matched:
            return {"processed": False}

        for account in matched:
            pubkey = account.get("pubkey", "")
            data = account.get("account", {}).get("data", {})

            logger.info(
                "account_change_detected",
                pubkey=pubkey,
                data_len=len(str(data)),
            )

            return {
                "processed": True,
                "pubkey": pubkey,
                "change_type": "account_update",
            }

        return {"processed": False}

    async def notify_deposit_success(self, result: dict) -> None:
        """
        Send deposit success notifications.
        Triggers WebSocket updates and voice confirmation.
        """
        signature = result.get("signature", "")
        amount = result.get("amount", 0)
        vault = result.get("vault_address", "")

        logger.info(
            "deposit_notification_sent",
            signature=signature,
            amount=amount,
            vault=vault,
        )

        # Broadcast to connected WebSocket clients
        for session_id, ws in self._ws_connections.items():
            try:
                await ws.send_json({
                    "type": "deposit_confirmed",
                    "data": {
                        "signature": signature,
                        "amount": amount,
                        "vault": vault,
                    },
                })
                logger.info("ws_notification_sent", session=session_id)
            except Exception as e:
                logger.warning("ws_notification_failed", session=session_id, error=str(e))

    def register_ws(self, session_id: str, websocket: Any) -> None:
        """Register a WebSocket connection for notifications."""
        self._ws_connections[session_id] = websocket
        logger.info("ws_registered", session=session_id)

    def unregister_ws(self, session_id: str) -> None:
        """Unregister a WebSocket connection."""
        self._ws_connections.pop(session_id, None)
        logger.info("ws_unregistered", session=session_id)


# Singleton
quicknode_service = QuickNodeService()
