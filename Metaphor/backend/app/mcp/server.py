import json
import logging
import httpx
import asyncio
from mcp.server.fastmcp import FastMCP

logger = logging.getLogger("metaphor.mcp")

mcp = FastMCP("Metaphor", instructions="Universal context engine.")

METAPHOR_API_URL = "http://localhost:8000/api/v1"
METAPHOR_API_KEY = "metaphor_dev_secret_key_123"

def get_headers():
    return {"X-API-Key": METAPHOR_API_KEY, "Content-Type": "application/json"}

@mcp.tool()
async def get_context(query: str, ai_consumer: str = "claude") -> str:
    """Retrieve the delta Context Package from Metaphor."""
    logger.info(f"[MCP] get_context: query={query!r}")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{METAPHOR_API_URL}/context/query",
                json={"query": query, "ai_consumer": ai_consumer},
                headers=get_headers(),
                timeout=60.0
            )
            if resp.status_code == 200:
                return json.dumps(resp.json(), indent=2)
            return f"Error: {resp.status_code} - {resp.text}"
        except Exception as e:
            return f"Error connecting to Metaphor API: {e}"

if __name__ == "__main__":
    logger.info("Starting Metaphor MCP via stdio...")
    mcp.run()
