import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, String, JSON

class Organization(SQLModel, table=True):
    __tablename__ = "organizations"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    slug: str = Field(unique=True, index=True)
    plan: str = Field(default="free")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    
    members: List["OrganizationMember"] = Relationship(back_populates="organization")

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    # Maps to Supabase auth.users.id or profiles.id
    id: uuid.UUID = Field(primary_key=True)
    email: Optional[str] = Field(default=None, index=True)
    name: Optional[str] = None
    
    avatar: Optional[str] = None
    timezone: Optional[str] = None
    
    # Persona fields
    mission_statement: Optional[str] = None
    writing_style: Optional[str] = None
    preferred_terms: Optional[str] = None
    banned_terms: Optional[str] = None
    
    settings: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    
    memberships: List["OrganizationMember"] = Relationship(back_populates="user")

class OrganizationMember(SQLModel, table=True):
    __tablename__ = "organization_members"
    
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", primary_key=True)
    role: str = Field(default="member") # "owner", "admin", "member"
    
    user: User = Relationship(back_populates="memberships")
    organization: Organization = Relationship(back_populates="members")

class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    name: str # e.g., "Orion", "Atlas", "Global"
    
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class Consumer(SQLModel, table=True):
    __tablename__ = "consumers"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[uuid.UUID] = Field(default=None, foreign_key="workspaces.id", index=True)
    
    name: str # e.g., "Claude", "ChatGPT", "Orion Agent"
    type: str = Field(default="agent") # "user", "agent", "system"
    
    # E.g. ["global", "workspace:orion", "project:*"]
    allowed_scopes: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    # E.g. {"excluded_context": ["history", "tasks"]}
    context_preferences: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
    # E.g. ["create_handoff", "update_state", "read_insights"]
    capabilities: dict = Field(default_factory=list, sa_column=Column(JSON))
    
    status: str = Field(default="active")
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
