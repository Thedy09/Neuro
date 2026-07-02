"""
NEURO Backend — Configuration
Typed settings from environment variables via Pydantic v2
"""

from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")

    # CORS
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:5173", "http://localhost:3000"])

    # Solana
    # SOLANA_CLUSTER: "devnet" (default) or "mainnet-beta" (production).
    # RPC URLs must be set consistently with the cluster (QuickNode overrides below).
    SOLANA_CLUSTER: str = Field(default="devnet")
    SOLANA_RPC_URL: str = Field(default="https://api.devnet.solana.com")
    SOLANA_WS_URL: str = Field(default="wss://api.devnet.solana.com")
    NEURO_PROGRAM_ID: str = Field(default="E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT")

    # LI.FI
    LIFI_API_URL: str = Field(default="https://li.quest/v1")
    LIFI_API_KEY: str = Field(default="")

    # Monetization — integrator fee on LI.FI bridge volume (transaction-fee
    # business model). Register the integrator name and the fee-collection
    # wallet on https://portal.li.fi/, then set both values here.
    # LIFI_FEE is a fraction of the bridged amount (e.g. 0.0025 = 0.25%).
    # With no integrator configured, routes are requested without fees.
    LIFI_INTEGRATOR: str = Field(default="")
    LIFI_FEE: float = Field(default=0.0, ge=0.0, le=0.1)

    # ElevenLabs
    ELEVENLABS_API_KEY: str = Field(default="")
    ELEVENLABS_AGENT_ID: str = Field(default="")

    # LLM (optional) — upgrades /chat from keyword routing to a real model.
    # Anthropic is used when ANTHROPIC_API_KEY is set. Otherwise any
    # OpenAI-compatible endpoint can be used via LLM_API_KEY + LLM_BASE_URL.
    # When no key is configured the agent gracefully falls back to keyword routing.
    ANTHROPIC_API_KEY: str = Field(default="")
    ANTHROPIC_MODEL: str = Field(default="claude-haiku-4-5-20251001")
    LLM_API_KEY: str = Field(default="")
    LLM_BASE_URL: str = Field(default="https://api.openai.com/v1")
    LLM_MODEL: str = Field(default="gpt-4o-mini")

    # Agent WebSocket — if set, clients must pass the same value as query param `token`
    AGENT_WS_TOKEN: str = Field(default="")

    # Monetization — freemium voice quotas.
    # Voice (ElevenLabs TTS/STT/ConvAI) is the main variable cost. The free tier
    # gets VOICE_FREE_DAILY_REQUESTS voice calls per identity per day (0 = unlimited).
    # PRO_WALLETS is a JSON list of wallet addresses with unlimited voice
    # (manual override; on-chain subscriptions below are the primary path).
    VOICE_FREE_DAILY_REQUESTS: int = Field(default=0, ge=0)
    PRO_WALLETS: list[str] = Field(default_factory=list)

    # Monetization — on-chain Pro subscription.
    # Users pay PRO_PRICE_SOL to PRO_TREASURY_WALLET (plain SOL transfer);
    # the backend verifies the transaction on-chain and activates Pro for
    # PRO_DURATION_DAYS. Feature is disabled while PRO_TREASURY_WALLET is empty.
    PRO_TREASURY_WALLET: str = Field(default="")
    PRO_PRICE_SOL: float = Field(default=0.5, gt=0)
    PRO_DURATION_DAYS: int = Field(default=30, gt=0)

    # QuickNode
    QUICKNODE_RPC_URL: str = Field(default="")
    QUICKNODE_WS_URL: str = Field(default="")
    QUICKNODE_ENDPOINT: str = Field(default="")
    QUICKNODE_STREAM_ID: str = Field(default="")
    QUICKNODE_STREAM_TOKEN: str = Field(default="")
    QUICKNODE_WEBHOOK_SECRET: str = Field(default="")
    QUICKNODE_WEBHOOK_SIGNATURE_HEADER: str = Field(default="x-qn-signature")

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "production", "prod"}:
            return False
        return value

    @model_validator(mode="after")
    def apply_quicknode_defaults(self):
        if self.QUICKNODE_RPC_URL:
            self.SOLANA_RPC_URL = self.QUICKNODE_RPC_URL
        elif self.QUICKNODE_ENDPOINT:
            self.SOLANA_RPC_URL = self.QUICKNODE_ENDPOINT

        if self.QUICKNODE_WS_URL:
            self.SOLANA_WS_URL = self.QUICKNODE_WS_URL
        return self

    model_config = SettingsConfigDict(
        env_file=_BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
