import uuid
import hashlib
import json
import logging
from typing import List, Dict, Any, Callable
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.operations import WebhookEvent, SyncJob
from app.services.reflection import ReflectionService
from app.services.graph import GraphService

logger = logging.getLogger("metaphor.services.sync")

class SyncEngine:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.graph = GraphService(session)
        self.reflection = ReflectionService(self.graph)

    def generate_checksum(self, payload: Dict[str, Any]) -> str:
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode('utf-8')).hexdigest()

    async def _is_duplicate(self, provider: str, checksum: str) -> bool:
        stmt = select(WebhookEvent).where(
            WebhookEvent.provider == provider,
            WebhookEvent.checksum == checksum
        )
        result = await self.session.execute(stmt)
        return result.first() is not None

    async def run_pull_sync(self, provider: str, org_id: uuid.UUID, limit: int = 5):
        # Create SyncJob
        job = SyncJob(
            organization_id=org_id,
            provider=provider,
            status="processing"
        )
        self.session.add(job)
        await self.session.commit()
        await self.session.refresh(job)

        try:
            # Fetch raw events
            raw_events = []
            if provider == "notion":
                from app.parsers.notion import NotionParser
                raw_events = await NotionParser().fetch_documents()
            elif provider == "github":
                from app.parsers.github import GitHubParser
                raw_events = await GitHubParser().fetch_documents()
            elif provider in ["google", "gcal", "gmail"]:
                from app.parsers.google_services import GoogleParser
                raw_events = await GoogleParser().fetch_documents()
            elif provider == "linear":
                from app.services.integrations.linear import fetch_linear_workspace
                from app.config import settings
                content = await fetch_linear_workspace(settings.LINEAR_CLIENT_SECRET)
                if content.startswith("Failed"):
                    raise RuntimeError(content)
                raw_events = [{"id": str(uuid.uuid4()), "title": "Linear Sync", "content": content, "source": "linear"}]
            else:
                raise ValueError(f"Unknown integration provider: {provider}")

            # Deduplicate and process
            items_processed = 0
            for raw_event in raw_events:
                checksum = self.generate_checksum(raw_event)
                if await self._is_duplicate(provider, checksum):
                    logger.info(f"Skipping duplicate event for {provider}")
                    continue

                event = WebhookEvent(
                    provider=provider,
                    event_type="sync_pull",
                    payload=raw_event,
                    checksum=checksum
                )
                self.session.add(event)
                await self.session.commit()
                await self.session.refresh(event)

                await self.reflection.reflect_and_evolve(org_id, event)
                
                event.processed_at = datetime.utcnow()
                self.session.add(event)
                await self.session.commit()
                
                items_processed += 1

            job.status = "completed"
            job.items_processed = items_processed
            job.completed_at = datetime.utcnow()

        except Exception as e:
            logger.error(f"SyncJob {job.id} failed: {e}")
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            raise e

        self.session.add(job)
        await self.session.commit()
