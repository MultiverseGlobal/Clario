import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database.session import engine
from app.services.identity import IdentityService
from app.services.graph import GraphService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def ingest_kuro_os_data():
    """Ingests high-signal events from Kuro OS (Deals, Decisions) into Metaphor memory."""
    async with AsyncSession(engine) as session:
        logger.info("Starting Kuro OS High-Signal Ingestion...")
        identity = IdentityService(session)
        org = await identity.get_or_create_default_organization()
        
        graph = GraphService(session)

        # 1. Ingest Strategic Decisions (DEC-02)
        logger.info("Ingesting Personal Decisions...")
        decisions_res = await session.execute(text("SELECT * FROM personal.decisions"))
        decisions = decisions_res.mappings().all()
        
        for decision in decisions:
            summary = f"Decision: {decision['decision_text'][:100]}..."
            content = f"Why: {decision.get('why', '')}\nEvidence: {decision.get('evidence', '')}\nAssumptions: {decision.get('assumptions', '')}\nOutcome: {decision.get('expected_outcome', '')}"
            
            node = await graph.create_node(
                org_id=org.id,
                type="decision",
                title=decision["decision_text"][:255],
                summary=summary,
                content=content,
                metadata={
                    "kuro_os_table": "personal.decisions",
                    "kuro_os_id": str(decision["id"]),
                    "review_date": str(decision.get("review_date", ""))
                }
            )
            logger.info(f"Indexed Decision: {node.title}")

        # 2. Ingest Business Deals (ACQ-07)
        logger.info("Ingesting Won Business Deals...")
        deals_res = await session.execute(text("SELECT * FROM business.deals WHERE stage = 'WON'"))
        deals = deals_res.mappings().all()
        
        for deal in deals:
            summary = f"Won Deal: {deal['title']} (${deal['value']})"
            content = f"Founder Thesis: {deal.get('founder_thesis', '')}\nStage: {deal['stage']}"
            
            node = await graph.create_node(
                org_id=org.id,
                type="deal",
                title=f"Deal Won: {deal['title']}",
                summary=summary,
                content=content,
                metadata={
                    "kuro_os_table": "business.deals",
                    "kuro_os_id": str(deal["id"]),
                    "deal_value": str(deal["value"])
                }
            )
            logger.info(f"Indexed Deal: {node.title}")

        logger.info("Kuro OS Ingestion Complete!")

if __name__ == "__main__":
    asyncio.run(ingest_kuro_os_data())
