"""
NEURO Backend — Vault Router
Solana vault management endpoints with real on-chain data fetching
"""

import struct
import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from solders.pubkey import Pubkey
from solders.rpc.responses import GetAccountInfoResp
import httpx

from config import settings

logger = structlog.get_logger()
router = APIRouter()

# ── Constants ────────────────────────────────────────────────────────────────

PROGRAM_ID = Pubkey.from_string(settings.NEURO_PROGRAM_ID)
ANCHOR_DISCRIMINATOR_LEN = 8
# UserVault layout after 8-byte discriminator:
#   owner:                Pubkey (32 bytes)
#   risk_tolerance_score: u8     (1 byte)
#   total_deposited:      u64    (8 bytes)
#   bump:                 u8     (1 byte)
#   created_at:           i64    (8 bytes)
USER_VAULT_DATA_LEN = 32 + 1 + 8 + 1 + 8


# ── Models ───────────────────────────────────────────────────────────────────

class VaultInfo(BaseModel):
    owner: str
    risk_tolerance_score: int
    total_deposited: int
    created_at: int
    bump: int
    vault_address: str


class InitVaultRequest(BaseModel):
    owner_pubkey: str = Field(..., description="Wallet public key")
    risk_score: int = Field(..., ge=0, le=100, description="Risk tolerance 0-100")


class UpdateRiskRequest(BaseModel):
    owner_pubkey: str
    new_score: int = Field(..., ge=0, le=100)


class DepositRequest(BaseModel):
    owner_pubkey: str
    amount: int = Field(..., gt=0, description="Amount in lamports")


# ── Helpers ──────────────────────────────────────────────────────────────────

def derive_vault_pda(owner_pubkey: Pubkey) -> tuple[Pubkey, int]:
    """Derive vault PDA: seeds = [owner_pubkey, "vault"]"""
    seeds = [bytes(owner_pubkey), b"vault"]
    return Pubkey.find_program_address(seeds, PROGRAM_ID)


def decode_vault_data(data: bytes) -> dict:
    """Decode raw account data into vault fields (skip 8-byte Anchor discriminator)."""
    if len(data) < ANCHOR_DISCRIMINATOR_LEN + USER_VAULT_DATA_LEN:
        raise ValueError(f"Account data too short: {len(data)} bytes")

    offset = ANCHOR_DISCRIMINATOR_LEN
    owner = Pubkey.from_bytes(data[offset:offset + 32])
    offset += 32
    risk_tolerance_score = data[offset]
    offset += 1
    total_deposited = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    bump = data[offset]
    offset += 1
    created_at = struct.unpack_from("<q", data, offset)[0]

    return {
        "owner": str(owner),
        "risk_tolerance_score": risk_tolerance_score,
        "total_deposited": total_deposited,
        "bump": bump,
        "created_at": created_at,
    }


async def fetch_account_from_rpc(address: Pubkey) -> dict | None:
    """Fetch account info from Solana RPC."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAccountInfo",
            "params": [
                str(address),
                {"encoding": "base64", "commitment": "confirmed"}
            ],
        }
        response = await client.post(settings.SOLANA_RPC_URL, json=payload)
        response.raise_for_status()
        result = response.json()

        if result.get("error"):
            raise ValueError(result["error"].get("message", "RPC error"))

        account = result.get("result", {}).get("value")
        return account


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{owner_pubkey}", response_model=VaultInfo)
async def get_vault(owner_pubkey: str):
    """Fetch vault data for a given owner address from Solana RPC."""
    try:
        owner = Pubkey.from_string(owner_pubkey)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid public key format")

    vault_address, _ = derive_vault_pda(owner)

    try:
        account = await fetch_account_from_rpc(vault_address)
    except Exception as e:
        logger.error("vault_rpc_fetch_failed", error=str(e), owner=owner_pubkey)
        raise HTTPException(status_code=502, detail=f"Solana RPC error: {str(e)}")

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Vault not found for this wallet. Initialize it first.",
        )

    # Decode base64 account data
    import base64
    raw_data = base64.b64decode(account["data"][0])

    try:
        vault_data = decode_vault_data(raw_data)
    except ValueError as e:
        logger.error("vault_decode_failed", error=str(e), owner=owner_pubkey)
        raise HTTPException(status_code=500, detail=f"Failed to decode vault: {str(e)}")

    return VaultInfo(
        **vault_data,
        vault_address=str(vault_address),
    )


@router.post("/initialize")
async def prepare_init_vault(request: InitVaultRequest):
    """Prepare initialize_vault transaction for client signing."""
    if request.risk_score > 100:
        raise HTTPException(status_code=400, detail="Risk score must be <= 100")

    try:
        owner = Pubkey.from_string(request.owner_pubkey)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid public key format")

    vault_address, _ = derive_vault_pda(owner)

    return {
        "instruction": "initialize_vault",
        "args": {"risk_score": request.risk_score},
        "accounts": {
            "user": request.owner_pubkey,
            "vault": str(vault_address),
            "system_program": "11111111111111111111111111111111",
        },
        "message": f"Transaction prepared for vault initialization with risk score {request.risk_score}",
    }


@router.post("/update-risk")
async def prepare_update_risk(request: UpdateRiskRequest):
    """Prepare update_risk transaction for client signing."""
    try:
        owner = Pubkey.from_string(request.owner_pubkey)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid public key format")

    vault_address, _ = derive_vault_pda(owner)

    return {
        "instruction": "update_risk",
        "args": {"new_score": request.new_score},
        "accounts": {
            "owner": request.owner_pubkey,
            "vault": str(vault_address),
        },
        "message": f"Transaction prepared to update risk score to {request.new_score}",
    }


@router.post("/deposit")
async def prepare_deposit(request: DepositRequest):
    """Prepare deposit_tracking transaction for client signing."""
    try:
        owner = Pubkey.from_string(request.owner_pubkey)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid public key format")

    vault_address, _ = derive_vault_pda(owner)

    return {
        "instruction": "deposit_tracking",
        "args": {"amount": request.amount},
        "accounts": {
            "owner": request.owner_pubkey,
            "vault": str(vault_address),
        },
        "message": f"Transaction prepared to track deposit of {request.amount} lamports",
    }
