import asyncio
import uuid
import json
import pytest
from app.database.session import engine, async_session_maker
from sqlmodel import SQLModel
from app.models.operations import WebhookEvent
from app.services.graph import GraphService
from app.services.reflection import ReflectionService
from app.services.context import ContextService
from app.models.graph import Node, Evidence, Embedding
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Organization

# ── Helpers ────────────────────────────────────────────────────────────────────

async def make_org(session: AsyncSession) -> uuid.UUID:
    oid = uuid.uuid4()
    org = Organization(id=oid, name="Decision Test Org", slug=f"decision-test-{oid.hex[:8]}", plan="free")
    session.add(org)
    await session.commit()
    return oid

async def make_event(session: AsyncSession, payload: dict) -> WebhookEvent:
    event = WebhookEvent(provider="notion", event_type="page_updated", payload=payload)
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

async def make_node_with_embedding(
    org_id: uuid.UUID,
    title: str,
    summary: str,
    reasoning: str,
    status: str
) -> uuid.UUID:
    """
    Uses two separate session scopes to avoid async session state pollution:
    1. Insert node, get its ID
    2. Generate embedding (external HTTP call - no active session)
    3. Insert embedding + update node FK in a fresh session
    Returns the node's UUID.
    """
    from app.services.llm import llm_service as svc

    # Step 1: Insert node and capture its ID in one session
    async with async_session_maker() as s1:
        node = Node(
            organization_id=org_id, type="Decision",
            title=title, summary=summary, content=summary,
            reasoning=reasoning, status=status
        )
        s1.add(node)
        await s1.commit()
        node_id = node.id  # Capture before session closes

    # Step 2: Generate embedding outside any session context
    emb_vec = await svc.generate_embedding(f"{title}: {summary}")

    # Step 3: Insert embedding and update node FK in a fresh session
    async with async_session_maker() as s2:
        emb = Embedding(node_id=node_id, vector=emb_vec)
        s2.add(emb)
        await s2.commit()
        emb_id = emb.id  # Capture before session closes

    # Step 4: Update node.embedding_id in another fresh session
    async with async_session_maker() as s3:
        node_obj = await s3.get(Node, node_id)
        if node_obj:
            node_obj.embedding_id = emb_id
            s3.add(node_obj)
            await s3.commit()

    return node_id

# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
async def setup_db():
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(SQLModel.metadata.create_all)
    yield

# ==============================================================
# TEST 1: Decision node with full rationale via Reflection Engine
# ==============================================================
@pytest.mark.asyncio
async def test_decision_with_rationale(setup_db):
    async with async_session_maker() as session:
        org_id = await make_org(session)
        graph = GraphService(session)
        reflection = ReflectionService(graph)

        payload = {
            "title": "ADR-001: Database Selection",
            "notes": (
                "We evaluated three options: Supabase, Firebase, and Neon. "
                "We chose Supabase because it supports pgvector natively out of the box, "
                "provides a great Edge Functions story, and has generous free tier limits. "
                "Firebase was rejected due to no SQL support. Neon was rejected due to limited pgvector stability at launch."
            )
        }
        event = await make_event(session, payload)
        result = await reflection.reflect_and_evolve(org_id, event)
        print(f"\n[TEST1] ops={result.get('operations_applied')}, status={result['status']}")
        assert result["status"] == "success"

    async with async_session_maker() as session:
        stmt = select(Node).where(Node.organization_id == org_id, Node.type.ilike("%decision%"))
        res = await session.execute(stmt)
        nodes = res.scalars().all()

        if nodes:
            d = nodes[0]
            assert d.status == "pending_review", f"Expected pending_review, got {d.status}"
            assert d.reasoning and d.reasoning.strip(), "Reasoning must be populated"
            print(f"[TEST1] PASS - reasoning={d.reasoning[:100]}")
        else:
            print("[TEST1] PASS (LLM chose ASK_CLARIFICATION or IGNORE - valid)")

# ==============================================================
# TEST 2: NO FABRICATED REASONING
# ==============================================================
@pytest.mark.asyncio
async def test_decision_no_rationale(setup_db):
    async with async_session_maker() as session:
        org_id = await make_org(session)
        graph = GraphService(session)
        reflection = ReflectionService(graph)

        payload = {
            "title": "Daily Standup Notes",
            "notes": "Team agreed to move forward with Stripe for payments. No further discussion."
        }
        event = await make_event(session, payload)
        result = await reflection.reflect_and_evolve(org_id, event)
        print(f"\n[TEST2] ops={result.get('operations_applied')}")

    async with async_session_maker() as session:
        stmt = select(Node).where(Node.organization_id == org_id, Node.type.ilike("%decision%"))
        res = await session.execute(stmt)
        nodes = res.scalars().all()

        for d in nodes:
            has_null = (
                not d.reasoning or d.reasoning.strip() == "" or
                "no rationale" in d.reasoning.lower() or d.reasoning.strip().lower() == "null"
            )
            print(f"[TEST2] '{d.title}' reasoning={repr(d.reasoning)}")
            assert has_null, f"FABRICATED REASONING DETECTED: {d.reasoning}"
            print("[TEST2] PASS")

        if not nodes:
            print("[TEST2] PASS - LLM chose non-CREATE action (no fabrication)")

# ==============================================================
# TEST 3: generate_decision_package returns approved decisions with evidence
# ==============================================================
@pytest.mark.asyncio
async def test_decision_package_query(setup_db):
    async with async_session_maker() as session:
        org_id = await make_org(session)

    node_id = await make_node_with_embedding(
        org_id=org_id,
        title="Chose FastAPI for backend framework",
        summary="Use FastAPI for async performance",
        reasoning="FastAPI is async-native and handles concurrent WebSocket connections far better than Flask or Django.",
        status="approved"
    )

    async with async_session_maker() as session:
        ev = Evidence(
            node_id=node_id, source="github", source_type="pull_request",
            url="http://github.com/org/repo/pr/1",
            raw_text="Add FastAPI as the primary backend framework.",
            checksum="abc" + str(node_id).replace("-", "")[:6]
        )
        session.add(ev)
        await session.commit()

        graph = GraphService(session)
        ctx = ContextService(session, graph)
        pkg = await ctx.generate_decision_package(org_id, "mcp", "Why did we choose FastAPI?")
        data = pkg.package_json
        print(f"\n[TEST3] status={data['status']}, count={len(data.get('decisions', []))}")

        assert data["status"] == "matched", f"Expected matched, got {data['status']}"
        found = next((d for d in data["decisions"] if "fastapi" in d["title"].lower()), None)
        assert found, "FastAPI decision not found in results"
        assert found["reasoning"] and "async" in found["reasoning"].lower()
        assert len(found["evidence"]) >= 1
        print(f"[TEST3] PASS - reasoning={found['reasoning'][:80]}")

# ==============================================================
# TEST 4: pending_review nodes MUST NOT appear in decision queries
# ==============================================================
@pytest.mark.asyncio
async def test_pending_node_not_returned(setup_db):
    async with async_session_maker() as session:
        org_id = await make_org(session)

    await make_node_with_embedding(
        org_id=org_id,
        title="Pending: Considering a move to Rust",
        summary="Considering rewriting critical path in Rust",
        reasoning="Rust would be faster.",
        status="pending_review"
    )

    async with async_session_maker() as session:
        graph = GraphService(session)
        ctx = ContextService(session, graph)
        pkg = await ctx.generate_decision_package(org_id, "mcp", "Why did we choose Rust?")
        data = pkg.package_json
        found = any("rust" in d["title"].lower() for d in data.get("decisions", []))
        assert not found, "ISOLATION BREACH: pending_review node in query results!"
        print("\n[TEST4] PASS - pending decision correctly excluded")

# ==============================================================
# TEST 5: Multi-tenant isolation
# ==============================================================
@pytest.mark.asyncio
async def test_multitenant_isolation(setup_db):
    async with async_session_maker() as session:
        org_id = await make_org(session)
        other_org_id = await make_org(session)

    await make_node_with_embedding(
        org_id=org_id,
        title="Chose Supabase for auth",
        summary="Use Supabase for auth because it has the best DX for JWT handling.",
        reasoning="Best developer experience for JWT handling.",
        status="approved"
    )

    async with async_session_maker() as session:
        graph = GraphService(session)
        ctx = ContextService(session, graph)
        pkg = await ctx.generate_decision_package(other_org_id, "mcp", "Why did we choose Supabase?")
        data = pkg.package_json
        found = any("supabase" in d["title"].lower() for d in data.get("decisions", []))
        assert not found, "ISOLATION BREACH: Other org's decision visible!"
        print("\n[TEST5] PASS - multi-tenant isolation holds")
