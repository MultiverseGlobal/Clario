import asyncio
import uuid
import json
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel import select

# We need the Metaphor backend imports
import sys
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.database.session import engine
from app.services.mcp_server import call_mcp_tool
from app.models.graph import Node
from app.models.identity import Organization

async def test_handoff_flow():
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
    )
    
    async with AsyncSessionLocal() as session:
        # Get an org
        res = await session.execute(select(Organization))
        org = res.scalars().first()
        if not org:
            print("No organization found.")
            return

        # Ensure a project exists
        res = await session.execute(select(Node).where(Node.organization_id == org.id, Node.type == "project"))
        project = res.scalars().first()
        if not project:
            print("No project found, creating one...")
            project = Node(
                id=uuid.uuid4(),
                organization_id=org.id,
                type="project",
                title="Test Handoff Project",
                summary="Test summary",
                content="",
                status="approved"
            )
            session.add(project)
            await session.commit()
            
        print(f"Using Project: {project.title} ({project.id})")
        
        # Test 1: Push Handoff
        print("\n--- Test 1: Push Handoff ---")
        push_args = {
            "source_ai": "antigravity",
            "target_ai": "claude",
            "project_id": str(project.id),
            "payload": "I encountered an error while parsing the new database schema. Please take a look.",
            "instructions": "Fix the parser script and deploy."
        }
        res_push = await call_mcp_tool("push_handoff", push_args, org.id, session)
        print("Push Result:", res_push)
        
        # Extract handoff ID
        import re
        match = re.search(r"Handoff ID: ([0-9a-fA-F-]+)", res_push["content"][0]["text"])
        handoff_id = match.group(1) if match else None
        
        if not handoff_id:
            print("Failed to get handoff ID.")
            return
            
        # Test 2: Pull Handoff
        print("\n--- Test 2: Pull Handoffs ---")
        pull_args = {
            "my_ai_name": "claude",
            "project_id": str(project.id)
        }
        res_pull = await call_mcp_tool("pull_handoffs", pull_args, org.id, session)
        data = json.loads(res_pull["content"][0]["text"])
        print(f"Pulled {len(data)} tasks.")
        for t in data:
            print(f"- From {t['source_ai']}: {t['payload']}")
            
        # Test 3: Resolve Handoff
        print("\n--- Test 3: Resolve Handoff ---")
        resolve_args = {
            "handoff_id": handoff_id,
            "resolution_summary": "Fixed the parser and updated the schema definition."
        }
        res_resolve = await call_mcp_tool("resolve_handoff", resolve_args, org.id, session)
        print("Resolve Result:", res_resolve)
        
        # Verify it's removed from pending
        res_pull_again = await call_mcp_tool("pull_handoffs", pull_args, org.id, session)
        data_again = json.loads(res_pull_again["content"][0]["text"])
        print(f"Pulled {len(data_again)} tasks after resolution.")

if __name__ == "__main__":
    asyncio.run(test_handoff_flow())
