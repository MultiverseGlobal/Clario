import pytest
import uuid
from httpx import AsyncClient
from app.models.identity import Consumer
from app.models.graph import Node
from app.models.events import UniversalEvent
from sqlmodel import select

@pytest.mark.asyncio
async def test_event_ingestion_idempotency(test_db_session, setup_test_user):
    raw_key, org_id, user_id = setup_test_user
    
    # Create a consumer to satisfy constraints
    consumer_id = uuid.uuid4()
    consumer = Consumer(id=consumer_id, organization_id=org_id, name="Test Consumer", type="agent", context_preferences={}, capabilities={})
    test_db_session.add(consumer)
    await test_db_session.commit()
    
    # We will test using the service directly to ensure idempotency works
    from app.services.events import EventIngestionService
    from app.services.insight import InsightService
    
    insight_service = InsightService(test_db_session)
    service = EventIngestionService(test_db_session, insight_service)
    
    app_event_id = f"test-event-{uuid.uuid4()}"
    
    # Insert event 1
    event1 = await service.ingest_event(
        event_type="test_event",
        consumer_id=consumer_id,
        organization_id=org_id,
        payload={"foo": "bar"},
        app_event_id=app_event_id
    )
    
    assert event1.app_event_id == app_event_id
    
    # Insert event 2 (duplicate)
    event2 = await service.ingest_event(
        event_type="test_event",
        consumer_id=consumer_id,
        organization_id=org_id,
        payload={"foo": "bar"},
        app_event_id=app_event_id
    )
    
    assert event1.id == event2.id

@pytest.mark.asyncio
async def test_event_reflects_to_graph(test_db_session, setup_test_user):
    raw_key, org_id, user_id = setup_test_user
    
    consumer_id = uuid.uuid4()
    consumer = Consumer(id=consumer_id, organization_id=org_id, name="Test Consumer 2", type="agent", context_preferences={}, capabilities={})
    test_db_session.add(consumer)
    await test_db_session.commit()
    
    from app.services.events import EventIngestionService
    from app.services.insight import InsightService
    
    insight_service = InsightService(test_db_session)
    service = EventIngestionService(test_db_session, insight_service)
    
    # Ingest a decision
    event = await service.ingest_event(
        event_type="decision_made",
        consumer_id=consumer_id,
        organization_id=org_id,
        payload={"title": "Use PostgreSQL", "description": "We need relational integrity"},
        app_event_id=str(uuid.uuid4())
    )
    
    # Check if node was created
    stmt = select(Node).where(Node.organization_id == org_id, Node.type == "decision")
    res = await test_db_session.execute(stmt)
    node = res.scalars().first()
    
    assert node is not None
    assert node.title == "Use PostgreSQL"
    assert node.status == "approved"
