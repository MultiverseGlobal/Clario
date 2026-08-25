import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime, JSON

class Integration(SQLModel, table=True):
    __tablename__ = "integrations"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    provider: str # e.g., "notion", "github"
    status: str = Field(default="active")
    
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    
    settings: dict = Field(default_factory=dict, sa_column=Column(JSON))

class WebhookEvent(SQLModel, table=True):
    __tablename__ = "events"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider: str
    event_type: str
    
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON))
    checksum: Optional[str] = Field(default=None, index=True)
    
    received_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    processed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

class Activity(SQLModel, table=True):
    __tablename__ = "activity"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    
    action: str
    entity: str
    entity_id: str
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class APIKey(SQLModel, table=True):
    __tablename__ = "api_keys"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    
    name: str
    hashed_key: str
    last_used: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    permissions: dict = Field(default_factory=dict, sa_column=Column(JSON))

class MCPSession(SQLModel, table=True):
    __tablename__ = "mcp_sessions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    
    client: str
    
    connected_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    last_seen: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class SyncJob(SQLModel, table=True):
    __tablename__ = "sync_jobs"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    
    provider: str
    status: str = Field(default="processing") # processing, completed, failed
    
    items_processed: int = Field(default=0)
    error_message: Optional[str] = None
    
    started_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))
    completed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

class MCPOAuthClient(SQLModel, table=True):
    __tablename__ = "mcp_oauth_clients"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: str = Field(index=True, unique=True)
    client_secret_hash: Optional[str] = None
    client_name: str
    redirect_uris_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    grant_types_json: dict = Field(default_factory=dict, sa_column=Column(JSON))
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class MCPOAuthAuthCode(SQLModel, table=True):
    __tablename__ = "mcp_oauth_auth_codes"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code_hash: str = Field(index=True, unique=True)
    client_id: str = Field(index=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    redirect_uri: str
    code_challenge: str
    code_challenge_method: str = Field(default="S256")
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    used: bool = Field(default=False)

class MCPOAuthToken(SQLModel, table=True):
    __tablename__ = "mcp_oauth_tokens"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    token_hash: str = Field(index=True, unique=True)
    refresh_token_hash: Optional[str] = Field(default=None, index=True)
    preview: str
    client_id: str = Field(index=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    scope: str = Field(default="read:workspace")
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    refresh_expires_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    revoked_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

class MCPAuditLog(SQLModel, table=True):
    __tablename__ = "mcp_audit_logs"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organizations.id", index=True)
    token_id: Optional[uuid.UUID] = Field(default=None, index=True)
    project_id: Optional[uuid.UUID] = Field(default=None, index=True)
    client_name: str
    call_type: str # "resource" or "tool"
    name: str # e.g. "search_context" or "workspace://graph"
    query_summary: Optional[str] = None
    status_code: int = Field(default=200)
    response_time_ms: float = Field(default=0.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=True)))

