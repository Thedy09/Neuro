"""
NEURO Backend — On-Chain Pro Subscriptions

Payment flow (non-custodial, no Stripe):
1. The user sends a plain SOL transfer of PRO_PRICE_SOL to PRO_TREASURY_WALLET
   from their own wallet (the frontend builds the transfer; the user signs).
2. The frontend calls POST /api/v1/pro/verify with the transaction signature.
3. This service fetches the transaction from the Solana RPC, checks the
   transfer (source = subscriber wallet, destination = treasury, amount and
   recency), and activates Pro for PRO_DURATION_DAYS.

Subscriptions are persisted to a JSON file next to the backend code — fine for
a single instance (VPS / one Render service); move to a database when scaling.
"""

import json
import time
from pathlib import Path

import httpx
import structlog

from config import settings

logger = structlog.get_logger()

_STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "pro_subscriptions.json"

# Reject payment transactions older than this (prevents replaying an ancient
# transfer that happened to match the price).
MAX_TX_AGE_SECONDS = 24 * 3600

LAMPORTS_PER_SOL = 1_000_000_000


class ProSubscriptionError(Exception):
    """Verification failed for a user-facing reason (bad tx, wrong amount...)."""


class ProService:
    """Verifies SOL payment transactions and tracks subscription expiries."""

    def __init__(self, store_path: Path = _STORE_PATH):
        self._store_path = store_path
        self._subscriptions: dict[str, float] = {}  # wallet -> expiry (unix ts)
        self._used_signatures: set[str] = set()
        # Injectable for tests
        self._client_factory = lambda: httpx.AsyncClient(timeout=20.0)
        self._load()

    # ── Persistence ───────────────────────────────────────────────────────

    def _load(self) -> None:
        try:
            raw = json.loads(self._store_path.read_text())
            self._subscriptions = {str(k): float(v) for k, v in raw.get("subscriptions", {}).items()}
            self._used_signatures = set(raw.get("used_signatures", []))
        except FileNotFoundError:
            pass
        except (json.JSONDecodeError, ValueError, OSError) as e:
            logger.warning("pro_store_load_failed", error=str(e))

    def _save(self) -> None:
        try:
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
            self._store_path.write_text(
                json.dumps(
                    {
                        "subscriptions": self._subscriptions,
                        "used_signatures": sorted(self._used_signatures),
                    },
                    indent=2,
                )
            )
        except OSError as e:
            logger.error("pro_store_save_failed", error=str(e))

    # ── Subscription state ────────────────────────────────────────────────

    @staticmethod
    def enabled() -> bool:
        return bool(settings.PRO_TREASURY_WALLET.strip())

    def is_pro(self, wallet_address: str | None) -> bool:
        if not wallet_address:
            return False
        wallet = wallet_address.strip()
        if wallet in settings.PRO_WALLETS:  # manual override list
            return True
        expiry = self._subscriptions.get(wallet)
        return expiry is not None and expiry > time.time()

    def expires_at(self, wallet_address: str) -> float | None:
        expiry = self._subscriptions.get(wallet_address.strip())
        if expiry is None or expiry <= time.time():
            return None
        return expiry

    # ── Payment verification ──────────────────────────────────────────────

    async def _fetch_transaction(self, signature: str) -> dict | None:
        async with self._client_factory() as client:
            resp = await client.post(
                settings.SOLANA_RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [
                        signature,
                        {
                            "encoding": "jsonParsed",
                            "commitment": "confirmed",
                            "maxSupportedTransactionVersion": 0,
                        },
                    ],
                },
            )
            resp.raise_for_status()
            return resp.json().get("result")

    @staticmethod
    def _find_transfer_lamports(tx: dict, source: str, destination: str) -> int:
        """Sum lamports of parsed system transfers matching source → destination."""
        message = tx.get("transaction", {}).get("message", {})
        total = 0
        for ix in message.get("instructions", []):
            parsed = ix.get("parsed")
            if not isinstance(parsed, dict) or parsed.get("type") != "transfer":
                continue
            info = parsed.get("info", {})
            if info.get("source") == source and info.get("destination") == destination:
                total += int(info.get("lamports", 0))
        return total

    async def verify_and_activate(self, wallet_address: str, tx_signature: str) -> dict:
        """Verify a SOL payment transaction and activate/extend Pro.

        Returns ``{"is_pro": True, "expires_at": <unix ts>}`` on success.
        Raises ProSubscriptionError with a user-facing message otherwise.
        """
        if not self.enabled():
            raise ProSubscriptionError("On-chain subscriptions are not enabled on this server")

        wallet = wallet_address.strip()
        signature = tx_signature.strip()
        if not wallet or not signature:
            raise ProSubscriptionError("wallet_address and tx_signature are required")

        if signature in self._used_signatures:
            raise ProSubscriptionError("This transaction has already been used for a subscription")

        try:
            tx = await self._fetch_transaction(signature)
        except httpx.HTTPError as e:
            logger.error("pro_rpc_error", error=str(e))
            raise ProSubscriptionError("Could not reach the Solana RPC to verify the payment") from e

        if tx is None:
            raise ProSubscriptionError("Transaction not found — wait for confirmation and retry")

        if tx.get("meta", {}).get("err") is not None:
            raise ProSubscriptionError("Transaction failed on-chain")

        block_time = tx.get("blockTime")
        if block_time is not None and time.time() - block_time > MAX_TX_AGE_SECONDS:
            raise ProSubscriptionError("Transaction is too old — send a new payment")

        treasury = settings.PRO_TREASURY_WALLET.strip()
        paid = self._find_transfer_lamports(tx, source=wallet, destination=treasury)
        required = int(settings.PRO_PRICE_SOL * LAMPORTS_PER_SOL)
        if paid < required:
            raise ProSubscriptionError(
                f"Insufficient payment: expected {settings.PRO_PRICE_SOL} SOL "
                f"to {treasury[:8]}…, found {paid / LAMPORTS_PER_SOL} SOL from this wallet"
            )

        # Extend from current expiry when still active, otherwise from now.
        now = time.time()
        base = max(self._subscriptions.get(wallet, 0.0), now)
        expiry = base + settings.PRO_DURATION_DAYS * 24 * 3600

        self._subscriptions[wallet] = expiry
        self._used_signatures.add(signature)
        self._save()

        logger.info(
            "pro_subscription_activated",
            wallet=wallet,
            signature=signature,
            expires_at=expiry,
        )
        return {"is_pro": True, "expires_at": expiry}


pro_service = ProService()
