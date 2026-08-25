import asyncio
from sqlalchemy import text
from app.database.session import engine

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE integrations ADD COLUMN user_id UUID;'))
        except Exception as e:
            print(f"Integration update failed: {e}")
        try:
            await conn.execute(text('ALTER TABLE nodes ADD COLUMN source_event_id UUID;'))
        except Exception as e:
            print(f"Nodes update failed: {e}")
        try:
            await conn.execute(text('ALTER TABLE edges ADD COLUMN source_event_id UUID;'))
        except Exception as e:
            print(f"Edges update failed: {e}")
        print('done')

asyncio.run(main())
