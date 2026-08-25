from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from app.database.session import get_session
from app.models.graph import Node, NodeMetadata
from app.models.operations import MCPOAuthToken
from app.api.mcp import authenticate_mcp_token, MCPTokenContext
from pydantic import BaseModel

router = APIRouter()

class PipelineIntakeRequest(BaseModel):
    source: str
    target_id: Optional[str] = None
    title: str
    summary: str
    content: str
    type: str # "strategy" or "action"
    confidence: float = 1.0

@router.get("/brief")
async def get_pipeline_brief(
    request: Request,
    token_obj: Any = Depends(authenticate_mcp_token),
    session: AsyncSession = Depends(get_session)
):
    """
    Returns a structured context brief from Metaphor's live knowledge graph.
    Used by downstream pseudonyms (Atlas, William) to get current context.
    """
    # token_obj could be MCPOAuthToken or MCPTokenContext
    org_id = token_obj.organization_id
    
    # Fetch active goals, constraints, decisions
    stmt = select(Node).where(
        Node.organization_id == org_id,
        Node.status.in_(["approved", "pending_review"]),
        Node.type.in_(["goal", "constraint", "decision"])
    ).order_by(Node.updated_at.desc()).limit(20)
    
    res = await session.execute(stmt)
    active_nodes = res.scalars().all()
    
    active_goals = [n.title for n in active_nodes if n.type == "goal"]
    active_constraints = [n.title for n in active_nodes if n.type == "constraint"]
    open_decisions = [n.title for n in active_nodes if n.type == "decision"]
    
    # Basic recommendation heuristic: if there's a goal but no decisions, recommend making a decision
    recommended_focus = "General context processing"
    if active_goals and not open_decisions:
        recommended_focus = f"Develop strategy for: {active_goals[0]}"
    elif open_decisions:
        recommended_focus = f"Resolve open decision: {open_decisions[0]}"

    return {
        "brief_id": str(uuid.uuid4()),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "active_goals": active_goals,
        "active_constraints": active_constraints,
        "open_decisions": open_decisions,
        "recommended_focus": recommended_focus,
        "node_count": len(active_nodes)
    }

@router.post("/intake")
async def post_pipeline_intake(
    payload: PipelineIntakeRequest,
    request: Request,
    token_obj: Any = Depends(authenticate_mcp_token),
    session: AsyncSession = Depends(get_session)
):
    """
    Receives a payload from Atlas (strategy) or William (action log). 
    Writes it into Metaphor as a new Node.
    """
    org_id = token_obj.organization_id
    user_id = token_obj.user_id if hasattr(token_obj, "user_id") else None

    # Validate type
    if payload.type not in ["strategy", "action"]:
        raise HTTPException(status_code=400, detail="Invalid intake type. Must be 'strategy' or 'action'")

    new_node = Node(
        id=uuid.uuid4(),
        organization_id=org_id,
        type=payload.type,
        title=payload.title,
        summary=payload.summary,
        content=payload.content,
        confidence=payload.confidence,
        status="approved", # Auto-approve pipeline intakes for now
        created_by=user_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    session.add(new_node)
    
    # Add metadata for the source
    meta_source = NodeMetadata(
        id=uuid.uuid4(),
        node_id=new_node.id,
        key="pipeline_source",
        value=payload.source
    )
    session.add(meta_source)

    await session.commit()
    await session.refresh(new_node)

    return {"status": "success", "node_id": str(new_node.id)}

@router.get("/status")
async def get_pipeline_status(
    request: Request,
    token_obj: Any = Depends(authenticate_mcp_token),
    session: AsyncSession = Depends(get_session)
):
    """
    Returns connection status for all known clients (atlas, william).
    """
    org_id = token_obj.organization_id
    
    # Get active OAuth tokens for this org to determine connected clients
    # In MCPOAuthToken we have client_id. Atlas="atlas", William="william"
    stmt = select(MCPOAuthToken).where(
        MCPOAuthToken.organization_id == org_id,
        MCPOAuthToken.revoked_at == None
    )
    res = await session.execute(stmt)
    tokens = res.scalars().all()
    
    active_clients = {t.client_id for t in tokens}
    
    # For now, return basic status
    return {
        "atlas": {
            "connected": "atlas" in active_clients,
            "last_intake": None # Would require querying NodeMetadata for 'atlas'
        },
        "william": {
            "connected": "william" in active_clients,
            "last_intake": None
        }
    }
