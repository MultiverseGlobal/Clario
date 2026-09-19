import asyncio
from sqlalchemy import text
from app.database.session import engine
from app.models.task_handoff import TaskHandoff
from sqlmodel import SQLModel

async def run_migration():
    print("Migrating task_handoffs to Phase 3 schema...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DROP TABLE IF EXISTS task_handoffs CASCADE;"))
            
            # Use raw SQL to recreate table exactly to avoid SQLModel sync issues
            # We will use the exact schema for Phase 3
            create_sql = """
            CREATE TABLE task_handoffs (
                id UUID PRIMARY KEY,
                organization_id UUID NOT NULL REFERENCES organizations(id),
                workspace_id UUID,
                project_id UUID,
                source_consumer_id UUID NOT NULL REFERENCES consumers(id),
                target_consumer_id UUID NOT NULL REFERENCES consumers(id),
                created_by UUID REFERENCES users(id),
                title VARCHAR NOT NULL,
                objective VARCHAR NOT NULL,
                instructions VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'pending',
                priority VARCHAR NOT NULL DEFAULT 'normal',
                context_refs JSONB NOT NULL DEFAULT '[]',
                artifact_refs JSONB NOT NULL DEFAULT '[]',
                decision_refs JSONB NOT NULL DEFAULT '[]',
                constraint_refs JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL,
                accepted_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ
            );
            """
            
            indexes = [
                "CREATE INDEX ix_task_handoffs_organization_id ON task_handoffs(organization_id);",
                "CREATE INDEX ix_task_handoffs_workspace_id ON task_handoffs(workspace_id);",
                "CREATE INDEX ix_task_handoffs_project_id ON task_handoffs(project_id);",
                "CREATE INDEX ix_task_handoffs_source_consumer_id ON task_handoffs(source_consumer_id);",
                "CREATE INDEX ix_task_handoffs_target_consumer_id ON task_handoffs(target_consumer_id);",
                "CREATE INDEX ix_task_handoffs_created_by ON task_handoffs(created_by);",
                "CREATE INDEX ix_task_handoffs_status ON task_handoffs(status);"
            ]
            
            await conn.execute(text(create_sql))
            for idx_sql in indexes:
                await conn.execute(text(idx_sql))
            print("[OK] task_handoffs table recreated with new schema.")
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
