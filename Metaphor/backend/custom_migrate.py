import asyncio
from sqlmodel import SQLModel
from sqlalchemy import text
from app.database.session import engine
from app.models.identity import * 
from app.models.graph import *

async def migrate():
    async with engine.begin() as conn:
        print("Creating all tables (including ContextModel)...")
        await conn.run_sync(SQLModel.metadata.create_all)
        
        print("Adding settings column to users table...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN settings JSON DEFAULT '{}'::json;"))
        except Exception as e:
            print("Settings column might already exist:", str(e))
            
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
