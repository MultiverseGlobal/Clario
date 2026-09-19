import asyncio
from app.database.session import engine
from sqlmodel import SQLModel
from sqlalchemy import text

async def run_migration():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("DROP TABLE universal_events CASCADE;"))
            print("Dropped universal_events table")
        except Exception as e:
            print("Error dropping:", e)
        
        from app.models import UniversalEvent
        print("Creating missing tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(run_migration())
