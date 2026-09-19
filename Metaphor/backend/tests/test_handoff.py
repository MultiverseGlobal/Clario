import pytest
import uuid
import asyncio
from fastapi import HTTPException
from app.models.identity import Consumer
from app.services.retrieval import RetrievalScope
from app.models.task_handoff import TaskHandoff
from app.services.handoff import HandoffService
from sqlmodel import select

pytestmark = pytest.mark.asyncio

@pytest.fixture
def org_id():
    return uuid.uuid4()

@pytest.fixture
def workspace_1():
    return uuid.uuid4()

@pytest.fixture
def workspace_2():
    return uuid.uuid4()

@pytest.fixture
def claude_consumer_id():
    return uuid.uuid4()

@pytest.fixture
def orion_consumer_id():
    return uuid.uuid4()

@pytest.fixture
def atlas_consumer_id():
    return uuid.uuid4()

@pytest.fixture
async def setup_consumers(test_db_session, org_id, claude_consumer_id, orion_consumer_id, atlas_consumer_id):
    c1 = Consumer(id=claude_consumer_id, organization_id=org_id, name="Claude")
    c2 = Consumer(id=orion_consumer_id, organization_id=org_id, name="Orion")
    c3 = Consumer(id=atlas_consumer_id, organization_id=org_id, name="Atlas")
    
    test_db_session.add_all([c1, c2, c3])
    await test_db_session.commit()
    return c1, c2, c3

async def test_a_authorized_creation(test_db_session, setup_consumers, org_id, workspace_1, claude_consumer_id, orion_consumer_id):
    """Test A: Authorized source consumer can create a handoff."""
    scope = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=claude_consumer_id)
    service = HandoffService(test_db_session)
    
    handoff = await service.create_handoff(
        scope=scope,
        target_consumer_id=orion_consumer_id,
        title="Test Handoff",
        objective="Do the thing",
        context_refs=[{"type": "node", "id": str(uuid.uuid4())}]
    )
    
    assert handoff.id is not None
    assert handoff.status == "pending"
    assert handoff.target_consumer_id == orion_consumer_id
    assert handoff.workspace_id == workspace_1
    assert len(handoff.context_refs) == 1

async def test_b_unauthorized_creation(test_db_session, setup_consumers, org_id, workspace_1, claude_consumer_id):
    """Test B: Consumer cannot create a handoff outside its allowed workspace/project.
    In this architecture, the Service relies on the Scope which is securely injected. 
    If a consumer tries to target a consumer in a different org, it fails."""
    
    different_org_id = uuid.uuid4()
    scope = RetrievalScope(organization_id=different_org_id, workspace_id=workspace_1, consumer_id=claude_consumer_id)
    service = HandoffService(test_db_session)
    
    with pytest.raises(HTTPException) as excinfo:
        await service.create_handoff(
            scope=scope,
            target_consumer_id=setup_consumers[1].id,  # Target is in org_id, but scope is different_org_id
            title="Sneaky Handoff",
            objective="Bypass org boundaries"
        )
    assert excinfo.value.status_code == 404
    assert "Target consumer not found or access denied" in excinfo.value.detail


async def test_c_target_isolation(test_db_session, setup_consumers, org_id, workspace_1, claude_consumer_id, orion_consumer_id, atlas_consumer_id):
    """Test C: Target isolation (Orion can retrieve Orion-targeted handoffs)."""
    service = HandoffService(test_db_session)
    
    # Claude creates handoff for Orion
    scope_claude = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=claude_consumer_id)
    await service.create_handoff(scope_claude, target_consumer_id=orion_consumer_id, title="For Orion", objective="")
    
    # Claude creates handoff for Atlas
    await service.create_handoff(scope_claude, target_consumer_id=atlas_consumer_id, title="For Atlas", objective="")
    
    # Orion retrieves its handoffs
    scope_orion = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=orion_consumer_id)
    orion_pending = await service.list_pending_handoffs(scope_orion, role="target")
    
    assert len(orion_pending) == 1
    assert orion_pending[0].title == "For Orion"
    
    # Atlas cannot see Orion's handoffs
    scope_atlas = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=atlas_consumer_id)
    atlas_pending = await service.list_pending_handoffs(scope_atlas, role="target")
    
    assert len(atlas_pending) == 1
    assert atlas_pending[0].title == "For Atlas"


async def test_d_lifecycle(test_db_session, setup_consumers, org_id, workspace_1, claude_consumer_id, orion_consumer_id):
    """Test D: Valid state transitions succeed. Invalid fail."""
    service = HandoffService(test_db_session)
    scope_claude = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=claude_consumer_id)
    scope_orion = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=orion_consumer_id)
    
    handoff = await service.create_handoff(scope_claude, target_consumer_id=orion_consumer_id, title="Lifecycle", objective="")
    
    # Target accepts
    handoff = await service.accept_handoff(scope_orion, handoff.id)
    assert handoff.status == "accepted"
    
    # Cannot accept again (invalid transition)
    with pytest.raises(HTTPException) as excinfo:
        await service.accept_handoff(scope_orion, handoff.id)
    assert excinfo.value.status_code == 409
    
    # Target starts
    handoff = await service.start_handoff(scope_orion, handoff.id)
    assert handoff.status == "in_progress"
    
    # Target completes
    handoff = await service.complete_handoff(scope_orion, handoff.id)
    assert handoff.status == "completed"
    
    # Source cannot complete it
    handoff_2 = await service.create_handoff(scope_claude, target_consumer_id=orion_consumer_id, title="Lifecycle 2", objective="")
    await service.accept_handoff(scope_orion, handoff_2.id)
    await service.start_handoff(scope_orion, handoff_2.id)
    
    with pytest.raises(HTTPException) as excinfo:
        await service.complete_handoff(scope_claude, handoff_2.id)
    assert excinfo.value.status_code == 403
    assert "Only target consumer can perform this transition" in excinfo.value.detail


async def test_h_concurrency_double_accept(test_db_session, setup_consumers, org_id, workspace_1, claude_consumer_id, orion_consumer_id):
    """Test H: Concurrency. Simulating a concurrent accept by testing the state machine check."""
    service = HandoffService(test_db_session)
    scope_claude = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=claude_consumer_id)
    scope_orion = RetrievalScope(organization_id=org_id, workspace_id=workspace_1, consumer_id=orion_consumer_id)
    
    handoff = await service.create_handoff(scope_claude, target_consumer_id=orion_consumer_id, title="Concurrency", objective="")
    
    # Service 1 accepts
    await service.accept_handoff(scope_orion, handoff.id)
    
    # Service 2 (concurrent request) tries to accept the same handoff ID
    # Since it reads the DB and sees status="accepted" instead of "pending", it raises 409
    with pytest.raises(HTTPException) as excinfo:
        await service.accept_handoff(scope_orion, handoff.id)
        
    assert excinfo.value.status_code == 409
    assert "Handoff is not in pending state" in excinfo.value.detail
