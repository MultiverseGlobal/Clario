import asyncio
from sqlalchemy import text
from app.database.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding decided_at and reasoning columns to nodes table...")
        await conn.execute(text("ALTER TABLE nodes ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;"))
        await conn.execute(text("ALTER TABLE nodes ADD COLUMN IF NOT EXISTS reasoning TEXT;"))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
