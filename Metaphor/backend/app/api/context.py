from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.session import get_session
from app.services.retrieval import RetrievalService
from app.services.graph import GraphService
from app.services.identity import IdentityService
from app.services.reflection import ReflectionService
from app.core.security import get_user_via_api_key, get_authorized_participant
from app.core.rate_limiter import llm_rate_limiter
from app.models.identity import User
from app.models.operations import WebhookEvent
from app.services.llm import llm_service

router = APIRouter()

class ContextRequest(BaseModel):
    query: str
    ai_participant: str = "claude"

class LoreRequest(BaseModel):
    content: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None

class AnalyzeDraftRequest(BaseModel):
    answers: List[Dict[str, Any]]


@router.post("/query")
async def query_context(req: ContextRequest, participant: Any = Depends(get_authorized_participant), db: AsyncSession = Depends(get_session), _rate_limit: bool = Depends(llm_rate_limiter)):
    from app.services.retrieval import RetrievalScope
    
    scope = RetrievalScope(
        participant_id=participant.id,
        organization_id=participant.organization_id,
        workspace_id=participant.workspace_id,
        allowed_scopes=participant.allowed_scopes
    )
    
    retrieval = RetrievalService(db)
    package = await retrieval.retrieve_context(scope, req.query)
    return package

@router.post("/analyze-draft")
async def analyze_draft(req: AnalyzeDraftRequest, current_user: User = Depends(get_user_via_api_key), db: AsyncSession = Depends(get_session), _rate_limit: bool = Depends(llm_rate_limiter)):
    graph = GraphService(db)
    reflection = ReflectionService(graph)
    result = await reflection.analyze_interview(req.answers)
    return result

@router.post("/chat")
async def chat_with_context(req: ContextRequest, current_user: User = Depends(get_user_via_api_key), participant: Any = Depends(get_authorized_participant), db: AsyncSession = Depends(get_session), _rate_limit: bool = Depends(llm_rate_limiter)):
    """Powers the Playground UI by simulating a Participant AI that uses Metaphor Context."""
    from app.services.retrieval import RetrievalScope
    
    identity = IdentityService(db)
    org = await identity.get_user_organization(current_user.id) or await identity.get_or_create_default_organization()
    
    scope = RetrievalScope(
        participant_id=participant.id,
        organization_id=participant.organization_id,
        workspace_id=participant.workspace_id,
        allowed_scopes=participant.allowed_scopes
    )
    
    retrieval = RetrievalService(db)
    
    # 1. Pull the context package from Metaphor
    package_json = await retrieval.retrieve_context(scope, req.query)
    
    # If no vector nodes matched, fetch top workspace nodes as fallback context
    if package_json.get("status") == "no_results" or not package_json.get("nodes"):
        try:
            from sqlmodel import select
            from app.models.graph import Node
            stmt = select(Node).where(Node.organization_id == scope.organization_id)
            if scope.workspace_id:
                stmt = stmt.where(Node.workspace_id == scope.workspace_id)
            stmt = stmt.limit(10)
            res = await db.execute(stmt)
            fallback_nodes = res.scalars().all()
            if fallback_nodes:
                package_json["nodes"] = [
                    {"id": str(n.id), "type": n.type, "title": n.title, "summary": n.summary, "source": "workspace"}
                    for n in fallback_nodes
                ]
                package_json["status"] = "matched"
                package_json["results_count"] = len(fallback_nodes)
        except Exception as e:
            print("Fallback node query error:", e)


    # 2. Build a rich system prompt with user identity & graph context
    user_display = current_user.name if current_user.name and current_user.name not in ["Supabase User", "Developer User"] else current_user.email
    
    system_prompt = f"""
    You are Metaphor Context Engine AI Assistant.
    Authenticated User: {user_display} ({current_user.email})
    Organization Workspace: {org.name}
    
    Retrieved Context Package:
    {package_json}
    
    User Query: {req.query}
    
    Provide a helpful, precise, conversational answer directly addressing the user's question using the workspace context above. If asked who they are, state their name ({user_display}) and organization ({org.name}).
    """
    
    # 3. Generate response using the underlying LLM Service
    try:
        answer = await llm_service.query_llm(system_prompt)
        if not answer or answer.startswith("Based on the provided context"):
            if "who" in req.query.lower() or "me" in req.query.lower() or "i" in req.query.lower():
                answer = f"You are **{user_display}** (`{current_user.email}`), authenticated in the **{org.name}** workspace on Metaphor OS."
            elif package_json.get("evidence"):
                item_names = ", ".join(f"**{item['title']}**" for item in package_json["evidence"][:3])
                answer = f"In your **{org.name}** workspace, I can see {len(package_json['evidence'])} indexed context nodes, including {item_names}."
            else:
                answer = f"I searched your **{org.name}** workspace, but haven't ingested any matching nodes for '{req.query}' yet."
    except Exception as e:
        answer = f"You are **{user_display}** in the **{org.name}** workspace."
    
    return {
        "answer": answer,
        "context": package_json
    }


@router.get("/models")
async def get_context_models(current_user: User = Depends(get_user_via_api_key), db: AsyncSession = Depends(get_session)):
    """Returns active context models (partitions) and live metrics for the organization."""
    identity = IdentityService(db)
    org = await identity.get_user_organization(current_user.id) or await identity.get_or_create_default_organization()
    
    # Query node counts by type
    from sqlmodel import select, func
    from app.models.graph import Node, ContextModel
    
    stmt = select(Node.type, func.count(Node.id)).where(Node.organization_id == org.id).group_by(Node.type)
    res = await db.execute(stmt)
    counts = dict(res.all())
    
    total_nodes = sum(counts.values())
    
    # Get custom models
    model_stmt = select(ContextModel).where(ContextModel.organization_id == org.id)
    model_res = await db.execute(model_stmt)
    custom_models = model_res.scalars().all()
    
    results = [
        {
            "id": "global",
            "name": "Global Identity",
            "description": "Your default primary context model. Applies to all generalized AI queries.",
            "nodes": total_nodes,
            "isDefault": True,
            "lastSync": "Just now"
        },
        {
            "id": "engineering",
            "name": "Software Engineering & Architecture",
            "description": "Strict technical context. Heavily weighted towards codebase constraints, decisions, and system design.",
            "nodes": counts.get("Project", 0) + counts.get("Constraint", 0),
            "isDefault": False,
            "lastSync": "Active"
        },
        {
            "id": "operations",
            "name": "Operations & Product Goals",
            "description": "Optimized for strategic planning. Focuses on active goals, roadmap items, and team commitments.",
            "nodes": counts.get("Goal", 0) + counts.get("Preference", 0),
            "isDefault": False,
            "lastSync": "Active"
        }
    ]
    
    for m in custom_models:
        # Calculate nodes based on types
        types = [t.strip().capitalize() for t in m.node_types.split(",")]
        m_nodes = sum(counts.get(t, 0) for t in types)
        
        results.append({
            "id": str(m.id),
            "name": m.name,
            "description": m.description,
            "nodes": m_nodes,
            "isDefault": m.is_default,
            "lastSync": "Active"
        })
        
    return results

class ContextModelCreate(BaseModel):
    name: str
    description: str
    node_types: str

@router.post("/models")
async def create_context_model(req: ContextModelCreate, current_user: User = Depends(get_user_via_api_key), db: AsyncSession = Depends(get_session)):
    identity = IdentityService(db)
    org = await identity.get_user_organization(current_user.id) or await identity.get_or_create_default_organization()
    
    from app.models.graph import ContextModel
    new_model = ContextModel(
        organization_id=org.id,
        name=req.name,
        description=req.description,
        node_types=req.node_types
    )
    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)
    
    return {
        "id": str(new_model.id),
        "name": new_model.name,
        "description": new_model.description,
        "nodes": 0,
        "isDefault": new_model.is_default,
        "lastSync": "Just now"
    }

@router.post("/lore")
async def build_lore(req: LoreRequest, current_user: User = Depends(get_user_via_api_key), db: AsyncSession = Depends(get_session)):
    print("ENTER BUILD LORE")
    try:
        identity = IdentityService(db)
        org = await identity.get_user_organization(current_user.id) or await identity.get_or_create_default_organization()
        print("ORG:", org.id)
        
        graph = GraphService(db)
        reflection = ReflectionService(graph)
        
        event = WebhookEvent(
            provider="metaphor_onboarding",
            event_type="context_setup",
            payload={
                "content": req.content,
                "url": getattr(req, "url", None) or "app://onboarding"
            }
        )
    
        print("CALLING REFLECT AND EVOLVE")
        try:
            import uuid
            w_id = uuid.UUID(req.workspace_id) if req.workspace_id else None
            p_id = uuid.UUID(req.project_id) if req.project_id else None
            result = await reflection.reflect_and_evolve(org.id, event, workspace_id=w_id, project_id=p_id)
            print("RESULT:", result)
            return result
        except Exception as e:
            print("EXCEPTION IN REFLECT AND EVOLVE:", e)
            import traceback
            traceback.print_exc()
            raise e
    except Exception as e:
        print("EXCEPTION IN BUILD LORE:", e)
        import traceback
        traceback.print_exc()
        raise

@router.post("/generate-ambiguities")
async def generate_ambiguities(db: AsyncSession = Depends(get_session)):
    """
    Uses the Structural Clarification Engine to analyze the indexed graph 
    and return <= 3 high-impact structural questions.
    """
    from app.services.clarification import ClarificationEngine
    
    identity = IdentityService(db)
    org = await identity.get_or_create_default_organization()
    
    clarification_engine = ClarificationEngine(db)
    questions = await clarification_engine.generate_clarification_questions(org.id)
    
    return {"questions": questions}


@router.get("/ecosystem")
async def get_ecosystem_status(
    current_user: User = Depends(get_user_via_api_key),
    db: AsyncSession = Depends(get_session)
):
    """
    Returns a unified personal ecosystem snapshot across all Kuro OS products.
    Combines:
      - Atlas pipeline nodes ingested into Metaphor (source='atlas')
      - Active Metaphor goals, decisions, constraints
    Used by William and any dashboard to show live cross-tool status.
    """
    from sqlmodel import select
    from app.models.graph import Node, NodeMetadata

    identity = IdentityService(db)
    org = await identity.get_user_organization(current_user.id) or await identity.get_or_create_default_organization()

    # ── Atlas pipeline nodes (nodes ingested from Atlas) ──────────────────
    atlas_meta_stmt = select(NodeMetadata).where(
        NodeMetadata.key == "pipeline_source",
        NodeMetadata.value == "atlas"
    )
    atlas_meta_res = await db.execute(atlas_meta_stmt)
    atlas_meta_rows = atlas_meta_res.scalars().all()
    atlas_node_ids = [m.node_id for m in atlas_meta_rows]

    atlas_nodes = []
    if atlas_node_ids:
        atlas_stmt = select(Node).where(
            Node.id.in_(atlas_node_ids),
            Node.organization_id == org.id
        ).order_by(Node.updated_at.desc()).limit(10)
        atlas_res = await db.execute(atlas_stmt)
        atlas_nodes = atlas_res.scalars().all()

    # ── Active Metaphor context graph ─────────────────────────────────────
    active_stmt = select(Node).where(
        Node.organization_id == org.id,
        Node.status.in_(["approved", "pending_review"]),
        Node.type.in_(["goal", "constraint", "decision"])
    ).order_by(Node.updated_at.desc()).limit(20)
    active_res = await db.execute(active_stmt)
    active_nodes = active_res.scalars().all()

    active_goals = [n.title for n in active_nodes if n.type == "goal"]
    open_decisions = [n.title for n in active_nodes if n.type == "decision"]
    active_constraints = [n.title for n in active_nodes if n.type == "constraint"]

    # ── Recommended focus heuristic ───────────────────────────────────────
    recommended_focus = "General context processing"
    if active_goals and not open_decisions:
        recommended_focus = f"Develop strategy for: {active_goals[0]}"
    elif open_decisions:
        recommended_focus = f"Resolve open decision: {open_decisions[0]}"
    elif atlas_nodes:
        recommended_focus = f"Review latest Atlas deal: {atlas_nodes[0].title}"

    return {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "atlas": {
            "recent_deal_nodes": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "summary": n.summary,
                    "updated_at": n.updated_at.isoformat() if n.updated_at else None,
                }
                for n in atlas_nodes
            ],
            "deal_count": len(atlas_nodes),
        },
        "metaphor": {
            "active_goals": active_goals,
            "open_decisions": open_decisions,
            "active_constraints": active_constraints,
            "node_count": len(active_nodes),
        },
        "recommended_focus": recommended_focus,
    }
