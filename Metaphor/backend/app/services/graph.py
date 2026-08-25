import uuid
from typing import List, Optional, Dict
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.graph import Node, NodeMetadata, Edge, Evidence
from datetime import datetime

class GraphService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_node(
        self, 
        org_id: uuid.UUID, 
        type: str, 
        title: str, 
        summary: str, 
        content: str, 
        metadata: Dict[str, str] = None, 
        embedding_vector: List[float] = None, 
        confidence: float = 1.0, 
        source_event_id: Optional[uuid.UUID] = None,
        decided_at: Optional[datetime] = None,
        reasoning: Optional[str] = None
    ) -> Node:
        # Idempotency check
        if source_event_id:
            stmt = select(Node).where(
                Node.organization_id == org_id,
                Node.source_event_id == source_event_id,
                Node.title == title[:255]
            )
            res = await self.session.execute(stmt)
            existing = res.scalars().first()
            if existing:
                return existing

        node = Node(
            organization_id=org_id,
            type=type,
            title=title[:255],
            summary=summary,
            content=content,
            confidence=confidence,
            source_event_id=source_event_id,
            decided_at=decided_at,
            reasoning=reasoning
        )
        self.session.add(node)
        await self.session.commit()
        await self.session.refresh(node)
        
        if embedding_vector:
            from app.models.graph import Embedding
            emb = Embedding(node_id=node.id, vector=embedding_vector)
            self.session.add(emb)
            await self.session.commit()
            await self.session.refresh(emb)
            node.embedding_id = emb.id
            self.session.add(node)
            await self.session.commit()
            
        if metadata:
            for k, v in metadata.items():
                md = NodeMetadata(node_id=node.id, key=k, value=str(v))
                self.session.add(md)
            await self.session.commit()
            
        return node

    async def vector_search(self, org_id: uuid.UUID, query_vector: List[float], limit: int = 20, statuses: Optional[List[str]] = None) -> List[Node]:
        from app.models.graph import Embedding
        filter_statuses = statuses or ["active"]
        stmt = (
            select(Node)
            .join(Embedding, Node.embedding_id == Embedding.id)
            .where(Node.organization_id == org_id)
            .where(Node.status.in_(filter_statuses))
            .order_by(Embedding.vector.cosine_distance(query_vector))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def add_evidence(self, node_id: uuid.UUID, source: str, source_type: str, raw_text: str, url: str = None) -> Evidence:
        import hashlib
        checksum = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()
        
        evidence = Evidence(
            node_id=node_id,
            source=source,
            source_type=source_type,
            url=url,
            raw_text=raw_text,
            checksum=checksum
        )
        self.session.add(evidence)
        await self.session.commit()
        await self.session.refresh(evidence)
        return evidence

    async def create_edge(self, from_node: uuid.UUID, to_node: uuid.UUID, relationship: str, weight: float = 1.0, source_event_id: Optional[uuid.UUID] = None) -> Edge:
        # Idempotency check
        if source_event_id:
            stmt = select(Edge).where(
                Edge.from_node == from_node,
                Edge.to_node == to_node,
                Edge.relationship == relationship,
                Edge.source_event_id == source_event_id
            )
            res = await self.session.execute(stmt)
            existing = res.scalars().first()
            if existing:
                return existing

        edge = Edge(
            from_node=from_node,
            to_node=to_node,
            relationship=relationship,
            weight=weight,
            source_event_id=source_event_id
        )
        self.session.add(edge)
        await self.session.commit()
        await self.session.refresh(edge)
        return edge

    async def get_node(self, node_id: uuid.UUID) -> Optional[Node]:
        return await self.session.get(Node, node_id)
        
    async def update_node(self, node_id: uuid.UUID, **kwargs) -> Optional[Node]:
        node = await self.get_node(node_id)
        if not node:
            return None
        for key, value in kwargs.items():
            if hasattr(node, key):
                setattr(node, key, value)
        node.updated_at = datetime.utcnow()
        self.session.add(node)
        await self.session.commit()
        await self.session.refresh(node)
        return node
        
    async def list_recent_nodes(self, org_id: uuid.UUID, limit: int = 50) -> List[Node]:
        stmt = select(Node).where(Node.organization_id == org_id).order_by(Node.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def merge_nodes(self, primary_node_id: uuid.UUID, duplicate_node_id: uuid.UUID) -> Optional[Node]:
        """Merges duplicate_node into primary_node, re-pointing all edges and archiving duplicate_node."""
        primary = await self.get_node(primary_node_id)
        duplicate = await self.get_node(duplicate_node_id)
        if not primary or not duplicate or primary.id == duplicate.id:
            return primary
            
        # Redirect all edges pointing to or from duplicate
        stmt_from = select(Edge).where(Edge.from_node == duplicate.id)
        res_from = await self.session.execute(stmt_from)
        for edge in res_from.scalars().all():
            edge.from_node = primary.id
            self.session.add(edge)
            
        stmt_to = select(Edge).where(Edge.to_node == duplicate.id)
        res_to = await self.session.execute(stmt_to)
        for edge in res_to.scalars().all():
            edge.to_node = primary.id
            self.session.add(edge)
            
        # Archive duplicate node
        duplicate.status = "archived"
        duplicate.summary = (duplicate.summary or "") + f" [Merged into {primary.title}]"
        self.session.add(duplicate)
        
        await self.session.commit()
        await self.session.refresh(primary)
        return primary

    async def classify_node(self, node_id: uuid.UUID, new_type: str) -> Optional[Node]:
        """Updates the structural entity classification type of a node."""
        return await self.update_node(node_id, type=new_type)

    async def set_authoritative_source(self, node_id: uuid.UUID, is_authoritative: bool = True) -> Optional[Node]:
        """Marks a node as authoritative in the graph."""
        node = await self.get_node(node_id)
        if not node:
            return None
        md = NodeMetadata(node_id=node.id, key="is_authoritative", value=str(is_authoritative).lower())
        self.session.add(md)
        node.confidence = 1.0 if is_authoritative else node.confidence
        self.session.add(node)
        await self.session.commit()
        await self.session.refresh(node)
        return node
