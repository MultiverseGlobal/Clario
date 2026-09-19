import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

from app.database.session import get_session
from app.core.config import settings
from app.models import Node, Edge, Evidence, Clarification
from app.provider import llm_provider
from app.reflection import reflection_engine

logger = logging.getLogger("metaphor.routes.graph")
router = APIRouter()

# API authentication utility
async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != settings.METAPHOR_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")
    return x_api_key

# Request / Response Schemas
class GraphRequest(BaseModel):
    dimensions: Optional[List[str]] = None # List of "structural", "semantic", "temporal"
    node_types: Optional[List[str]] = None

class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class ExplainRequest(BaseModel):
    node_a_name: str
    node_b_name: str

class HistoryResponse(BaseModel):
    timeline: List[Dict[str, Any]]

@router.post("/graph", response_model=GraphResponse)
async def get_graph(
    req: Optional[GraphRequest] = None,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """Retrieve the nodes and edges filtering by dimensions or types."""
    try:
        # Load all approved nodes
        nodes_q = await session.exec(select(Node).where(Node.status == "approved"))
        nodes = nodes_q.all()
        
        # Load all approved edges
        edges_q = await session.exec(select(Edge).where(Edge.status == "approved"))
        edges = edges_q.all()

        # Apply filtering
        filtered_nodes = nodes
        if req and req.node_types:
            filtered_nodes = [n for n in nodes if n.type in req.node_types]

        node_ids = {n.id for n in filtered_nodes}

        filtered_edges = []
        for e in edges:
            # Verify endpoints exist in filtered set
            if e.source_id in node_ids and e.target_id in node_ids:
                if req and req.dimensions and e.dimension not in req.dimensions:
                    continue
                filtered_edges.append(e)

        return GraphResponse(
            nodes=[
                {
                    "id": str(n.id),
                    "name": n.title,
                    "type": n.type,
                    "metadata": {"summary": n.summary, "content": n.content},
                    "created_at": n.created_at.isoformat() if n.created_at else ""
                }
                for n in filtered_nodes
            ],
            edges=[
                {
                    "id": str(e.id),
                    "source": str(e.from_node),
                    "target": str(e.to_node),
                    "dimension": "structural",
                    "type": e.relationship,
                    "weight": e.weight,
                    "description": "",
                    "created_at": e.created_at.isoformat() if e.created_at else ""
                }
                for e in filtered_edges
            ]
        )
    except Exception as e:
        logger.error(f"Error retrieving subgraph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain")
async def explain_relationship(
    req: ExplainRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """
    Find paths between two nodes, gather relevant evidence, 
    and ask Claude to explain their relation.
    """
    try:
        # Find Node A
        node_a_q = await session.exec(select(Node).where(Node.title == req.node_a_name))
        node_a = node_a_q.first()
        # Find Node B
        node_b_q = await session.exec(select(Node).where(Node.title == req.node_b_name))
        node_b = node_b_q.first()

        if not node_a or not node_b:
            raise HTTPException(status_code=404, detail="One or both nodes not found")

        # Gather evidence chunks for Node A and Node B
        evidence_a_q = await session.exec(select(Evidence).where(Evidence.node_id == node_a.id))
        chunks_a = evidence_a_q.all()
        evidence_a = "\n".join([f"- {c.raw_text[:300]}..." for c in chunks_a])

        evidence_b_q = await session.exec(select(Evidence).where(Evidence.node_id == node_b.id))
        chunks_b = evidence_b_q.all()
        evidence_b = "\n".join([f"- {c.raw_text[:300]}..." for c in chunks_b])

        # Fetch direct paths between A and B
        edges_q = await session.exec(
            select(Edge).where(
                ((Edge.from_node == node_a.id) & (Edge.to_node == node_b.id)) |
                ((Edge.from_node == node_b.id) & (Edge.to_node == node_a.id))
            )
        )
        edges = edges_q.all()
        direct_paths = []
        for e in edges:
            direct_paths.append(
                f"- Connection: {req.node_a_name} -> {req.node_b_name} | Relation: {e.relationship}"
            )
        paths_text = "\n".join(direct_paths) if direct_paths else "- No direct edges between them, searching graph paths."

        # Prompt Claude to explain relationship
        system_prompt = "You are Metaphor's Context Explainer. You translate graph database paths and source evidence into human explanations."
        
        prompt = (
            f"Please explain how '{node_a.title}' ({node_a.type}) relates to '{node_b.title}' ({node_b.type}) in the user's workspace.\n\n"
            f"Graph Path Context:\n"
            f"{paths_text}\n\n"
            f"Evidence supporting '{node_a.title}':\n"
            f"{evidence_a or '- No direct evidence text stored.'}\n\n"
            f"Evidence supporting '{node_b.title}':\n"
            f"{evidence_b or '- No direct evidence text stored.'}\n\n"
            f"Synthesize this context. Explain: \n"
            f"1. The causal or chronological chain of connection (how they relate in time, e.g., meetings, commits, ideas).\n"
            f"2. The logical/structural relationship (projects, people).\n"
            f"3. What this connection actually means for the founder."
        )

        explanation = await llm_provider.query_llm(prompt=prompt, system_prompt=system_prompt)
        
        return {
            "node_a": node_a.title,
            "node_b": node_b.title,
            "explanation": explanation
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error explaining relationship: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/history", response_model=HistoryResponse)
async def get_history(
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    """
    Returns a chronological sequence of temporal nodes and edges representing 
    the evolution of decisions, ideas, meetings, commits, and feedback.
    """
    try:
        # Load all nodes of event/decision types
        event_types = ["Meeting", "Idea", "Decision", "Commit", "Feedback"]
        nodes_q = await session.exec(select(Node).where(Node.type.in_(event_types)))
        nodes = nodes_q.all()

        # Load all temporal edges
        edges_q = await session.exec(select(Edge).where(Edge.dimension == "temporal"))
        edges = edges_q.all()

        # Build list of items with dates
        timeline = []
        for n in nodes:
            # Look for a start_time or date in metadata, fallback to created_at
            meta = n.metadata_json or {}
            date_str = meta.get("date") or meta.get("start_time") or meta.get("created_at")
            
            # Try parsing or fallback
            event_date = n.created_at
            if date_str:
                try:
                    # Strip Z and load
                    if date_str.endswith("Z"):
                        date_str = date_str[:-1]
                    event_date = datetime.fromisoformat(date_str)
                except Exception:
                    pass

            timeline.append({
                "id": str(n.id),
                "name": n.title,
                "type": n.type,
                "metadata": meta,
                "date": event_date.isoformat() if event_date else "",
                "display_date": event_date.strftime("%B %d, %Y %H:%M") if event_date else ""
            })

        # Sort timeline chronologically
        timeline.sort(key=lambda x: x["date"])

        # Map temporal relationships
        # For each node, find what temporal edges lead out of it
        for item in timeline:
            outgoing = []
            for e in edges:
                if str(e.from_node) == item["id"]:
                    # Find target node name
                    target_name = "Unknown"
                    for tn in nodes:
                        if str(tn.id) == str(e.to_node):
                            target_name = tn.title
                            break
                    outgoing.append({
                        "target_id": str(e.to_node),
                        "target_name": target_name,
                        "type": e.relationship,
                        "description": ""
                    })
            item["causes"] = outgoing

        return HistoryResponse(timeline=timeline)
    except Exception as e:
        logger.error(f"Error fetching temporal history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Context Inbox Schemas & Routes ───────────────────────────────────────────

class InboxResponse(BaseModel):
    pending_nodes: List[Dict[str, Any]]
    pending_edges: List[Dict[str, Any]]
    clarifications: List[Dict[str, Any]]

class ApproveRequest(BaseModel):
    item_id: str
    item_type: str  # "node" or "edge"

class RejectRequest(BaseModel):
    item_id: str
    item_type: str  # "node" or "edge"

class ResolveRequest(BaseModel):
    clarification_id: str
    selected_option: str

class UnderstandChatRequest(BaseModel):
    conversation: str


@router.get("/inbox", response_model=InboxResponse)
async def get_inbox(
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    try:
        # Load all pending nodes
        nodes_q = await session.exec(select(Node).where(Node.status == "pending"))
        pending_nodes = nodes_q.all()

        # Load all pending edges
        edges_q = await session.exec(select(Edge).where(Edge.status == "pending"))
        pending_edges = edges_q.all()

        # Load all unresolved clarifications
        clar_q = await session.exec(select(Clarification).where(Clarification.resolved == False))
        clarifications = clar_q.all()

        # Serialize pending edges with names
        edges_serialized = []
        for e in pending_edges:
            src_node = await session.get(Node, e.from_node)
            tgt_node = await session.get(Node, e.to_node)
            edges_serialized.append({
                "id": str(e.id),
                "source_id": str(e.from_node),
                "target_id": str(e.to_node),
                "source_name": src_node.title if src_node else "Unknown",
                "target_name": tgt_node.title if tgt_node else "Unknown",
                "dimension": "structural",
                "relationship_type": e.relationship,
                "description": ""
            })

        return InboxResponse(
            pending_nodes=[
                {
                    "id": str(n.id),
                    "name": n.title,
                    "type": n.type,
                    "metadata": {"summary": n.summary, "content": n.content}
                }
                for n in pending_nodes
            ],
            pending_edges=edges_serialized,
            clarifications=[
                {
                    "id": str(c.id),
                    "question_text": c.question_text,
                    "options_json": c.options_json,
                    "created_at": c.created_at.isoformat()
                }
                for c in clarifications
            ]
        )
    except Exception as e:
        logger.error(f"Error fetching inbox items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inbox/approve")
async def approve_inbox_item(
    req: ApproveRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    try:
        item_uuid = uuid.UUID(req.item_id)
        if req.item_type == "node":
            node = await session.get(Node, item_uuid)
            if not node:
                raise HTTPException(status_code=404, detail="Node not found")
            node.status = "approved"
            session.add(node)
        elif req.item_type == "edge":
            edge = await session.get(Edge, item_uuid)
            if not edge:
                raise HTTPException(status_code=404, detail="Edge not found")
            edge.status = "approved"
            session.add(edge)
        else:
            raise HTTPException(status_code=400, detail="Invalid item type")
        
        await session.commit()
        return {"status": "success", "message": f"{req.item_type.capitalize()} approved."}
    except Exception as e:
        logger.error(f"Error approving item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inbox/reject")
async def reject_inbox_item(
    req: RejectRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    try:
        item_uuid = uuid.UUID(req.item_id)
        if req.item_type == "node":
            node = await session.get(Node, item_uuid)
            if not node:
                raise HTTPException(status_code=404, detail="Node not found")
            # Delete associated edges
            edges_q = await session.exec(select(Edge).where(
                (Edge.from_node == item_uuid) | (Edge.to_node == item_uuid)
            ))
            for e in edges_q.all():
                await session.delete(e)
            await session.delete(node)
        elif req.item_type == "edge":
            edge = await session.get(Edge, item_uuid)
            if not edge:
                raise HTTPException(status_code=404, detail="Edge not found")
            await session.delete(edge)
        else:
            raise HTTPException(status_code=400, detail="Invalid item type")

        await session.commit()
        return {"status": "success", "message": f"{req.item_type.capitalize()} rejected and deleted."}
    except Exception as e:
        logger.error(f"Error rejecting item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inbox/resolve")
async def resolve_clarification(
    req: ResolveRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    try:
        clar_uuid = uuid.UUID(req.clarification_id)
        clar = await session.get(Clarification, clar_uuid)
        if not clar:
            raise HTTPException(status_code=404, detail="Clarification not found")
        
        clar.resolved = True
        clar.resolved_answer = req.selected_option
        session.add(clar)

        # Execute structural graph updates if target node IDs exist on the clarification object
        if hasattr(clar, 'target_node_id') and clar.target_node_id:
            from app.services.graph import GraphService
            graph_svc = GraphService(session)
            await graph_svc.classify_node(clar.target_node_id, req.selected_option)

        await session.commit()
        return {"status": "success", "message": "Clarification resolved successfully."}
    except Exception as e:
        logger.error(f"Error resolving clarification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inbox/understand-chat")
async def understand_chat(
    req: UnderstandChatRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key)
):
    try:
        if not req.conversation.strip():
            raise HTTPException(status_code=400, detail="Conversation content cannot be empty.")
        
        chat_log = [{
            "id": f"chat_snippet_{int(datetime.utcnow().timestamp())}",
            "title": "Chat Conversation Snippet",
            "content": req.conversation,
            "source": "chat",
            "metadata": {}
        }]

        report = await reflection_engine.reflect_and_evolve(session, chat_log, status="pending")
        return {
            "status": "success",
            "message": "Conversation understood. Extracted nodes/edges have been staged in the Context Inbox.",
            "report": report
        }
    except Exception as e:
        logger.error(f"Error processing chat understanding: {e}")
        raise HTTPException(status_code=500, detail=str(e))
