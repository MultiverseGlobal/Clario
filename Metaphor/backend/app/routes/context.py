import logging
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from pydantic import BaseModel

from app.database.session import get_session
from app.core.config import settings
from app.models import Node, Edge, Evidence
from app.provider import llm_provider

logger = logging.getLogger("metaphor.routes.context")
router = APIRouter()


# ── Auth ────────────────────────────────────────────────────────────────────
async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != settings.METAPHOR_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")
    return x_api_key


# ── Schemas ──────────────────────────────────────────────────────────────────
class SnapshotRequest(BaseModel):
    """
    A machine-callable request for a tailored context snapshot.
    """
    consumer: str = "general"
    intent: str = "general"
    filters: Optional[Dict[str, Any]] = None


class SnapshotResponse(BaseModel):
    mission: str
    active_projects: List[Dict[str, Any]]
    recent_decisions: List[Dict[str, Any]]
    constraints: List[str]
    timeline: List[Dict[str, Any]]
    recommended_focus: str
    confidence: float
    is_partial: bool = False
    error_message: Optional[str] = None


class ContextQueryRequest(BaseModel):
    query: str
    consumer: str = "general"
    top_k: int = 5
    entity_types: Optional[List[str]] = None


class ContextQueryResponse(BaseModel):
    query: str
    relevant_nodes: List[Dict[str, Any]]
    relevant_chunks: List[Dict[str, Any]]
    synthesized_answer: str


# ── Helpers ──────────────────────────────────────────────────────────────────
def _serialize_node(n: Node) -> Dict[str, Any]:
    return {
        "id": str(n.id),
        "name": n.name,
        "type": n.type,
        "metadata": n.metadata_json,
        "created_at": n.created_at.isoformat(),
        "updated_at": n.updated_at.isoformat(),
    }


def _serialize_edge(e: Edge) -> Dict[str, Any]:
    return {
        "id": str(e.id),
        "source": str(e.source_id),
        "target": str(e.target_id),
        "dimension": e.dimension,
        "relationship_type": e.relationship_type,
    }


# ── Route ────────────────────────────────────────────────────────────────────
@router.post("/context/snapshot", response_model=SnapshotResponse)
async def get_context_snapshot(
    req: SnapshotRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key),
):
    """
    Context-as-a-Service endpoint. (Phase 5 Orchestrated)
    """
    logger.info(f"[context/snapshot] consumer={req.consumer!r}  intent={req.intent!r}")

    try:
        from app.services.orchestration import ContextOrchestrator
        from app.models.orchestration import ContextRequest
        from app.services.retrieval import RetrievalScope
        
        # Hardcode a default Org for legacy requests that don't pass identity properly.
        # In a real system this comes from Auth. For tests, we use the first org or a fixed one.
        from app.models.identity import Organization
        org = (await session.execute(select(Organization))).scalars().first()
        if not org:
            raise HTTPException(status_code=400, detail="No organization found for context.")
        
        scope = RetrievalScope(
            consumer_id=org.id, # Mocking consumer_id as org.id for now
            organization_id=org.id,
            allowed_scopes=["global"]
        )

        orchestrator = ContextOrchestrator(session)
        
        # Build ContextRequest
        context_req = ContextRequest(
            objective=req.intent, # Use intent as objective
            consumer=req.consumer,
        )
        
        # Orchestrate!
        package = await orchestrator.orchestrate(context_req, scope)
        
        # Map back to SnapshotResponse for backwards compatibility
        mission = ""
        constraints = []
        recommended_focus = ""
        
        for ins in package.insights:
            if ins["type"].lower() == "mission" and not mission:
                mission = ins["content"]
            elif ins["type"].lower() == "constraint":
                constraints.append(ins["content"])
            elif ins["type"].lower() in ["priority", "recommended_focus"] and not recommended_focus:
                recommended_focus = ins["content"]
                
        if not mission:
            mission = "Maintain current priorities."
            
        # Build timeline from history & tasks & decisions
        timeline = []
        for n in package.history + package.decisions:
            meta = n.get("metadata", {}) or {}
            timeline.append({
                "id": str(n["id"]),
                "name": n["title"],
                "type": n["type"],
                "metadata": meta,
                "date": n.get("created_at") or meta.get("date") or "2026-01-01T00:00:00",
                "display_date": "Historical Event"
            })
            
        timeline.sort(key=lambda x: x["date"])

        confidence = 0.85 # Simplified for Orchestrator

        return SnapshotResponse(
            mission=mission,
            active_projects=package.current_state[:10],
            recent_decisions=package.decisions[:10],
            constraints=constraints,
            timeline=timeline,
            recommended_focus=recommended_focus,
            confidence=confidence,
            is_partial=False,
            error_message=None
        )

    except Exception as e:
        logger.error(f"[context/snapshot] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Context snapshot failed: {str(e)}")


@router.post("/context/query", response_model=ContextQueryResponse)
async def query_context(
    req: ContextQueryRequest,
    session: AsyncSession = Depends(get_session),
    api_key: str = Depends(verify_api_key),
):
    """
    Query Metaphor's Context Engine using semantic graph search.
    Allows William, Atlas, and external agents to query state by keyword/intent.
    """
    logger.info(f"[context/query] consumer={req.consumer!r} query={req.query!r}")
    try:
        # Search matching nodes
        nodes_q = await session.exec(
            select(Node).where(Node.status == "approved")
        )
        all_nodes = nodes_q.all()

        query_lower = req.query.lower()
        matching_nodes = [
            _serialize_node(n) for n in all_nodes
            if query_lower in n.name.lower() or query_lower in n.type.lower() or query_lower in str(n.metadata_json).lower()
        ][:req.top_k]

        # Search matching evidence
        evidence_q = await session.exec(select(Evidence).limit(req.top_k))
        all_evidence = evidence_q.all()
        matching_evidence = [
            {
                "id": str(e.id),
                "content": e.raw_text[:300],
                "source": e.source
            }
            for e in all_evidence
            if query_lower in e.raw_text.lower()
        ][:req.top_k]

        # Synthesize answer using Claude
        node_context = json.dumps(matching_nodes, indent=2)
        evidence_context = json.dumps(matching_evidence, indent=2)

        synth_prompt = (
            f"Query: {req.query}\n\n"
            f"Matched Graph Nodes:\n{node_context}\n\n"
            f"Matched Text Evidence:\n{evidence_context}\n\n"
            f"Answer the query accurately based on the context above."
        )

        try:
            answer = await llm_provider.query_llm(
                prompt=synth_prompt,
                system_prompt="You are the Metaphor Context Operating System. Answer concisely.",
                max_tokens=256
            )
        except Exception:
            answer = f"Found {len(matching_nodes)} matching entities and {len(matching_evidence)} evidence blocks for query: '{req.query}'."

        return ContextQueryResponse(
            query=req.query,
            relevant_nodes=matching_nodes,
            relevant_chunks=matching_evidence,
            synthesized_answer=answer.strip()
        )
    except Exception as e:
        logger.error(f"[context/query] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Context query failed: {str(e)}")

