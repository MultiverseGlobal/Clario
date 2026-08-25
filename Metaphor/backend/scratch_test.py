import asyncio
import uuid
import json
from sqlmodel import select
from app.database.session import get_session_context
from app.models.graph import Node, Edge
from app.models.operations import WebhookEvent, SyncJob
from app.services.graph import GraphService
from app.services.reflection import ReflectionService
from app.models.identity import Organization

async def run_tests():
    async with get_session_context() as db:
        # Get existing org
        result = await db.execute(select(Organization).limit(1))
        org = result.scalars().first()
        if not org:
            org = Organization(name="Test Org", slug=f"test-org-{uuid.uuid4()}")
            db.add(org)
            await db.commit()
            await db.refresh(org)
        
        graph = GraphService(db)
        reflection = ReflectionService(graph)

        print("--- TEST 1.1: Edge Creation ---")
        event1 = WebhookEvent(provider="test", event_type="test", payload={"content": "Alice created the Metaphor project."}, organization_id=org.id)
        db.add(event1)
        await db.commit()
        await reflection.reflect_and_evolve(org.id, event1)
        
        # Check edges
        edges = (await db.execute(select(Edge))).scalars().all()
        print(f"Edges after test 1.1: {len(edges)}")
        for e in edges:
            print(f"Edge: {e.source_id} -> {e.target_id} ({e.relationship_type})")
            
        print("\n--- TEST 2.1: Context Inbox Default State ---")
        nodes = (await db.execute(select(Node).order_by(Node.created_at.desc()).limit(10))).scalars().all()
        print("Recent nodes statuses:")
        for n in nodes:
            print(f"- {n.title}: {n.status}")

        print("\n--- TEST 2.2: Clarification Workflow ---")
        event2 = WebhookEvent(provider="test", event_type="test", payload={"content": "He launched the thing yesterday."}, organization_id=org.id)
        db.add(event2)
        await db.commit()
        await reflection.reflect_and_evolve(org.id, event2)
        
        clarifications = (await db.execute(select(Node).where(Node.type == "Clarification"))).scalars().all()
        print(f"Clarifications created: {len(clarifications)}")
        for c in clarifications:
            print(f"- Question: {c.title}")

        print("\n--- TEST 4.1: Worker Resilience ---")
        job = SyncJob(organization_id=org.id, provider="test", payload={"user_id": "123", "sources": ["github"]})
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        from app.workers import resume_stuck_jobs
        await resume_stuck_jobs()
        
        # Check if job was resumed (status updated)
        await db.refresh(job)
        print(f"Job status after resume: {job.status}")

if __name__ == "__main__":
    asyncio.run(run_tests())
