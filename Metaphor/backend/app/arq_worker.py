import asyncio
import logging
import uuid
from typing import List, Optional, Dict, Any
from arq import Worker
from arq.connections import RedisSettings

from app.core.config import settings
from app.database.session import get_session_context
from sqlmodel import select
from app.models.operations import Integration, SyncJob, WebhookEvent
from app.services.integrations.github import fetch_public_repository, fetch_all_user_repositories
from app.services.integrations.notion import fetch_notion_workspace
from app.services.integrations.linear import fetch_linear_workspace
from app.services.integrations.google import fetch_google_workspace
from app.services.reflection import ReflectionService
from app.services.graph import GraphService
from app.core.security import decrypt_token

logger = logging.getLogger("metaphor.arq_worker")

from contextlib import asynccontextmanager

@asynccontextmanager
async def tenant_concurrency_limit(ctx: Dict[Any, Any], org_id: str, limit: int = 3):
    redis = ctx['redis']
    tenant_lock_key = f"tenant_sync:{org_id}"
    
    current_syncs = await redis.incr(tenant_lock_key)
    if current_syncs == 1:
        await redis.expire(tenant_lock_key, 3600)
        
    if current_syncs > limit:
        await redis.decr(tenant_lock_key)
        from arq.worker import Retry
        raise Retry(defer=10)
        
    try:
        yield
    finally:
        await redis.decr(tenant_lock_key)

async def process_integration_sync(
    ctx: Dict[Any, Any],
    user_id: str,
    org_id: str,
    sources: List[str],
    github_repo: str,
    job_id: uuid.UUID
):
    """
    Arq background task that fetches data from requested sources.
    Idempotent by checking job_id and doing upserts in ReflectionService.
    Concurrency limited per-tenant via Redis Semaphore.
    """
    async with tenant_concurrency_limit(ctx, org_id):
        combined_content = f"User {user_id} has connected the following sources: {', '.join(sources)}.\n\n"
        
        async with get_session_context() as session:
            job = await session.get(SyncJob, job_id)
            if not job or job.status in ["completed"]:
                return # Already done or missing
            
            # Fetch and decrypt tokens with strict user+org filtering
            tokens = {}
            for provider in ["github", "notion", "linear", "google", "gmail", "gcal"]:
                stmt = select(Integration).where(
                    Integration.organization_id == uuid.UUID(org_id),
                    Integration.user_id == uuid.UUID(user_id),
                    Integration.provider == provider
                )
                res = await session.execute(stmt)
                integ = res.scalars().first()
                if integ and integ.access_token:
                    tokens[provider] = decrypt_token(integ.access_token)

            if "github" in sources:
                logger.info("Fetching all GitHub repositories for user")
                job.status = "Analyzing GitHub repositories..."
                session.add(job)
                await session.commit()
                github_token = tokens.get("github")
                if github_token:
                    # Auto-fetch ALL repos the user has access to via OAuth token
                    github_content = await fetch_all_user_repositories(github_token)
                elif github_repo:
                    # Fallback: manual repo name was specified (legacy)
                    github_content = await fetch_public_repository(github_repo, None)
                else:
                    github_content = "GitHub connected but no token or repo available to sync."
                combined_content += github_content + "\n\n"
                
            if "notion" in sources:
                logger.info("Fetching Notion workspace")
                job.status = "Analyzing Notion workspace..."
                session.add(job)
                await session.commit()
                notion_content = await fetch_notion_workspace(tokens.get("notion"))
                combined_content += notion_content + "\n\n"

            if "linear" in sources:
                logger.info("Fetching Linear workspace")
                job.status = "Analyzing Linear workspace..."
                session.add(job)
                await session.commit()
                linear_content = await fetch_linear_workspace(tokens.get("linear"))
                combined_content += linear_content + "\n\n"

            if "gmail" in sources or "gcal" in sources or "google" in sources:
                logger.info("Fetching Google workspace")
                job.status = "Analyzing Google Workspace..."
                session.add(job)
                await session.commit()
                # we fall back to 'google' token if specific ones aren't found
                g_token = tokens.get("gmail") or tokens.get("gcal") or tokens.get("google")
                google_content = await fetch_google_workspace(g_token)
                combined_content += google_content + "\n\n"

            job.status = "Extracting entities and updating Graph..."
            session.add(job)
            await session.commit()
            
            # Process via Reflection Service
            event = WebhookEvent(
                provider="sync_job",
                event_type="batch_sync",
                payload={"content": combined_content},
                organization_id=uuid.UUID(org_id)
            )
            session.add(event)
            await session.commit()
            await session.refresh(event)
            
            graph = GraphService(session)
            reflection = ReflectionService(graph)
            
            # reflect_and_evolve needs to be idempotent
            result = await reflection.reflect_and_evolve(uuid.UUID(org_id), event)
            
            job.status = "completed"
            job.completed_at = asyncio.get_event_loop().time() # Not accurate for datetime, better to use datetime.utcnow()
            from datetime import datetime
            job.completed_at = datetime.utcnow()
            session.add(job)
            await session.commit()



async def cleanup_expired_chat_sessions(ctx):
    """
    Scheduled Arq worker task to delete expired ChatSession rows from PostgreSQL database.
    """
    from datetime import datetime, timezone
    from sqlmodel import select
    from app.models.chat_session import ChatSession

    async with get_session_context() as session:
        now = datetime.now(timezone.utc)
        stmt = select(ChatSession).where(ChatSession.expires_at <= now)
        res = await session.execute(stmt)
        expired_items = res.scalars().all()
        count = len(expired_items)
        if count > 0:
            logger.info(f"Cleaning up {count} expired ChatSession rows...")
            for item in expired_items:
                await session.delete(item)
            await session.commit()
            logger.info(f"Successfully cleaned up {count} expired ChatSession rows.")
        return count

async def startup(ctx):
    pass

async def shutdown(ctx):
    pass

# Extract host/port from REDIS_URL
import urllib.parse
parsed = urllib.parse.urlparse(settings.REDIS_URL)
redis_host = parsed.hostname or "localhost"
redis_port = parsed.port or 6379

class WorkerSettings:
    functions = [process_integration_sync, cleanup_expired_chat_sessions]
    redis_settings = RedisSettings(host=redis_host, port=redis_port)
    on_startup = startup
    on_shutdown = shutdown
