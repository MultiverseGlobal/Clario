"""
Migration: Add project_id to chat_sessions table.

Adds an optional UUID column that allows session drops to be scoped
to a specific project node. Safe to re-run (idempotent).
"""
import asyncio
from sqlalchemy import text
from app.database.session import engine


async def migrate():
    async with engine.begin() as conn:
        print("Adding project_id column to chat_sessions...")
        try:
            await conn.execute(text(
                "ALTER TABLE chat_sessions ADD COLUMN project_id UUID REFERENCES nodes(id) ON DELETE SET NULL;"
            ))
            print("  [OK] project_id column added.")
        except Exception as e:
            print(f"  [SKIP] May already exist: {e}")

        print("Creating index on chat_sessions.project_id...")
        try:
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_chat_sessions_project_id ON chat_sessions(project_id);"
            ))
            print("  [OK] Index created.")
        except Exception as e:
            print(f"  [SKIP] Index: {e}")

        print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
