import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func, or_
from app.database.session import get_session
from app.services.identity import IdentityService
from app.models.graph import Node, Edge
from app.models.operations import WebhookEvent, MCPAuditLog
from app.models.context import ContextSession

from app.core.security import get_user_via_api_key
from app.models.identity import User, Organization, OrganizationMember

router = APIRouter()

async def get_user_org(user: User, db: AsyncSession) -> Organization:
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    res = await db.execute(stmt)
    org_member = res.scalars().first()
    if org_member:
        org = await db.get(Organization, org_member.organization_id)
        if org:
            return org
    identity = IdentityService(db)
    return await identity.get_or_create_default_organization()

@router.get("/")
async def get_graph(
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Retrieve all nodes and edges for the authenticated user's organization."""
    org = await get_user_org(user, db)

    # Get nodes
    nodes_res = await db.execute(select(Node).where(Node.organization_id == org.id))
    nodes = nodes_res.scalars().all()

    # Get edges
    edges_res = await db.execute(
        select(Edge).join(Node, Edge.from_node == Node.id).where(Node.organization_id == org.id)
    )
    edges = edges_res.scalars().all()

    if not nodes:
        node1 = Node(
            id=uuid.uuid4(),
            organization_id=org.id,
            type="architecture",
            title="Metaphor OS Architecture",
            summary="Core Cognitive Operating System memory layer with Graph RAG.",
            raw_data={"status": "active"}
        )
        node2 = Node(
            id=uuid.uuid4(),
            organization_id=org.id,
            type="project",
            title="Remote MCP Integration",
            summary="OAuth 2.1 PKCE server connecting ChatGPT and Claude Desktop.",
            raw_data={"status": "connected"}
        )
        node3 = Node(
            id=uuid.uuid4(),
            organization_id=org.id,
            type="rule",
            title="Linear Design System Enforcer",
            summary="UI/UX rule enforcement with semantic design tokens and 8pt baselines.",
            raw_data={"priority": "high"}
        )
        db.add_all([node1, node2, node3])
        await db.flush()

        edge1 = Edge(id=uuid.uuid4(), from_node=node1.id, to_node=node2.id, relationship="ENABLES")
        edge2 = Edge(id=uuid.uuid4(), from_node=node1.id, to_node=node3.id, relationship="ENFORCES")
        db.add_all([edge1, edge2])
        await db.commit()

        nodes = [node1, node2, node3]
        edges = [edge1, edge2]


    return {
        "nodes": [
            {"id": str(n.id), "name": n.title, "type": n.type, "summary": n.summary}
            for n in nodes
        ],
        "edges": [
            {"id": str(e.id), "source": str(e.from_node), "target": str(e.to_node), "type": e.relationship}
            for e in edges
        ]
    }


@router.get("/stats")
async def get_stats(
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Retrieve high-level metrics for the dashboard for the authenticated user."""
    org = await get_user_org(user, db)

    node_count = (await db.execute(select(func.count(Node.id)).where(Node.organization_id == org.id))).scalar()
    edge_count = (await db.execute(select(func.count(Edge.id)).join(Node, Edge.from_node == Node.id).where(Node.organization_id == org.id))).scalar()
    session_count = (await db.execute(select(func.count(ContextSession.id)).where(ContextSession.organization_id == org.id))).scalar()
    event_count = (await db.execute(select(func.count(WebhookEvent.id)))).scalar()

    return {
        "node_count": node_count or 0,
        "edge_count": edge_count or 0,
        "active_sessions": session_count or 0,
        "total_events": event_count or 0
    }

@router.get("/inbox")
async def get_inbox(
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Retrieve all pending nodes for review for the authenticated user's organization."""
    org = await get_user_org(user, db)

    nodes_res = await db.execute(
        select(Node).where(Node.organization_id == org.id, Node.status == "pending_review")
    )
    nodes = nodes_res.scalars().all()

    return {
        "nodes": [
            {"id": str(n.id), "title": n.title, "type": n.type, "summary": n.summary, "content": n.content, "confidence": n.confidence, "created_at": n.created_at}
            for n in nodes
        ]
    }

@router.post("/nodes/{node_id}/approve")
async def approve_node(
    node_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Approve a pending node."""
    org = await get_user_org(user, db)
    node = await db.get(Node, node_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Node not found")
    node.status = "approved"
    db.add(node)
    await db.commit()
    return {"status": "success"}

@router.post("/nodes/{node_id}/reject")
async def reject_node(
    node_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Reject a pending node."""
    org = await get_user_org(user, db)
    node = await db.get(Node, node_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Node not found")
    node.status = "rejected"
    db.add(node)
    await db.commit()
    return {"status": "success"}


# ── The Binding Phase: Project Node CRUD ────────────────────────────────────

class CreateNodeRequest(BaseModel):
    type: str
    title: str
    summary: Optional[str] = ""
    content: Optional[str] = ""
    metadata: Optional[dict] = {}


@router.post("/nodes")
async def create_node(
    req: CreateNodeRequest,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    Create a new node directly — used during The Binding Phase of onboarding
    to register user-defined projects into the Knowledge Graph.
    """
    org = await get_user_org(user, db)
    node = Node(
        id=uuid.uuid4(),
        organization_id=org.id,
        type=req.type,
        title=req.title,
        summary=req.summary or "",
        content=req.content or "",
        created_by=user.id,
        status="approved",
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return {
        "id": str(node.id),
        "type": node.type,
        "title": node.title,
        "summary": node.summary,
        "created_at": node.created_at.isoformat()
    }


@router.get("/nodes")
async def list_nodes(
    type: Optional[str] = Query(None, description="Filter nodes by type, e.g. 'project'"),
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    List all nodes for the user's organization, optionally filtered by type.
    Used by /dashboard/projects to display user-created projects.
    """
    org = await get_user_org(user, db)
    stmt = select(Node).where(Node.organization_id == org.id)
    if type:
        stmt = stmt.where(Node.type == type)
    res = await db.execute(stmt)
    nodes = res.scalars().all()
    return {
        "nodes": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "summary": n.summary,
                "status": n.status,
                "project_status": _parse_project_status(n.content),
                "created_at": n.created_at.isoformat()
            }
            for n in nodes
            if n.status != "archived"
        ]
    }


def _parse_project_status(content: str) -> str:
    """Extract project_status from content JSON blob, default to 'active'."""
    try:
        data = json.loads(content or "{}")
        return data.get("project_status", "active")
    except Exception:
        return "active"


class UpdateNodeRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None     # used to update bound AIs
    project_status: Optional[str] = None  # "active", "paused", "completed"
    archive: Optional[bool] = None


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: uuid.UUID,
    req: UpdateNodeRequest,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    Update a project node: rename, edit bound AIs, change status, or archive.
    """
    org = await get_user_org(user, db)
    node = await db.get(Node, node_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Node not found")

    if req.title is not None:
        node.title = req.title
    if req.summary is not None:
        node.summary = req.summary
    if req.project_status is not None:
        try:
            data = json.loads(node.content or "{}")
        except Exception:
            data = {}
        data["project_status"] = req.project_status
        node.content = json.dumps(data)
    if req.archive is True:
        node.status = "archived"
        node.archived_at = datetime.utcnow()
    elif req.archive is False and node.status == "archived":
        node.status = "approved"
        node.archived_at = None

    node.updated_at = datetime.utcnow()
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return {
        "id": str(node.id),
        "title": node.title,
        "summary": node.summary,
        "status": node.status,
        "project_status": _parse_project_status(node.content),
        "updated_at": node.updated_at.isoformat()
    }


@router.get("/nodes/{project_id}/handoffs")
async def get_project_handoffs(
    project_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Get active multi-agent handoffs for a project."""
    org = await get_user_org(user, db)
    # verify project ownership
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models.task_handoff import TaskHandoff
    stmt = select(TaskHandoff).where(TaskHandoff.project_id == project_id).order_by(TaskHandoff.created_at.desc())
    res = await db.execute(stmt)
    handoffs = res.scalars().all()
    
    return {
        "handoffs": [
            {
                "id": str(h.id),
                "source_ai": h.source_ai,
                "target_ai": h.target_ai,
                "payload": h.payload,
                "instructions": h.instructions,
                "status": h.status,
                "resolution_summary": h.resolution_summary,
                "created_at": h.created_at.isoformat(),
                "resolved_at": h.resolved_at.isoformat() if h.resolved_at else None
            }
            for h in handoffs
        ]
    }


class CreateHandoffRequest(BaseModel):
    source_ai: str               # e.g. "atlas", "william", "clario"
    target_ai: str               # e.g. "william", "claude"
    payload: str                 # Human-readable description of what is being handed off
    instructions: Optional[str] = None  # Machine-readable command


@router.post("/nodes/{project_id}/handoffs")
async def create_handoff(
    project_id: uuid.UUID,
    req: CreateHandoffRequest,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Push a new task handoff from an ecosystem tool (Atlas, William, Clario) into a project queue."""
    org = await get_user_org(user, db)
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models.task_handoff import TaskHandoff
    handoff = TaskHandoff(
        id=uuid.uuid4(),
        project_id=project_id,
        source_ai=req.source_ai.lower(),
        target_ai=req.target_ai.lower(),
        payload=req.payload,
        instructions=req.instructions,
        status="pending",
    )
    db.add(handoff)
    await db.commit()
    await db.refresh(handoff)
    return {
        "id": str(handoff.id),
        "source_ai": handoff.source_ai,
        "target_ai": handoff.target_ai,
        "status": handoff.status,
        "created_at": handoff.created_at.isoformat()
    }


class ResolveHandoffRequest(BaseModel):
    status: str   # "resolved" or "cancelled"
    resolution_summary: Optional[str] = None


@router.patch("/nodes/{project_id}/handoffs/{handoff_id}")
async def resolve_handoff(
    project_id: uuid.UUID,
    handoff_id: uuid.UUID,
    req: ResolveHandoffRequest,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Mark a handoff as resolved or cancelled."""
    org = await get_user_org(user, db)
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models.task_handoff import TaskHandoff
    handoff = await db.get(TaskHandoff, handoff_id)
    if not handoff or handoff.project_id != project_id:
        raise HTTPException(status_code=404, detail="Handoff not found")
    if req.status not in ("resolved", "cancelled"):
        raise HTTPException(status_code=400, detail="status must be 'resolved' or 'cancelled'")

    handoff.status = req.status
    handoff.resolution_summary = req.resolution_summary
    handoff.resolved_at = datetime.utcnow()
    db.add(handoff)
    await db.commit()
    return {"id": str(handoff.id), "status": handoff.status}


@router.post("/nodes/{project_id}/handoffs/clear")
async def clear_handoff_queue(
    project_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Bulk-cancel all pending handoffs for a project."""
    org = await get_user_org(user, db)
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models.task_handoff import TaskHandoff
    stmt = select(TaskHandoff).where(
        TaskHandoff.project_id == project_id,
        TaskHandoff.status == "pending"
    )
    res = await db.execute(stmt)
    pending = res.scalars().all()
    now = datetime.utcnow()
    for h in pending:
        h.status = "cancelled"
        h.resolved_at = now
        h.resolution_summary = "Manually cleared by user."
        db.add(h)
    await db.commit()
    return {"cleared": len(pending)}



class DispatchRequest(BaseModel):
    source_tool: str
    target_tool: str
    action: str
    payload: dict

import httpx

@router.post("/nodes/{project_id}/dispatch")
async def dispatch_command(
    project_id: uuid.UUID,
    req: DispatchRequest,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    Universal Command Router.
    Allows any tool in the project to command any other tool.
    Records the command as a handoff, then actively routes it if the target has a webhook.
    """
    org = await get_user_org(user, db)
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.models.task_handoff import TaskHandoff
    
    # 1. Always record the command in the Handoff Queue for visibility
    handoff = TaskHandoff(
        id=uuid.uuid4(),
        project_id=project_id,
        source_ai=req.source_tool.lower(),
        target_ai=req.target_tool.lower(),
        payload=f"Action: {req.action}\nPayload: {json.dumps(req.payload)}",
        instructions=f"Dispatched command: {req.action}",
        status="pending",
    )
    db.add(handoff)
    await db.commit()
    await db.refresh(handoff)

    target = req.target_tool.lower()
    webhook_url = None
    
    # Map ecosystem tools to their cloud webhooks
    if target == "william":
        webhook_url = "https://william.pseudonyms.ai/api/metaphor/webhook"
    elif target == "atlas":
        webhook_url = "https://sqthvliapkauoxieiwfb.supabase.co/functions/v1/metaphor-to-atlas"
    elif target == "clario":
        webhook_url = "https://clario.pseudonyms.ai/api/metaphor/webhook"

    dispatch_result = "Queued"

    # 2. If it's an active ecosystem tool, fire the webhook immediately
    if webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    webhook_url,
                    json={
                        "handoff_id": str(handoff.id),
                        "project_id": str(project_id),
                        "source_tool": req.source_tool,
                        "action": req.action,
                        "payload": req.payload
                    },
                    timeout=5.0
                )
                if res.status_code in (200, 201):
                    dispatch_result = "Delivered via Webhook"
                else:
                    dispatch_result = f"Webhook failed: {res.status_code}"
        except Exception as e:
            dispatch_result = f"Webhook error: {e}"
            logger.error(f"Failed to dispatch to {target}: {e}")

    return {
        "status": "success",
        "handoff_id": str(handoff.id),
        "target": target,
        "dispatch_result": dispatch_result
    }

@router.delete("/nodes/{node_id}")
async def delete_node(
    node_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    Delete a node and all its associated edges.
    Chat history (TaskHandoffs) is intentionally orphaned, not deleted.
    """
    org = await get_user_org(user, db)
    node = await db.get(Node, node_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Node not found")

    # Delete all edges connected to this node (both directions)
    edges_res = await db.execute(
        select(Edge).where(or_(Edge.from_node == node_id, Edge.to_node == node_id))
    )
    edges = edges_res.scalars().all()
    for edge in edges:
        await db.delete(edge)

    await db.delete(node)
    await db.commit()
    return {"status": "deleted", "id": str(node_id)}


@router.get("/nodes/{project_id}/connected-clients")
async def get_project_connected_clients(
    project_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """Return distinct AI client names that have ever called MCP tools scoped to this project."""
    org = await get_user_org(user, db)
    node = await db.get(Node, project_id)
    if not node or node.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Project not found")

    stmt = (
        select(MCPAuditLog.client_name, func.max(MCPAuditLog.timestamp).label("last_seen"))
        .where(
            MCPAuditLog.organization_id == org.id,
            MCPAuditLog.project_id == project_id
        )
        .group_by(MCPAuditLog.client_name)
        .order_by(func.max(MCPAuditLog.timestamp).desc())
    )
    res = await db.execute(stmt)
    rows = res.all()
    return {
        "clients": [
            {"client_name": row.client_name, "last_seen": row.last_seen.isoformat()}
            for row in rows
        ]
    }
