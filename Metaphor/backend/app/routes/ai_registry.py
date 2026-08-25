"""
routes/ai_registry.py — CRUD API for External AI Agent Registry
"""

import uuid
import logging
import httpx
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.models.ai_registry import AIAgent
from app.api.mcp import authenticate_mcp_token

logger = logging.getLogger("metaphor.ai_registry")
router = APIRouter(prefix="/ai-registry", tags=["AI Registry"])


# ── Pydantic schemas ──────────────────────────────────────────────

class AIAgentCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    webhook_url: Optional[str] = None
    auth_header: Optional[str] = None
    callback_secret: Optional[str] = None
    supports_callback: bool = False

class AIAgentUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    webhook_url: Optional[str] = None
    auth_header: Optional[str] = None
    callback_secret: Optional[str] = None
    supports_callback: Optional[bool] = None
    is_active: Optional[bool] = None

class AIAgentOut(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    description: Optional[str]
    webhook_url: Optional[str]
    supports_callback: bool
    is_active: bool
    ping_status: Optional[str]
    last_pinged_at: Optional[datetime]
    created_at: datetime


# ── Routes ───────────────────────────────────────────────────────

@router.get("/agents", response_model=List[AIAgentOut])
async def list_agents(
    request_obj=None,
    session: AsyncSession = Depends(get_session),
):
    """List all registered external AI agents."""
    result = await session.exec(select(AIAgent).where(AIAgent.is_active == True))
    return result.all()


@router.post("/agents", response_model=AIAgentOut)
async def create_agent(
    body: AIAgentCreate,
    session: AsyncSession = Depends(get_session),
):
    """Register a new external AI agent."""
    # Use a placeholder org_id for single-tenant mode
    agent = AIAgent(
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        **body.model_dump()
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    logger.info(f"Registered AI agent: {agent.name} ({agent.display_name})")
    return agent


@router.patch("/agents/{agent_id}", response_model=AIAgentOut)
async def update_agent(
    agent_id: uuid.UUID,
    body: AIAgentUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update an AI agent's configuration."""
    agent = await session.get(AIAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(agent, field, value)
    agent.updated_at = datetime.utcnow()
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Deactivate an AI agent."""
    agent = await session.get(AIAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_active = False
    agent.updated_at = datetime.utcnow()
    session.add(agent)
    await session.commit()
    return {"status": "deactivated", "agent_id": str(agent_id)}


@router.post("/agents/{agent_id}/ping")
async def ping_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    """Test connectivity to an external AI agent's webhook URL."""
    agent = await session.get(AIAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if not agent.webhook_url:
        raise HTTPException(status_code=400, detail="No webhook URL configured")

    try:
        headers = {}
        if agent.auth_header:
            headers["Authorization"] = agent.auth_header
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(agent.webhook_url, headers=headers)
        status = "ok" if resp.status_code < 500 else "error"
    except httpx.TimeoutException:
        status = "timeout"
    except Exception as e:
        status = f"error: {str(e)[:100]}"

    agent.ping_status = status
    agent.last_pinged_at = datetime.utcnow()
    session.add(agent)
    await session.commit()
    return {"agent_id": str(agent_id), "ping_status": status}
