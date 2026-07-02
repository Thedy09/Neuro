"""
NEURO Backend — Voice Usage Quotas (freemium revenue model)

Voice endpoints (ElevenLabs TTS / STT / ConvAI sessions) are the main variable
cost of the product. This service enforces a daily free allowance per identity
(wallet address when known, client IP otherwise) so the free tier stays within
budget, while Pro wallets (subscribers) bypass the quota entirely.

Storage is in-memory and resets on process restart — acceptable for a single
instance; move to Redis when scaling horizontally.
"""

import time

import structlog

from config import settings

logger = structlog.get_logger()


class UsageService:
    """Daily request counter with a free-tier limit and a Pro allowlist."""

    def __init__(self):
        self._day: str = self._today()
        self._counts: dict[str, int] = {}

    @staticmethod
    def _today() -> str:
        return time.strftime("%Y-%m-%d", time.gmtime())

    def _rollover(self) -> None:
        today = self._today()
        if today != self._day:
            self._day = today
            self._counts = {}

    @staticmethod
    def is_pro(wallet_address: str | None) -> bool:
        if not wallet_address:
            return False
        return wallet_address.strip() in settings.PRO_WALLETS

    def check_and_increment(
        self, identity: str, wallet_address: str | None = None
    ) -> dict:
        """Consume one voice request from the daily allowance.

        Returns ``{"allowed", "remaining", "limit", "is_pro"}``.
        ``remaining`` is -1 when unlimited (Pro tier or quotas disabled).
        """
        if self.is_pro(wallet_address):
            return {"allowed": True, "remaining": -1, "limit": -1, "is_pro": True}

        limit = settings.VOICE_FREE_DAILY_REQUESTS
        if limit <= 0:  # quotas disabled
            return {"allowed": True, "remaining": -1, "limit": -1, "is_pro": False}

        self._rollover()
        used = self._counts.get(identity, 0)
        if used >= limit:
            logger.info("voice_quota_exceeded", identity=identity, limit=limit)
            return {"allowed": False, "remaining": 0, "limit": limit, "is_pro": False}

        self._counts[identity] = used + 1
        return {
            "allowed": True,
            "remaining": limit - used - 1,
            "limit": limit,
            "is_pro": False,
        }

    def usage(self, identity: str, wallet_address: str | None = None) -> dict:
        """Read-only view of today's usage for an identity."""
        if self.is_pro(wallet_address):
            return {"used": 0, "remaining": -1, "limit": -1, "is_pro": True}

        limit = settings.VOICE_FREE_DAILY_REQUESTS
        if limit <= 0:
            return {"used": 0, "remaining": -1, "limit": -1, "is_pro": False}

        self._rollover()
        used = self._counts.get(identity, 0)
        return {
            "used": used,
            "remaining": max(limit - used, 0),
            "limit": limit,
            "is_pro": False,
        }


usage_service = UsageService()
