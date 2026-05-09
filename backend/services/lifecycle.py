"""
NEURO Backend — Application Lifecycle Management
Startup and shutdown event handlers
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
import structlog

from config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    # Startup
    logger.info("neuro_api_starting", version="1.0.0")
    logger.info(
        "voice_capabilities_summary",
        elevenlabs_voice_ready=bool(settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_AGENT_ID),
        agent_ws_guard_enabled=bool(settings.AGENT_WS_TOKEN),
    )
    logger.info("services_initializing")

    # Initialize services
    from services.lifi_service import lifi_service
    from services.quicknode_service import quicknode_service

    await lifi_service.initialize()
    await quicknode_service.initialize()

    logger.info("neuro_api_ready", status="all_services_initialized")

    yield

    # Shutdown
    logger.info("neuro_api_shutting_down")
    await lifi_service.close()
    await quicknode_service.close()
    logger.info("neuro_api_stopped")
