"""
Migration: Create task_handoffs table
"""
import asyncio
from sqlalchemy import text
from app.database.session import engine

async def run_migration():
    print("Creating task_handoffs table if it does not exist...")
    
    # We use a raw SQL statement to ensure it's created accurately with UUID primary keys.
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS task_handoffs (
        id UUID PRIMARY KEY,
        project_id UUID NOT NULL,
        source_ai VARCHAR NOT NULL,
        target_ai VARCHAR NOT NULL,
        payload TEXT NOT NULL,
        instructions TEXT,
        status VARCHAR NOT NULL DEFAULT 'pending',
        resolution_summary TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        resolved_at TIMESTAMPTZ
    );
    """
    
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS ix_task_handoffs_project_id ON task_handoffs (project_id);",
        "CREATE INDEX IF NOT EXISTS ix_task_handoffs_source_ai ON task_handoffs (source_ai);",
        "CREATE INDEX IF NOT EXISTS ix_task_handoffs_target_ai ON task_handoffs (target_ai);",
        "CREATE INDEX IF NOT EXISTS ix_task_handoffs_status ON task_handoffs (status);"
    ]
    
    try:
        async with engine.begin() as conn:
            await conn.execute(text(create_table_sql))
            for sql in create_indexes_sql:
                await conn.execute(text(sql))
            print("[OK] task_handoffs table and indexes created successfully.")
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
