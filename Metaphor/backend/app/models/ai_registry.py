"""
ai_registry.py — External AI Agent Registry
Stores webhook URLs and auth details for external AI agents (Manus, Devin, etc.)
so Metaphor can proactively dispatch tasks to them instead of passive queuing.
"""

import uuid
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class AIAgent(SQLModel, table=True):
    __tablename__ = "ai_agents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(index=True)

    # Identity
    name: str  # e.g. "manus", "devin", "antigravity", "cursor"
    display_name: str  # e.g. "Manus AI", "Devin", "Antigravity IDE"
    description: Optional[str] = None

    # Connectivity
    webhook_url: Optional[str] = None  # POST endpoint Metaphor calls to dispatch tasks
    auth_header: Optional[str] = None  # "Bearer sk-..." stored encrypted
    callback_secret: Optional[str] = None  # HMAC secret for validating callbacks from this agent
    supports_callback: bool = False  # Can this agent POST results back to Metaphor?

    # Metadata
    is_active: bool = True
    last_pinged_at: Optional[datetime] = None
    ping_status: Optional[str] = None  # "ok", "timeout", "error"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
