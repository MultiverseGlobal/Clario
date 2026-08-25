from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.database.session import get_session
from app.models.operations import APIKey, WebhookEvent
from app.services.graph import GraphService
from app.services.reflection import ReflectionService
import logging

logger = logging.getLogger("metaphor.webhooks")
router = APIRouter()

async def process_webhook_event(org_id, event_id: str, db: AsyncSession):
    """Background task to run reflection."""
    from app.services.reflection import ReflectionService
    from app.services.graph import GraphService
    from app.models.operations import WebhookEvent
    
    graph = GraphService(db)
    reflection = ReflectionService(graph)
    
    stmt = select(WebhookEvent).where(WebhookEvent.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        return
        
    try:
        await reflection.reflect_and_evolve(org_id, event)
        logger.info(f"Successfully processed webhook event {event_id} for org {org_id}")
    except Exception as e:
        logger.error(f"Error processing webhook event {event_id}: {e}")

@router.post("/{provider}")
async def receive_webhook(
    provider: str,
    request: Request,
    background_tasks: BackgroundTasks,
    api_key: str = None,
    db: AsyncSession = Depends(get_session)
):
    """
    Generic webhook receiver.
    Requires ?api_key= query parameter to authenticate and map to an organization.
    """
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing ?api_key= query parameter")
        
    stmt = select(APIKey).where(APIKey.hashed_key == api_key)
    res = await db.execute(stmt)
    api_key_record = res.scalars().first()
    
    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid API Key")
        
    org_id = api_key_record.organization_id
    
    try:
        payload = await request.json()
    except Exception:
        payload = {}
        
    event = WebhookEvent(
        provider=provider,
        event_type="webhook_push",
        payload=payload
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    async def run_reflection_safe(org_id, event_id):
        from app.database.session import async_session_maker
        async with async_session_maker() as new_session:
            await process_webhook_event(org_id, event_id, new_session)

    background_tasks.add_task(run_reflection_safe, org_id, event.id)
    
    return {"status": "accepted", "event_id": str(event.id)}
