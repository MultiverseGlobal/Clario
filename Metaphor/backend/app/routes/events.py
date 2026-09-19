import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc

from app.database.session import get_session
from app.services.events import EventIngestionService
from app.services.insight import InsightService
from app.models.events import UniversalEvent

router = APIRouter(prefix="/events", tags=["events"])

class EventIngestRequest(BaseModel):
    event_type: str
    consumer_id: uuid.UUID
    organization_id: uuid.UUID
    payload: Dict[str, Any]
    workspace_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    entity_id: Optional[uuid.UUID] = None
    app_event_id: Optional[str] = None

class EventChangeFeedResponse(BaseModel):
    events: List[Any]
    next_timestamp: Optional[datetime] = None

@router.post("/ingest")
async def ingest_event(
    request: EventIngestRequest,
    db: AsyncSession = Depends(get_session)
):
    """
    Ingests a new UniversalEvent from a pseudonyms application, normalizes it, and reflects it to graph state.
    """
    insight_service = InsightService(db)
    service = EventIngestionService(db, insight_service)
    
    event = await service.ingest_event(
        event_type=request.event_type,
        consumer_id=request.consumer_id,
        organization_id=request.organization_id,
        payload=request.payload,
        workspace_id=request.workspace_id,
        project_id=request.project_id,
        entity_id=request.entity_id,
        app_event_id=request.app_event_id
    )
    
    return {"status": "success", "event_id": str(event.id)}

@router.get("/changes")
async def get_changes(
    consumer_id: uuid.UUID,
    organization_id: uuid.UUID,
    since: datetime,
    db: AsyncSession = Depends(get_session)
):
    """
    Retrieves a feed of UniversalEvents that have occurred since the given timestamp, for a specific consumer.
    (In a real system, we would filter by `consumer.allowed_scopes`).
    """
    stmt = select(UniversalEvent).where(
        UniversalEvent.organization_id == organization_id,
        UniversalEvent.occurred_at > since
    ).order_by(desc(UniversalEvent.occurred_at)).limit(50)
    
    res = await db.execute(stmt)
    events = res.scalars().all()
    
    return {
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "occurred_at": e.occurred_at,
                "payload": e.payload,
                "entity_id": str(e.entity_id) if e.entity_id else None
            } for e in events
        ]
    }
