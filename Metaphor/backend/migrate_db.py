import asyncio
from sqlmodel import SQLModel
from app.database import engine
from app.models import Chunk
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Dropping chunk table...")
        await conn.execute(text("DROP TABLE IF EXISTS chunk CASCADE;"))
        print("Recreating chunk table with 768 dimensions...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
