import enum
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class IntentMode(str, enum.Enum):
    RESEARCH = "research"
    PLANNING = "planning"
    EXECUTION = "execution"
    DEBUGGING = "debugging"
    DECISION = "decision"
    WRITING = "writing"
    REVIEW = "review"
    HANDOFF = "handoff"
    STATUS = "status"


class ContextRequest(BaseModel):
    objective: str
    consumer: str = "general"
    workspace_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    task_id: Optional[uuid.UUID] = None
    requested_mode: Optional[IntentMode] = None
    context_depth: str = "relevant" # "relevant", "exhaustive", "minimal"


class ContextPlan(BaseModel):
    intent: IntentMode
    required: List[str]
    preferred: List[str]
    optional: List[str]
    excluded: List[str]


class ContextPackage(BaseModel):
    request: Dict[str, Any]
    identity: Dict[str, Any] = Field(default_factory=dict)
    current_state: List[Dict[str, Any]] = Field(default_factory=list)
    insights: List[Dict[str, Any]] = Field(default_factory=list)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    constraints: List[Dict[str, Any]] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    history: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContextViewPreferences(BaseModel):
    consumer: str
    preferred_context: List[str] = Field(default_factory=list)
    excluded_context: List[str] = Field(default_factory=list)
