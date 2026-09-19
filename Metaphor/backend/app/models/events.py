import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, JSON

class UniversalEvent(SQLModel, table=True):
    __tablename__ = "universal_events"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Core event data
    event_type: str = Field(index=True) # e.g., decision_made, task_completed
    
    # Identifiers
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[uuid.UUID] = Field(default=None, index=True)
    project_id: Optional[uuid.UUID] = Field(default=None, index=True)
    entity_id: Optional[uuid.UUID] = Field(default=None, index=True) # ID of the node/task/handoff affected
    
    consumer_id: uuid.UUID = Field(foreign_key="consumers.id", index=True)
    
    # The raw application event payload
    payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Timestamps
    occurred_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    ingested_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    
    # For idempotency
    app_event_id: Optional[str] = Field(default=None, index=True, unique=True)
