"""
Metaphor Context Package Builder

This module defines the Context Package schema — the atomic unit of value
that Metaphor delivers to any AI consumer. When an AI requests context,
Metaphor does not return raw memories. It returns a structured, prioritized,
relevance-scored document that any model can immediately consume.
"""
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ── Schema ───────────────────────────────────────────────────────────────────

class IdentityModel(BaseModel):
    name: str = "William"
    mission: str = "Build Multiverse Global Enterprises"
    writing_style: str = "Direct, technical, concise. Avoids jargon unless domain-specific."
    preferred_terminology: Dict[str, List[str]] = Field(default_factory=lambda: {
        "do_use": ["Context Engine", "Knowledge Graph", "Identity Model"],
        "do_not_use": ["Second Brain", "Digital Twin", "Lore"]
    })


class ActiveObjective(BaseModel):
    goal: str
    confidence: float = 0.85
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    why: str = "Inferred from recent conversations."


class KeyDecision(BaseModel):
    decision: str
    date: str
    confidence: float = 0.80


class RelevantProject(BaseModel):
    name: str
    status: str = "active"
    relevance_score: float
    summary: str = ""
    key_decisions: List[KeyDecision] = Field(default_factory=list)


class RelevantMemory(BaseModel):
    memory_id: str = Field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:8]}")
    type: str  # decision | belief | preference | constraint | goal | relationship
    content: str
    source: str = "metaphor"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    relevance_score: float = 0.0
    why_relevant: str = ""


class PackageMetadata(BaseModel):
    total_memories_searched: int = 0
    memories_returned: int = 0
    compression_ratio: str = "0:0"
    processing_time_ms: int = 0


class ContextPackage(BaseModel):
    """
    The atomic unit of value Metaphor delivers to any AI consumer.
    """
    schema_version: str = "1.0"
    package_id: str = Field(default_factory=lambda: f"cpkg_{uuid.uuid4().hex[:8]}")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    requesting_client: str = "unknown"
    query_context: str = ""

    identity: IdentityModel = Field(default_factory=IdentityModel)
    active_objective: Optional[ActiveObjective] = None
    relevant_projects: List[RelevantProject] = Field(default_factory=list)
    relevant_memories: List[RelevantMemory] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    metadata: PackageMetadata = Field(default_factory=PackageMetadata)


# ── Builder ──────────────────────────────────────────────────────────────────

def build_context_package(
    query: str,
    nodes: list,
    edges: list,
    chunks: list,
    requesting_client: str = "mcp",
    token_budget: int = 4000,
) -> ContextPackage:
    """
    Builds a ContextPackage from the existing graph data.
    This is the bridge between the current Metaphor backend (Nodes, Edges, Chunks)
    and the new Context Package schema.
    """
    import time
    start = time.time()

    # ── 1. Partition nodes by type ────────────────────────────────────────
    by_type: Dict[str, list] = {}
    for n in nodes:
        by_type.setdefault(n.type.lower(), []).append(n)

    # ── 2. Extract Projects ───────────────────────────────────────────────
    projects = []
    for n in by_type.get("project", []):
        decisions = []
        for d in by_type.get("decision", []):
            meta = d.metadata_json or {}
            if _is_related(n, d, edges):
                decisions.append(KeyDecision(
                    decision=d.name,
                    date=d.created_at.strftime("%Y-%m-%d") if hasattr(d.created_at, 'strftime') else str(d.created_at),
                    confidence=meta.get("confidence", 0.80)
                ))

        projects.append(RelevantProject(
            name=n.name,
            status=n.metadata_json.get("status", "active") if n.metadata_json else "active",
            relevance_score=_score_relevance(query, n),
            summary=n.metadata_json.get("description", "") if n.metadata_json else "",
            key_decisions=decisions[:5]
        ))

    # Sort by relevance
    projects.sort(key=lambda p: p.relevance_score, reverse=True)
    projects = projects[:5]

    # ── 3. Extract Memories (all non-project, non-person nodes) ───────────
    memory_types_map = {
        "decision": "decision",
        "idea": "belief",
        "goal": "goal",
        "constraint": "constraint",
        "note": "belief",
    }
    memories = []
    for node_type, memory_type in memory_types_map.items():
        for n in by_type.get(node_type, []):
            score = _score_relevance(query, n)
            if score > 0.3:  # Only include somewhat relevant memories
                memories.append(RelevantMemory(
                    type=memory_type,
                    content=n.name,
                    source=n.metadata_json.get("source", "metaphor") if n.metadata_json else "metaphor",
                    created_at=n.created_at.isoformat() if hasattr(n.created_at, 'isoformat') else str(n.created_at),
                    relevance_score=score,
                    why_relevant=f"Matched query terms in {node_type} node."
                ))

    # Sort by relevance, take top memories
    memories.sort(key=lambda m: m.relevance_score, reverse=True)
    memories = memories[:10]

    # ── 4. Extract Constraints ────────────────────────────────────────────
    constraints = [n.name for n in by_type.get("constraint", [])]

    # ── 5. Infer Active Objective ─────────────────────────────────────────
    active_objective = None
    goals = by_type.get("goal", [])
    if goals:
        top_goal = goals[0]
        active_objective = ActiveObjective(
            goal=top_goal.name,
            confidence=0.85,
            last_updated=top_goal.updated_at.isoformat() if hasattr(top_goal.updated_at, 'isoformat') else str(top_goal.updated_at),
            why=f"Most recent goal node in the knowledge graph."
        )

    # ── 6. Metadata ──────────────────────────────────────────────────────
    total_searched = len(nodes)
    total_returned = len(memories)
    compression = f"{total_searched}:{total_returned}" if total_returned > 0 else "0:0"
    elapsed_ms = int((time.time() - start) * 1000)

    return ContextPackage(
        requesting_client=requesting_client,
        query_context=query,
        active_objective=active_objective,
        relevant_projects=projects,
        relevant_memories=memories,
        constraints=constraints,
        metadata=PackageMetadata(
            total_memories_searched=total_searched,
            memories_returned=total_returned,
            compression_ratio=compression,
            processing_time_ms=elapsed_ms,
        )
    )


# ── Scoring Utilities ────────────────────────────────────────────────────────

def _score_relevance(query: str, node) -> float:
    """
    Simple keyword-based relevance scoring.
    In production, this will use cosine similarity on vector embeddings.
    """
    if not query:
        return 0.5

    query_tokens = set(query.lower().split())
    name_tokens = set(node.name.lower().split())
    meta_str = json.dumps(node.metadata_json or {}).lower()

    # Direct name match
    overlap = query_tokens & name_tokens
    name_score = len(overlap) / max(len(query_tokens), 1)

    # Metadata match
    meta_score = sum(1 for t in query_tokens if t in meta_str) / max(len(query_tokens), 1)

    return min(round(name_score * 0.7 + meta_score * 0.3, 2), 1.0)


def _is_related(node_a, node_b, edges) -> bool:
    """Check if two nodes are connected by any edge."""
    a_id = str(node_a.id)
    b_id = str(node_b.id)
    for e in edges:
        if (str(e.source_id) == a_id and str(e.target_id) == b_id) or \
           (str(e.source_id) == b_id and str(e.target_id) == a_id):
            return True
    return False
