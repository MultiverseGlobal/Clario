import pytest
import uuid
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.graph import Node, Evidence, Embedding
from app.services.retrieval import RetrievalService, RetrievalScope
from app.services.mcp_server import call_mcp_tool

@pytest.mark.asyncio
async def test_retrieval_semantic_search_and_provenance(test_db_session: AsyncSession):
    # Setup
    org_id = uuid.uuid4()
    
    node = Node(
        organization_id=org_id,
        title="Project Apollo",
        summary="A space mission project.",
        content="We are going to the moon.",
        type="project",
        status="approved"
    )
    test_db_session.add(node)
    await test_db_session.flush()

    # Create embedding (mock L2 vector)
    emb = Embedding(
        node_id=node.id,
        vector=[0.1] * 3072
    )
    test_db_session.add(emb)
    
    # Attach embedding ID to node
    await test_db_session.flush()
    node.embedding_id = emb.id
    
    # Create evidence
    ev = Evidence(
        node_id=node.id,
        source="notion",
        source_type="page",
        raw_text="The Apollo mission is documented here.",
        checksum="123"
    )
    test_db_session.add(ev)
    await test_db_session.commit()

    # Test
    retrieval = RetrievalService(test_db_session)
    # Note: query embedding will be mocked or will fallback to simple lookup 
    # depending on llm_provider mock in tests
    scope = RetrievalScope(consumer_id=uuid.uuid4(), organization_id=org_id)
    package = await retrieval.retrieve_context(scope, "space mission")
    
    assert package["status"] == "success"
    assert len(package["nodes"]) >= 1
    
    found_node = package["nodes"][0]
    assert found_node["title"] == "Project Apollo"
    assert len(found_node["evidence"]) == 1
    assert found_node["evidence"][0]["source"] == "notion"


@pytest.mark.asyncio
async def test_retrieval_scope_filtering(test_db_session: AsyncSession):
    org_1 = uuid.uuid4()
    org_2 = uuid.uuid4()
    
    node1 = Node(organization_id=org_1, title="Org 1 Node", summary="", content="", type="idea")
    node2 = Node(organization_id=org_2, title="Org 2 Node", summary="", content="", type="idea")
    test_db_session.add_all([node1, node2])
    await test_db_session.commit()
    
    retrieval = RetrievalService(test_db_session)
    scope = RetrievalScope(consumer_id=uuid.uuid4(), organization_id=org_1)
    package = await retrieval.retrieve_context(scope, "Node")
    
    # Should only find node1
    assert all(n["title"] == "Org 1 Node" for n in package["nodes"])

@pytest.mark.asyncio
async def test_retrieval_superseded_filtering(test_db_session: AsyncSession):
    org_id = uuid.uuid4()
    
    node_active = Node(organization_id=org_id, title="Active Idea", summary="", content="", type="idea", status="approved")
    node_super = Node(organization_id=org_id, title="Old Idea", summary="", content="", type="idea", status="superseded")
    test_db_session.add_all([node_active, node_super])
    await test_db_session.commit()
    
    retrieval = RetrievalService(test_db_session)
    scope = RetrievalScope(consumer_id=uuid.uuid4(), organization_id=org_id)
    
    # Default behavior: exclude superseded
    package1 = await retrieval.retrieve_context(scope, "Idea")
    assert any(n["title"] == "Active Idea" for n in package1["nodes"])
    assert not any(n["title"] == "Old Idea" for n in package1["nodes"])
    
    # Include superseded
    package2 = await retrieval.retrieve_context(scope, "Idea", include_superseded=True)
    assert any(n["title"] == "Old Idea" for n in package2["nodes"])

@pytest.mark.asyncio
async def test_retrieval_workspace_and_project_filtering(test_db_session: AsyncSession):
    org_id = uuid.uuid4()
    workspace_1 = uuid.uuid4()
    workspace_2 = uuid.uuid4()
    project_1 = uuid.uuid4()
    
    node_ws1 = Node(organization_id=org_id, workspace_id=workspace_1, title="WS1 Node", summary="", content="", type="idea")
    node_ws2 = Node(organization_id=org_id, workspace_id=workspace_2, title="WS2 Node", summary="", content="", type="idea")
    node_proj = Node(organization_id=org_id, workspace_id=workspace_1, title="Proj Node", summary="", content="", type="idea")
    test_db_session.add_all([node_ws1, node_ws2, node_proj])
    await test_db_session.flush()
    
    # Link Proj Node to Project
    from app.models.graph import Edge
    edge = Edge(from_node=node_proj.id, to_node=project_1, relationship="belongs_to")
    test_db_session.add(edge)
    await test_db_session.commit()
    
    retrieval = RetrievalService(test_db_session)
    
    # 1. Workspace scope
    scope_ws1 = RetrievalScope(consumer_id=uuid.uuid4(), organization_id=org_id, workspace_id=workspace_1)
    package_ws1 = await retrieval.retrieve_context(scope_ws1, "Node")
    titles = [n["title"] for n in package_ws1["nodes"]]
    assert "WS1 Node" in titles
    assert "Proj Node" in titles
    assert "WS2 Node" not in titles
    
    # 2. Project scope
    scope_proj = RetrievalScope(consumer_id=uuid.uuid4(), organization_id=org_id, workspace_id=workspace_1, project_id=project_1)
    package_proj = await retrieval.retrieve_context(scope_proj, "Node")
    titles = [n["title"] for n in package_proj["nodes"]]
    assert "Proj Node" in titles
    assert "WS1 Node" not in titles
    assert "WS2 Node" not in titles
