import asyncio
import logging
from app.database.session import engine
from app.integrations.notion import notion_ingestor
from app.services.identity import IdentityService
from sqlmodel.ext.asyncio.session import AsyncSession

logging.basicConfig(level=logging.INFO)

async def test_notion_ingestion():
    async with AsyncSession(engine) as session:
        print("Starting Notion Ingestion test (V2 Architecture)...")
        identity = IdentityService(session)
        org = await identity.get_or_create_default_organization()
        await notion_ingestor.process_and_ingest(session, org.id, limit=3)
        print("Done!")

if __name__ == "__main__":
    asyncio.run(test_notion_ingestion())
