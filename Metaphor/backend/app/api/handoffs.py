import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel

from app.database.session import get_db
from app.api.auth import get_authorized_consumer
from app.services.retrieval import RetrievalScope
from app.models.task_handoff import Task
from app.services.handoff import HandoffService

router = APIRouter(prefix="/handoffs", tags=["Handoffs"])

class CreateHandoffRequest(BaseModel):
    target_consumer_id: uuid.UUID
    title: str
    objective: str
    instructions: Optional[str] = None
    priority: str = "normal"
    context_refs: List[Dict[str, Any]] = []
    artifact_refs: List[Dict[str, Any]] = []
    decision_refs: List[Dict[str, Any]] = []
    constraint_refs: List[Dict[str, Any]] = []

@router.post("", response_model=Task)
async def create_handoff(
    request: CreateHandoffRequest,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.create_handoff(
        scope=scope,
        target_consumer_id=request.target_consumer_id,
        title=request.title,
        objective=request.objective,
        instructions=request.instructions,
        priority=request.priority,
        context_refs=request.context_refs,
        artifact_refs=request.artifact_refs,
        decision_refs=request.decision_refs,
        constraint_refs=request.constraint_refs
    )

@router.get("", response_model=List[Task])
async def list_pending_handoffs(
    role: str = "target",
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.list_pending_handoffs(scope=scope, role=role)

@router.get("/{handoff_id}", response_model=Task)
async def get_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.get_handoff(scope, handoff_id)

@router.post("/{handoff_id}/accept", response_model=Task)
async def accept_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.accept_handoff(scope, handoff_id)

@router.post("/{handoff_id}/start", response_model=Task)
async def start_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.start_handoff(scope, handoff_id)

@router.post("/{handoff_id}/complete", response_model=Task)
async def complete_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.complete_handoff(scope, handoff_id)

@router.post("/{handoff_id}/reject", response_model=Task)
async def reject_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.reject_handoff(scope, handoff_id)

@router.post("/{handoff_id}/cancel", response_model=Task)
async def cancel_handoff(
    handoff_id: uuid.UUID,
    scope: RetrievalScope = Depends(get_authorized_consumer),
    db: AsyncSession = Depends(get_db)
):
    service = HandoffService(db)
    return await service.cancel_handoff(scope, handoff_id)
