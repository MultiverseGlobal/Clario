import uuid
from mcp.server.fastmcp import FastMCP
from app.database.session import async_session_maker
from app.services.context import ContextService
from app.services.graph import GraphService
from app.services.identity import IdentityService

mcp = FastMCP("Metaphor Context Engine")

@mcp.tool()
async def query_metaphor_context(objective: str, ai_consumer: str = "claude") -> str:
    """
    Query the Metaphor Intelligence Engine to retrieve a hyper-relevant Context Package.
    Always use this tool when you need background context on the user, their projects, or their constraints.
    
    Args:
        objective: What are you trying to accomplish or what information do you need?
        ai_consumer: The identifier for your client (e.g., claude, cursor).
    """
    async with async_session_maker() as session:
        # For local MCP, we assume the default org. 
        identity = IdentityService(session)
        org = await identity.get_or_create_default_organization()
        
        graph = GraphService(session)
        context = ContextService(session, graph)
        
        package = await context.generate_context_package(org.id, ai_consumer, objective)
        
        import json
        return json.dumps(package.package_json, indent=2)
