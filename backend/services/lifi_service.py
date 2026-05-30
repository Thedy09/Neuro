"""
NEURO Backend — LI.FI Cross-Chain Bridge Service
Real API integration with https://li.quest/v1
"""

import httpx
import structlog
from tenacity import (
    RetryError,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import settings

logger = structlog.get_logger()

# Chain ID mapping for LI.FI
CHAIN_IDS = {
    "ETH": 1,
    "ETHEREUM": 1,
    "BASE": 8453,
    "ARB": 42161,
    "ARBITRUM": 42161,
    "POL": 137,
    "POLYGON": 137,
    "BSC": 56,
    "SOL": 1151111081099710,
    "SOLANA": 1151111081099710,
}

# Common token addresses per chain
TOKEN_ADDRESSES = {
    1: {  # Ethereum
        "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "ETH": "0x0000000000000000000000000000000000000000",
    },
    8453: {  # Base
        "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "ETH": "0x0000000000000000000000000000000000000000",
    },
    42161: {  # Arbitrum
        "USDC": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        "ETH": "0x0000000000000000000000000000000000000000",
    },
    137: {  # Polygon
        "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    56: {  # BSC
        "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "USDT": "0x55d398326f99059fF775485246999027B3197955",
    },
    1151111081099710: {  # Solana
        "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "SOL": "So11111111111111111111111111111111111111112",
    },
}

SOLANA_CHAIN_ID = 1151111081099710


class LiFiService:
    """Cross-chain bridge service using LI.FI API."""

    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._base_url = settings.LIFI_API_URL

    async def initialize(self):
        """Initialize HTTP client."""
        headers = {"Accept": "application/json"}
        if settings.LIFI_API_KEY:
            headers["x-lifi-api-key"] = settings.LIFI_API_KEY

        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers=headers,
            timeout=httpx.Timeout(60.0, connect=30.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )
        logger.info("lifi_service_initialized", base_url=self._base_url)

    async def close(self):
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("LiFi service not initialized. Call initialize() first.")
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    )
    async def _post_advanced_routes(self, params: dict) -> httpx.Response:
        response = await self.client.post("/advanced/routes", json=params)
        response.raise_for_status()
        return response

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    )
    async def _post_step_transaction(self, step: dict) -> httpx.Response:
        response = await self.client.post("/advanced/stepTransaction", json=step)
        response.raise_for_status()
        return response

    def _build_route_params(
        self,
        from_chain: str,
        from_token: str,
        amount: str,
        destination_token: str,
        from_address: str | None,
        to_address: str | None,
    ) -> dict:
        source_chain_id = CHAIN_IDS.get(from_chain.upper())
        if source_chain_id is None:
            raise ValueError(f"Unsupported source chain: {from_chain}")

        source_tokens = TOKEN_ADDRESSES.get(source_chain_id, {})
        from_token_address = source_tokens.get(from_token.upper(), from_token)

        dest_tokens = TOKEN_ADDRESSES.get(SOLANA_CHAIN_ID, {})
        to_token_address = dest_tokens.get(destination_token.upper(), destination_token)

        params: dict = {
            "fromChainId": source_chain_id,
            "toChainId": SOLANA_CHAIN_ID,
            "fromTokenAddress": from_token_address,
            "toTokenAddress": to_token_address,
            "fromAmount": amount,
            "options": {
                "slippage": 0.005,
                "order": "RECOMMENDED",
                "allowSwitchChain": True,
            },
        }
        # Addresses are required for LI.FI to return executable transaction data.
        if from_address:
            params["fromAddress"] = from_address
        if to_address:
            params["toAddress"] = to_address
        return params

    async def _request_routes(self, params: dict) -> list[dict]:
        """POST /advanced/routes and return the raw routes list (mapped errors)."""
        try:
            response = await self._post_advanced_routes(params)
        except RetryError as e:
            fut = e.args[0] if e.args else None
            last: BaseException | None = fut.exception() if fut is not None else None
            if last is None:
                last = e
            logger.error("lifi_unreachable", error=str(last))
            raise RuntimeError(
                "Cannot reach LI.FI after retries. Check internet/DNS/firewall for li.quest. "
                f"Cause: {last!s}"
            ) from last

        routes = response.json().get("routes", [])
        if not routes:
            raise ValueError("No routes found for this transfer")
        return routes

    async def get_best_route(
        self,
        from_chain: str,
        from_token: str,
        amount: str,
        destination_token: str = "USDC",
        from_address: str | None = None,
        to_address: str | None = None,
    ) -> dict:
        """
        Fetch the best cross-chain route to Solana via LI.FI.

        Args:
            from_chain: Source chain identifier (ETH, BASE, ARB, POL, BSC)
            from_token: Source token symbol or address
            amount: Amount in smallest unit (wei)
            destination_token: Destination token on Solana (default USDC)
            from_address: Source EVM wallet (enables executable transaction data)
            to_address: Destination Solana wallet

        Returns:
            Parsed route with transaction data
        """
        params = self._build_route_params(
            from_chain, from_token, amount, destination_token, from_address, to_address
        )

        logger.info(
            "lifi_quote_request",
            from_chain=from_chain,
            from_token=from_token,
            amount=amount,
            dest=destination_token,
        )

        routes = await self._request_routes(params)

        # Select best route (first = recommended)
        best = routes[0]
        steps = best.get("steps", [])

        parsed_route = {
            "route_id": best.get("id", ""),
            "from_chain": from_chain.upper(),
            "to_chain": "SOL",
            "from_token": from_token.upper(),
            "to_token": destination_token.upper(),
            "from_amount": best.get("fromAmount", amount),
            "to_amount": best.get("toAmount", "0"),
            "estimated_gas": best.get("gasCostUSD", "0"),
            "estimated_time_seconds": sum(
                s.get("estimate", {}).get("executionDuration", 0) for s in steps
            ),
            "bridge_name": steps[0].get("toolDetails", {}).get("name", "Unknown") if steps else "Unknown",
            "steps": [
                {
                    "type": s.get("type", ""),
                    "tool": s.get("tool", ""),
                    "from_chain": s.get("action", {}).get("fromChainId", 0),
                    "to_chain": s.get("action", {}).get("toChainId", 0),
                    "from_token": s.get("action", {}).get("fromToken", {}).get("symbol", ""),
                    "to_token": s.get("action", {}).get("toToken", {}).get("symbol", ""),
                    "estimate": {
                        "from_amount": s.get("estimate", {}).get("fromAmount", ""),
                        "to_amount": s.get("estimate", {}).get("toAmount", ""),
                        "duration": s.get("estimate", {}).get("executionDuration", 0),
                    },
                }
                for s in steps
            ],
            "transaction_request": best.get("transactionRequest"),
        }

        logger.info(
            "lifi_route_found",
            route_id=parsed_route["route_id"],
            bridge=parsed_route["bridge_name"],
            to_amount=parsed_route["to_amount"],
            eta=parsed_route["estimated_time_seconds"],
        )

        return parsed_route

    async def get_executable_transaction(
        self,
        from_chain: str,
        from_token: str,
        amount: str,
        from_address: str,
        to_address: str,
        destination_token: str = "USDC",
    ) -> dict:
        """
        Produce a ready-to-sign transaction for the first bridge step.

        Custody is on-device: the backend never holds keys. This fetches the
        recommended route *with* the user's addresses and resolves the first
        step into an unsigned ``transactionRequest`` (to / data / value / gas /
        chainId) that the wallet (MWA on mobile, wallet-standard on web) signs
        and broadcasts. The completing call is the LI.FI status poll.

        Returns:
            ``{"route_id", "bridge_name", "from_chain", "to_chain",
               "from_amount", "to_amount", "transaction_request",
               "next_step"}``
        """
        if not from_address:
            raise ValueError("from_address (source wallet) is required to execute a bridge")
        if not to_address:
            raise ValueError("to_address (destination Solana wallet) is required")

        params = self._build_route_params(
            from_chain, from_token, amount, destination_token, from_address, to_address
        )
        routes = await self._request_routes(params)
        best = routes[0]
        steps = best.get("steps", [])
        if not steps:
            raise ValueError("Route has no executable steps")

        first_step = steps[0]
        tx_request = first_step.get("transactionRequest")
        if tx_request is None:
            # Routes don't always inline the tx; resolve it explicitly.
            step_resp = await self._post_step_transaction(first_step)
            tx_request = step_resp.json().get("transactionRequest")

        if not tx_request:
            raise ValueError("LI.FI did not return a signable transaction for this route")

        result = {
            "route_id": best.get("id", ""),
            "bridge_name": (
                steps[0].get("toolDetails", {}).get("name", "Unknown") if steps else "Unknown"
            ),
            "from_chain": from_chain.upper(),
            "to_chain": "SOL",
            "from_amount": best.get("fromAmount", amount),
            "to_amount": best.get("toAmount", "0"),
            "transaction_request": tx_request,
            "next_step": "Sign and broadcast transaction_request in your wallet, then poll /status",
        }
        logger.info(
            "lifi_executable_built",
            route_id=result["route_id"],
            bridge=result["bridge_name"],
        )
        return result

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        retry=retry_if_exception_type(httpx.TimeoutException),
    )
    async def get_transaction_status(self, tx_hash: str) -> dict:
        """Check the status of a bridge transaction."""
        response = await self.client.get("/status", params={"txHash": tx_hash})
        response.raise_for_status()
        data = response.json()

        return {
            "status": data.get("status", "UNKNOWN"),
            "substatus": data.get("substatus"),
            "sending": data.get("sending", {}),
            "receiving": data.get("receiving", {}),
        }

    async def get_supported_chains(self) -> list[dict]:
        """Fetch all supported chains from LI.FI."""
        response = await self.client.get("/chains")
        response.raise_for_status()
        data = response.json()
        return data.get("chains", [])


# Singleton instance
lifi_service = LiFiService()
