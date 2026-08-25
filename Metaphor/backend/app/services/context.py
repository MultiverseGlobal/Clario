import json
import uuid
import logging
from typing import Dict, Any, List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.context import ContextSession, ContextPackage
from app.models.graph import Node
from app.services.graph import GraphService
from datetime import datetime

logger = logging.getLogger("metaphor.services.context")

class ContextService:
    def __init__(self, session: AsyncSession, graph_service: GraphService):
        self.session = session
        self.graph = graph_service

    async def get_or_create_session(self, org_id: uuid.UUID, ai_consumer: str, objective: str) -> ContextSession:
        """Finds an active context session for this consumer/objective, or creates one."""
        stmt = select(ContextSession).where(
            ContextSession.organization_id == org_id,
            ContextSession.ai_consumer == ai_consumer,
            ContextSession.objective == objective
        )
        result = await self.session.execute(stmt)
        ctx_session = result.scalar_one_or_none()
        
        if not ctx_session:
            ctx_session = ContextSession(
                organization_id=org_id,
                ai_consumer=ai_consumer,
                objective=objective,
                state={"previously_sent_node_ids": []}
            )
            self.session.add(ctx_session)
            await self.session.commit()
            await self.session.refresh(ctx_session)
            
        return ctx_session

    async def generate_context_package(self, org_id: uuid.UUID, ai_consumer: str, query: str) -> ContextPackage:
        """
        Generates a Context Package. If a Context Session exists, it only sends a delta of new nodes.
        """
        # 1. Resolve Session
        ctx_session = await self.get_or_create_session(org_id, ai_consumer, query)
        
        # 2. Search for relevant nodes via Vector Search
        from app.services.llm import llm_service
        try:
            query_embedding = await llm_service.generate_embedding(query)
            nodes = await self.graph.vector_search(org_id, query_embedding, limit=20)
        except Exception as e:
            print(f"Warning: Failed to generate embeddings or search graph: {e}")
            nodes = []

        
        # 3. Filter out nodes we already sent in this session to reduce token bloat
        previously_sent = set(ctx_session.state.get("previously_sent_node_ids", []))
        
        new_nodes = []
        for node in nodes:
            node_id_str = str(node.id)
            if node_id_str not in previously_sent:
                new_nodes.append(node)
                previously_sent.add(node_id_str)
                
        # 4. Update session state
        ctx_session.state["previously_sent_node_ids"] = list(previously_sent)
        ctx_session.last_active_at = datetime.utcnow()
        self.session.add(ctx_session)
        
        # 5. Build rich, semantic Context Pack JSON payload
        node_summaries = [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "summary": n.summary,
                "source": getattr(n, "source", "workspace")
            }
            for n in new_nodes
        ]

        if not nodes:
            status = "no_results"
            answer_text = "I searched your Metaphor workspace, but found no indexed nodes matching your query."
        else:
            status = "matched"
            answer_text = f"Found {len(new_nodes)} relevant context items in your workspace memory."

        package_json = {
            "status": status,
            "query": query,
            "answer": answer_text,
            "workspace_summary": {
                "total_items_found": len(nodes),
                "new_items_in_context": len(new_nodes),
                "categories": list(set(n.type for n in nodes))
            },
            "evidence": node_summaries,
            "confidence": 0.95 if nodes else 0.0
        }

        
        # 6. Save the package history
        pkg = ContextPackage(
            objective=query,
            package_json=package_json,
            token_count=len(json.dumps(package_json)) # Rough token estimation
        )
        self.session.add(pkg)
        await self.session.commit()
        await self.session.refresh(pkg)
        
        return pkg

    async def generate_decision_package(self, org_id: uuid.UUID, ai_consumer: str, query: str) -> ContextPackage:
        # Specialized query for decisions
        from app.services.llm import llm_service
        from app.models.graph import Evidence, Edge
        
        query_embedding = await llm_service.generate_embedding(query)
        
        # 1. Fetch decision nodes via vector search, then filter to approved decisions
        nodes = await self.graph.vector_search(org_id, query_embedding, limit=20, statuses=["approved"])
        decision_nodes = [n for n in nodes if "decision" in n.type.lower()][:5]

        # 2. Gather Evidence and Edges for each
        enriched_nodes = []
        for n in decision_nodes:
            # Evidence
            ev_stmt = select(Evidence).where(Evidence.node_id == n.id)
            ev_res = await self.session.execute(ev_stmt)
            evidences = ev_res.scalars().all()

            # Alternatives (edges pointing to other nodes with relationship 'alternative')
            alt_stmt = select(Edge).where(Edge.from_node == n.id, Edge.relationship == "alternative")
            alt_res = await self.session.execute(alt_stmt)
            alts = alt_res.scalars().all()
            
            # Follow-ups/outcomes
            out_stmt = select(Edge).where(Edge.from_node == n.id, Edge.relationship == "outcome")
            out_res = await self.session.execute(out_stmt)
            outs = out_res.scalars().all()

            enriched_nodes.append({
                "id": str(n.id),
                "title": n.title,
                "reasoning": n.reasoning,
                "decided_at": n.decided_at.isoformat() if n.decided_at else None,
                "evidence": [{"source": e.source, "url": e.url, "text": e.raw_text[:200]} for e in evidences],
                "alternatives_count": len(alts),
                "outcomes_count": len(outs)
            })

        package_json = {
            "status": "matched" if enriched_nodes else "no_results",
            "query": query,
            "answer": "Here is the reasoning trail for the decisions related to your query.",
            "decisions": enriched_nodes
        }

        pkg = ContextPackage(
            objective=query,
            package_json=package_json,
            token_count=len(json.dumps(package_json))
        )
        self.session.add(pkg)
        await self.session.commit()
        await self.session.refresh(pkg)
        
        return pkg

    async def index_chat_drop(
        self,
        org_id: uuid.UUID,
        chat_session_id: uuid.UUID,
        source_model: str,
        session_title: str,
        summary: str,
        active_files: List[str]
    ) -> Node:
        """
        Indexes an explicit chat drop directly into the Graph as a Node with status='approved' and source_type='chat_drop'.
        Bypasses Reflection Engine review gate since this is an explicit human-directed write.
        """
        from app.models.graph import Node, NodeMetadata, Edge
        from sqlmodel import select

        node_title = f"[{source_model.upper()}] {session_title}"
        payload_content = json.dumps({
            "chat_session_id": str(chat_session_id),
            "source_model": source_model,
            "summary": summary,
            "active_files": active_files
        })

        node = Node(
            organization_id=org_id,
            type="chat_session",
            title=node_title,
            summary=summary[:500],
            content=payload_content,
            confidence=1.0,
            status="approved" # Auto-approved with audit trail — explicit user action
        )
        self.session.add(node)
        await self.session.flush()

        # Add explicit metadata distinguishing this as a chat_drop
        meta_source = NodeMetadata(node_id=node.id, key="source_type", value="chat_drop")
        meta_model = NodeMetadata(node_id=node.id, key="source_model", value=source_model)
        self.session.add(meta_source)
        self.session.add(meta_model)

        # Connect to any active project node in the organization if present
        stmt_proj = select(Node).where(Node.organization_id == org_id, Node.type == "project").limit(1)
        res_proj = await self.session.execute(stmt_proj)
        proj_node = res_proj.scalars().first()
        if proj_node:
            edge = Edge(
                from_node=node.id,
                to_node=proj_node.id,
                relation="SESSION_CONTEXT_FOR"
            )
            self.session.add(edge)

        await self.session.commit()
        await self.session.refresh(node)
        return node
