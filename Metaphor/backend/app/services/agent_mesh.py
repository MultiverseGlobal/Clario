"""
Agent Mesh Service for Metaphor.
Manages the universal collaborative network of AI tools:
ChatGPT, Orion, Atlas, Clario, Claude, Antigravity, Manus, Perplexity, and Metaphor.
Provides role discovery, task board delegation, checkpoints, and handoffs.
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("metaphor.agent_mesh")

# ── 1. The Registered Ecosystem AI Agents ─────────────────────────────────────
AGENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "antigravity": {
        "name": "Antigravity",
        "creator": "Google DeepMind",
        "role": "Master System Architect & Code Engineer",
        "description": "Deep full-stack code execution, architecture, refactoring, test running, debugging, file system operations, and backend deployment.",
        "best_for": [
            "Writing and modifying full-stack code (React, TypeScript, Python, SQL)",
            "Running build tools, tests, and debugging runtime errors",
            "Creating database migrations and backend API schemas",
            "Complex architectural refactoring and project restructuring",
        ],
        "strengths": ["Autonomous execution", "Filesystem access", "Terminal execution", "Deep precision"],
        "handoff_instructions": "Provide target file paths, technical constraints, and desired acceptance criteria. Antigravity handles execution and automated test verification.",
    },
    "chatgpt": {
        "name": "ChatGPT",
        "creator": "OpenAI",
        "role": "Strategic Orchestrator & Creative Partner",
        "description": "High-level strategic ideation, rapid prompt decomposition, user communication, narrative copywriting, and cross-functional planning.",
        "best_for": [
            "Brainstorming product features and business models",
            "Drafting high-converting sales copy, email sequences, and narrative messaging",
            "Interpreting broad user intent and translating into structured project briefs",
            "Cross-functional strategic reviews",
        ],
        "strengths": ["Conversational dexterity", "Broad world knowledge", "Executive summarization"],
        "handoff_instructions": "Give ChatGPT high-level project goals, brand voice, and user feedback. It will return strategic briefs, copy, and task breakdowns.",
    },
    "claude": {
        "name": "Claude",
        "creator": "Anthropic",
        "role": "Cognitive Analyst & Long-Context Reasoner",
        "description": "Excellence in complex logical reasoning, extensive code reviews, nuanced document synthesis, and multi-document analysis.",
        "best_for": [
            "In-depth architectural review and safety analysis",
            "Synthesizing massive technical specifications and research papers",
            "Complex edge-case reasoning and ethical constraint verification",
        ],
        "strengths": ["Huge context window", "Nuanced technical prose", "Low hallucination"],
        "handoff_instructions": "Send complete document contexts and complex problem statements requiring step-by-step analytical reasoning.",
    },
    "atlas": {
        "name": "Atlas",
        "creator": "Pseudonyms Ecosystem",
        "role": "Autonomous Acquisition OS & B2B Growth Engine",
        "description": "Prospect discovery, ICP scoring, contact verification, personalized outreach drafting, and sales CRM pipeline management.",
        "best_for": [
            "Finding high-fit agency and B2B prospects across Clutch, YC, and registries",
            "Scoring operational bottlenecks and pain signals",
            "Dispatching verified cold email and LinkedIn touchpoints",
            "Tracking deals and validation-to-first-client campaigns",
        ],
        "strengths": ["Live lead sourcing", "Email SMTP/Resend integration", "Pipeline CRM", "ICP validation"],
        "handoff_instructions": "Specify ICP criteria (headcount, industry, geography, pain hypothesis). Atlas will find companies and draft targeted acquisition sequences.",
    },
    "clario": {
        "name": "Clario",
        "creator": "Pseudonyms Ecosystem",
        "role": "Synthetic Media & Video Engine",
        "description": "Automated video generation, voice cloning, video harvesting, and dynamic Loom-style personalized video pitches.",
        "best_for": [
            "Generating personalized synthetic sales video demos for prospects",
            "Cloning founder likeness and voice for automated video messaging",
            "Harvesting and analyzing video assets for brand consistency",
        ],
        "strengths": ["Render pipeline", "Voice likeness synthesis", "Dynamic video assembly"],
        "handoff_instructions": "Pass prospect name, company domain, and key value proposition hook. Clario produces a customized video asset URL.",
    },
    "manus": {
        "name": "Manus",
        "creator": "General Autonomous Agent",
        "role": "Autonomous Deep Web Browser & Task Operator",
        "description": "Full interactive browser automation, navigating dynamic web apps, form submission, and complex multi-page online tasks.",
        "best_for": [
            "Navigating complex web portals that lack public APIs",
            "Automated multi-step web scraping behind authentication or dynamic SPAs",
            "Autonomous online transactions and interactive research execution",
        ],
        "strengths": ["Interactive browser control", "Visual navigation", "Autonomous web work"],
        "handoff_instructions": "Provide target web URLs and clear step-by-step success conditions for browser navigation.",
    },
    "perplexity": {
        "name": "Perplexity",
        "creator": "Perplexity AI",
        "role": "Real-Time Search & Citation Engine",
        "description": "Live web search, citation-backed factual verification, real-time market data retrieval, and competitor intelligence.",
        "best_for": [
            "Checking up-to-the-minute market news and industry shifts",
            "Retrieving verifiable citations and sources for claims",
            "Competitive intelligence and company background verification",
        ],
        "strengths": ["Real-time search", "Direct citations", "Factual accuracy"],
        "handoff_instructions": "Ask specific factual research questions requiring verified web sources and recent data.",
    },
    "orion": {
        "name": "Orion",
        "creator": "Pseudonyms Ecosystem",
        "role": "Mobile Companion & Voice Operator",
        "description": "Mobile-first executive assistant, voice note processing, on-the-go decision alerts, and push notification triggers.",
        "best_for": [
            "Voice-driven task capture and morning briefing delivery",
            "Push alerts for critical pipeline replies and decision gates",
            "On-the-go review and approval of AI-generated assets",
        ],
        "strengths": ["Mobile presence (Android/iOS)", "Voice synthesis", "Real-time push alerts"],
        "handoff_instructions": "Route short executive summaries and actionable yes/no approval gates to Orion for mobile review.",
    },
    "metaphor": {
        "name": "Metaphor",
        "creator": "Pseudonyms Ecosystem",
        "role": "Universal Context Engine & Multi-Agent MCP Hub",
        "description": "Central nervous system connecting all AIs. Maintains shared knowledge graph, task board, agent routing, and project memory.",
        "best_for": [
            "Unified project memory and architectural context retrieval",
            "Cross-AI task handoffs and progress tracking",
            "Role routing ('who is best for this job')",
            "Central MCP integration endpoint for all agents",
        ],
        "strengths": ["Multi-tenant graph", "MCP stdio & SSE", "Cross-agent state synchronization"],
        "handoff_instructions": "Use Metaphor to query shared memory, post checkpoints, claim tasks, and coordinate handoffs across agents.",
    },
}

# ── 2. Shared In-Memory Task Board Store (with Cloud Persistence) ────────────
# In a full deployment, these persist to PostgreSQL / SQLite Node/Edge or Task tables
ACTIVE_TASKS: List[Dict[str, Any]] = [
    {
        "id": "task-init-001",
        "title": "Establish Universal Cross-AI Mesh via Metaphor",
        "description": "Connect ChatGPT, Antigravity, Atlas, Clario, Claude, Manus, and Perplexity into a single shared MCP collaboration network.",
        "assigned_to": "antigravity",
        "created_by": "user",
        "priority": "critical",
        "status": "in_progress",
        "context_summary": "Unified project memory, task handoffs, and capability discovery across all AI tools.",
        "checkpoints": [
            {
                "agent": "antigravity",
                "summary": "Implemented universal Agent Mesh service with 9-agent capability registry and shared board.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
]

# ── 3. Core Service Methods ──────────────────────────────────────────────────

class AgentMeshService:
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    def get_directory(self) -> Dict[str, Any]:
        """Returns the full registered network of AI agents with their specialties and guidelines."""
        return {
            "total_agents": len(AGENT_REGISTRY),
            "agents": AGENT_REGISTRY,
            "hub": "Metaphor MCP Hub",
            "supported_transports": ["MCP stdio", "MCP SSE", "OpenAPI REST (ChatGPT Actions)"],
        }

    def recommend_agent(self, task_description: str) -> Dict[str, Any]:
        """
        Intelligently analyzes a task description and recommends the optimal AI agent,
        explaining why and providing handoff instructions.
        """
        task_lower = task_description.lower()

        # Heuristic scoring
        scores: Dict[str, int] = {agent_id: 0 for agent_id in AGENT_REGISTRY}

        # Antigravity indicators
        if any(w in task_lower for w in ["code", "typescript", "python", "bug", "build", "refactor", "test", "database", "sql", "migration", "fastapi", "react"]):
            scores["antigravity"] += 10
        # ChatGPT indicators
        if any(w in task_lower for w in ["strategy", "copy", "pitch", "brainstorm", "email copy", "story", "ideate", "write"]):
            scores["chatgpt"] += 8
        # Atlas indicators
        if any(w in task_lower for w in ["prospect", "outreach", "lead", "clutch", "agency", "pipeline", "crm", "acquisition", "icp", "campaign"]):
            scores["atlas"] += 10
        # Clario indicators
        if any(w in task_lower for w in ["video", "synthetic", "clone", "voice", "loom", "avatar", "render"]):
            scores["clario"] += 10
        # Perplexity indicators
        if any(w in task_lower for w in ["search", "latest", "news", "cite", "citation", "fact check", "market research", "recent"]):
            scores["perplexity"] += 9
        # Manus indicators
        if any(w in task_lower for w in ["scrape", "browser", "click", "form", "navigate", "portal", "automate web"]):
            scores["manus"] += 9
        # Claude indicators
        if any(w in task_lower for w in ["review", "reasoning", "long document", "analysis", "audit", "philosophy"]):
            scores["claude"] += 7
        # Orion indicators
        if any(w in task_lower for w in ["mobile", "notification", "voice note", "on the go", "phone", "alert"]):
            scores["orion"] += 9

        best_agent_id = max(scores, key=lambda k: scores[k])
        if scores[best_agent_id] == 0:
            best_agent_id = "chatgpt"  # default to strategic ideator

        agent_info = AGENT_REGISTRY[best_agent_id]

        return {
            "recommended_agent": best_agent_id,
            "agent_name": agent_info["name"],
            "role": agent_info["role"],
            "confidence": "high" if scores[best_agent_id] >= 7 else "medium",
            "why": f"{agent_info['name']} specializes in {', '.join(agent_info['best_for'][:2])}.",
            "handoff_instructions": agent_info["handoff_instructions"],
            "available_capabilities": agent_info["best_for"],
        }

    def list_tasks(self, status: Optional[str] = None, assigned_to: Optional[str] = None) -> List[Dict[str, Any]]:
        """List tasks on the shared cross-AI board, with optional status and assignment filters."""
        tasks = ACTIVE_TASKS
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        if assigned_to:
            tasks = [t for t in tasks if t.get("assigned_to") == assigned_to.lower()]
        return tasks

    def create_task(
        self,
        title: str,
        description: str,
        assigned_to: str,
        created_by: str = "chatgpt",
        priority: str = "normal",
        context_summary: str = "",
    ) -> Dict[str, Any]:
        """Creates a new task on the shared board for another AI agent to execute."""
        normalized_assignee = assigned_to.lower().strip()
        if normalized_assignee not in AGENT_REGISTRY:
            normalized_assignee = "antigravity"

        new_task = {
            "id": f"task-{uuid.uuid4().hex[:8]}",
            "title": title,
            "description": description,
            "assigned_to": normalized_assignee,
            "created_by": created_by,
            "priority": priority,
            "status": "pending",
            "context_summary": context_summary,
            "checkpoints": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        ACTIVE_TASKS.insert(0, new_task)
        logger.info(f"[AgentMesh] New task created: '{title}' assigned to {normalized_assignee} by {created_by}")
        return new_task

    def post_checkpoint(
        self,
        task_id: str,
        agent_name: str,
        summary: str,
        files_touched: Optional[List[str]] = None,
        next_steps: Optional[str] = None,
        new_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Posts an execution checkpoint to a task so collaborating AIs know what has been accomplished."""
        for task in ACTIVE_TASKS:
            if task["id"] == task_id:
                checkpoint = {
                    "agent": agent_name,
                    "summary": summary,
                    "files_touched": files_touched or [],
                    "next_steps": next_steps,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                task.setdefault("checkpoints", []).append(checkpoint)
                if new_status:
                    task["status"] = new_status
                task["updated_at"] = datetime.now(timezone.utc).isoformat()
                return {"success": True, "task": task, "checkpoint": checkpoint}

        return {"success": False, "error": f"Task '{task_id}' not found."}

    def update_task_status(
        self,
        task_id: str,
        status: str,
        notes: str = "",
        handoff_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates task status and optionally hands it off to another AI agent."""
        for task in ACTIVE_TASKS:
            if task["id"] == task_id:
                task["status"] = status
                if notes:
                    task.setdefault("checkpoints", []).append({
                        "agent": "system",
                        "summary": notes,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                if handoff_to:
                    target = handoff_to.lower().strip()
                    if target in AGENT_REGISTRY:
                        task["assigned_to"] = target
                        task.setdefault("checkpoints", []).append({
                            "agent": "metaphor_hub",
                            "summary": f"Handed off task to {target.upper()}",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                task["updated_at"] = datetime.now(timezone.utc).isoformat()
                return {"success": True, "task": task}

        return {"success": False, "error": f"Task '{task_id}' not found."}
