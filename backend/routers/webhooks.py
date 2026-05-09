"""
NEURO Backend — Webhook Router
QuickNode Streams integration for Solana deposit monitoring
Secured with HMAC signature verification
"""

import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
import structlog

from config import settings
from services.quicknode_service import quicknode_service

logger = structlog.get_logger()
router = APIRouter()


class QuickNodeStreamPayload(BaseModel):
    """QuickNode Streams webhook payload structure."""
    matchedTransactions: list[dict] = []
    matchedAccounts: list[dict] = []
    context: dict = {}


async def verify_webhook_signature(request: Request) -> bytes:
    """
    Verify QuickNode webhook HMAC-SHA256 signature.
    Raises 401 if signature is missing or invalid.
    """
    body = await request.body()

    if not settings.QUICKNODE_WEBHOOK_SECRET:
        if settings.DEBUG:
            logger.warning(
                "quicknode_webhook_no_secret",
                msg="Webhook secret not configured — skipping verification (DEBUG only)",
            )
            return body
        logger.warning("quicknode_webhook_rejected_unconfigured")
        raise HTTPException(
            status_code=503,
            detail="QuickNode webhooks are not configured (set QUICKNODE_WEBHOOK_SECRET)",
        )

    signature = request.headers.get(settings.QUICKNODE_WEBHOOK_SIGNATURE_HEADER, "")
    if not signature:
        logger.warning("quicknode_webhook_missing_signature")
        raise HTTPException(status_code=401, detail="Missing webhook signature")

    expected = hmac.new(
        settings.QUICKNODE_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        logger.warning("quicknode_webhook_invalid_signature")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    return body


@router.post("/quicknode/deposit")
async def handle_quicknode_deposit(request: Request, body: bytes = Depends(verify_webhook_signature)):
    """
    Webhook endpoint for QuickNode Streams.
    Triggered when a deposit is detected on a NEURO vault PDA.
    Secured via HMAC-SHA256 signature verification.
    """
    try:
        import json
        payload = json.loads(body)
        logger.info("quicknode_webhook_received", payload_keys=list(payload.keys()))

        # Parse and process the stream event
        result = await quicknode_service.process_deposit_event(payload)

        if result["processed"]:
            logger.info(
                "deposit_event_processed",
                tx_signature=result.get("signature"),
                amount=result.get("amount"),
                vault=result.get("vault_address"),
            )

            # Trigger downstream notifications
            await quicknode_service.notify_deposit_success(result)

        return {"status": "ok", "processed": result["processed"]}

    except Exception as e:
        logger.error("quicknode_webhook_error", error=str(e))
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("/quicknode/account-change")
async def handle_account_change(request: Request, body: bytes = Depends(verify_webhook_signature)):
    """
    Webhook for account data changes on vault PDAs.
    Used to detect risk score updates and other vault mutations.
    Secured via HMAC-SHA256 signature verification.
    """
    try:
        import json
        payload = json.loads(body)
        logger.info("account_change_received", payload_keys=list(payload.keys()))

        result = await quicknode_service.process_account_change(payload)
        return {"status": "ok", "processed": result.get("processed", False)}

    except Exception as e:
        logger.error("account_change_error", error=str(e))
        raise HTTPException(status_code=500, detail="Account change processing failed")
