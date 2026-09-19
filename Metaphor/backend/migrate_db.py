import asyncio
from sqlmodel import SQLModel
from app.database.session import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Dropping chunk table...")
        await conn.execute(text("DROP TABLE IF EXISTS chunk CASCADE;"))
        print("Adding workspace_id to nodes...")
        try:
            await conn.execute(text("ALTER TABLE nodes ADD COLUMN IF NOT EXISTS workspace_id UUID;"))
        except: pass
        print("Adding consumer_id to api_keys...")
        try:
            await conn.execute(text("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS consumer_id UUID;"))
            await conn.execute(text("ALTER TABLE mcp_oauth_clients ADD COLUMN IF NOT EXISTS consumer_id UUID;"))
            await conn.execute(text("ALTER TABLE mcp_oauth_tokens ADD COLUMN IF NOT EXISTS consumer_id UUID;"))
        except: pass
        print("Creating new tables...")
        from app.models.identity import Workspace, Consumer
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
