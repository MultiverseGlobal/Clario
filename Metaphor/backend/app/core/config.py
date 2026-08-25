import os
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Metaphor Context Engine"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    
    # Security
    METAPHOR_API_KEY: str = "metaphor_dev_secret_key_123"
    SECRET_KEY: str = "super_secret_key_change_me"
    ENCRYPTION_KEY: str = ""
    ALGORITHM: str = "HS256"
    FRONTEND_URL: str = "https://metaphor-three.vercel.app"
    BACKEND_URL: str = "http://localhost:8000"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    CHAT_SESSION_RETENTION_DAYS: int = 14
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/metaphor"
    
    # LLM Providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # Integration Developer Tokens
    NOTION_INTEGRATION_TOKEN: str = ""
    GITHUB_PERSONAL_ACCESS_TOKEN: str = ""
    
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # OAuth Credentials
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "Ov23li43OiTLKCWt4ywX")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    NOTION_CLIENT_ID: str = os.getenv("NOTION_CLIENT_ID", "3afd872b-594c-8112-8c5d-0037abbc1ffd")
    NOTION_CLIENT_SECRET: str = os.getenv("NOTION_CLIENT_SECRET", "")
    LINEAR_CLIENT_ID: str = os.getenv("LINEAR_CLIENT_ID", "dc98e44f0ee7afaaef19c16986f7d1fa")
    LINEAR_CLIENT_SECRET: str = os.getenv("LINEAR_CLIENT_SECRET", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # WorkOS AuthKit MCP Settings
    WORKOS_AUTHKIT_DOMAIN: str = "https://api.workos.com"
    WORKOS_CLIENT_ID: str = ""
    WORKOS_MCP_RESOURCE_ID: str = "https://metaphor-backend.onrender.com/api/v1/mcp"
    
    # Google Service Account JSON path
    GOOGLE_SERVICE_ACCOUNT_JSON_PATH: str = ""

    # Redis and Security
    REDIS_URL: str = "redis://localhost:6379"
    ENCRYPTION_KEY: str = "" # Read from .env

    @field_validator("*", mode="before")
    @classmethod
    def strip_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("BACKEND_URL", mode="after")
    @classmethod
    def auto_detect_backend_url(cls, v: str) -> str:
        if v and v != "http://localhost:8000":
            return v.rstrip("/")
        render_url = os.getenv("RENDER_EXTERNAL_URL")
        if render_url:
            return render_url.rstrip("/")
        vercel_prod = os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
        if vercel_prod:
            return f"https://{vercel_prod}".rstrip("/")
        vercel_url = os.getenv("VERCEL_URL")
        if vercel_url:
            return f"https://{vercel_url}".rstrip("/")
        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url and "localhost" not in frontend_url:
            return frontend_url.rstrip("/")
        # Production deployment on Render / Vercel fallback
        if os.getenv("RENDER") or os.getenv("VERCEL") or os.getenv("PORT"):
            return "https://metaphor-backend.onrender.com"
        return v

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
