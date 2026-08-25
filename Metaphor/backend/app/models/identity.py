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
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    hashed_password: str
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
