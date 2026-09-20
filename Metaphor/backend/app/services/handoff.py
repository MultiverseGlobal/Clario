import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
from app.models.task_handoff import Task
from app.models.identity import Consumer
from app.services.retrieval import RetrievalScope

class HandoffService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_handoff(self, scope: RetrievalScope, 
                             target_consumer_id: uuid.UUID,
                             title: str,
                             objective: str,
                             instructions: Optional[str] = None,
                             priority: str = "normal",
                             context_refs: List[dict] = None,
                             artifact_refs: List[dict] = None,
                             decision_refs: List[dict] = None,
                             constraint_refs: List[dict] = None) -> Task:
        # Validate scope provides required fields
        if not scope.organization_id or not scope.consumer_id:
            raise HTTPException(status_code=403, detail="Invalid retrieval scope for handoff creation.")
        
        # We allow workspace_id or project_id to be None, but if provided they must match the scope
        # In a real app we'd verify the target_consumer_id exists and is in the same organization
        target_consumer = await self.session.get(Consumer, target_consumer_id)
        if not target_consumer or target_consumer.organization_id != scope.organization_id:
            raise HTTPException(status_code=404, detail="Target consumer not found or access denied.")

        handoff = Task(
            organization_id=scope.organization_id,
            workspace_id=scope.workspace_id,
            project_id=scope.project_id,
            source_consumer_id=scope.consumer_id,
            target_consumer_id=target_consumer_id,
            created_by=scope.user_id,
            title=title,
            objective=objective,
            instructions=instructions,
            status="pending",
            priority=priority,
            context_refs=context_refs or [],
            artifact_refs=artifact_refs or [],
            decision_refs=decision_refs or [],
            constraint_refs=constraint_refs or []
        )
        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        return handoff

    async def get_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        handoff = await self.session.get(Task, handoff_id)
        if not handoff:
            raise HTTPException(status_code=404, detail="Handoff not found")
            
        # Enforce scope
        if handoff.organization_id != scope.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Either the source or the target can view it, assuming workspace matches
        if scope.consumer_id not in (handoff.source_consumer_id, handoff.target_consumer_id):
            raise HTTPException(status_code=403, detail="Access denied")
            
        if scope.workspace_id and handoff.workspace_id and scope.workspace_id != handoff.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied (workspace mismatch)")
            
        if scope.project_id and handoff.project_id and scope.project_id != handoff.project_id:
            raise HTTPException(status_code=403, detail="Access denied (project mismatch)")

        return handoff

    async def list_pending_handoffs(self, scope: RetrievalScope, role: str = "target") -> List[Task]:
        """List handoffs where the consumer is either the target or source."""
        query = select(Task).where(Task.organization_id == scope.organization_id)
        
        if role == "target":
            query = query.where(Task.target_consumer_id == scope.consumer_id)
        elif role == "source":
            query = query.where(Task.source_consumer_id == scope.consumer_id)
        else:
            raise ValueError("Role must be 'target' or 'source'")
            
        query = query.where(Task.status == "pending")
        
        if scope.workspace_id:
            # Global handoffs (workspace_id = None) or specific workspace
            query = query.where((Task.workspace_id == None) | (Task.workspace_id == scope.workspace_id))
            
        if scope.project_id:
            query = query.where((Task.project_id == None) | (Task.project_id == scope.project_id))
            
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def _transition_status(self, scope: RetrievalScope, handoff_id: uuid.UUID, current_status: str, new_status: str) -> Task:
        handoff = await self.get_handoff(scope, handoff_id)
        
        # Only target can accept/start/complete
        if scope.consumer_id != handoff.target_consumer_id and new_status in ["accepted", "in_progress", "completed"]:
            raise HTTPException(status_code=403, detail="Only target consumer can perform this transition")
            
        # Concurrency/State safety check
        if handoff.status != current_status:
            raise HTTPException(status_code=409, detail=f"Handoff is not in {current_status} state (current: {handoff.status})")
            
        handoff.status = new_status
        handoff.updated_at = datetime.now(timezone.utc)
        
        if new_status == "accepted":
            handoff.accepted_at = datetime.now(timezone.utc)
        elif new_status == "completed":
            handoff.completed_at = datetime.now(timezone.utc)
            
        await self.session.commit()
        await self.session.refresh(handoff)
        return handoff

    async def accept_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        return await self._transition_status(scope, handoff_id, "pending", "accepted")

    async def start_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        # Can transition from accepted to in_progress
        return await self._transition_status(scope, handoff_id, "accepted", "in_progress")

    async def complete_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        return await self._transition_status(scope, handoff_id, "in_progress", "completed")

    async def reject_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        return await self._transition_status(scope, handoff_id, "pending", "rejected")

    async def cancel_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        # Cancel can be done by source
        handoff = await self.get_handoff(scope, handoff_id)
        if scope.consumer_id != handoff.source_consumer_id:
            raise HTTPException(status_code=403, detail="Only source consumer can cancel")
            
        if handoff.status in ["completed", "rejected", "cancelled"]:
            raise HTTPException(status_code=409, detail="Cannot cancel a finalized handoff")
            
        handoff.status = "cancelled"
        handoff.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(handoff)
        return handoff
