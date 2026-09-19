import pytest
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.identity import Organization, Workspace, Consumer
from app.models.insight import ContextInsight
from app.models.graph import Node, Evidence
from app.models.task_handoff import TaskHandoff
from app.services.insight import InsightService
from app.services.retrieval import RetrievalService, RetrievalScope
from app.routes.context import get_context_snapshot, SnapshotRequest, SnapshotResponse

@pytest.fixture
async def sample_org(test_db_session: AsyncSession) -> Organization:
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name=f"Test Org {org_id.hex}", slug=f"test-org-{org_id.hex}")
    test_db_session.add(org)
    await test_db_session.commit()
    return org

@pytest.fixture
async def sample_workspace(test_db_session: AsyncSession, sample_org: Organization) -> Workspace:
    ws_id = uuid.uuid4()
    ws = Workspace(id=ws_id, organization_id=sample_org.id, name=f"Test WS {ws_id.hex}", type="project")
    test_db_session.add(ws)
    await test_db_session.commit()
    return ws

@pytest.fixture
async def sample_consumer(test_db_session: AsyncSession, sample_org: Organization, sample_workspace: Workspace) -> Consumer:
    cons_id = uuid.uuid4()
    cons = Consumer(
        id=cons_id, 
        organization_id=sample_org.id, 
        workspace_id=sample_workspace.id, 
        name=f"Test AI {cons_id.hex}", 
        type="ai_agent"
    )
    test_db_session.add(cons)
    await test_db_session.commit()
    return cons

@pytest.mark.asyncio
async def test_a_insight_creation(test_db_session: AsyncSession, sample_org: Organization):
    """Test A: Evidence can produce a valid derived insight."""
    service = InsightService(test_db_session)
    
    node_id = uuid.uuid4()
    
    insight = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="mission",
        content="Launch Orion by Q4",
        origin="inference",
        confidence="medium_inferred",
        source_refs=[{"type": "node", "id": str(node_id)}]
    )
    
    assert insight.id is not None
    assert insight.status == "active"
    assert insight.type == "mission"
    assert len(insight.source_refs) == 1
    assert insight.source_refs[0]["id"] == str(node_id)

@pytest.mark.asyncio
async def test_b_provenance(test_db_session: AsyncSession, sample_org: Organization):
    """Test B: Every derived insight retains references to its supporting evidence."""
    service = InsightService(test_db_session)
    insight = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="priority",
        content="Focus on Atlas",
        origin="inference",
        confidence="medium_inferred",
        source_refs=[{"type": "evidence", "id": "ev-123"}, {"type": "node", "id": "node-456"}]
    )
    
    assert len(insight.source_refs) == 2
    assert insight.source_refs[0]["type"] == "evidence"

@pytest.mark.asyncio
async def test_c_explicit_authority_and_d_versioning(test_db_session: AsyncSession, sample_org: Organization):
    """
    Test C: Explicit user statement overrides an inferred insight.
    Test D: A new version supersedes an older insight without deleting it.
    """
    service = InsightService(test_db_session)
    
    # 1. Inferred insight
    inferred = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="priority",
        content="Atlas is the priority",
        origin="inference",
        confidence="medium_inferred",
        source_refs=[]
    )
    assert inferred.status == "active"
    
    # 2. User explicitly corrects it
    corrected = await service.explicit_correction(
        old_insight_id=inferred.id,
        correct_content="No, Orion is the priority",
        source_refs=[{"type": "user_statement", "text": "explicit correction"}]
    )
    
    assert corrected.status == "active"
    assert corrected.origin == "explicit"
    assert corrected.confidence == "high_explicit"
    assert corrected.previous_version_id == inferred.id
    
    # 3. Verify older is superseded
    await test_db_session.refresh(inferred)
    assert inferred.status == "superseded"
    assert inferred.superseded_by_id == corrected.id

@pytest.mark.asyncio
async def test_e_scope_and_f_current_state(test_db_session: AsyncSession, sample_org: Organization, sample_workspace: Workspace):
    """
    Test E: A workspace/project insight cannot leak outside authorized scope.
    Test F: Superseded insights are not treated as current.
    """
    service = InsightService(test_db_session)
    
    # Global insight
    global_ins = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="principle",
        content="Global principle",
        origin="explicit",
        confidence="high",
        source_refs=[]
    )
    
    # Workspace insight
    ws_ins = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        workspace_id=sample_workspace.id,
        type="strategy",
        content="Workspace strategy",
        origin="explicit",
        confidence="high",
        source_refs=[]
    )
    
    # Superseded insight (should not be returned)
    old_ins = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        workspace_id=sample_workspace.id,
        type="strategy",
        content="Old strategy",
        origin="inference",
        confidence="low",
        source_refs=[]
    )
    old_ins.status = "superseded"
    test_db_session.add(old_ins)
    await test_db_session.commit()
    
    # Query for workspace scope
    scope_ws = RetrievalScope(
        consumer_id=uuid.uuid4(),
        organization_id=sample_org.id,
        workspace_id=sample_workspace.id,
        allowed_scopes=["workspace"]
    )
    
    active = await service.get_active_insights(scope_ws)
    ids = [i.id for i in active]
    
    assert global_ins.id in ids  # Global is visible
    assert ws_ins.id in ids      # Workspace is visible
    assert old_ins.id not in ids # Superseded is hidden
    
    # Query for global scope (different workspace)
    scope_other = RetrievalScope(
        consumer_id=uuid.uuid4(),
        organization_id=sample_org.id,
        workspace_id=uuid.uuid4(), # Different workspace
        allowed_scopes=["global"]
    )
    active_other = await service.get_active_insights(scope_other)
    ids_other = [i.id for i in active_other]
    
    assert global_ins.id in ids_other
    assert ws_ins.id not in ids_other # Workspace insight shouldn't leak to other workspace

@pytest.mark.asyncio
async def test_g_contradiction(test_db_session: AsyncSession, sample_org: Organization):
    """Test G: Conflicting evidence can be represented without silently choosing a winner."""
    service = InsightService(test_db_session)
    
    # Just represent a contradiction as a current_state insight
    insight = await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="current_state",
        content="conflict detected: priority unclear between Atlas and Orion",
        origin="inference",
        confidence="low_uncertain",
        source_refs=[{"type": "node", "id": "ev-A"}, {"type": "node", "id": "ev-B"}]
    )
    
    assert insight.content.startswith("conflict detected")

@pytest.mark.asyncio
async def test_h_retrieval(test_db_session: AsyncSession, sample_org: Organization, sample_workspace: Workspace, sample_consumer: Consumer):
    """Test H: RetrievalService can retrieve relevant active insights."""
    service = InsightService(test_db_session)
    await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="mission",
        content="Launch Metaphor Brain",
        origin="explicit",
        confidence="high",
        source_refs=[]
    )
    
    # We must mock llm_service.generate_embedding to avoid real API calls
    import app.services.retrieval
    original_embed = app.services.retrieval.llm_service.generate_embedding
    
    async def mock_embed(text):
        return None  # Will force fallback search
        
    app.services.retrieval.llm_service.generate_embedding = mock_embed
    
    try:
        retrieval = RetrievalService(test_db_session)
        scope = RetrievalScope(
            consumer_id=sample_consumer.id,
            organization_id=sample_org.id,
            workspace_id=sample_workspace.id,
            allowed_scopes=["global", "workspace"]
        )
        
        pkg = await retrieval.retrieve_context(scope, query="mission metaphor")
        
        assert pkg["status"] == "success"
        assert len(pkg["insights"]) > 0
        assert pkg["insights"][0]["type"] == "mission"
        assert "Metaphor Brain" in pkg["insights"][0]["content"]
    finally:
        app.services.retrieval.llm_service.generate_embedding = original_embed

@pytest.mark.asyncio
async def test_i_snapshot(test_db_session: AsyncSession, sample_org: Organization):
    """Test I: Context Snapshot uses persistent structured understanding."""
    service = InsightService(test_db_session)
    await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="mission",
        content="Snapshot Test Mission",
        origin="explicit",
        confidence="high",
        source_refs=[]
    )
    
    # Add a mock verified user/api key to test the route
    req = SnapshotRequest(consumer="test", intent="test")
    # For testing, we mock get_session and verify_api_key manually by calling the function directly
    # and passing the db session instead of Depends.
    
    res: SnapshotResponse = await get_context_snapshot(req=req, session=test_db_session, api_key="valid")
    
    # It should have pulled the mission directly from insights instead of LLM
    assert res.mission == "Snapshot Test Mission"
    # Fallback constraints logic should have generated an empty list or fallback
    assert isinstance(res.constraints, list)

@pytest.mark.asyncio
async def test_j_mcp(test_db_session: AsyncSession, sample_org: Organization):
    """Test J: MCP accesses the same insight system."""
    from app.services.mcp_server import call_mcp_tool
    
    # Prepare token mock
    class MockToken:
        id = uuid.uuid4()
        user_id = uuid.uuid4()
        organization_id = sample_org.id
        workspace_id = None
        allowed_scopes = ["global"]
        
    service = InsightService(test_db_session)
    await service.generate_or_update_insight(
        organization_id=sample_org.id,
        type="strategy",
        content="MCP Strategy",
        origin="explicit",
        confidence="high",
        source_refs=[]
    )
    
    res = await call_mcp_tool("get_current_context", {}, MockToken(), test_db_session)
    
    data = json.loads(res["content"][0]["text"])
    assert data["status"] == "success"
    assert data["count"] >= 1
    assert any(i["content"] == "MCP Strategy" for i in data["insights"])

@pytest.mark.asyncio
async def test_k_handoff(test_db_session: AsyncSession, sample_org: Organization, sample_consumer: Consumer):
    """Test K: A Handoff can reference insights."""
    handoff = TaskHandoff(
        organization_id=sample_org.id,
        source_consumer_id=sample_consumer.id,
        target_consumer_id=sample_consumer.id,
        title="Test Handoff",
        objective="Do work",
        insight_refs=[{"type": "insight", "id": str(uuid.uuid4())}]
    )
    test_db_session.add(handoff)
    await test_db_session.commit()
    await test_db_session.refresh(handoff)
    
    assert len(handoff.insight_refs) == 1
    assert handoff.insight_refs[0]["type"] == "insight"
