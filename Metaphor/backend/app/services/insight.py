import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from app.models.insight import ContextInsight
from app.services.retrieval import RetrievalScope

class InsightService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def get_active_insights(self, scope: RetrievalScope) -> List[ContextInsight]:
        """
        Retrieves all active insights for the given scope (org, workspace).
        """
        stmt = select(ContextInsight).where(
            ContextInsight.organization_id == scope.organization_id,
            ContextInsight.status == "active"
        )
        
        if scope.workspace_id:
            # Insights that are either global (workspace_id IS NULL) or belong to this workspace
            stmt = stmt.where(
                (ContextInsight.workspace_id == scope.workspace_id) |
                (ContextInsight.workspace_id.is_(None))
            )
            
        stmt = stmt.order_by(desc(ContextInsight.updated_at))
        result = await self.db.execute(stmt)
        return result.scalars().all()
        
    async def generate_or_update_insight(
        self,
        organization_id: uuid.UUID,
        type: str,
        content: str,
        origin: str,
        confidence: str,
        source_refs: list,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        previous_version_id: Optional[uuid.UUID] = None
    ) -> ContextInsight:
        """
        Creates a new insight. If a previous version is provided, marks it as superseded.
        """
        new_insight = ContextInsight(
            organization_id=organization_id,
            workspace_id=workspace_id,
            project_id=project_id,
            type=type,
            content=content,
            origin=origin,
            status="active",
            confidence=confidence,
            source_refs=source_refs,
            previous_version_id=previous_version_id,
        )
        
        self.db.add(new_insight)
        await self.db.flush()
        
        if previous_version_id:
            # Mark the old one as superseded
            stmt = select(ContextInsight).where(ContextInsight.id == previous_version_id)
            res = await self.db.execute(stmt)
            old_insight = res.scalar_one_or_none()
            if old_insight:
                old_insight.status = "superseded"
                old_insight.superseded_by_id = new_insight.id
                old_insight.valid_until = datetime.utcnow()
                self.db.add(old_insight)
                
        await self.db.commit()
        await self.db.refresh(new_insight)
        return new_insight
        
    async def explicit_correction(
        self,
        old_insight_id: uuid.UUID,
        correct_content: str,
        source_refs: list
    ) -> ContextInsight:
        """
        Allows explicit user correction to override an inferred insight.
        """
        stmt = select(ContextInsight).where(ContextInsight.id == old_insight_id)
        res = await self.db.execute(stmt)
        old_insight = res.scalar_one_or_none()
        
        if not old_insight:
            raise ValueError(f"Insight {old_insight_id} not found.")
            
        return await self.generate_or_update_insight(
            organization_id=old_insight.organization_id,
            workspace_id=old_insight.workspace_id,
            project_id=old_insight.project_id,
            type=old_insight.type,
            content=correct_content,
            origin="explicit", # explicit user override
            confidence="high_explicit",
            source_refs=source_refs,
            previous_version_id=old_insight_id
        )
