import asyncio
import sys
import os

# Ensure backend directory is in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import init_db

async def main():
    print("Attempting to initialize the database...")
    try:
        await init_db()
        print("Successfully connected to Supabase and initialized tables!")
    except Exception as e:
        print(f"Failed to connect or initialize: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
