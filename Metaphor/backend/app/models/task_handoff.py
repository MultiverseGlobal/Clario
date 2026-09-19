import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, JSON

class TaskHandoff(SQLModel, table=True):
    __tablename__ = "task_handoffs"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[uuid.UUID] = Field(default=None, index=True)
    project_id: Optional[uuid.UUID] = Field(default=None, index=True)
    
    source_consumer_id: uuid.UUID = Field(foreign_key="consumers.id", index=True)
    target_consumer_id: uuid.UUID = Field(foreign_key="consumers.id", index=True)
    created_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    
    title: str
    objective: str
    instructions: Optional[str] = None
    
    # State: draft, pending, accepted, in_progress, completed, rejected, cancelled, superseded
    status: str = Field(default="pending", index=True)
    priority: str = Field(default="normal")
    
    # References as JSON lists of {"type": "node", "id": "..."}
    context_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    artifact_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    decision_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    constraint_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    insight_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    accepted_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    completed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    expires_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
