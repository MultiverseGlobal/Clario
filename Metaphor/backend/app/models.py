import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from sqlalchemy import Text
from pgvector.sqlalchemy import Vector

# Association table for Node to Chunk evidence
class NodeEvidence(SQLModel, table=True):
    node_id: uuid.UUID = Field(foreign_key="node.id", primary_key=True)
    chunk_id: uuid.UUID = Field(foreign_key="chunk.id", primary_key=True)

class UniversalEvent(SQLModel, table=True):
    """
    Normalized event format across all connectors (GitHub, Notion, Google Calendar, Stripe, etc.)
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source: str = Field(index=True)  # e.g., "github", "notion", "gcal", "stripe"
    entity: str = Field(index=True)  # e.g., "commit", "page", "meeting", "invoice"
    action: str = Field(index=True)  # e.g., "created", "updated", "deleted", "pushed"
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    raw_payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    normalized_payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Node(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    # Supported entity types: Project, Person, Meeting, Task, Document, Company, Idea, Commit, Email, Note, Product, Goal, Decision, Event
    type: str = Field(index=True)
    metadata_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="approved", index=True) # approved, pending, rejected

    # Relationships
    incoming_edges: List["Edge"] = Relationship(
        sa_relationship_kwargs={"primaryjoin": "Node.id==Edge.target_id"}
    )
    outgoing_edges: List["Edge"] = Relationship(
        sa_relationship_kwargs={"primaryjoin": "Node.id==Edge.source_id"}
    )
    chunks: List["Chunk"] = Relationship(
        link_model=NodeEvidence, back_populates="nodes"
    )

class Edge(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source_id: uuid.UUID = Field(foreign_key="node.id", index=True)
    target_id: uuid.UUID = Field(foreign_key="node.id", index=True)
    dimension: str = Field(index=True)  # "structural", "semantic", "temporal"
    # Supported relationship types: owns, created, mentions, depends_on, related_to, belongs_to, scheduled_after, blocked_by, assigned_to
    relationship_type: str = Field(index=True)
    weight: float = Field(default=1.0)
    metadata_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="approved", index=True) # approved, pending, rejected

class Chunk(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    text_content: str = Field(sa_column=Column(Text, nullable=False))
    # 768 dimensions for Gemini text-embedding-004
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(768), nullable=True))
    metadata_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    nodes: List[Node] = Relationship(
        link_model=NodeEvidence, back_populates="chunks"
    )


class Clarification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_text: str = Field(index=True)
    options_json: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    resolved: bool = Field(default=False, index=True)
    resolved_answer: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

