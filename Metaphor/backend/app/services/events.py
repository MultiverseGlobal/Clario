import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.exc import IntegrityError

from app.models.events import UniversalEvent
from app.models.graph import Node, Evidence
from app.models.task_handoff import Task
from app.services.insight import InsightService

logger = logging.getLogger(__name__)

class EventIngestionService:
    def __init__(self, db: AsyncSession, insight_service: InsightService):
        self.db = db
        self.insight_service = insight_service

    async def ingest_event(
        self,
        event_type: str,
        consumer_id: uuid.UUID,
        organization_id: uuid.UUID,
        payload: Dict[str, Any],
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        entity_id: Optional[uuid.UUID] = None,
        app_event_id: Optional[str] = None
    ) -> UniversalEvent:
        """
        Validates, persists, and reacts to a new ecosystem event.
        """
        if app_event_id:
            # Check idempotency
            stmt = select(UniversalEvent).where(UniversalEvent.app_event_id == app_event_id)
            res = await self.db.execute(stmt)
            existing = res.scalars().first()
            if existing:
                logger.info(f"Event {app_event_id} already ingested, skipping.")
                return existing
                
        event = UniversalEvent(
            event_type=event_type,
            consumer_id=consumer_id,
            organization_id=organization_id,
            workspace_id=workspace_id,
            project_id=project_id,
            entity_id=entity_id,
            payload=payload,
            app_event_id=app_event_id,
            occurred_at=datetime.utcnow()
        )
        self.db.add(event)
        
        try:
            await self.db.flush()
        except IntegrityError:
            await self.db.rollback()
            # Idempotency fallback if race condition
            stmt = select(UniversalEvent).where(UniversalEvent.app_event_id == app_event_id)
            res = await self.db.execute(stmt)
            existing = res.scalars().first()
            if existing:
                return existing
            raise

        await self._reflect_event_to_graph(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def _reflect_event_to_graph(self, event: UniversalEvent):
        """
        Translates specific known event types into Graph / Handoff state changes.
        """
        # Handoff Transitions
        if event.event_type == "handoff_accepted" and event.entity_id:
            await self._update_handoff_status(event.entity_id, "in_progress")
            
        elif event.event_type == "handoff_completed" and event.entity_id:
            await self._update_handoff_status(event.entity_id, "completed")
            
        elif event.event_type == "decision_made":
            # Create a new Node of type decision
            node = Node(
                organization_id=event.organization_id,
                workspace_id=event.workspace_id,
                type="decision",
                title=event.payload.get("title", "New Decision"),
                content=event.payload.get("description", ""),
                status="approved",
                created_by=event.consumer_id
            )
            self.db.add(node)
            await self.db.flush()
            
            # Record Evidence
            evidence = Evidence(
                node_id=node.id,
                source=f"Event:{event.id}",
                source_type="event",
                raw_text=str(event.payload)
            )
            self.db.add(evidence)
            
            # Conditionally invalidate/refresh insights
            await self._refresh_insights(event.organization_id, event.workspace_id, event.project_id)
            
        elif event.event_type == "task_completed" and event.entity_id:
            await self._update_node_status(event.entity_id, "completed")
            
        elif event.event_type == "artifact_updated" and event.entity_id:
            node = await self.db.get(Node, event.entity_id)
            if node:
                node.content = event.payload.get("content", node.content)
                node.updated_at = datetime.utcnow()

    async def _update_handoff_status(self, handoff_id: uuid.UUID, new_status: str):
        handoff = await self.db.get(Task, handoff_id)
        if handoff:
            handoff.status = new_status
            handoff.updated_at = datetime.utcnow()

    async def _update_node_status(self, node_id: uuid.UUID, new_status: str):
        node = await self.db.get(Node, node_id)
        if node:
            node.status = new_status
            node.updated_at = datetime.utcnow()
            
    async def _refresh_insights(self, org_id: uuid.UUID, workspace_id: Optional[uuid.UUID], project_id: Optional[uuid.UUID]):
        pass
