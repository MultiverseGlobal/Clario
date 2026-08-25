"""
ai_thread.py — AI Conversation Thread Model
Enables multi-turn back-and-forth conversation between AI agents
routed through Metaphor as the message bus.
"""

import uuid
from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, JSON, Column


class AIThreadMessage(SQLModel):
    """A single message in an AI-to-AI conversation thread."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_ai: str           # e.g. "claude", "manus", "antigravity"
    content: str
    metadata: Optional[dict] = None
    sent_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AIThread(SQLModel, table=True):
    __tablename__ = "ai_threads"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(index=True)
    project_id: Optional[uuid.UUID] = None

    participants: List[str] = Field(default=[], sa_column=Column(JSON))
    # List of AIThreadMessage dicts stored as JSON
    messages: List[dict] = Field(default=[], sa_column=Column(JSON))

    title: Optional[str] = None
    status: str = "open"  # "open" | "resolved"
    resolution_summary: Optional[str] = None

    created_by: str = "unknown"  # The AI that opened the thread
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
