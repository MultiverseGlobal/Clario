import pytest
import uuid
import asyncio
from sqlmodel import select
from app.models.operations import Integration
from app.models.graph import Node, Edge
from app.core.security import encrypt_token, decrypt_token
from app.services.graph import GraphService
from app.database.session import get_session_context
from app.arq_worker import tenant_concurrency_limit
from app.database.session import async_session_maker
from arq.worker import Retry
import pytest_asyncio

@pytest_asyncio.fixture
async def db_session():
    async with async_session_maker() as session:
        yield session

@pytest.mark.asyncio
async def test_encryption_at_rest():
    """Verify that tokens are encrypted when processed through security utils."""
    raw_token = "gho_mocktoken1234567890"
    encrypted = encrypt_token(raw_token)
    
    assert encrypted != raw_token
    assert "gho" not in encrypted
    
    decrypted = decrypt_token(encrypted)
    assert decrypted == raw_token

from app.models.identity import Organization, User, OrganizationMember

@pytest.mark.asyncio
async def test_tenant_isolation_tokens(db_session):
    """Verify that looking up a token for a different user in the same org fails, and missing tokens fail gracefully."""
    org_id = uuid.uuid4()
    user_1 = uuid.uuid4()
    user_2 = uuid.uuid4()
    
    # Create prerequisites
    db_session.add(Organization(id=org_id, name="Test Org", slug=f"org-{org_id.hex[:8]}"))
    db_session.add(User(id=user_1, email=f"u1_{user_1}@test.local", hashed_password="pw", name="User 1"))
    db_session.add(User(id=user_2, email=f"u2_{user_2}@test.local", hashed_password="pw", name="User 2"))
    await db_session.commit()
    
    # User 1 connects github
    integ = Integration(
        organization_id=org_id,
        user_id=user_1,
        provider="github",
        access_token=encrypt_token("token_u1")
    )
    db_session.add(integ)
    await db_session.commit()
    
    # User 2 tries to fetch github token
    stmt = select(Integration).where(
        Integration.organization_id == org_id,
        Integration.user_id == user_2,
        Integration.provider == "github"
    )
    res = await db_session.execute(stmt)
    u2_token = res.scalars().first()
    
    assert u2_token is None, "User 2 should not be able to access User 1's token even in the same org"
    
    # User 1 fetches token
    stmt = select(Integration).where(
        Integration.organization_id == org_id,
        Integration.user_id == user_1,
        Integration.provider == "github"
    )
    res = await db_session.execute(stmt)
    u1_token = res.scalars().first()
    
    assert u1_token is not None
    assert decrypt_token(u1_token.access_token) == "token_u1"

@pytest.mark.asyncio
async def test_idempotent_node_creation(db_session):
    """Verify that GraphService.create_node is idempotent when source_event_id is provided."""
    graph = GraphService(db_session)
    org_id = uuid.uuid4()
    event_id = uuid.uuid4()
    
    # Create prerequisites
    db_session.add(Organization(id=org_id, name="Test Org 2", slug=f"org-{org_id.hex[:8]}"))
    await db_session.commit()

    
    # First creation
    node1 = await graph.create_node(
        org_id=org_id,
        type="Concept",
        title="Test Node",
        summary="Summary",
        content="Content",
        source_event_id=event_id
    )
    
    # Second creation with same event and title
    node2 = await graph.create_node(
        org_id=org_id,
        type="Concept",
        title="Test Node",
        summary="Different Summary",
        content="Different Content",
        source_event_id=event_id
    )
    
    # Should return the exact same node ID, not create a new one
    assert node1.id == node2.id
    
    # Verify only one node exists for this org
    res = await db_session.execute(select(Node).where(Node.organization_id == org_id))
    nodes = res.scalars().all()
    assert len(nodes) == 1

@pytest.mark.asyncio
async def test_arq_tenant_concurrency_lock():
    """Verify that the semaphore correctly manages concurrent jobs up to the limit."""
    class MockRedis:
        def __init__(self):
            self.data = {}
            
        async def incr(self, key):
            self.data[key] = self.data.get(key, 0) + 1
            return self.data[key]
            
        async def decr(self, key):
            if key in self.data:
                self.data[key] -= 1
            return self.data.get(key, 0)
            
        async def expire(self, key, seconds):
            pass
            
    ctx = {"redis": MockRedis()}
    org_id = uuid.uuid4()
    
    # Should acquire successfully
    async with tenant_concurrency_limit(ctx, str(org_id), limit=2):
        # Nested acquisition for same org
        async with tenant_concurrency_limit(ctx, str(org_id), limit=2):
            # Third acquisition should raise a Retry
            try:
                async with tenant_concurrency_limit(ctx, str(org_id), limit=2):
                    assert False, "Should have raised an exception"
            except Retry:
                pass

import jwt
from app.core.config import settings
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_oauth_callback_flow(db_session):
    """Verify that the OAuth callback correctly processes tokens for new integrations."""
    org_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    # Prerequisites
    db_session.add(Organization(id=org_id, name="OAuth Org", slug=f"org-{org_id.hex[:8]}"))
    db_session.add(User(id=user_id, email=f"oauth_{user_id}@test.local", hashed_password="pw", name="OAuth User"))
    await db_session.commit()
    
    # Generate state token
    state_payload = {
        "org_id": str(org_id),
        "user_id": str(user_id),
        "provider": "linear",
        "exp": 9999999999 # never expire
    }
    state_token = jwt.encode(state_payload, settings.SECRET_KEY, algorithm="HS256")
    
    from unittest.mock import MagicMock
    
    # Mock httpx.AsyncClient.post
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"access_token": "linear_mock_token_123"}
    
    mock_post = AsyncMock(return_value=mock_response)
    
    from app.api.integrations import integration_callback
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        # Call the callback directly since we need to inject the db_session
        response = await integration_callback(
            provider="linear",
            code="mock_auth_code",
            state=state_token,
            session=db_session
        )
        
    # Verify the redirect
    assert response.status_code == 307 or response.status_code == 302
    assert "success=linear" in response.headers["location"]
    
    # Verify the token was saved securely
    stmt = select(Integration).where(
        Integration.organization_id == org_id,
        Integration.user_id == user_id,
        Integration.provider == "linear"
    )
    res = await db_session.execute(stmt)
    integ = res.scalars().first()
    
    assert integ is not None
    assert decrypt_token(integ.access_token) == "linear_mock_token_123"
