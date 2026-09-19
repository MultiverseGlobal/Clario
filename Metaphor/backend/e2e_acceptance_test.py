import asyncio
import httpx
import json
import logging
import uuid
import hashlib
from fastapi import FastAPI, Request
import uvicorn
import threading

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("E2E_TEST")

app = FastAPI()

@app.post("/webhook")
async def orion_webhook(request: Request):
    payload = await request.json()
    logger.info(f"[Orion] Received webhook payload:\n{json.dumps(payload, indent=2)}")
    callback_url = payload.get("callback_url")
    
    async def process_and_callback():
        await asyncio.sleep(1)
        logger.info(f"[Orion] Processing task '{payload.get('action')}'...")
        result = {"status": "success", "result": "Orion successfully processed the task and built the mobile app."}
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(callback_url, json=result)
            logger.info(f"[Orion] Callback response from Metaphor: {resp.status_code}")

    asyncio.create_task(process_and_callback())
    return {"status": "received"}

def run_orion_server():
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="error")


async def main():
    logger.info("==================================================")
    logger.info(" METAPHOR E2E PROOF OF VALUE SIMULATION (PHASE 6)")
    logger.info("==================================================")
    
    logger.info("Starting Orion Dummy Server on port 8001...")
    t = threading.Thread(target=run_orion_server, daemon=True)
    t.start()
    
    await asyncio.sleep(2)
    
    from app.database.session import async_session_maker
    from app.models.ai_registry import AIAgent
    from app.models.identity import Organization
    from app.models.operations import APIKey
    from sqlmodel import select

    test_key = "test_e2e_key_123"
    
    async with async_session_maker() as session:
        org = (await session.execute(select(Organization))).scalars().first()
        if not org:
            logger.error("No default org found!")
            return
            
        orion = (await session.execute(select(AIAgent).where(AIAgent.name == "orion"))).scalars().first()
        if not orion:
            orion = AIAgent(
                name="orion", 
                display_name="Orion Mobile AI", 
                webhook_url="http://127.0.0.1:8001/webhook",
                organization_id=org.id,
                supports_callback=True
            )
            session.add(orion)
            logger.info("[Setup] Registered Orion in AI Registry.")
        else:
            orion.webhook_url = "http://127.0.0.1:8001/webhook"
            orion.supports_callback = True
            session.add(orion)
            logger.info("[Setup] Updated Orion webhook URL in AI Registry.")

        key_hash = hashlib.sha256(test_key.encode()).hexdigest()
        existing = (await session.execute(select(APIKey).where(APIKey.hashed_key == key_hash))).scalars().first()
        if not existing:
            ak = APIKey(
                name="E2E Test Key",
                organization_id=org.id,
                created_by=uuid.uuid4(),
                hashed_key=key_hash,
                preview="test_e2e..."
            )
            session.add(ak)
            logger.info("[Setup] Created test API key.")
            
        await session.commit()

    logger.info("\n[Claude] Dispatching task to Orion via Metaphor MCP...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        mcp_payload = {
            "jsonrpc": "2.0",
            "id": "1",
            "method": "tools/call",
            "params": {
                "name": "dispatch_to_tool",
                "arguments": {
                    "source_tool": "claude",
                    "target_tool": "orion",
                    "action": "build_mobile_app",
                    "payload": {"platform": "android", "profile": "preview"}
                }
            }
        }
        try:
            resp = await client.post(
                "http://127.0.0.1:8000/api/v1/mcp",
                json=mcp_payload,
                headers={"Authorization": f"Bearer {test_key}"}
            )
            logger.info(f"    MCP Status: {resp.status_code}")
            logger.info(f"    Engine Report: {json.dumps(resp.json(), indent=2)}")
        except Exception as e:
            logger.error(f"    [!] Failed to hit Metaphor server. Is it running on port 8000? {e}")
            return
        
    logger.info("\nWaiting 4 seconds for async callback flow to complete...")
    await asyncio.sleep(4)
    
    logger.info("\n[Atlas] Fetching resolved callbacks from Metaphor...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("http://127.0.0.1:8000/api/v1/callbacks/resolved")
        if resp.status_code == 200:
            data = resp.json()
            callbacks = data.get("callbacks", [])
            logger.info(f"    Resolved Callbacks:\n{json.dumps(callbacks, indent=2)}")
            found = any(c.get("source_ai") == "orion" and c.get("action") == "build_mobile_app" for c in callbacks)
            if found:
                logger.info("\n✅ SUCCESS: E2E Ecosystem loop completed successfully!")
            else:
                logger.error("\n❌ FAILED: Callback from Orion not found in resolved list.")
        else:
            logger.error(f"\n❌ FAILED: Failed to fetch resolved callbacks: {resp.status_code}")
            
if __name__ == "__main__":
    asyncio.run(main())
