import asyncio
import logging
from sqlalchemy import text
from app.database.session import engine, init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reset_db")

async def reset_database():
    logger.info("Dropping all existing tables in Supabase...")
    async with engine.begin() as conn:
        # Drop all old flat tables if they exist
        await conn.execute(text("DROP TABLE IF EXISTS chunk CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS nodeevidence CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS edge CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS node CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS universalevent CASCADE;"))
        
        # Drop any partially created V2 tables if we run this multiple times
        await conn.execute(text("DROP TABLE IF EXISTS mcp_sessions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS api_keys CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS activity CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS events CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS integrations CASCADE;"))
        
        await conn.execute(text("DROP TABLE IF EXISTS context_sessions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS context_packages CASCADE;"))
        
        await conn.execute(text("DROP TABLE IF EXISTS search_documents CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS embeddings CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS evidence CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS edges CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS node_metadata CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS nodes CASCADE;"))
        
        await conn.execute(text("DROP TABLE IF EXISTS organization_members CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS organizations CASCADE;"))

    logger.info("Initializing new V2 10-year architecture tables...")
    await init_db()
    logger.info("V2 Database successfully initialized!")

if __name__ == "__main__":
    asyncio.run(reset_database())
