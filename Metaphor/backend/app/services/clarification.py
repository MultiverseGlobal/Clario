import uuid
import logging
import json
from typing import List, Dict, Any, Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.graph import Node, Edge
from app.services.graph import GraphService
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

class StructuralAmbiguity:
    def __init__(
        self,
        category: str,  # 'boundary', 'duplicate', 'relationship', 'authority', 'ownership'
        target_nodes: List[Node],
        context_description: str,
        impact: float = 1.0,
        confidence_gap: float = 1.0,
        downstream_effect: float = 1.0
    ):
        self.category = category
        self.target_nodes = target_nodes
        self.context_description = context_description
        self.impact = impact
        self.confidence_gap = confidence_gap
        self.downstream_effect = downstream_effect
        
        category_weights = {
            "boundary": 5.0,
            "duplicate": 4.0,
            "relationship": 3.0,
            "authority": 2.0,
            "ownership": 1.0
        }
        self.weight = category_weights.get(category, 1.0)
        self.information_gain = self.weight * impact * confidence_gap * downstream_effect

class ClarificationEngine:
    """
    Structural Clarification Engine for Metaphor OS.
    Analyzes the indexed graph after source connection to detect and rank
    the highest Information Gain structural ambiguities before conversation.
    """
    def __init__(self, session: AsyncSession):
        self.session = session
        self.graph_service = GraphService(session)

    async def detect_ambiguities(self, org_id: uuid.UUID) -> List[StructuralAmbiguity]:
        """
        Scans the PostgreSQL Node and Edge graph for an organization
        to identify structural uncertainties.
        """
        nodes = await self.graph_service.list_recent_nodes(org_id, limit=100)
        if not nodes:
            return []

        ambiguities: List[StructuralAmbiguity] = []
        
        # 1. Detect Duplicate Candidates (fuzzy title token overlap across different nodes)
        nodes_by_clean_name: Dict[str, List[Node]] = {}
        for n in nodes:
            clean_title = n.title.lower().replace("-", " ").replace("_", " ").strip()
            # Normalize title words
            base_tokens = set(clean_title.split())
            matched = False
            for existing_name, n_list in nodes_by_clean_name.items():
                existing_tokens = set(existing_name.split())
                overlap = base_tokens.intersection(existing_tokens)
                if len(overlap) >= 1 and (len(base_tokens) == 1 or len(existing_tokens) == 1 or len(overlap) / max(len(base_tokens), len(existing_tokens)) >= 0.5):
                    n_list.append(n)
                    matched = True
                    break
            if not matched:
                nodes_by_clean_name[clean_title] = [n]

        for clean_name, dup_group in nodes_by_clean_name.items():
            if len(dup_group) > 1:
                ambiguities.append(
                    StructuralAmbiguity(
                        category="duplicate",
                        target_nodes=dup_group,
                        context_description=f"Discovered multiple entities referencing '{clean_name}': " + ", ".join([f"`{n.title}` ({n.type})" for n in dup_group]),
                        impact=0.9,
                        confidence_gap=0.8,
                        downstream_effect=0.9
                    )
                )

        # 2. Detect Boundary Clarification Candidates (unclassified nodes or top-level product vs repo vs platform)
        unclassified_nodes = [n for n in nodes if not n.type or n.type in ["concept", "entity", "doc", "other"]]
        if len(unclassified_nodes) >= 2:
            ambiguities.append(
                StructuralAmbiguity(
                    category="boundary",
                    target_nodes=unclassified_nodes[:4],
                    context_description="Discovered core entities without defined boundaries: " + ", ".join([f"`{n.title}`" for n in unclassified_nodes[:4]]),
                    impact=1.0,
                    confidence_gap=0.9,
                    downstream_effect=1.0
                )
            )

        # 3. Detect Relationship Clarification Candidates (connected nodes lacking explicit relationship edge)
        if len(nodes) >= 2:
            # Query existing edges
            stmt_edges = select(Edge)
            res_edges = await self.session.execute(stmt_edges)
            edges = res_edges.scalars().all()
            connected_pairs = set((e.from_node, e.to_node) for e in edges).union(set((e.to_node, e.from_node) for e in edges))
            
            top_nodes = sorted(nodes, key=lambda n: len(n.title), reverse=True)[:5]
            for i in range(len(top_nodes)):
                for j in range(i + 1, len(top_nodes)):
                    n1, n2 = top_nodes[i], top_nodes[j]
                    if (n1.id, n2.id) not in connected_pairs:
                        ambiguities.append(
                            StructuralAmbiguity(
                                category="relationship",
                                target_nodes=[n1, n2],
                                context_description=f"Discovered co-occurring entities `{n1.title}` ({n1.summary[:40]}...) and `{n2.title}` ({n2.summary[:40]}...) without an explicit structural relationship.",
                                impact=0.8,
                                confidence_gap=0.7,
                                downstream_effect=0.8
                            )
                        )
                        break

        # Sort ambiguities by Information Gain
        ambiguities.sort(key=lambda a: a.information_gain, reverse=True)
        return ambiguities

    async def generate_clarification_questions(self, org_id: uuid.UUID) -> List[str]:
        """
        Analyzes the graph, ranks ambiguities by Information Gain,
        and generates <= 3 structural clarification questions.
        Enforces strict Question Policy (zero survey / personal questions).
        """
        ambiguities = await self.detect_ambiguities(org_id)
        
        # If no significant structural ambiguity is found or graph is confident, return 0-3 questions
        if not ambiguities:
            logger.info("Graph is structurally confident. Generating 0 clarification questions.")
            return []

        top_ambiguities = ambiguities[:3]
        ambiguity_descriptions = "\n".join([f"- Priority [{a.category.upper()} | Score {a.information_gain:.1f}]: {a.context_description}" for a in top_ambiguities])

        system_prompt = (
            "You are the Metaphor Structural Clarification Engine.\n"
            "Your ONLY objective is to generate precise, single-focused structural clarification questions based on discovered workspace entities.\n\n"
            "STRICT QUESTION POLICY:\n"
            "✓ MUST resolve structural graph uncertainty (entity boundaries, duplicates, relationship types, or authority).\n"
            "✓ MUST ask only ONE clear thing per question.\n"
            "✓ MUST include specific discovered entity names in backticks (e.g., `atlas-core`, `metaphor-os`).\n"
            "❌ NEVER ask about personal preferences, company mission, goals, workflows, biography, or 'tell us about yourself'.\n"
            "❌ NEVER ask generic survey or opinion questions.\n"
            "❌ Output a JSON array of strings containing at most 3 questions."
        )

        prompt = (
            f"Discovered Workspace Ambiguities (Ranked by Information Gain):\n"
            f"{ambiguity_descriptions}\n\n"
            f"Output JSON array of at most 3 structural questions:"
        )

        try:
            response_text = await llm_service.query_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.3)
            clean = response_text.strip()
            if clean.startswith("```json"): clean = clean[7:]
            if clean.startswith("```"): clean = clean[3:]
            if clean.endswith("```"): clean = clean[:-3]
            questions = json.loads(clean.strip())

            if isinstance(questions, list):
                # Filter out any lingering survey questions just in case
                valid_questions = [
                    q for q in questions[:3]
                    if isinstance(q, str) and not any(forbidden in q.lower() for forbidden in ["goal", "mission", "preference", "workflow", "tell us", "yourself", "like to"])
                ]
                return valid_questions
        except Exception as e:
            logger.error(f"Failed to generate structural clarification questions via LLM: {e}")

        # Fallback structural questions if LLM call fails
        fallback_questions = []
        for amb in top_ambiguities:
            names = [f"`{n.title}`" for n in amb.target_nodes]
            if amb.category == "duplicate" and len(names) >= 2:
                fallback_questions.append(f"Do {names[0]} and {names[1]} refer to the same project or different systems?")
            elif amb.category == "boundary" and len(names) >= 2:
                fallback_questions.append(f"Are {', '.join(names[:3])} independent products, internal platforms, or client projects?")
            elif amb.category == "relationship" and len(names) >= 2:
                fallback_questions.append(f"What is the intended structural relationship between {names[0]} and {names[1]}?")

        return fallback_questions[:3]
