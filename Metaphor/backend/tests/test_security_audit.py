import pytest
import hmac
import hashlib
import os
import uuid
from httpx import AsyncClient
from app.database.session import async_session_maker
from app.services.graph import GraphService
from app.models.operations import Integration

@pytest.mark.asyncio
async def test_webhook_unauthenticated_rejected(async_client: AsyncClient):
    """A1. Webhook Signature Security: Confirm unsigned/invalid webhooks return 401."""
    # 1. Test GitHub webhook with missing signature
    res = await async_client.post("/api/v1/webhooks/github", json={"repository": {"full_name": "forged/repo"}})
    assert res.status_code == 401, f"Expected 401 for unsigned GitHub webhook, got {res.status_code}"

    # 2. Test Notion webhook with missing signature
    res_notion = await async_client.post("/api/v1/webhooks/notion", json={"title": "Forged Page"})
    assert res_notion.status_code == 401, f"Expected 401 for unsigned Notion webhook, got {res_notion.status_code}"

    # 3. Test Google webhook with missing token
    res_google = await async_client.post("/api/v1/webhooks/google", json={"title": "Forged Doc"})
    assert res_google.status_code == 401, f"Expected 401 for unsigned Google webhook, got {res_google.status_code}"


@pytest.mark.asyncio
async def test_webhook_valid_signature_accepted(async_client: AsyncClient, monkeypatch):
    """A1. Webhook Signature Security: Confirm valid HMAC signature is accepted."""
    test_secret = "test_secret_key_123"
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", test_secret)

    # Mock reflection_engine so network LLM calls aren't made during signature verification test
    from app.reflection import reflection_engine
    async def mock_reflect(*args, **kwargs):
        return {"nodes": 1}
    monkeypatch.setattr(reflection_engine, "reflect_and_evolve", mock_reflect)

    payload_bytes = b'{"repository":{"full_name":"org/repo"}}'
    expected_sig = "sha256=" + hmac.new(test_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

    headers = {
        "X-Hub-Signature-256": expected_sig,
        "X-GitHub-Event": "push",
        "Content-Type": "application/json"
    }

    res = await async_client.post("/api/v1/webhooks/github", content=payload_bytes, headers=headers)
    assert res.status_code == 200, f"Expected 200 for valid HMAC signature, got {res.status_code}: {res.text}"


@pytest.mark.asyncio
async def test_rate_limiting_burst(async_client: AsyncClient, monkeypatch):
    """A2. Rate Limiting: Confirm burst exceeding limit returns 429 Too Many Requests."""
    from app.services.llm import llm_service
    async def mock_query(*args, **kwargs):
        return "Mocked chat response"
    monkeypatch.setattr(llm_service, "query_llm", mock_query)

    burst_count = 35
    rejected_429 = False

    for i in range(burst_count):
        res = await async_client.post("/api/v1/context/chat", json={"query": f"Test burst query {i}"})
        if res.status_code == 429:
            rejected_429 = True
            assert "Retry-After" in res.headers
            break

    assert rejected_429, "Expected 429 Too Many Requests during 35-request burst."


@pytest.mark.asyncio
async def test_multi_tenant_isolation(setup_test_user):
    """B1. Multi-Tenant Isolation: Confirm Org B cannot see Org A's graph nodes."""
    raw_key_a, org_id_a, _ = setup_test_user
    org_id_b = uuid.uuid4()

    async with async_session_maker() as session:
        graph = GraphService(session)
        # Create private node in Org A
        node_a = await graph.create_node(org_id_a, "project", "Org A Confidential Blueprint", "Confidential", "Secret content A")

        # Query nodes for Org B
        nodes_b = await graph.list_recent_nodes(org_id_b, limit=50)

        # Confirm Org B receives 0 nodes from Org A
        node_ids_b = [n.id for n in nodes_b]
        assert node_a.id not in node_ids_b, "CRITICAL: Org B was able to see Org A's graph node!"
