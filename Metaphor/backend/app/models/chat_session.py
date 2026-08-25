import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field
from sqlalchemy.dialects.postgresql import JSONB, UUID as pg_UUID
from sqlalchemy import Column as SAColumn, Text, DateTime

from app.core.config import settings


def default_expires_at() -> datetime:
    days = getattr(settings, "CHAT_SESSION_RETENTION_DAYS", 14)
    return datetime.now(timezone.utc) + timedelta(days=days)


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    organization_id: uuid.UUID = Field(index=True, nullable=False)
    model_name: str = Field(index=True, nullable=False)  # Self-reported client label e.g. "claude", "cursor", "chatgpt"
    session_title: str = Field(default="Cross-Model Session Drop", nullable=False)
    summary: str = Field(sa_column=SAColumn(Text, nullable=False))
    context_payload: Dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSONB, nullable=False))

    # Optional project scope — when set, this drop belongs to a specific project node
    project_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=SAColumn(pg_UUID(as_uuid=True), index=True, nullable=True)
    )

    # All datetimes stored as TIMESTAMPTZ (timezone-aware)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=SAColumn(DateTime(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=SAColumn(DateTime(timezone=True), nullable=False)
    )
    expires_at: datetime = Field(
        default_factory=default_expires_at,
        sa_column=SAColumn(DateTime(timezone=True), index=True, nullable=False)
    )
    retracted_at: Optional[datetime] = Field(
        default=None,
        sa_column=SAColumn(DateTime(timezone=True), index=True, nullable=True)
    )
