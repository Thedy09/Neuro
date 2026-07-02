"""
NEURO Backend — FastAPI Application Entry Point
AI-Powered Cross-Chain Wealth Operating System
"""

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from routers import bridge_router, agent_router, vault_router, webhook_router, pro_router
from services.lifecycle import lifespan

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="NEURO API",
    description="AI-Powered Cross-Chain Wealth Operating System on Solana",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

# Register routers
app.include_router(bridge_router, prefix="/api/v1/bridge", tags=["Bridge"])
app.include_router(agent_router, prefix="/api/v1/agent", tags=["Agent"])
app.include_router(vault_router, prefix="/api/v1/vault", tags=["Vault"])
app.include_router(webhook_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(pro_router, prefix="/api/v1/pro", tags=["Pro"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "neuro-api",
        "version": "1.0.0",
        "cluster": settings.SOLANA_CLUSTER,
    }
