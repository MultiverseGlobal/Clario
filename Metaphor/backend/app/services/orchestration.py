import logging
import json
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc

from app.models.orchestration import (
    ContextRequest,
    IntentMode,
    ContextPlan,
    ContextPackage,
    ContextViewPreferences,
)
from app.models.graph import Node, Edge, Evidence
from app.models.task_handoff import TaskHandoff
from app.models.insight import ContextInsight
from app.services.retrieval import RetrievalService, RetrievalScope
from app.services.llm import llm_service
from app.provider import llm_provider

logger = logging.getLogger("metaphor.services.orchestration")


class ContextOrchestrator:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.retrieval_service = RetrievalService(session)

    async def orchestrate(self, request: ContextRequest, scope: RetrievalScope) -> ContextPackage:
        """
        Main entry point for Context Orchestration (Phase 5).
        """
        logger.info(f"Orchestrating context for objective='{request.objective}' consumer='{request.consumer}'")

        # 1. Intent Classification
        intent = await self._classify_intent(request)
        logger.info(f"Classified intent: {intent}")

        # 2. Context Planning
        plan = self._generate_context_plan(intent)

        # 3. Targeted Retrieval (Pass 1)
        # Gather insights
        insights = await self._retrieve_insights(scope, plan)
        
        # Gather nodes matching the objective (semantic + fallback)
        retrieved_data = await self.retrieval_service.retrieve_context(
            scope=scope,
            query=request.objective,
            limit=15, # Budget constraint initial pass
            include_superseded=False
        )

        raw_nodes = retrieved_data.get("nodes", [])
        
        # 3.5 Bounded Graph Expansion
        # Find edges connected to raw_nodes to bring in closely related context (1 hop)
        expanded_nodes = []
        if raw_nodes and "history" not in plan.excluded: # quick proxy for deep context
            node_ids = [uuid.UUID(n["id"]) for n in raw_nodes]
            stmt_edges = select(Edge).where(Edge.source_id.in_(node_ids) | Edge.target_id.in_(node_ids))
            res_edges = await self.session.execute(stmt_edges)
            edges = res_edges.scalars().all()
            
            related_ids = set()
            for e in edges:
                if e.source_id not in node_ids: related_ids.add(e.source_id)
                if e.target_id not in node_ids: related_ids.add(e.target_id)
                
            if related_ids:
                stmt_related = select(Node).where(Node.id.in_(related_ids)).where(Node.status == "approved")
                res_related = await self.session.execute(stmt_related)
                for n in res_related.scalars().all():
                    # Check if not already in raw_nodes
                    if not any(rn["id"] == str(n.id) for rn in raw_nodes):
                        expanded_nodes.append({
                            "id": str(n.id),
                            "type": n.type,
                            "title": n.title,
                            "summary": n.summary,
                            "content": n.content,
                            "status": n.status,
                            "evidence": []
                        })
        
        all_nodes = raw_nodes + expanded_nodes
        
        # 3.6 Fetch Active Handoffs
        handoffs = await self._fetch_handoffs(scope)

        
        # 4. Context Filtering & Ranking
        # Separate nodes into categories based on plan
        current_state = []
        decisions = []
        constraints = []
        tasks = []
        artifacts = []
        history = []
        
        for node in all_nodes:
            node_type = node.get("type", "").lower()
            if node_type == "decision":
                decisions.append(node)
            elif node_type == "constraint":
                constraints.append(node)
            elif node_type == "task":
                tasks.append(node)
            elif node_type in ["artifact", "document", "code"]:
                artifacts.append(node)
            elif node_type in ["project", "goal", "milestone"]:
                current_state.append(node)
            else:
                history.append(node)

        # 5. Missing Context Detection (Pass 2)
        if "constraints" in plan.required and not constraints:
            # We must have constraints but didn't find any in top N.
            extra_constraints = await self._fetch_by_type(scope, "constraint", limit=3)
            constraints.extend(extra_constraints)
            
        if "decisions" in plan.required and not decisions:
            extra_decisions = await self._fetch_by_type(scope, "decision", limit=3)
            decisions.append(extra_decisions)
            
        if "current_state" in plan.required and not current_state:
            extra_state = await self._fetch_by_type(scope, "project", limit=1)
            current_state.extend(extra_state)
            
        # Add handoffs to tasks or history based on plan
        for h in handoffs:
            handoff_dict = {
                "id": str(h.id),
                "type": "handoff",
                "title": h.title,
                "summary": h.objective,
                "content": h.instructions or h.objective,
                "status": h.status
            }
            tasks.insert(0, handoff_dict) # prioritize handoffs in tasks

        # 6. Context Assembly & View Adaptation
        # View preference filtering based on consumer
        prefs = self._get_consumer_preferences(request.consumer)
        
        package = ContextPackage(
            request=request.model_dump(),
            identity={
                "consumer": request.consumer,
                "organization_id": str(scope.organization_id),
                "workspace_id": str(scope.workspace_id) if scope.workspace_id else None
            },
            current_state=current_state if "current_state" not in prefs.excluded_context else [],
            insights=insights if "insights" not in prefs.excluded_context else [],
            decisions=decisions if "decisions" not in prefs.excluded_context else [],
            constraints=constraints if "constraints" not in prefs.excluded_context else [],
            tasks=tasks if "tasks" not in prefs.excluded_context else [],
            artifacts=artifacts if "artifacts" not in prefs.excluded_context else [],
            history=history if "history" not in prefs.excluded_context else [],
            metadata={
                "intent": intent.value,
                "plan": plan.model_dump(),
                "retrieved_nodes_count": len(raw_nodes),
                "missing_recovered": ("constraints" in plan.required and not constraints) # example stat
            }
        )
        
        return package

    async def _classify_intent(self, request: ContextRequest) -> IntentMode:
        if request.requested_mode:
            return request.requested_mode

        obj_lower = request.objective.lower()
        if "fix" in obj_lower or "bug" in obj_lower or "error" in obj_lower:
            return IntentMode.DEBUGGING
        elif "plan" in obj_lower or "design" in obj_lower or "architecture" in obj_lower:
            return IntentMode.PLANNING
        elif "write" in obj_lower or "post" in obj_lower or "draft" in obj_lower:
            return IntentMode.WRITING
        elif "handoff" in obj_lower:
            return IntentMode.HANDOFF
        elif "status" in obj_lower or "what is" in obj_lower:
            return IntentMode.STATUS
        elif "decide" in obj_lower or "should i" in obj_lower:
            return IntentMode.DECISION
        
        # Fallback to LLM if ambiguous (simplified for performance)
        return IntentMode.EXECUTION

    def _generate_context_plan(self, intent: IntentMode) -> ContextPlan:
        if intent == IntentMode.DEBUGGING:
            return ContextPlan(
                intent=intent,
                required=["current_state", "tasks", "decisions", "artifacts"],
                preferred=["history", "constraints"],
                optional=["insights"],
                excluded=[]
            )
        elif intent == IntentMode.WRITING:
            return ContextPlan(
                intent=intent,
                required=["insights", "current_state"],
                preferred=["artifacts"],
                optional=["history"],
                excluded=["tasks", "decisions"]
            )
        elif intent == IntentMode.PLANNING:
            return ContextPlan(
                intent=intent,
                required=["insights", "constraints", "decisions", "current_state"],
                preferred=["tasks"],
                optional=["history"],
                excluded=[]
            )
        # Default Execution
        return ContextPlan(
            intent=intent,
            required=["current_state", "tasks"],
            preferred=["decisions", "constraints", "insights"],
            optional=["artifacts", "history"],
            excluded=[]
        )

    async def _retrieve_insights(self, scope: RetrievalScope, plan: ContextPlan) -> List[Dict[str, Any]]:
        # Avoid pulling insights if explicitly excluded
        if "insights" in plan.excluded:
            return []

        stmt = (
            select(ContextInsight)
            .where(ContextInsight.organization_id == scope.organization_id)
            .where(ContextInsight.status == "active")
        )
        if scope.workspace_id and "global" not in scope.allowed_scopes:
            stmt = stmt.where(ContextInsight.workspace_id == scope.workspace_id)

        stmt = stmt.order_by(desc(ContextInsight.updated_at)).limit(10)
        res = await self.session.execute(stmt)
        insights = res.scalars().all()
        
        return [
            {
                "id": str(i.id),
                "type": i.type,
                "content": i.content,
                "confidence": i.confidence
            }
            for i in insights
        ]

    async def _fetch_by_type(self, scope: RetrievalScope, node_type: str, limit: int = 3) -> List[Dict[str, Any]]:
        stmt = (
            select(Node)
            .where(Node.organization_id == scope.organization_id)
            .where(Node.status == "approved")
            .where(Node.type == node_type)
        )
        if scope.workspace_id and "global" not in scope.allowed_scopes:
            stmt = stmt.where(Node.workspace_id == scope.workspace_id)
            
        stmt = stmt.order_by(desc(Node.updated_at)).limit(limit)
        res = await self.session.execute(stmt)
        
        out = []
        for n in res.scalars().all():
            out.append({
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "summary": n.summary,
                "content": n.content,
                "status": n.status,
                "evidence": [] # simplified for secondary fetch
            })
        return out

    def _get_consumer_preferences(self, consumer: str) -> ContextViewPreferences:
        if consumer.lower() == "orion":
            return ContextViewPreferences(
                consumer=consumer,
                preferred_context=["current_state", "tasks", "constraints", "decisions"],
                excluded_context=["history"] # concise execution view
            )
        elif consumer.lower() == "clario":
            return ContextViewPreferences(
                consumer=consumer,
                preferred_context=["insights", "current_state", "artifacts"],
                excluded_context=["tasks", "decisions"] # creative view
            )
        return ContextViewPreferences(consumer=consumer)

    async def _fetch_handoffs(self, scope: RetrievalScope) -> List[TaskHandoff]:
        stmt = (
            select(TaskHandoff)
            .where(TaskHandoff.organization_id == scope.organization_id)
            .where(TaskHandoff.status.in_(["pending", "in_progress"]))
        )
        if scope.workspace_id and "global" not in scope.allowed_scopes:
            stmt = stmt.where(TaskHandoff.workspace_id == scope.workspace_id)
            
        stmt = stmt.order_by(desc(TaskHandoff.updated_at)).limit(5)
        res = await self.session.execute(stmt)
        return res.scalars().all()
