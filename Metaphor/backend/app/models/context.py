import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, JSON

class ContextPackage(SQLModel, table=True):
    __tablename__ = "context_packages"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    
    objective: str
    package_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    token_count: int = Field(default=0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class ContextSession(SQLModel, table=True):
    """
    Context Sessions bridge the stateless AI conversations with Metaphor's living graph.
    They track the ongoing objective and allow for delta context updates.
    """
    __tablename__ = "context_sessions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    
    ai_consumer: str # e.g., "claude", "william"
    objective: str
    
    # Stores conversation history and selected node IDs to avoid repeating context
    state: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    last_active_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
