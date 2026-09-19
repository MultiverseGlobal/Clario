import asyncio
from sqlalchemy import text
from app.database.session import engine

async def run_migration():
    
    async with engine.begin() as conn:
        print("Creating context_insights table...")
        
        await conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS context_insights (
                id UUID PRIMARY KEY,
                organization_id UUID NOT NULL REFERENCES organizations(id),
                workspace_id UUID REFERENCES workspaces(id),
                project_id UUID,
                type VARCHAR NOT NULL,
                content TEXT NOT NULL,
                origin VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                confidence VARCHAR NOT NULL,
                source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
                previous_version_id UUID REFERENCES context_insights(id),
                superseded_by_id UUID REFERENCES context_insights(id),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
                valid_until TIMESTAMP WITH TIME ZONE
            );
            """
        ))
        
        print("Creating indexes on context_insights...")
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_org_id ON context_insights (organization_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_workspace_id ON context_insights (workspace_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_project_id ON context_insights (project_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_type ON context_insights (type);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_origin ON context_insights (origin);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_context_insights_status ON context_insights (status);"))
        
        print("Adding insight_refs to task_handoffs if it doesn't exist...")
        try:
            await conn.execute(text(
                """
                ALTER TABLE task_handoffs
                ADD COLUMN IF NOT EXISTS insight_refs JSONB NOT NULL DEFAULT '[]'::jsonb;
                """
            ))
        except Exception as e:
            print("Error adding column (it might already exist):", e)
            
    print("Migration Phase 4 complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())
