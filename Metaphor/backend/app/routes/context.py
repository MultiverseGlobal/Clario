import logging
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from pydantic import BaseModel

from app.database.session import get_session
from app.config import settings
from app.models import Node, Edge, Chunk
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
    Context-as-a-Service endpoint.

    Downstream AIs (William, Atlas, Weave) query this to get an updated,
    narrative-enriched operational mental model of the user's world.
    """
    logger.info(f"[context/snapshot] consumer={req.consumer!r}  intent={req.intent!r}")

    try:
        # ── 1. Pull the approved graph ─────────────────────────────────────
        nodes_q = await session.exec(
            select(Node).where(Node.status == "approved").order_by(desc(Node.updated_at))
        )
        all_nodes: List[Node] = nodes_q.all()

        edges_q = await session.exec(
            select(Edge).where(Edge.status == "approved")
        )
        all_edges: List[Edge] = edges_q.all()

        # ── 2. Partition by type ───────────────────────────────────────────
        by_type: Dict[str, List[Node]] = {}
        for n in all_nodes:
            by_type.setdefault(n.type.lower(), []).append(n)

        projects   = [_serialize_node(n) for n in by_type.get("project",  [])[:10]]
        decisions  = [_serialize_node(n) for n in by_type.get("decision", [])[:10]]
        people     = [_serialize_node(n) for n in by_type.get("person",   [])[:10]]
        commits    = [_serialize_node(n) for n in by_type.get("commit",   [])[:10]]
        ideas      = [_serialize_node(n) for n in by_type.get("idea",     [])[:10]]

        # ── 3. Build Timeline ──────────────────────────────────────────────
        timeline_nodes = [n for n in all_nodes if n.type.lower() in ("meeting", "commit", "decision", "event")]
        temporal_edges = [e for e in all_edges if e.dimension == "temporal"]
        
        timeline = []
        for n in timeline_nodes:
            meta = n.metadata_json or {}
            date_str = meta.get("date") or meta.get("start_time") or meta.get("created_at")
            
            event_date = n.created_at
            if date_str:
                try:
                    if date_str.endswith("Z"):
                        date_str = date_str[:-1]
                    event_date = datetime.fromisoformat(date_str)
                except Exception:
                    pass

            timeline.append({
                "id": str(n.id),
                "name": n.name,
                "type": n.type,
                "metadata": meta,
                "date": event_date.isoformat(),
                "display_date": event_date.strftime("%B %d, %Y %H:%M")
            })

        # Sort timeline chronologically
        timeline.sort(key=lambda x: x["date"])

        # Map temporal relationships
        for item in timeline:
            outgoing = []
            for e in temporal_edges:
                if str(e.source_id) == item["id"]:
                    target_name = "Unknown"
                    for tn in all_nodes:
                        if str(tn.id) == str(e.target_id):
                            target_name = tn.name
                            break
                    outgoing.append({
                        "target_id": str(e.target_id),
                        "target_name": target_name,
                        "type": e.relationship_type,
                        "description": e.metadata_json.get("description", "")
                    })
            item["causes"] = outgoing

        # ── 4. Ask Claude for narrative synthesis (Mission & Constraints) ──
        node_lines = "\n".join(
            f"  [{n.type.upper()}] {n.name}: {json.dumps(n.metadata_json)}"
            for n in all_nodes
        )
        edge_lines = "\n".join(
            f"  {str(e.source_id)[:8]} --[{e.relationship_type}]--> {str(e.target_id)[:8]}"
            for e in all_edges[:30]
        )
        graph_text = f"Nodes:\n{node_lines or '  (none)'}\n\nEdges:\n{edge_lines or '  (none)'}"

        system_prompt = (
            "You are the Metaphor Context Operating System. Your role is to synthesise the user's "
            "world model graph into core operational context for downstream AI agents. "
            "Respond STRICTLY in JSON format with keys: 'mission', 'constraints', and 'recommended_focus'. "
            "Do not hallucinate. Use only the provided data."
        )
        user_prompt = (
            f"Consumer: {req.consumer}\n"
            f"Intent: {req.intent}\n\n"
            f"Current Approved World Model Graph:\n{graph_text}\n\n"
            f"Synthesize the overarching mission, context constraints/rules, and recommended focus for this AI agent."
        )

        mission = ""
        constraints = []
        recommended_focus = ""
        is_partial = False
        error_message = None
        
        try:
            llm_response = await llm_provider.query_llm(
                system_prompt=system_prompt,
                prompt=user_prompt,
                max_tokens=512,
            )
            clean_res = llm_response.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:]
            if clean_res.endswith("```"):
                clean_res = clean_res[:-3]
            data = json.loads(clean_res)
            mission = data.get("mission", "")
            constraints = data.get("constraints", [])
            recommended_focus = data.get("recommended_focus", "")
        except Exception as llm_err:
            logger.warning(f"LLM context snapshot synthesis failed: {llm_err}.")
            is_partial = True
            error_message = f"LLM synthesis failed: {str(llm_err)}"

        # ── 5. Calculate Confidence (Context Health) ──────────────────────
        active_integrations = 0
        if settings.NOTION_INTEGRATION_TOKEN: active_integrations += 1
        if settings.GITHUB_PERSONAL_ACCESS_TOKEN: active_integrations += 1
        if settings.GOOGLE_SERVICE_ACCOUNT_JSON_PATH: active_integrations += 1
        
        confidence = 0.70 + (active_integrations * 0.08)
        if len(all_nodes) > 8:
            confidence += 0.05
        confidence = min(max(confidence, 0.50), 0.98)

        return SnapshotResponse(
            mission=mission,
            active_projects=projects,
            recent_decisions=decisions,
            constraints=constraints,
            timeline=timeline,
            recommended_focus=recommended_focus,
            confidence=round(confidence, 2),
            is_partial=is_partial,
            error_message=error_message
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

        # Search matching chunks
        chunks_q = await session.exec(select(Chunk).limit(req.top_k))
        all_chunks = chunks_q.all()
        matching_chunks = [
            {
                "id": str(c.id),
                "content": c.text_content[:300],
                "metadata": c.metadata_json
            }
            for c in all_chunks
            if query_lower in c.text_content.lower()
        ][:req.top_k]

        # Synthesize answer using Claude
        node_context = json.dumps(matching_nodes, indent=2)
        chunk_context = json.dumps(matching_chunks, indent=2)

        synth_prompt = (
            f"Query: {req.query}\n\n"
            f"Matched Graph Nodes:\n{node_context}\n\n"
            f"Matched Text Evidence:\n{chunk_context}\n\n"
            f"Answer the query accurately based on the context above."
        )

        try:
            answer = await llm_provider.query_llm(
                prompt=synth_prompt,
                system_prompt="You are the Metaphor Context Operating System. Answer concisely.",
                max_tokens=256
            )
        except Exception:
            answer = f"Found {len(matching_nodes)} matching entities and {len(matching_chunks)} evidence chunks for query: '{req.query}'."

        return ContextQueryResponse(
            query=req.query,
            relevant_nodes=matching_nodes,
            relevant_chunks=matching_chunks,
            synthesized_answer=answer.strip()
        )
    except Exception as e:
        logger.error(f"[context/query] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Context query failed: {str(e)}")

