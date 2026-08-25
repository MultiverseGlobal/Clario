from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings

from sqlalchemy.pool import NullPool
import urllib.parse
from sqlalchemy.engine.url import make_url

def sanitize_db_url(raw_url: str) -> str:
    if not raw_url:
        return ""
    cleaned = raw_url.strip().strip("'").strip('"').strip()
    try:
        url_obj = make_url(cleaned)
        if url_obj.database:
            cleaned_db = url_obj.database.strip().strip("\n").strip("\r").strip()
            url_obj = url_obj._replace(database=cleaned_db)
        return url_obj.render_as_string(hide_password=False)
    except Exception:
        return cleaned

clean_db_url = sanitize_db_url(settings.DATABASE_URL)

# Create database engine
engine = create_async_engine(
    clean_db_url,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0}
)

# Async session maker
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db() -> None:
    async with engine.begin() as conn:
        from sqlalchemy import text
        # Create pgvector extension if not exists
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Import all models here so SQLModel metadata captures them
        from app.models import (
            User, Organization, OrganizationMember,
            Node, NodeMetadata, Edge, Evidence, Embedding, SearchDocument,
            ContextPackage, ContextSession,
            Integration, WebhookEvent, Activity, APIKey, MCPSession,
            ChatSession
        )
        await conn.run_sync(SQLModel.metadata.create_all)

import contextlib

@contextlib.asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
