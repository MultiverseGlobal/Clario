import logging
import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.mcp_server import mcp

if __name__ == "__main__":
    # Disable logging to stdout because MCP stdio transport uses stdout to communicate!
    logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
    logger = logging.getLogger("metaphor.mcp_main")
    logger.warning("Starting Metaphor MCP Server (stdio)")
    
    # Run the MCP server using stdio transport (required for Cursor and Claude Desktop)
    mcp.run(transport="stdio")
