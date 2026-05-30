"""
NEURO Backend — Bridge Router
Cross-chain bridging via LI.FI
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.lifi_service import lifi_service

router = APIRouter()


class BridgeQuoteRequest(BaseModel):
    from_chain: str = Field(..., description="Source chain (e.g., 'ETH', 'BASE', 'ARB')")
    from_token: str = Field(..., description="Source token address or symbol")
    amount: str = Field(..., description="Amount in smallest unit (wei/lamports)")
    destination_token: str = Field(default="USDC", description="Destination token on Solana")


class BridgeQuoteResponse(BaseModel):
    route_id: str
    from_chain: str
    to_chain: str
    from_token: str
    to_token: str
    from_amount: str
    to_amount: str
    estimated_gas: str
    estimated_time_seconds: int
    bridge_name: str
    steps: list[dict]
    transaction_request: dict | None = None


@router.post("/quote", response_model=BridgeQuoteResponse)
async def get_bridge_quote(request: BridgeQuoteRequest):
    """Fetch optimal cross-chain bridge route via LI.FI."""
    try:
        route = await lifi_service.get_best_route(
            from_chain=request.from_chain,
            from_token=request.from_token,
            amount=request.amount,
            destination_token=request.destination_token,
        )
        return BridgeQuoteResponse(**route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bridge service error: {str(e)}")


class BridgeExecuteRequest(BaseModel):
    from_chain: str = Field(..., description="Source chain (e.g., 'ETH', 'BASE', 'ARB')")
    from_token: str = Field(..., description="Source token address or symbol")
    amount: str = Field(..., description="Amount in smallest unit (wei/lamports)")
    from_address: str = Field(..., description="Source wallet address (signs the bridge tx)")
    to_address: str = Field(..., description="Destination Solana wallet address")
    destination_token: str = Field(default="USDC", description="Destination token on Solana")


class BridgeExecuteResponse(BaseModel):
    route_id: str
    bridge_name: str
    from_chain: str
    to_chain: str
    from_amount: str
    to_amount: str
    transaction_request: dict
    next_step: str


@router.post("/execute", response_model=BridgeExecuteResponse)
async def execute_bridge(request: BridgeExecuteRequest):
    """
    Build a ready-to-sign bridge transaction via LI.FI.

    The backend is non-custodial: it returns an unsigned ``transaction_request``
    that the user's wallet signs and broadcasts on-device (MWA on mobile,
    wallet-standard on web). Poll ``/status/{tx_hash}`` afterwards to track it.
    """
    try:
        result = await lifi_service.get_executable_transaction(
            from_chain=request.from_chain,
            from_token=request.from_token,
            amount=request.amount,
            from_address=request.from_address,
            to_address=request.to_address,
            destination_token=request.destination_token,
        )
        return BridgeExecuteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bridge execution error: {str(e)}")


@router.get("/chains")
async def get_supported_chains():
    """List supported source chains for bridging to Solana."""
    return {
        "destination": "solana",
        "supported_sources": [
            {"id": "ETH", "name": "Ethereum", "chain_id": 1},
            {"id": "BASE", "name": "Base", "chain_id": 8453},
            {"id": "ARB", "name": "Arbitrum", "chain_id": 42161},
            {"id": "POL", "name": "Polygon", "chain_id": 137},
            {"id": "BSC", "name": "BNB Chain", "chain_id": 56},
        ],
    }


@router.get("/status/{tx_hash}")
async def get_bridge_status(tx_hash: str):
    """Check bridge transaction status."""
    try:
        status = await lifi_service.get_transaction_status(tx_hash)
        return status
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Status check failed: {str(e)}")
