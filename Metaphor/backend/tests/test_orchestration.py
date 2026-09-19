import pytest
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.identity import Organization
from app.models.graph import Node
from app.models.insight import ContextInsight
from app.models.orchestration import ContextRequest, IntentMode
from app.services.orchestration import ContextOrchestrator
from app.services.retrieval import RetrievalScope

pytestmark = pytest.mark.asyncio

async def test_intent_classification(test_db_session: AsyncSession):
    orchestrator = ContextOrchestrator(test_db_session)
    
    # Test fallback classification by text
    req_debug = ContextRequest(objective="fix the login bug", consumer="test")
    intent1 = await orchestrator._classify_intent(req_debug)
    assert intent1 == IntentMode.DEBUGGING
    
    req_plan = ContextRequest(objective="design the new architecture", consumer="test")
    intent2 = await orchestrator._classify_intent(req_plan)
    assert intent2 == IntentMode.PLANNING
    
    req_write = ContextRequest(objective="draft a blog post", consumer="test")
    intent3 = await orchestrator._classify_intent(req_write)
    assert intent3 == IntentMode.WRITING

async def test_context_planning():
    orchestrator = ContextOrchestrator(None)
    
    plan_debug = orchestrator._generate_context_plan(IntentMode.DEBUGGING)
    assert "current_state" in plan_debug.required
    assert "tasks" in plan_debug.required
    
    plan_write = orchestrator._generate_context_plan(IntentMode.WRITING)
    assert "tasks" in plan_write.excluded
    assert "decisions" in plan_write.excluded

async def test_full_orchestration(test_db_session: AsyncSession):
    # Setup Data
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name="Test Org", slug=f"test-org-orch-{uuid.uuid4().hex}")
    test_db_session.add(org)
    await test_db_session.commit()
    
    # Add Nodes
    n_project = Node(id=uuid.uuid4(), organization_id=org_id, type="project", name="P1", title="Project 1", summary="P1 summary", content="P1 content", status="approved")
    n_decision = Node(id=uuid.uuid4(), organization_id=org_id, type="decision", name="D1", title="Decision 1", summary="D1 summary", content="D1 content", status="approved")
    n_constraint = Node(id=uuid.uuid4(), organization_id=org_id, type="constraint", name="C1", title="Constraint 1", summary="C1 summary", content="C1 content", status="approved")
    n_task = Node(id=uuid.uuid4(), organization_id=org_id, type="task", name="T1", title="Task 1", summary="T1 summary", content="T1 content", status="approved")
    
    # Add Insight
    insight = ContextInsight(
        id=uuid.uuid4(),
        organization_id=org_id,
        type="mission",
        content="Primary mission is to test.",
        status="active",
        origin="system"
    )
    
    test_db_session.add_all([n_project, n_decision, n_constraint, n_task, insight])
    await test_db_session.commit()
    
    orchestrator = ContextOrchestrator(test_db_session)
    scope = RetrievalScope(consumer_id=org_id, organization_id=org_id, allowed_scopes=["global"])
    
    # Test Debugging (should require constraints, if not found naturally, missing context detector grabs them)
    req = ContextRequest(objective="fix error in system", consumer="orion")
    package = await orchestrator.orchestrate(req, scope)
    
    assert package.request["objective"] == "fix error in system"
    assert package.metadata["intent"] == IntentMode.DEBUGGING.value
    assert len(package.constraints) > 0 # Secondary retrieval or primary retrieval should get it
    assert len(package.tasks) > 0
    
    # Test Writing (tasks and decisions should be excluded from view via plan or view preferences)
    req2 = ContextRequest(objective="write release notes", consumer="clario")
    package2 = await orchestrator.orchestrate(req2, scope)
    
    assert package2.metadata["intent"] == IntentMode.WRITING.value
    assert len(package2.tasks) == 0 # Excluded by writing plan or clario consumer prefs
    assert len(package2.decisions) == 0 # Excluded by writing plan or clario consumer prefs
    assert len(package2.insights) > 0

