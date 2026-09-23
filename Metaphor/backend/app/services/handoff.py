import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
import logging

from app.models.task_handoff import Task, Handoff
from app.models.identity import Participant, User, Organization
from app.services.retrieval import RetrievalScope

logger = logging.getLogger("metaphor.services.handoff")

class HandoffService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_handoff(
        self,
        scope: RetrievalScope,
        target_consumer_id: Optional[uuid.UUID] = None,
        title: str = "",
        objective: str = "",
        instructions: Optional[str] = None,
        priority: str = "normal",
        from_tool: str = "ChatGPT",
        to_tool: str = "GitHub",
        context_refs: List[Dict[str, Any]] = None,
        artifact_refs: List[Dict[str, Any]] = None,
        decision_refs: List[Dict[str, Any]] = None,
        constraint_refs: List[Dict[str, Any]] = None
    ) -> Task:
        if not scope.organization_id:
            raise HTTPException(status_code=403, detail="Invalid retrieval scope: organization_id required.")

        handoff = Task(
            organization_id=scope.organization_id,
            project_id=scope.project_id,
            created_by=scope.participant_id,
            owner_participant_id=target_consumer_id or scope.participant_id,
            title=title,
            objective=objective,
            instructions=instructions,
            from_tool=from_tool,
            to_tool=to_tool,
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
            raise HTTPException(status_code=404, detail="Handoff record not found")

        if handoff.organization_id != scope.organization_id:
            raise HTTPException(status_code=403, detail="Access denied to handoff in another organization")

        return handoff

    async def list_pending_handoffs(
        self,
        scope: RetrievalScope,
        role: str = "target",
        status_filter: Optional[str] = None
    ) -> List[Task]:
        """List handoffs for the active organization, auto-seeding sample state if table is empty."""
        stmt = select(Task).where(Task.organization_id == scope.organization_id)
        
        if status_filter:
            stmt = stmt.where(Task.status == status_filter)

        stmt = stmt.order_by(Task.created_at.desc())
        result = await self.session.execute(stmt)
        tasks = list(result.scalars().all())

        if not tasks:
            # Seed demonstration records so new workspaces immediately reflect active coordination
            seeded = await self._seed_default_handoffs(scope.organization_id, scope.participant_id)
            return seeded

        return tasks

    async def _seed_default_handoffs(self, org_id: uuid.UUID, creator_id: uuid.UUID) -> List[Task]:
        seed_1 = Task(
            id=uuid.UUID("00000000-0000-0000-0000-000000001042"),
            organization_id=org_id,
            created_by=creator_id,
            from_tool="ChatGPT",
            to_tool="GitHub",
            title="Promote draft PR description & architectural rationale into GitHub repository",
            objective="Pass ADR-42 and session constraints to GitHub PR branch for Auth & Session rewrite.",
            instructions="Merge 4 schema references and 2 conversation excerpts into single structured PR description.",
            status="pending",
            priority="high",
            context_refs=[
                {"type": "decision", "name": "ADR-42", "detail": "Approved by Lead"},
                {"type": "code", "name": "Auth Middleware", "detail": "12 files referenced"}
            ],
            artifact_refs=[{"name": "PR-1042-Draft.md", "size": "4.2KB"}],
            decision_refs=[{"id": "ADR-42", "title": "NATS JetStream Migration"}],
            constraint_refs=[{"title": "Q4 Code Freeze Deadline"}]
        )

        seed_2 = Task(
            id=uuid.UUID("00000000-0000-0000-0000-000000001041"),
            organization_id=org_id,
            created_by=creator_id,
            from_tool="Notion",
            to_tool="ChatGPT",
            title="Ingested Product Requirements Document (PRD) for Notification Core",
            objective="Tokenized requirement specifications and synchronized user acceptance criteria into reasoning memory.",
            status="completed",
            priority="normal",
            context_refs=[{"type": "document", "name": "DOC-89", "size": "48KB"}],
            completed_at=datetime.now(timezone.utc)
        )

        seed_3 = Task(
            id=uuid.UUID("00000000-0000-0000-0000-000000001040"),
            organization_id=org_id,
            created_by=creator_id,
            from_tool="Cursor",
            to_tool="Antigravity",
            title="Exchanged IDE buffer states and diagnostics after breakpoint resolution",
            objective="Preserved cursor line pointers and active type definitions across IDE transitions.",
            status="completed",
            priority="normal",
            context_refs=[{"type": "editor", "name": "6 active files"}],
            completed_at=datetime.now(timezone.utc)
        )

        self.session.add_all([seed_1, seed_2, seed_3])
        await self.session.commit()
        for s in [seed_1, seed_2, seed_3]:
            await self.session.refresh(s)

        return [seed_1, seed_2, seed_3]

    async def accept_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        handoff = await self.get_handoff(scope, handoff_id)
        handoff.status = "completed"
        handoff.accepted_at = datetime.now(timezone.utc)
        handoff.completed_at = datetime.now(timezone.utc)
        handoff.updated_at = datetime.now(timezone.utc)

        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        logger.info(f"Handoff {handoff_id} successfully accepted and completed.")
        return handoff

    async def reject_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        handoff = await self.get_handoff(scope, handoff_id)
        handoff.status = "rejected"
        handoff.updated_at = datetime.now(timezone.utc)

        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        logger.info(f"Handoff {handoff_id} rejected.")
        return handoff

    async def cancel_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        handoff = await self.get_handoff(scope, handoff_id)
        handoff.status = "cancelled"
        handoff.updated_at = datetime.now(timezone.utc)

        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        return handoff
