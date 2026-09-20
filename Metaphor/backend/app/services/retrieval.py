import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.graph import Node, Edge, Evidence, Embedding
from app.services.llm import llm_service

logger = logging.getLogger("metaphor.services.retrieval")

from pydantic import BaseModel

class RetrievalScope(BaseModel):
    participant_id: uuid.UUID
    organization_id: uuid.UUID
    workspace_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    allowed_scopes: List[str]

class RetrievalService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def retrieve_context(
        self,
        scope: RetrievalScope,
        query: str,
        limit: int = 20,
        include_superseded: bool = False
    ) -> Dict[str, Any]:
        """
        Unified canonical retrieval pipeline.
        Replaces fragmented context generation across MCP and REST.
        """
        logger.info(f"Retrieving context for participant={scope.participant_id} query='{query}' org={scope.organization_id} workspace={scope.workspace_id}")

        # 1. Semantic Embedding of Query
        query_embedding = None
        try:
            query_embedding = await llm_service.generate_embedding(query)
        except Exception as e:
            logger.warning(f"Failed to embed query: {e}")

        # 2. Hard Constraints Filter
        # PostgreSQL vector similarity search. We want to find nodes in this org.
        # If pgvector isn't available or fails, fallback to standard query.
        nodes = []
        if query_embedding:
            try:
                # Use pgvector distance operator (L2 distance or inner product)
                # Ensure we only fetch nodes belonging to this org
                from sqlalchemy import text
                stmt = (
                    select(Node, Embedding.vector.l2_distance(query_embedding).label("distance"))
                    .join(Embedding, Node.embedding_id == Embedding.id, isouter=True)
                    .where(Node.organization_id == scope.organization_id)
                )

                if not include_superseded:
                    stmt = stmt.where(Node.status != "superseded")
                
                # Scope Filtering
                if "global" not in scope.allowed_scopes and scope.workspace_id:
                    # Very basic boundary: must be global or matching workspace
                    # Real systems might use complex logic, but here we require either global scope or matching workspace
                    stmt = stmt.where(Node.workspace_id == scope.workspace_id)
                elif scope.workspace_id:
                    stmt = stmt.where(Node.workspace_id == scope.workspace_id)

                if scope.project_id:
                    # Future: Traversal or Edge joining. For now, rely on direct association if we have one.
                    pass
                
                stmt = stmt.order_by("distance").limit(limit)
                result = await self.session.execute(stmt)
                
                for row in result.all():
                    node = row[0]
                    nodes.append(node)
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to simple lookup: {e}")
                nodes = await self._fallback_search(scope, query, limit, include_superseded)
        else:
            nodes = await self._fallback_search(scope, query, limit, include_superseded)

        # 3. Gather Provenance & Build Result
        # For each node, attach its evidence
        results = []
        for node in nodes:
            ev_stmt = select(Evidence).where(Evidence.node_id == node.id)
            ev_res = await self.session.execute(ev_stmt)
            evidences = ev_res.scalars().all()

            results.append({
                "id": str(node.id),
                "type": node.type,
                "title": node.title,
                "summary": node.summary,
                "content": node.content,
                "status": node.status,
                "evidence": [
                    {"source": e.source, "url": e.url, "text": e.raw_text[:300]} 
                    for e in evidences
                ]
            })

        from app.services.insight import InsightService
        insight_service = InsightService(self.session)
        insights = await insight_service.get_active_insights(scope)
        
        # Optionally filter insights by query if query is specific, but usually we just include the top active ones
        query_lower = query.lower()
        relevant_insights = [
            {
                "id": str(i.id),
                "type": i.type,
                "content": i.content,
                "origin": i.origin,
                "confidence": i.confidence,
                "source_refs": i.source_refs
            }
            for i in insights if query_lower in i.content.lower() or query_lower in i.type.lower()
        ]
        
        if not relevant_insights and insights:
            # If no text match, just include the most recent active ones
            relevant_insights = [
                {
                    "id": str(i.id),
                    "type": i.type,
                    "content": i.content,
                    "origin": i.origin,
                    "confidence": i.confidence,
                    "source_refs": i.source_refs
                }
                for i in insights[:5]
            ]

        package = {
            "query": query,
            "participant_id": str(scope.participant_id),
            "workspace_id": str(scope.workspace_id) if scope.workspace_id else None,
            "results_count": len(results),
            "nodes": results,
            "insights": relevant_insights,
            "status": "success" if results or relevant_insights else "no_results"
        }
        
        return package

    async def _fallback_search(
        self, 
        scope: RetrievalScope, 
        query: str, 
        limit: int, 
        include_superseded: bool
    ) -> List[Node]:
        stmt = select(Node).where(Node.organization_id == scope.organization_id)
        
        if scope.workspace_id:
            stmt = stmt.where(Node.workspace_id == scope.workspace_id)
            
        if not include_superseded:
            stmt = stmt.where(Node.status != "superseded")
        stmt = stmt.limit(limit)
        res = await self.session.execute(stmt)
        return res.scalars().all()
