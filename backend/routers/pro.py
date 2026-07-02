"""
NEURO Backend — Pro Subscription Router
On-chain (SOL) subscription payment: config, verification, status.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services.pro_service import ProSubscriptionError, pro_service

router = APIRouter()


@router.get("/config")
async def pro_config():
    """Payment parameters the frontend needs to build the transfer."""
    return {
        "enabled": pro_service.enabled(),
        "treasury_wallet": settings.PRO_TREASURY_WALLET or None,
        "price_sol": settings.PRO_PRICE_SOL,
        "duration_days": settings.PRO_DURATION_DAYS,
    }


class ProVerifyRequest(BaseModel):
    wallet_address: str = Field(..., min_length=32, max_length=64)
    tx_signature: str = Field(..., min_length=32, max_length=128)


@router.post("/verify")
async def pro_verify(body: ProVerifyRequest):
    """Verify a SOL payment transaction and activate Pro for the wallet."""
    try:
        return await pro_service.verify_and_activate(body.wallet_address, body.tx_signature)
    except ProSubscriptionError as e:
        raise HTTPException(status_code=402, detail=str(e)) from e


@router.get("/status")
async def pro_status(wallet_address: str):
    """Subscription status for a wallet."""
    return {
        "is_pro": pro_service.is_pro(wallet_address),
        "expires_at": pro_service.expires_at(wallet_address),
    }
