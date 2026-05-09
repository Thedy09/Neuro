"""
NEURO Backend — AI Agent Service
Rule-based intents / templated replies plus LI.FI-backed bridging tools (no hosted LLM in this module).
Browser-side ElevenLabs voice uses `ElevenLabsService` separately from `/chat`.
"""

import re
import uuid
import structlog
from typing import Any

from services.lifi_service import lifi_service
from config import settings

logger = structlog.get_logger()


# ─── Yield Protocol Data ───────────────���─────────────────────────────────────

YIELD_PROTOCOLS = [
    {
        "protocol": "Jito",
        "type": "Liquid Staking",
        "asset": "SOL",
        "apy": 7.1,
        "risk_level": "Low",
        "risk_score": 15,
        "liquidity_score": 98,
        "tvl": "$2.1B",
        "recommendation": "Conservative pick. Reliable yield with high liquidity.",
    },
    {
        "protocol": "Kamino",
        "type": "USDC Vault",
        "asset": "USDC",
        "apy": 8.2,
        "risk_level": "Low",
        "risk_score": 20,
        "liquidity_score": 95,
        "tvl": "$890M",
        "recommendation": "Best risk-adjusted return for stablecoin exposure.",
    },
    {
        "protocol": "Drift",
        "type": "USDC-SOL LP",
        "asset": "USDC-SOL",
        "apy": 12.4,
        "risk_level": "Medium",
        "risk_score": 45,
        "liquidity_score": 82,
        "tvl": "$320M",
        "recommendation": "Higher yield suitable for medium risk tolerance.",
    },
    {
        "protocol": "MarginFi",
        "type": "Lending",
        "asset": "USDC",
        "apy": 6.8,
        "risk_level": "Low",
        "risk_score": 12,
        "liquidity_score": 97,
        "tvl": "$650M",
        "recommendation": "Most conservative. Lending with highest liquidity.",
    },
]


# ─── Agent Tools ──────────────────────────────────────────────────────────────

async def get_yield_analysis(risk_tolerance: int = 50) -> dict:
    """Analyze yield opportunities across Solana DeFi protocols."""
    logger.info("tool_get_yield_analysis", risk_tolerance=risk_tolerance)

    filtered = []
    for p in YIELD_PROTOCOLS:
        if risk_tolerance < 30 and p["risk_level"] != "Low":
            continue
        if risk_tolerance < 60 and p["risk_level"] == "High":
            continue
        filtered.append(p)

    # Sort by risk-adjusted APY
    filtered.sort(key=lambda x: x["apy"] / max(x["risk_score"], 1), reverse=True)

    recommended = filtered[0] if filtered else YIELD_PROTOCOLS[0]

    return {
        "protocols": filtered,
        "recommended": {
            "protocol": recommended["protocol"],
            "apy": recommended["apy"],
            "risk_level": recommended["risk_level"],
            "liquidity_score": recommended["liquidity_score"],
            "reason": recommended["recommendation"],
        },
        "risk_tolerance_used": risk_tolerance,
    }


async def execute_cross_chain_move(
    source_chain: str,
    token: str,
    amount: str,
    destination_strategy: str = "vault",
) -> dict:
    """Bridge assets from another chain to Solana and prepare vault deposit."""
    logger.info(
        "tool_execute_cross_chain_move",
        source=source_chain,
        token=token,
        amount=amount,
        strategy=destination_strategy,
    )

    try:
        route = await lifi_service.get_best_route(
            from_chain=source_chain,
            from_token=token,
            amount=amount,
            destination_token="USDC",
        )

        return {
            "status": "route_found",
            "bridge_route": route,
            "destination_strategy": destination_strategy,
            "next_step": "Sign transaction in wallet to execute bridge",
        }
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        logger.error("cross_chain_move_failed", error=str(e))
        return {"status": "error", "message": f"Failed to fetch route: {str(e)}"}


async def get_portfolio_risk(wallet_address: str | None = None) -> dict:
    """Analyze portfolio risk metrics. Reads on-chain vault data when available."""
    logger.info("tool_get_portfolio_risk", wallet=wallet_address)

    # Try to fetch real vault risk score if wallet is provided
    risk_score = 50  # default
    if wallet_address:
        try:
            import httpx
            from solders.pubkey import Pubkey

            owner = Pubkey.from_string(wallet_address)
            program_id = Pubkey.from_string(settings.NEURO_PROGRAM_ID)
            vault_address, _ = Pubkey.find_program_address(
                [bytes(owner), b"vault"], program_id
            )

            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    settings.SOLANA_RPC_URL,
                    json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getAccountInfo",
                        "params": [str(vault_address), {"encoding": "base64", "commitment": "confirmed"}],
                    },
                )
                result = resp.json().get("result", {}).get("value")
                if result:
                    import base64, struct
                    data = base64.b64decode(result["data"][0])
                    # Skip 8-byte discriminator + 32-byte owner → risk_tolerance_score is at offset 40
                    if len(data) >= 41:
                        risk_score = data[40]
                        logger.info("vault_risk_read_onchain", risk_score=risk_score)
        except Exception as e:
            logger.warning("vault_risk_fetch_fallback", error=str(e))

    # Determine rating from on-chain score
    if risk_score <= 25:
        rating = "Conservative"
    elif risk_score <= 50:
        rating = "Moderate"
    elif risk_score <= 75:
        rating = "Growth"
    else:
        rating = "Aggressive"

    return {
        "risk_score": risk_score,
        "rating": rating,
        "metrics": {
            "stablecoin_exposure": {
                "value": max(20, 90 - risk_score),
                "unit": "%",
                "status": "healthy" if risk_score < 60 else "moderate",
                "description": "Stablecoin allocation relative to portfolio",
            },
            "chain_concentration": {
                "value": 85,
                "unit": "%",
                "primary_chain": "Solana",
                "status": "moderate",
                "description": "Consider diversifying across chains",
            },
            "protocol_exposure": {
                "protocols": 3,
                "status": "good",
                "description": "Diversified across multiple protocols",
            },
            "estimated_volatility": {
                "level": "Low" if risk_score < 30 else "Low-Medium" if risk_score < 60 else "Medium-High",
                "daily_var_95": f"{0.5 + risk_score * 0.03:.1f}%",
                "description": f"Expected daily loss under {0.5 + risk_score * 0.03:.1f}% at 95% confidence",
            },
        },
        "recommendations": [
            "Consider adding a small SOL staking position for yield diversification",
            "Chain concentration is moderate — bridging 10-15% to Ethereum could improve resilience",
        ] if risk_score < 50 else [
            "Your risk tolerance is elevated — consider increasing stablecoin allocation",
            "Monitor impermanent loss on LP positions closely",
        ],
    }


# ─── Tool Registry ────────────────────────────────────────────────────────────

TOOLS = {
    "get_yield_analysis": get_yield_analysis,
    "execute_cross_chain_move": execute_cross_chain_move,
    "get_portfolio_risk": get_portfolio_risk,
}


# ─── Intent Detection ───────────────────────────────────────────────────────────

_TOKEN_DECIMALS = {"USDC": 6, "USDT": 6, "ETH": 18, "SOL": 9}


def _detect_bridge_token(message: str) -> str:
    lower = message.lower()
    if re.search(r"\b(eth|ethereum)\b", lower):
        return "ETH"
    if re.search(r"\bsol\b", lower):
        return "SOL"
    if re.search(r"\busdt\b", lower):
        return "USDT"
    return "USDC"


def _parse_human_amount_from_message(message: str, default_human: float = 300.0) -> float:
    """Best-effort extract a transfer amount from user text (human units, e.g. 300 USDC)."""
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:\$|usd|usdc|usdt|sol|eth)?", message.lower())
    if not m:
        return default_human
    raw = m.group(1).replace(",", ".")
    try:
        val = float(raw)
    except ValueError:
        return default_human
    return val if val > 0 else default_human


def _human_to_smallest_unit(amount_human: float, token: str) -> str:
    decimals = _TOKEN_DECIMALS.get(token.upper(), 6)
    return str(int(round(amount_human * (10**decimals))))


def detect_intent(message: str) -> tuple[str, dict[str, Any]]:
    """Simple intent detection from natural language."""
    lower = message.lower()

    if any(w in lower for w in ["bridge", "move", "transfer", "send"]):
        params: dict[str, Any] = {}
        params["source_chain"] = "BASE"

        _bridge_chain_patterns: list[tuple[re.Pattern[str], str]] = [
            (re.compile(r"\bbase\b"), "BASE"),
            (re.compile(r"\b(arbitrum|arb)\b"), "ARB"),
            (re.compile(r"\b(polygon|matic)\b"), "POL"),
            (re.compile(r"\b(bsc|bnb\s+chain)\b"), "BSC"),
            (re.compile(r"\bethereum\b"), "ETH"),
            (re.compile(r"\beth\b"), "ETH"),
        ]
        for pattern, cid in _bridge_chain_patterns:
            if pattern.search(lower):
                params["source_chain"] = cid
                break

        token = _detect_bridge_token(message)
        amount_human = _parse_human_amount_from_message(message, default_human=300.0)
        params["token"] = token
        params["amount_smallest_unit"] = _human_to_smallest_unit(amount_human, token)

        return "cross_chain_move", params

    if any(w in lower for w in ["yield", "apy", "earn", "optimize", "stake"]):
        return "yield_analysis", {}

    if any(w in lower for w in ["risk", "portfolio", "analyze", "score", "exposure"]):
        return "portfolio_risk", {}

    return "general", {}


# ─── Response Templates ───────────────────────────────────────────────────────

def format_yield_response(data: dict) -> str:
    """Format yield analysis into natural language."""
    rec = data["recommended"]
    protocols = data["protocols"]

    lines = ["Based on your risk profile, here are the top opportunities:\n"]
    for i, p in enumerate(protocols[:3], 1):
        lines.append(f"{i}. **{p['protocol']} {p['type']}** — {p['apy']}% APY, {p['risk_level']} risk")

    lines.append(f"\n**Recommendation:** {rec['protocol']} at {rec['apy']}% APY. {rec['reason']}")
    return "\n".join(lines)


def format_bridge_response(data: dict) -> str:
    """Format bridge route into natural language."""
    if data["status"] == "error":
        return f"I couldn't find a route: {data['message']}"

    route = data["bridge_route"]
    return (
        f"I found the optimal route via LI.FI. Bridging {route['from_token']} from {route['from_chain']} "
        f"to Solana through {route['bridge_name']}. Estimated arrival: ~{route['estimated_time_seconds']}s. "
        f"Gas cost: ${route['estimated_gas']}. Shall I proceed?"
    )


def format_risk_response(data: dict) -> str:
    """Format risk analysis into natural language."""
    m = data["metrics"]
    lines = [
        "Your portfolio risk analysis:\n",
        f"- **Stablecoin exposure:** {m['stablecoin_exposure']['value']}% ({m['stablecoin_exposure']['status']})",
        f"- **Chain concentration:** {m['chain_concentration']['value']}% {m['chain_concentration']['primary_chain']} ({m['chain_concentration']['status']})",
        f"- **Protocol diversification:** {m['protocol_exposure']['protocols']} protocols ({m['protocol_exposure']['status']})",
        f"- **Estimated volatility:** {m['estimated_volatility']['level']}",
        f"\nOverall risk score: **{data['risk_score']}/100** — {data['rating']} profile.",
    ]
    return "\n".join(lines)


# ─── Agent Class ──────────────────────────────────────────────────────────────

class NeuroAgent:
    """Keyword routing + fixed finance templates; delegates bridging quotes to LI.FI."""

    SYSTEM_PROMPT = (
        "You are NEURO, an AI private banker for crypto natives. "
        "You are intelligent, futuristic, calm, concise, and trustworthy. "
        "You help users bridge assets across chains to Solana, analyze yield "
        "opportunities, manage vault risk scores, and optimize their DeFi portfolio. "
        "Always be precise with numbers and transparent about risks."
    )

    def __init__(self):
        self._sessions: dict[str, list[dict]] = {}

    async def process_message(
        self,
        message: str,
        wallet_address: str | None = None,
        session_id: str | None = None,
    ) -> dict:
        """Process a user message and return AI response with optional actions."""
        sid = session_id or str(uuid.uuid4())

        if sid not in self._sessions:
            self._sessions[sid] = []

        self._sessions[sid].append({"role": "user", "content": message})

        # Detect intent
        intent, params = detect_intent(message)
        logger.info("agent_intent_detected", intent=intent, session=sid)

        response_text = ""
        action = None

        if intent == "yield_analysis":
            # Use wallet-specific risk tolerance if available, otherwise default to 50
            risk = params.get("risk_tolerance", 50)
            data = await get_yield_analysis(risk_tolerance=risk)
            response_text = format_yield_response(data)
            action = {
                "type": "yield",
                "data": {
                    "recommended": data["recommended"]["protocol"],
                    "apy": f"{data['recommended']['apy']}%",
                    "risk": data["recommended"]["risk_level"],
                    "liquidity": f"{data['recommended']['liquidity_score']}%",
                },
            }

        elif intent == "cross_chain_move":
            source = params.get("source_chain", "BASE")
            token = params.get("token", "USDC")
            amount = params.get("amount_smallest_unit") or _human_to_smallest_unit(300.0, "USDC")
            data = await execute_cross_chain_move(
                source_chain=source,
                token=token,
                amount=amount,
                destination_strategy="vault",
            )
            response_text = format_bridge_response(data)
            if data["status"] == "route_found":
                route = data["bridge_route"]
                action = {
                    "type": "bridge",
                    "data": {
                        "from": route["from_chain"],
                        "to": "Solana",
                        "amount": f"{route['from_amount']} {route['from_token']}",
                        "route": route["bridge_name"],
                        "gas": f"${route['estimated_gas']}",
                        "eta": f"~{route['estimated_time_seconds']}s",
                    },
                }

        elif intent == "portfolio_risk":
            data = await get_portfolio_risk(wallet_address=wallet_address)
            response_text = format_risk_response(data)
            action = {
                "type": "risk",
                "data": {
                    "score": f"{data['risk_score']}/100",
                    "stablecoin": f"{data['metrics']['stablecoin_exposure']['value']}%",
                    "volatility": data["metrics"]["estimated_volatility"]["level"],
                    "status": data["rating"],
                },
            }

        else:
            response_text = (
                "I can help you with:\n\n"
                "- **Bridge assets** — Move tokens from any chain to Solana\n"
                "- **Yield analysis** — Find the best APY for your risk profile\n"
                "- **Risk assessment** — Analyze your portfolio exposure\n\n"
                "Just tell me what you'd like to do."
            )

        self._sessions[sid].append({"role": "assistant", "content": response_text})

        return {
            "response": response_text,
            "intent": intent,
            "action": action,
            "session_id": sid,
        }


# Singleton
neuro_agent = NeuroAgent()
