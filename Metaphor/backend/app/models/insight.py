import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, String, JSON

class ContextInsight(SQLModel, table=True):
    __tablename__ = "context_insights"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[uuid.UUID] = Field(default=None, foreign_key="workspaces.id", index=True)
    project_id: Optional[uuid.UUID] = Field(default=None, index=True)
    
    # E.g., "mission", "goal", "priority", "constraint", "preference", "principle", "strategy", "assumption", "current_state"
    type: str = Field(index=True)
    
    content: str
    
    # E.g., "explicit", "inference", "external"
    origin: str = Field(index=True)
    
    # E.g., "active", "superseded", "rejected", "under_review", "expired"
    status: str = Field(default="active", index=True)
    
    # E.g., "high_explicit", "medium_inferred", "low_uncertain"
    confidence: str = Field(default="medium_inferred")
    
    # List of UUID strings referencing supporting nodes/evidence/handoffs
    source_refs: list = Field(default_factory=list, sa_column=Column(JSON))
    
    # Reference to a previous version if this is an update/correction
    previous_version_id: Optional[uuid.UUID] = Field(default=None, foreign_key="context_insights.id")
    
    # Reference to a newer version if this is superseded
    superseded_by_id: Optional[uuid.UUID] = Field(default=None, foreign_key="context_insights.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    
    valid_from: Optional[datetime] = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    valid_until: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
