import json
import logging
from typing import List, Dict, Any
from app.services.llm import llm_service
from app.services.graph import GraphService
from app.models.operations import WebhookEvent
import uuid

logger = logging.getLogger("metaphor.services.reflection")

class ReflectionService:
    def __init__(self, graph_service: GraphService):
        self.graph = graph_service

    async def reflect_and_evolve(self, org_id: uuid.UUID, event: WebhookEvent) -> Dict[str, Any]:
        """
        Run the Reflection Agent to translate a WebhookEvent into Graph mutations.
        The Intelligence Layer emits structured operations: CREATE_NODE, UPDATE_NODE, SUPERSEDE_NODE, CREATE_EDGE, IGNORE.
        """
        # Fetch existing nodes for context mapping
        existing_nodes = await self.graph.list_recent_nodes(org_id, limit=100)
        existing_nodes_context = [{"id": str(n.id), "title": n.title, "type": n.type, "summary": n.summary, "status": n.status} for n in existing_nodes if n.status == "active"]

        payload_str = json.dumps(event.payload)

        system_prompt = (
            "You are the Metaphor Intelligence Engine. Your job is not just to remember data, but to UNDERSTAND it.\n"
            "You evaluate incoming events against the existing knowledge graph and emit specific MUTATION OPERATIONS.\n"
            "If a user states a constraint that conflicts with a previous constraint, you must SUPERSEDE the old node.\n"
            "If an event adds nuance to an existing node, you UPDATE the node.\n"
            "If an event introduces entirely new concepts (like Projects, Goals, Decisions, or Constraints), you CREATE new nodes.\n"
            "If an event is redundant or has no semantic value, you IGNORE it.\n"
            "CRITICAL - NO FABRICATED REASONING: When extracting a 'Decision', if the source material does not explicitly state the rationale/reasoning, you MUST set 'reasoning' to null or 'No rationale found in sources'. NEVER invent or hallucinate reasoning.\n"
        )

        prompt = (
            f"--- EXISTING GRAPH CONTEXT ---\n"
            f"{json.dumps(existing_nodes_context, indent=2)}\n\n"
            f"--- INCOMING EVENT ---\n"
            f"Provider: {event.provider}\n"
            f"Type: {event.event_type}\n"
            f"Payload: {payload_str}\n\n"
            f"Task: Analyze the event. Output a JSON object containing a list of 'operations'.\n"
            f"Supported actions: CREATE_NODE, UPDATE_NODE, SUPERSEDE_NODE, CREATE_EDGE, ASK_CLARIFICATION, IGNORE.\n"
            f"Generate a confidence score (0.0 to 1.0) for your extraction. If your confidence is below 0.7, or if there is glaring ambiguity, DO NOT create the node. Instead, output an ASK_CLARIFICATION action.\n"
            f"Output Schema:\n"
            f"{{\n"
            f"  \"operations\": [\n"
            f"    {{\n"
            f"       \"action\": \"CREATE_NODE\",\n"
            f"       \"node\": {{\"title\": \"...\", \"type\": \"Project|Decision|Goal|Constraint|Preference|Person|Concept\", \"summary\": \"...\", \"metadata\": {{}}, \"confidence\": 0.95, \"reasoning\": \"...\", \"decided_at\": \"2023-01-01T12:00:00Z\"}}\n"
            f"    }},\n"
            f"    {{\n"
            f"       \"action\": \"SUPERSEDE_NODE\",\n"
            f"       \"old_node_id\": \"uuid\",\n"
            f"       \"new_node\": {{\"title\": \"...\", \"type\": \"...\", \"summary\": \"...\", \"metadata\": {{}}}}\n"
            f"    }},\n"
            f"    {{\n"
            f"       \"action\": \"UPDATE_NODE\",\n"
            f"       \"node_id\": \"uuid\",\n"
            f"       \"summary\": \"Updated summary...\",\n"
            f"       \"confidence\": 0.95\n"
            f"    }},\n"
            f"    {{\n"
            f"       \"action\": \"ASK_CLARIFICATION\",\n"
            f"       \"question\": \"What is the timeline for the Metaphor launch?\",\n"
            f"       \"context\": \"Found a mention of launch but no date.\"\n"
            f"    }},\n"
            f"    {{\n"
            f"       \"action\": \"CREATE_EDGE\",\n"
            f"       \"source_title_or_id\": \"title or uuid\",\n"
            f"       \"target_title_or_id\": \"title or uuid\",\n"
            f"       \"relationship\": \"owns|requires|contradicts|relates_to|alternative|outcome\"\n"
            f"    }},\n"
            f"    {{\n"
            f"       \"action\": \"IGNORE\",\n"
            f"       \"reason\": \"...\"\n"
            f"    }}\n"
            f"  ],\n"
            f"  \"evidence_links\": [\n"
            f"    {{\"node_title_or_id\": \"...\"}}\n"
            f"  ]\n"
            f"}}\n"
            f"Respond STRICTLY in JSON format with no backticks or markdown formatting if possible."
        )

        logger.info("Calling LLM for intelligence layer reflection...")
        response_text = await llm_service.query_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.0)

        try:
            clean_response = response_text.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            result = json.loads(clean_response)
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON: {e}")
            return {"status": "error", "message": f"LLM Parse Error: {e}"}

        operations = result.get("operations", [])
        evidence_links = result.get("evidence_links", [])
        
        applied_ops = 0
        node_map = {} # title -> node
        
        for op in operations:
            action = op.get("action")
            
            if action == "CREATE_NODE":
                n_data = op.get("node", {})
                title = n_data.get("title")
                if title:
                    summary = n_data.get("summary", "")
                    embedding = await llm_service.generate_embedding(f"{title}: {summary}")
                    
                    # Parse datetime
                    decided_at_str = n_data.get("decided_at")
                    decided_at = None
                    if decided_at_str:
                        from dateutil.parser import parse
                        try:
                            decided_at = parse(decided_at_str)
                        except Exception:
                            pass
                            
                    node = await self.graph.create_node(
                        org_id=org_id,
                        type=n_data.get("type", "Concept"),
                        title=title,
                        summary=summary,
                        content=summary,
                        metadata=n_data.get("metadata", {}),
                        embedding_vector=embedding,
                        confidence=n_data.get("confidence", 1.0),
                        source_event_id=event.id,
                        decided_at=decided_at,
                        reasoning=n_data.get("reasoning")
                    )
                    node_map[title.lower()] = node
                    applied_ops += 1
                    
            elif action == "SUPERSEDE_NODE":
                old_id_str = op.get("old_node_id")
                n_data = op.get("new_node", {})
                title = n_data.get("title")
                
                if old_id_str and title:
                    try:
                        old_id = uuid.UUID(old_id_str)
                        summary = n_data.get("summary", "")
                        # Generate embedding
                        embedding = await llm_service.generate_embedding(f"{title}: {summary}")
                        # Parse datetime
                        decided_at_str = n_data.get("decided_at")
                        decided_at = None
                        if decided_at_str:
                            from dateutil.parser import parse
                            try:
                                decided_at = parse(decided_at_str)
                            except Exception:
                                pass
                                
                        # Create the new node
                        new_node = await self.graph.create_node(
                            org_id=org_id,
                            type=n_data.get("type", "Concept"),
                            title=title,
                            summary=summary,
                            content=summary,
                            metadata=n_data.get("metadata", {}),
                            embedding_vector=embedding,
                            confidence=n_data.get("confidence", 1.0),
                            source_event_id=event.id,
                            decided_at=decided_at,
                            reasoning=n_data.get("reasoning")
                        )
                        node_map[title.lower()] = new_node
                        
                        # Update old node
                        await self.graph.update_node(old_id, status="superseded", superseded_by_id=new_node.id)
                        
                        # Create an explicit edge
                        await self.graph.create_edge(from_node=new_node.id, to_node=old_id, relationship="supersedes", source_event_id=event.id)
                        
                        applied_ops += 1
                    except Exception as e:
                        logger.error(f"Error superseding node: {e}")
                        
            elif action == "UPDATE_NODE":
                node_id_str = op.get("node_id")
                new_summary = op.get("summary")
                if node_id_str and new_summary:
                    try:
                        nid = uuid.UUID(node_id_str)
                        await self.graph.update_node(nid, summary=new_summary, content=new_summary)
                        applied_ops += 1
                    except Exception as e:
                        logger.error(f"Error updating node: {e}")
                        
            elif action == "CREATE_EDGE":
                src_ref = op.get("source_title_or_id")
                tgt_ref = op.get("target_title_or_id")
                rel = op.get("relationship", "relates_to")
                if src_ref and tgt_ref:
                    def resolve_ref(ref_str):
                        if ref_str.lower() in node_map:
                            return node_map[ref_str.lower()].id
                        try:
                            return uuid.UUID(ref_str)
                        except ValueError:
                            found = next((n for n in existing_nodes if n.title.lower() == ref_str.lower()), None)
                            return found.id if found else None

                    try:
                        src_id = resolve_ref(src_ref)
                        tgt_id = resolve_ref(tgt_ref)
                        if src_id and tgt_id:
                            await self.graph.create_edge(src_id, tgt_id, rel, source_event_id=event.id)
                            applied_ops += 1
                        else:
                            logger.error(f"Error creating edge: Could not resolve references src='{src_ref}' tgt='{tgt_ref}'")
                    except Exception as e:
                        logger.error(f"Error creating edge: {e}")
                        
            elif action == "ASK_CLARIFICATION":
                question = op.get("question", "Unknown question")
                context = op.get("context", "")
                try:
                    await self.graph.create_node(
                        org_id=org_id,
                        type="Clarification",
                        title=question,
                        summary=context,
                        content=context,
                        metadata={},
                        source_event_id=event.id
                    )
                    applied_ops += 1
                except Exception as e:
                    logger.error(f"Error creating clarification: {e}")

            elif action == "IGNORE":
                logger.info(f"LLM Ignored event: {op.get('reason')}")
                applied_ops += 1

        # Add Evidence Links
        for link in evidence_links:
            ref = link.get("node_title_or_id", "")
            target_node = None
            
            # Check by title first in our new map
            if ref.lower() in node_map:
                target_node = node_map[ref.lower()]
            else:
                # Try to parse as UUID
                try:
                    nid = uuid.UUID(ref)
                    target_node = await self.graph.get_node(nid)
                except ValueError:
                    # Fallback to searching existing nodes by title
                    target_node = next((n for n in existing_nodes if n.title.lower() == ref.lower()), None)
                    
            if target_node:
                await self.graph.add_evidence(
                    node_id=target_node.id,
                    source=event.provider,
                    source_type=event.event_type,
                    raw_text=payload_str,
                    url=event.payload.get("url")
                )

        return {
            "status": "success", 
            "operations_applied": applied_ops,
            "created_nodes": [
                {"id": str(n.id), "title": n.title, "type": n.type, "summary": n.summary}
                for n in node_map.values()
            ]
        }

    async def analyze_draft(self, text: str) -> Dict[str, Any]:
        """Legacy single-text analysis. Kept for compatibility."""
        return await self.analyze_interview([{"question": "What are you currently building?", "answer": text}])

    async def analyze_interview(self, answers: list) -> Dict[str, Any]:
        """
        Multi-turn interview analysis. Accepts a full conversation history and returns:
        - Extracted entities (org, projects, goals, preferences)
        - Per-category confidence scores (mission, projects, goals, preferences, constraints)
        - An overall confidence score
        - A reflection statement proving the AI understood the last answer
        - The single highest-value next question to increase overall confidence
        """
        if not answers:
            return {
                "organization": "", "projects": [], "goals": [], "preferences": [],
                "categories": {"mission": 0, "projects": 0, "goals": 0, "preferences": 0, "constraints": 0},
                "overall_confidence": 0,
                "reflection": "",
                "next_question": "What are you currently working on?"
            }

        # Format the conversation history for the prompt
        history_str = "\n".join(
            [f"Q: {a.get('question', '')}\nA: {a.get('answer', '')}" for a in answers]
        )

        system_prompt = (
            "You are the Metaphor Intelligence Engine — an expert researcher building a structured model of a user.\n"
            "You are given a conversation history of questions and the user's answers.\n"
            "Your job is to:\n"
            "1. Extract all entities: organization, projects, goals, and preferences/constraints.\n"
            "2. Score each category's completeness from 0-100 (mission, projects, goals, preferences, constraints).\n"
            "3. Calculate an overall_confidence (0-100) as a weighted average.\n"
            "4. Write a short 'reflection' statement that proves you understood the LAST answer. Example: 'So MGE is your primary organization. Got it.'\n"
            "5. Generate the SINGLE highest-value next_question to most efficiently increase the overall_confidence.\n"
            "   - CRITICAL: DO NOT repeat a question that has already been asked in the conversation history.\n"
            "   - If mission is low, ask about mission. If projects are low, ask about specific products, etc.\n"
            "   - Make the question specific to the user's last answer to feel conversational.\n"
            "Respond STRICTLY with valid JSON matching this schema:\n"
            "{\n"
            "  \"organization\": \"str\",\n"
            "  \"projects\": [\"str\"],\n"
            "  \"goals\": [\"str\"],\n"
            "  \"preferences\": [\"str\"],\n"
            "  \"categories\": {\"mission\": 0, \"projects\": 0, \"goals\": 0, \"preferences\": 0, \"constraints\": 0},\n"
            "  \"overall_confidence\": 0,\n"
            "  \"reflection\": \"str\",\n"
            "  \"next_question\": \"str\"\n"
            "}"
        )

        prompt = f"Conversation History:\n{history_str}"

        try:
            response_text = await llm_service.query_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.4)
            clean = response_text.strip()
            if clean.startswith("```json"): clean = clean[7:]
            if clean.startswith("```"): clean = clean[3:]
            if clean.endswith("```"): clean = clean[:-3]
            return json.loads(clean.strip())
        except Exception as e:
            logger.error(f"LLM query or JSON parse failed in analyze_interview: {e}")
            raise RuntimeError(f"Interview analysis failed due to LLM error: {e}")

