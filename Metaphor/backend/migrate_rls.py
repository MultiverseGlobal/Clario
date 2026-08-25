import asyncio
from sqlalchemy import text
from app.database.session import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_rls")

# Tables that have organization_id
RLS_TABLES = [
    "nodes",
    "chat_sessions",
    "context_sessions",
    "organization_members",
    "integrations",
    "api_keys",
    "mcp_sessions",
    "sync_jobs",
    "mcp_oauth_clients",
    "mcp_oauth_auth_codes",
    "mcp_oauth_tokens",
    "mcp_audit_logs",
    "context_models"
]

async def run_migration():
    logger.info("Enabling Row Level Security (RLS) on core tables...")
    
    try:
        async with engine.begin() as conn:
            for table in RLS_TABLES:
                # Enable RLS
                await conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
                logger.info(f"Enabled RLS on {table}")
                
                # Drop existing policy if it exists to avoid errors on re-runs
                await conn.execute(text(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};"))
                
                # Create the policy
                # It uses current_setting('app.current_org_id', true) to get the org ID
                # The 'true' parameter makes it return NULL instead of erroring if not set.
                policy_sql = f"""
                CREATE POLICY tenant_isolation_policy ON {table}
                AS PERMISSIVE FOR ALL
                TO PUBLIC
                USING (
                    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
                )
                WITH CHECK (
                    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
                );
                """
                await conn.execute(text(policy_sql))
                logger.info(f"Created tenant_isolation_policy on {table}")
                
                # Force RLS for the table owner (postgres/supabase_admin) if needed, 
                # but usually we want admin to bypass. We will leave FORCE RLS off 
                # so the DB admin can still read everything, but the app user will be restricted.
                
            logger.info("[OK] RLS migration completed successfully.")
    except Exception as e:
        logger.error(f"[ERROR] Migration failed: {e}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
