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
    SOLANA_RPC_URL: str = Field(default="https://api.devnet.solana.com")
    SOLANA_WS_URL: str = Field(default="wss://api.devnet.solana.com")
    NEURO_PROGRAM_ID: str = Field(default="E7RAJWfEmSAm3NRR4Z2YBqw27fTGazBY2eGzypmFoCnT")

    # LI.FI
    LIFI_API_URL: str = Field(default="https://li.quest/v1")
    LIFI_API_KEY: str = Field(default="")

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
