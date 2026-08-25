import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy.dialects.postgresql import UUID as pg_UUID
from sqlalchemy import Column as SAColumn, Text, DateTime, String

class TaskHandoff(SQLModel, table=True):
    __tablename__ = "task_handoffs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    project_id: uuid.UUID = Field(
        sa_column=SAColumn(pg_UUID(as_uuid=True), index=True, nullable=False)
    )
    
    # E.g. "antigravity", "claude"
    source_ai: str = Field(sa_column=SAColumn(String, index=True, nullable=False))
    target_ai: str = Field(sa_column=SAColumn(String, index=True, nullable=False))
    
    payload: str = Field(sa_column=SAColumn(Text, nullable=False))
    instructions: Optional[str] = Field(default=None, sa_column=SAColumn(Text, nullable=True))
    
    # 'pending', 'resolved', 'cancelled'
    status: str = Field(default="pending", sa_column=SAColumn(String, index=True, nullable=False))
    
    resolution_summary: Optional[str] = Field(default=None, sa_column=SAColumn(Text, nullable=True))

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=SAColumn(DateTime(timezone=True), nullable=False)
    )
    resolved_at: Optional[datetime] = Field(
        default=None,
        sa_column=SAColumn(DateTime(timezone=True), nullable=True)
    )
