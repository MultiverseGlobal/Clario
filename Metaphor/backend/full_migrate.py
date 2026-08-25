import asyncio
from sqlmodel import SQLModel
from sqlalchemy import text
from app.database.session import engine
# Import all models to ensure they are registered with SQLModel.metadata
import app.models.operations
import app.models.graph
import app.models.identity
import app.models.context

async def migrate():
    async with engine.begin() as conn:
        print("Enabling vector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        print("Creating all tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
