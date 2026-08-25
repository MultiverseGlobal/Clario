import asyncio
import hashlib
import json
from httpx import AsyncClient, ASGITransport
from app.main import app

async def main():
    print("--- Running Local WorkOS MCP Protected Resource Test Flow ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Protected Resource Discovery (RFC 9728)
        r1 = await client.get("/api/v1/mcp/.well-known/oauth-protected-resource")
        print("[1] Protected Resource Discovery:", r1.status_code, r1.json())
        assert r1.status_code == 200
        assert "resource" in r1.json()
        assert "authorization_servers" in r1.json()

        # 2. Unauthenticated request challenge (WWW-Authenticate header)
        r2 = await client.post("/api/v1/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"})
        print("[2] Unauthenticated 401:", r2.status_code, r2.headers.get("WWW-Authenticate"))
        assert r2.status_code == 401
        assert "resource_id" in r2.headers.get("WWW-Authenticate", "")

        # 3. Health Check
        r3 = await client.get("/api/v1/mcp/health-check")
        print("[3] MCP Health Check:", r3.status_code, r3.json()["authentication"])
        assert r3.status_code == 200

if __name__ == "__main__":
    asyncio.run(main())
