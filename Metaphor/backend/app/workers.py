import logging
import asyncio
from app.database.session import get_session_context
from sqlmodel import select
from app.models.operations import SyncJob
from arq import create_pool
from arq.connections import RedisSettings
import urllib.parse
from app.core.config import settings

logger = logging.getLogger(__name__)

async def resume_stuck_jobs():
    """
    Finds processing SyncJobs that got stuck (e.g., pod restart without Redis persistence) and resumes them.
    Called from main.py startup lifespan.
    """
    try:
        parsed = urllib.parse.urlparse(settings.REDIS_URL)
        redis_host = parsed.hostname or "localhost"
        redis_port = parsed.port or 6379
        redis = await create_pool(RedisSettings(host=redis_host, port=redis_port))

        async with get_session_context() as session:
            stmt = select(SyncJob).where(SyncJob.status != "completed", SyncJob.status != "failed")
            result = await session.execute(stmt)
            stuck_jobs = result.scalars().all()
            
            for job in stuck_jobs:
                logger.info(f"Resuming stuck job {job.id} for org {job.organization_id} via Arq")
                payload = job.payload or {}
                if not payload:
                    job.status = "failed"
                    job.error_message = "No payload to resume"
                    session.add(job)
                    continue
                    
                await redis.enqueue_job(
                    "process_integration_sync",
                    user_id=payload.get("user_id"),
                    org_id=str(job.organization_id),
                    sources=payload.get("sources", []),
                    github_repo=payload.get("github_repo", "tiangolo/fastapi"),
                    job_id=job.id
                )
            await session.commit()
    except Exception as e:
        logger.error(f"Error resuming stuck jobs: {e}")
