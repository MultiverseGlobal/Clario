import json
import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Node, Edge, Chunk, NodeEvidence, UniversalEvent
from app.ingestion.normalizer import normalizer
from app.provider import llm_provider
from app.database.session import get_session

logger = logging.getLogger("metaphor.reflection")

class ReflectionEngine:
    def __init__(self):
        pass

    async def reflect_and_evolve(self, session: AsyncSession, raw_logs: List[Dict[str, Any]], status: str = "approved") -> Dict[str, Any]:
        """
        Run the Reflection Agent using Anthropic Claude.
        1. Ingest raw log text and convert to UniversalEvent records.
        2. Read existing nodes from DB for reference (context mapping).
        3. Prompt Claude to extract structured Objects, Edges, and Evidence links.
        4. Commit changes to PostgreSQL.
        """
        if not raw_logs:
            logger.info("No raw logs to reflect on.")
            return {"status": "success", "message": "No logs provided"}

        # 0. Normalize and record Universal Events
        normalized_events: List[UniversalEvent] = []
        for log in raw_logs:
            event = normalizer.normalize(log)
            session.add(event)
            normalized_events.append(event)
        await session.flush()

        # 1. Fetch existing graph nodes to prevent duplicate objects and map connections
        existing_nodes_query = await session.exec(select(Node))
        existing_nodes = existing_nodes_query.all()
        existing_nodes_context = [
            {"id": str(n.id), "name": n.name, "type": n.type}
            for n in existing_nodes
        ]

        # Prepare log summary for LLM
        formatted_logs = []
        for log in raw_logs:
            formatted_logs.append(
                f"Log ID: {log['id']}\n"
                f"Source: {log['source']}\n"
                f"Title: {log['title']}\n"
                f"Content:\n{log['content']}\n"
                f"Metadata: {json.dumps(log['metadata'])}\n"
                f"---"
            )
        logs_text = "\n\n".join(formatted_logs)

        # 2. Build system and user prompt for Claude
        system_prompt = (
            "You are the Metaphor World Modeling Reflection Engine.\n"
            "Your objective is to model the user's world. Instead of indexing isolated documents, "
            "you identify the underlying Objects (Nodes) and the Relationships (Edges) between them.\n"
            "Objects can be:\n"
            "- Person, Meeting, Idea, Decision, Commit, Project, Task, Document, Company, Email, Note, Product, Goal, Event\n\n"
            "Relationships must be categorized into three dimensions:\n"
            "- Structural: Hierarchy or ownership (e.g., Project contains Idea, owns, belongs_to, assigned_to)\n"
            "- Semantic: Semantic association or thematic relevance (e.g., Idea relates to Project, mentions, depends_on)\n"
            "- Temporal: Causal, chronological, or event sequencing (e.g., Meeting created Idea -> scheduled_after -> blocked_by)\n\n"
            "Ensure you resolve names to existing nodes to connect logs into the unified graph."
        )

        prompt = (
            f"Here are the existing nodes in Metaphor's graph database:\n"
            f"{json.dumps(existing_nodes_context, indent=2)}\n\n"
            f"Here are the new incoming workspace log documents that have been synced:\n"
            f"{logs_text}\n\n"
            f"Task: Extract the core Objects, their Relationships (Edges), and link the raw logs (referenced by Log ID) as Evidence to the appropriate Objects.\n"
            f"Respond STRICTLY in JSON format with no additional conversation. Use this exact schema:\n"
            f"{{\n"
            f"  \"nodes_to_create\": [\n"
            f"    {{\"name\": \"Object Name\", \"type\": \"Person|Meeting|Idea|Decision|Commit|Project|Task|Document|Company|Email|Note|Product|Goal|Event\", \"metadata\": {{...}}}}\n"
            f"  ],\n"
            f"  \"edges_to_create\": [\n"
            f"    {{\"source_node_name\": \"Name\", \"target_node_name\": \"Name\", \"dimension\": \"structural|semantic|temporal\", \"relationship_type\": \"owns|created|mentions|depends_on|related_to|belongs_to|scheduled_after|blocked_by|assigned_to\", \"description\": \"Why/how are they related?\"}}\n"
            f"  ],\n"
            f"  \"evidence_links\": [\n"
            f"    {{\"node_name\": \"Object Name\", \"log_id\": \"Log ID\"}}\n"
            f"  ]\n"
            f"}}\n"
        )

        # 3. Call Claude
        logger.info("Calling Claude for reflection extraction...")
        response_text = await llm_provider.query_llm(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.0
        )

        try:
            # Parse response
            clean_response = response_text.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response)
        except Exception as e:
            logger.error(f"Failed to parse LLM reflection JSON: {e}. Raw response: {response_text}")
            raise RuntimeError(f"Failed to parse LLM reflection JSON output: {e}")

        # 4. Write data to DB inside transaction
        report = await self._apply_graph_updates(session, raw_logs, result, status=status)
        report["normalized_events_count"] = len(normalized_events)
        return report

    async def _apply_graph_updates(self, session: AsyncSession, raw_logs: List[Dict[str, Any]], parsed_updates: Dict[str, Any], status: str = "approved") -> Dict[str, Any]:
        """Apply extracted nodes, edges, chunks and evidence linkages to Postgres."""
        
        # A. Store raw logs as Chunks and compute embeddings
        chunk_map = {} # Maps log_id to Chunk object
        for log in raw_logs:
            # Check if chunk exists
            from sqlalchemy import text
            existing_chunk_q = await session.exec(select(Chunk).where(text("metadata_json->>'log_id' = :log_id")).params(log_id=str(log["id"])))
            chunk = existing_chunk_q.first()
            if not chunk:
                # Create embedding
                embedding = await llm_provider.generate_embedding(log["content"])
                chunk = Chunk(
                    text_content=log["content"],
                    embedding=embedding,
                    metadata_json={"log_id": log["id"], "title": log["title"], "source": log["source"], **log["metadata"]}
                )
                session.add(chunk)
                await session.flush() # Populate chunk ID
            chunk_map[log["id"]] = chunk

        # B. Resolve or Create Nodes
        node_map = {} # Maps lowercase node name to Node object
        
        # Load existing nodes into node_map
        existing_nodes_q = await session.exec(select(Node))
        for n in existing_nodes_q.all():
            node_map[n.name.lower()] = n

        created_nodes_count = 0
        for n_data in parsed_updates.get("nodes_to_create", []):
            name = n_data["name"]
            n_type = n_data["type"]
            metadata = n_data.get("metadata", {})
            
            if name.lower() not in node_map:
                node = Node(
                    name=name,
                    type=n_type,
                    metadata_json=metadata,
                    status=status
                )
                session.add(node)
                await session.flush()
                node_map[name.lower()] = node
                created_nodes_count += 1
            else:
                # Node already exists, update metadata if relevant
                node = node_map[name.lower()]
                node.metadata_json.update(metadata)
                session.add(node)

        # C. Create Evidence Links
        evidence_links_count = 0
        for link in parsed_updates.get("evidence_links", []):
            node_name = link["node_name"]
            log_id = link["log_id"]
            
            node = node_map.get(node_name.lower())
            chunk = chunk_map.get(log_id)
            
            if node and chunk:
                # Check if association already exists
                assoc_q = await session.exec(
                    select(NodeEvidence).where(NodeEvidence.node_id == node.id, NodeEvidence.chunk_id == chunk.id)
                )
                if not assoc_q.first():
                    assoc = NodeEvidence(node_id=node.id, chunk_id=chunk.id)
                    session.add(assoc)
                    evidence_links_count += 1

        # D. Create Edges
        created_edges_count = 0
        for edge_data in parsed_updates.get("edges_to_create", []):
            src_name = edge_data["source_node_name"]
            tgt_name = edge_data["target_node_name"]
            dim = edge_data["dimension"]
            rel_type = edge_data["relationship_type"]
            desc = edge_data.get("description", "")

            src_node = node_map.get(src_name.lower())
            tgt_node = node_map.get(tgt_name.lower())

            if src_node and tgt_node:
                # Check if edge already exists
                existing_edge_q = await session.exec(
                    select(Edge).where(
                        Edge.source_id == src_node.id,
                        Edge.target_id == tgt_node.id,
                        Edge.dimension == dim,
                        Edge.relationship_type == rel_type
                    )
                )
                if not existing_edge_q.first():
                    edge = Edge(
                        source_id=src_node.id,
                        target_id=tgt_node.id,
                        dimension=dim,
                        relationship_type=rel_type,
                        metadata_json={"description": desc},
                        status=status
                    )
                    session.add(edge)
                    created_edges_count += 1

        await session.commit()
        
        return {
            "status": "success",
            "nodes_created": created_nodes_count,
            "edges_created": created_edges_count,
            "evidence_links_created": evidence_links_count
        }

reflection_engine = ReflectionEngine()
