import asyncio
from sqlmodel import SQLModel
from app.database.session import engine
from sqlalchemy import text
import app.models.operations
import app.models.graph
import app.models.identity
import app.models.context

async def migrate():
    async with engine.begin() as conn:
        print("Creating new tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        
        print("Adding checksum column to events...")
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN checksum VARCHAR;"))
            await conn.execute(text("CREATE INDEX ix_events_checksum ON events (checksum);"))
        except Exception as e:
            print("Checksum column might already exist:", e)
            
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
