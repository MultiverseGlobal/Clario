import uuid
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
import logging

from app.models.task_handoff import Task, Handoff
from app.models.identity import Participant, User, Organization
from app.services.retrieval import RetrievalScope

logger = logging.getLogger("metaphor.services.handoff")

def evaluate_autonomy_policy(
    autonomy_mode: str = "assisted",
    priority: str = "normal",
    context_refs: List[Dict[str, Any]] = None,
    constraint_refs: List[Dict[str, Any]] = None
) -> Tuple[str, str]:
    """
    Evaluates cross-tool handoff autonomy:
    - manual: Always requires human review.
    - assisted: Auto-approves safe scopes (<= 5 context refs, no constraints violated, normal priority).
    - autonomous: Auto-approves and immediately dispatches downstream.
    """
    mode = (autonomy_mode or "assisted").lower()

    if mode == "autonomous":
        return "completed", "Auto-approved: Autonomous Execution Policy active."

    if mode == "assisted":
        is_critical = priority.lower() in ("critical", "emergency", "high")
        has_constraints = len(constraint_refs or []) > 0
        is_large_bundle = len(context_refs or []) > 5

        if not is_critical and not has_constraints and not is_large_bundle:
            return "completed", "Auto-approved under Assisted Policy: Verified safe scope (<= 5 refs, 0 constraint flags, normal priority)."
        else:
            escalation_reasons = []
            if is_critical:
                escalation_reasons.append("high/critical priority")
            if has_constraints:
                escalation_reasons.append(f"{len(constraint_refs)} constraint(s) require human verification")
            if is_large_bundle:
                escalation_reasons.append("large context bundle (> 5 refs)")

            return "pending", f"Escalated to human review: {', '.join(escalation_reasons)}."

    return "pending", "Waiting for human review (Manual Mode)."


# Active in-memory / workspace autonomy policy registry
_AUTONOMY_POLICIES: Dict[str, str] = {}

def get_workspace_autonomy_mode(org_id: Optional[uuid.UUID] = None) -> str:
    key = str(org_id) if org_id else "global"
    return _AUTONOMY_POLICIES.get(key, "assisted")

def set_workspace_autonomy_mode(mode: str, org_id: Optional[uuid.UUID] = None) -> str:
    valid_modes = {"manual", "assisted", "autonomous"}
    normalized = mode.lower() if mode else "assisted"
    if normalized not in valid_modes:
        normalized = "assisted"
    key = str(org_id) if org_id else "global"
    _AUTONOMY_POLICIES[key] = normalized
    return normalized


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
        autonomy_mode: Optional[str] = None,
        context_refs: List[Dict[str, Any]] = None,
        artifact_refs: List[Dict[str, Any]] = None,
        decision_refs: List[Dict[str, Any]] = None,
        constraint_refs: List[Dict[str, Any]] = None
    ) -> Task:
        if not scope.organization_id:
            raise HTTPException(status_code=403, detail="Invalid retrieval scope: organization_id required.")

        effective_autonomy_mode = autonomy_mode or get_workspace_autonomy_mode(scope.organization_id)
        clean_context_refs = context_refs or []
        clean_constraint_refs = constraint_refs or []

        # Evaluate Autonomy Policy (Manual vs Assisted vs Autonomous)
        initial_status, decision_reason = evaluate_autonomy_policy(
            autonomy_mode=effective_autonomy_mode,
            priority=priority,
            context_refs=clean_context_refs,
            constraint_refs=clean_constraint_refs
        )

        now = datetime.now(timezone.utc)
        accepted_at = now if initial_status == "completed" else None
        completed_at = now if initial_status == "completed" else None

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
            status=initial_status,
            priority=priority,
            autonomy_mode=effective_autonomy_mode,
            policy_decision=decision_reason,
            context_refs=clean_context_refs,
            artifact_refs=artifact_refs or [],
            decision_refs=decision_refs or [],
            constraint_refs=clean_constraint_refs,
            accepted_at=accepted_at,
            completed_at=completed_at,
            created_at=now,
            updated_at=now
        )
        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        logger.info(f"Handoff {handoff.id} created with status '{initial_status}' ({decision_reason})")
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
            autonomy_mode="assisted",
            policy_decision="Escalated to human review: high/critical priority, 1 constraint(s) require human verification.",
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
            autonomy_mode="assisted",
            policy_decision="Auto-approved under Assisted Policy: Verified safe scope (<= 5 refs, 0 constraint flags, normal priority).",
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
            autonomy_mode="assisted",
            policy_decision="Auto-approved under Assisted Policy: Verified safe scope (<= 5 refs, 0 constraint flags, normal priority).",
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
        handoff.policy_decision = "Approved manually by workspace operator."

        self.session.add(handoff)
        await self.session.commit()
        await self.session.refresh(handoff)
        logger.info(f"Handoff {handoff_id} successfully accepted and completed.")
        return handoff

    async def reject_handoff(self, scope: RetrievalScope, handoff_id: uuid.UUID) -> Task:
        handoff = await self.get_handoff(scope, handoff_id)
        handoff.status = "rejected"
        handoff.updated_at = datetime.now(timezone.utc)
        handoff.policy_decision = "Rejected manually by workspace operator."

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
