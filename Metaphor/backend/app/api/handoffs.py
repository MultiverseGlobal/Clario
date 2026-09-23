import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from app.database.session import get_session
from app.core.security import get_authorized_participant
from app.models.identity import Participant
from app.services.retrieval import RetrievalScope
from app.models.task_handoff import Task
from app.services.handoff import HandoffService

router = APIRouter(prefix="/handoffs", tags=["Handoffs"])

async def get_handoff_scope(
    participant: Participant = Depends(get_authorized_participant)
) -> RetrievalScope:
    allowed = participant.allowed_scopes if isinstance(participant.allowed_scopes, list) else ["global"]
    return RetrievalScope(
        participant_id=participant.id,
        organization_id=participant.organization_id,
        workspace_id=participant.workspace_id,
        allowed_scopes=allowed
    )

class CreateHandoffRequest(BaseModel):
    title: str
    objective: str
    instructions: Optional[str] = None
    priority: str = "normal"
    from_tool: str = "ChatGPT"
    to_tool: str = "GitHub"
    target_consumer_id: Optional[uuid.UUID] = None
    context_refs: List[Dict[str, Any]] = []
    artifact_refs: List[Dict[str, Any]] = []
    decision_refs: List[Dict[str, Any]] = []
    constraint_refs: List[Dict[str, Any]] = []

@router.post("", response_model=Task)
async def create_handoff(
    request: CreateHandoffRequest,
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.create_handoff(
        scope=scope,
        target_consumer_id=request.target_consumer_id,
        title=request.title,
        objective=request.objective,
        instructions=request.instructions,
        priority=request.priority,
        from_tool=request.from_tool,
        to_tool=request.to_tool,
        context_refs=request.context_refs,
        artifact_refs=request.artifact_refs,
        decision_refs=request.decision_refs,
        constraint_refs=request.constraint_refs
    )

@router.get("", response_model=List[Task])
async def list_pending_handoffs(
    role: str = Query("target", description="Role: target or source"),
    status: Optional[str] = Query(None, description="Filter by status (pending, completed, rejected)"),
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.list_pending_handoffs(scope=scope, role=role, status_filter=status)

@router.get("/{handoff_id}", response_model=Task)
async def get_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.get_handoff(scope, handoff_id)

@router.post("/{handoff_id}/accept", response_model=Task)
async def accept_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.accept_handoff(scope, handoff_id)

@router.post("/{handoff_id}/reject", response_model=Task)
async def reject_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.reject_handoff(scope, handoff_id)

@router.post("/{handoff_id}/cancel", response_model=Task)
async def cancel_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_handoff_scope),
    db: AsyncSession = Depends(get_session)
):
    service = HandoffService(db)
    return await service.cancel_handoff(scope, handoff_id)
