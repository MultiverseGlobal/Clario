import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database.session import get_session
from app.config import settings
from app.parsers.notion import NotionParser
from app.parsers.github import GitHubParser
from app.parsers.google_services import GoogleParser
from app.reflection import reflection_engine

logger = logging.getLogger("metaphor.routes.sync")
router = APIRouter()

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != settings.METAPHOR_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")
    return x_api_key

@router.post("/sync", response_model=Dict[str, Any])
async def trigger_workspace_sync(
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """
    Trigger manual or periodic sync:
    1. Fetch documents from Notion, GitHub, and Google Calendar/Drive.
    2. Feed all raw docs to the Reflection Engine to update Objects and Relationships.
    """
    logger.info("Starting Metaphor workspace sync...")
    try:
        notion_parser = NotionParser()
        github_parser = GitHubParser()
        google_parser = GoogleParser()

        # Gather logs from all three channels
        notion_logs = await notion_parser.fetch_documents()
        github_logs = await github_parser.fetch_documents()
        google_logs = await google_parser.fetch_documents()

        all_logs = notion_logs + github_logs + google_logs
        
        logger.info(f"Gathered {len(all_logs)} logs. Ingesting to Reflection Engine...")
        report = await reflection_engine.reflect_and_evolve(session, all_logs)
        await session.commit()
        
        return {
            "status": "success",
            "message": f"Sync finished successfully. Ingested {len(all_logs)} log events.",
            "report": report
        }
    except Exception as e:
        logger.error(f"Error during manual sync: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
