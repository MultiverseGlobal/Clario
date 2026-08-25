import pytest
import uuid
from httpx import AsyncClient
from app.database.session import async_session_maker
from app.services.graph import GraphService
from app.services.clarification import ClarificationEngine

@pytest.mark.asyncio
async def test_clarification_engine_duplicate_detection(setup_test_user):
    raw_key, org_id, user_id = setup_test_user
    async with async_session_maker() as session:
        graph = GraphService(session)
        # Create duplicate candidate nodes
        await graph.create_node(org_id, "project", "Atlas Platform", "Core project", "Content 1")
        await graph.create_node(org_id, "repo", "atlas-core", "GitHub repository for Atlas", "Content 2")

        engine = ClarificationEngine(session)
        ambiguities = await engine.detect_ambiguities(org_id)

        assert len(ambiguities) > 0
        duplicate_ambiguities = [a for a in ambiguities if a.category == "duplicate"]
        assert len(duplicate_ambiguities) >= 1
        assert duplicate_ambiguities[0].information_gain > 0

@pytest.mark.asyncio
async def test_clarification_engine_question_policy_constraints(setup_test_user):
    raw_key, org_id, user_id = setup_test_user
    async with async_session_maker() as session:
        graph = GraphService(session)
        await graph.create_node(org_id, "entity", "metaphor-os", "Context engine", "Content 1")
        await graph.create_node(org_id, "entity", "atlas-core", "Atlas infrastructure", "Content 2")

        engine = ClarificationEngine(session)
        questions = await engine.generate_clarification_questions(org_id)

        # Must be at most 3 questions
        assert len(questions) <= 3

        for q in questions:
            q_lower = q.lower()
            # Verify Question Policy constraints: NO survey or preference questions allowed
            assert "preference" not in q_lower
            assert "mission" not in q_lower
            assert "goal" not in q_lower
            assert "tell us about yourself" not in q_lower

@pytest.mark.asyncio
async def test_graph_mutation_merge_nodes(setup_test_user):
    raw_key, org_id, user_id = setup_test_user
    async with async_session_maker() as session:
        graph = GraphService(session)
        primary = await graph.create_node(org_id, "project", "Atlas Platform", "Primary", "Content")
        duplicate = await graph.create_node(org_id, "repo", "atlas-core", "Duplicate", "Content")

        merged = await graph.merge_nodes(primary.id, duplicate.id)
        assert merged.id == primary.id

        refreshed_dup = await graph.get_node(duplicate.id)
        assert refreshed_dup.status == "archived"

@pytest.mark.asyncio
async def test_generate_ambiguities_endpoint(async_client: AsyncClient):
    res = await async_client.post("/api/v1/context/generate-ambiguities")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert len(data["questions"]) <= 3
