import pytest
import pytest_asyncio
import uuid
import secrets
import hashlib
from httpx import AsyncClient, ASGITransport
from sqlmodel import select, text
from app.main import app
from app.database.session import async_session_maker
from app.models.identity import User, Organization, OrganizationMember
from app.models.operations import APIKey

@pytest_asyncio.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def setup_test_user():
    # 1. Setup real records in the actual database
    async with async_session_maker() as session:
        user_id = uuid.uuid4()
        org_id = uuid.uuid4()
        
        user = User(id=user_id, email=f"test_{user_id}@metaphor.local", hashed_password="pw", name="E2E Test User")
        session.add(user)
        
        org = Organization(id=org_id, name="E2E Test Organization", slug=f"e2e-org-{user_id.hex[:8]}")
        session.add(org)
        
        member = OrganizationMember(user_id=user.id, organization_id=org.id, role="owner")
        session.add(member)
        
        raw_key = f"metaphor_test_{secrets.token_urlsafe(16)}"
        hashed_key = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
        
        api_key = APIKey(
            organization_id=org.id,
            name="Test API Key",
            hashed_key=hashed_key
        )
        session.add(api_key)
        
        await session.commit()
        
    yield raw_key, org_id, user_id
    
    # 2. Teardown: Cleanup real records after test completes
    async with async_session_maker() as session:
        # We manually delete all records to avoid polluting the DB
        tables = [
            "context_packages", "context_sessions", "nodes", "embeddings", 
            "api_keys", "organization_members", "organizations", "users"
        ]
        
        # Delete related data first
        await session.execute(text(f"DELETE FROM node_metadata WHERE node_id IN (SELECT id FROM nodes WHERE organization_id = '{org_id}')"))
        await session.execute(text(f"DELETE FROM evidence WHERE node_id IN (SELECT id FROM nodes WHERE organization_id = '{org_id}')"))
        
        # Unlink embeddings from nodes before deleting embeddings
        await session.execute(text(f"UPDATE nodes SET embedding_id = NULL WHERE organization_id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM embeddings WHERE node_id IN (SELECT id FROM nodes WHERE organization_id = '{org_id}')"))
        
        await session.execute(text(f"DELETE FROM edges WHERE from_node IN (SELECT id FROM nodes WHERE organization_id = '{org_id}') OR to_node IN (SELECT id FROM nodes WHERE organization_id = '{org_id}')"))
        
        await session.execute(text(f"DELETE FROM nodes WHERE organization_id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM context_sessions WHERE organization_id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM context_packages WHERE objective LIKE 'Integration Test%'"))
        
        await session.execute(text(f"DELETE FROM api_keys WHERE organization_id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM organization_members WHERE organization_id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM organizations WHERE id = '{org_id}'"))
        await session.execute(text(f"DELETE FROM users WHERE id = '{user_id}'"))
        
        await session.commit()

@pytest_asyncio.fixture
async def async_client(setup_test_user):
    raw_key, _, _ = setup_test_user
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://testserver", headers={"X-API-Key": raw_key}) as client:
        yield client
