import asyncio
import json
import logging
from typing import Dict, Any, Optional

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger("metaphor.mcp_client")

class MetaphorMCPClient:
    """
    A service that connects Metaphor to external MCP servers via Stdio.
    This enables Metaphor to proxy tool calls to specialized tools in the network.
    """
    def __init__(self):
        # Cache for active sessions (key: participant_id or server_name)
        self.active_sessions: Dict[str, ClientSession] = {}
        self.exit_stacks = {}

    async def connect_to_server(self, server_id: str, command: str, args: list[str], env: Optional[Dict[str, str]] = None) -> ClientSession:
        """
        Connects to an external MCP server via standard stdio transport.
        """
        if server_id in self.active_sessions:
            return self.active_sessions[server_id]

        server_params = StdioServerParameters(
            command=command,
            args=args,
            env=env
        )

        from contextlib import AsyncExitStack
        exit_stack = AsyncExitStack()
        
        try:
            stdio_transport = await exit_stack.enter_async_context(stdio_client(server_params))
            read, write = stdio_transport
            
            session = await exit_stack.enter_async_context(ClientSession(read, write))
            
            await session.initialize()
            
            self.active_sessions[server_id] = session
            self.exit_stacks[server_id] = exit_stack
            
            logger.info(f"Connected to external MCP server: {server_id}")
            return session
            
        except Exception as e:
            await exit_stack.aclose()
            logger.error(f"Failed to connect to MCP server {server_id}: {e}")
            raise e

    async def call_tool(self, server_id: str, tool_name: str, arguments: dict) -> dict:
        """
        Calls a tool on a connected MCP server.
        """
        if server_id not in self.active_sessions:
            raise ValueError(f"No active session for server {server_id}")
            
        session = self.active_sessions[server_id]
        
        result = await session.call_tool(tool_name, arguments)
        
        # Convert CallToolResult to dict
        return {
            "isError": result.isError,
            "content": [{"type": c.type, "text": getattr(c, "text", str(c))} for c in result.content]
        }

    async def disconnect(self, server_id: str):
        if server_id in self.exit_stacks:
            await self.exit_stacks[server_id].aclose()
            del self.exit_stacks[server_id]
            del self.active_sessions[server_id]
            logger.info(f"Disconnected from MCP server: {server_id}")

    async def disconnect_all(self):
        server_ids = list(self.exit_stacks.keys())
        for sid in server_ids:
            await self.disconnect(sid)

# Global singleton instance
mcp_client = MetaphorMCPClient()
