import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, JSON

class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    project_id: uuid.UUID = Field(foreign_key="projects.id", index=True)
    
    title: str
    objective: str
    status: str = Field(default="pending", index=True) # pending, in_progress, completed, failed
    
    created_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    owner_participant_id: Optional[uuid.UUID] = Field(default=None, foreign_key="participants.id")
    
    # Required capabilities for this task (e.g., ["frontend_implementation"])
    required_capabilities: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))


class Handoff(SQLModel, table=True):
    __tablename__ = "handoffs"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="tasks.id", index=True)
    
    from_participant_id: uuid.UUID = Field(foreign_key="participants.id", index=True)
    to_participant_id: uuid.UUID = Field(foreign_key="participants.id", index=True)
    
    expected_output: Optional[str] = None
    
    # Pointers to context package
    context_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    status: str = Field(default="pending") # pending, accepted, rejected, completed
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    completed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))


class Execution(SQLModel, table=True):
    __tablename__ = "executions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(foreign_key="tasks.id", index=True)
    participant_id: uuid.UUID = Field(foreign_key="participants.id", index=True)
    
    action: str # What was done (e.g., "code_generation", "github_commit")
    result: str # Result summary
    
    # Evidence (pointers to artifacts, URLs, logs)
    evidence_refs: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
