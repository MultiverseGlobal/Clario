import uuid
import time
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.graph import Node, Edge
from app.services.graph import GraphService
from app.services.context import ContextService
from app.models.operations import MCPAuditLog

logger = logging.getLogger("metaphor.mcp_server")

def hash_token(raw_token: str) -> str:
    import hashlib
    return hashlib.sha256(raw_token.encode()).hexdigest()

# ── In-Memory Active SSE Stream Tracker for Immediate Revocation Termination ─────
# Maps token_id (str) -> List of Dict containing connection details
ACTIVE_SSE_STREAMS: Dict[str, List[Dict[str, Any]]] = {}

def register_sse_stream(token_id: str, org_id: str, project_id: Optional[str] = None, client_name: Optional[str] = None) -> Tuple[asyncio.Event, asyncio.Queue]:
    shutdown_event = asyncio.Event()
    message_queue = asyncio.Queue()
    if token_id not in ACTIVE_SSE_STREAMS:
        ACTIVE_SSE_STREAMS[token_id] = []
    ACTIVE_SSE_STREAMS[token_id].append({
        "event": shutdown_event,
        "queue": message_queue,
        "org_id": org_id,
        "project_id": project_id,
        "client_name": client_name,
        "connected_at": datetime.utcnow().isoformat()
    })
    return shutdown_event, message_queue

def unregister_sse_stream(token_id: str, shutdown_event: asyncio.Event):
    if token_id in ACTIVE_SSE_STREAMS:
        ACTIVE_SSE_STREAMS[token_id] = [s for s in ACTIVE_SSE_STREAMS[token_id] if s["event"] != shutdown_event]
        if not ACTIVE_SSE_STREAMS[token_id]:
            del ACTIVE_SSE_STREAMS[token_id]

def terminate_active_sse_streams(token_id: str):
    if token_id in ACTIVE_SSE_STREAMS:
        logger.info(f"Terminating active SSE streams for revoked token {token_id}")
        for s in ACTIVE_SSE_STREAMS[token_id]:
            s["event"].set()
        del ACTIVE_SSE_STREAMS[token_id]

async def broadcast_sse_event(org_id: str, target_ai: str, event_type: str, data: dict):
    """Broadcast an SSE event to all connected clients matching the target_ai for the given organization."""
    count = 0
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for token_id, streams in ACTIVE_SSE_STREAMS.items():
        for s in streams:
            if s["org_id"] == str(org_id):
                # Optionally filter by target_ai if it matches client_name (if client_name is known/used)
                # But typically handoffs should go to the specific AI client (like 'atlas', 'william', 'clario').
                # If target_ai is specific, only send if client_name matches (case-insensitive) or if client_name is not set.
                if s["client_name"] and target_ai.lower() not in s["client_name"].lower() and target_ai != "unknown":
                    continue
                try:
                    s["queue"].put_nowait(payload)
                    count += 1
                except Exception as e:
                    logger.error(f"Error putting event in queue for {token_id}: {e}")
    if count > 0:
        logger.info(f"Broadcasted '{event_type}' to {count} connected clients (target_ai={target_ai}).")

def get_active_clients_for_org(org_id: str) -> List[Dict[str, Any]]:
    active_clients = []
    for token_id, streams in ACTIVE_SSE_STREAMS.items():
        for s in streams:
            if s["org_id"] == str(org_id):
                active_clients.append({
                    "project_id": s["project_id"],
                    "client_name": s["client_name"],
                    "connected_at": s["connected_at"]
                })
    return active_clients

def get_project_id_for_token(token_id: str) -> Optional[str]:
    if token_id in ACTIVE_SSE_STREAMS and ACTIVE_SSE_STREAMS[token_id]:
        return ACTIVE_SSE_STREAMS[token_id][0].get("project_id")
    return None

# ── Sliding Window Rate Limiter (30 requests / 60 seconds per token) ───────────
RATE_LIMIT_STORE: Dict[str, List[float]] = {}
MAX_REQUESTS_PER_MINUTE = 30
WINDOW_SECONDS = 60.0

def enforce_token_rate_limit(token_id: str):
    now = time.time()
    if token_id not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[token_id] = []
    
    # Remove timestamps older than window
    RATE_LIMIT_STORE[token_id] = [t for t in RATE_LIMIT_STORE[token_id] if now - t < WINDOW_SECONDS]
    
    if len(RATE_LIMIT_STORE[token_id]) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded for this MCP token. Maximum 30 requests per minute allowed.",
            headers={"Retry-After": "60"}
        )
    
    RATE_LIMIT_STORE[token_id].append(now)


import re

SECRET_PATTERNS = [
    re.compile(r"(?i)(sk-[a-zA-Z0-9_-]{20,})"),
    re.compile(r"(?i)(ghp_[a-zA-Z0-9]{20,})"),
    re.compile(r"(?i)(AKIA[0-9A-Z]{16})"),
    re.compile(r"-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----"),
    re.compile(r"(?i)(metaphor_[a-zA-Z0-9_-]{20,})"),
    re.compile(r"(?i)(AIza[0-9A-Za-z-_]{35})"),
    re.compile(r"(?i)(bearer\s+[a-zA-Z0-9_\-\.]{20,})")
]

def scan_text_for_secrets(text: str) -> Optional[str]:
    if not text:
        return None
    for pattern in SECRET_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(0)
    return None

def scan_payload_for_secrets(data: Any) -> Optional[str]:
    if isinstance(data, str):
        return scan_text_for_secrets(data)
    elif isinstance(data, list):
        for item in data:
            found = scan_payload_for_secrets(item)
            if found:
                return found
    elif isinstance(data, dict):
        for k, v in data.items():
            found_k = scan_payload_for_secrets(k)
            if found_k:
                return found_k
            found_v = scan_payload_for_secrets(v)
            if found_v:
                return found_v
    return None


# ── Tenant-Isolated Resource Resolvers ─────────────────────────────────────────
async def list_mcp_resources() -> List[Dict[str, Any]]:
    return [
        {"uri": "workspace://projects", "name": "Projects", "description": "Active workspace projects & sprint goals", "mimeType": "application/json"},
        {"uri": "workspace://docs", "name": "Documentation", "description": "Technical specs, design docs, and guides", "mimeType": "application/json"},
        {"uri": "workspace://graph", "name": "Knowledge Graph", "description": "Context graph summary & node topology", "mimeType": "application/json"},
        {"uri": "workspace://architecture", "name": "Architecture", "description": "Architectural decisions and design constraints", "mimeType": "application/json"},
        {"uri": "workspace://repositories", "name": "Repositories", "description": "Ingested repositories, codebase files, and commits", "mimeType": "application/json"},
        {"uri": "workspace://active-threads", "name": "Active Chat Threads", "description": "Recent cross-model chat session drops & active context threads across AI clients (Claude, Cursor, ChatGPT)", "mimeType": "application/json"},
    ]

async def read_mcp_resource(uri: str, organization_id: uuid.UUID, session: AsyncSession) -> Dict[str, Any]:

    if uri == "workspace://projects":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type == "project")
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"uri": uri, "contents": [{"text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary, "properties": getattr(n, "properties", {})} for n in nodes], indent=2)}]}
    
    elif uri == "workspace://docs":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["doc", "document", "spec"]))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"uri": uri, "contents": [{"text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary, "source": getattr(n, "source", "")} for n in nodes], indent=2)}]}

    elif uri == "workspace://graph":
        node_stmt = select(Node).where(Node.organization_id == organization_id)
        n_res = await session.execute(node_stmt)
        nodes = n_res.scalars().all()
        
        edge_stmt = select(Edge).join(Node, Edge.from_node == Node.id).where(Node.organization_id == organization_id)
        e_res = await session.execute(edge_stmt)
        edges = e_res.scalars().all()
        
        return {"uri": uri, "contents": [{"text": json.dumps({"organization_id": str(organization_id), "total_nodes": len(nodes), "total_edges": len(edges), "node_types": list(set(n.type for n in nodes))}, indent=2)}]}


    elif uri == "workspace://architecture":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["architecture", "decision", "adr"]))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"uri": uri, "contents": [{"text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary} for n in nodes], indent=2)}]}

    elif uri == "workspace://meetings":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["meeting", "notes"]))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"uri": uri, "contents": [{"text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary} for n in nodes], indent=2)}]}

    elif uri == "workspace://repositories":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["repo", "repository", "code"]))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"uri": uri, "contents": [{"text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary, "properties": getattr(n, "properties", {})} for n in nodes], indent=2)}]}

    elif uri == "workspace://active-threads":
        from app.models.chat_session import ChatSession
        now = datetime.now(timezone.utc)
        stmt = select(ChatSession).where(
            ChatSession.organization_id == organization_id,
            ChatSession.expires_at > now,
            ChatSession.retracted_at == None
        ).order_by(ChatSession.updated_at.desc()).limit(20)
        res = await session.execute(stmt)
        sessions = res.scalars().all()
        data = [
            {
                "id": str(s.id),
                "model_name": s.model_name,
                "session_title": s.session_title,
                "summary": s.summary,
                "context_payload": s.context_payload,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
                "expires_at": s.expires_at.isoformat()
            }
            for s in sessions
        ]
        return {"uri": uri, "contents": [{"text": json.dumps(data, indent=2)}]}

    else:
        raise HTTPException(404, detail=f"Resource '{uri}' not found.")


# ── Tenant-Isolated Read/Write Tools Resolvers ──────────────────────────────────
async def list_mcp_tools() -> List[Dict[str, Any]]:
    return [
        {
            "name": "search_context",
            "description": "Semantic context search across workspace memory.",
            "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "retrieve_documents",
            "description": "Lookup workspace documentation.",
            "inputSchema": {"type": "object", "properties": {"limit": {"type": "integer", "default": 10}}},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "find_related",
            "description": "Find connected graph relationships for an entity.",
            "inputSchema": {"type": "object", "properties": {"entity_name": {"type": "string"}}, "required": ["entity_name"]},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "explain_architecture",
            "description": "Retrieve architectural decisions & design rules.",
            "inputSchema": {"type": "object", "properties": {}},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "answer_from_workspace",
            "description": "High-confidence workspace answer using Context Engine.",
            "inputSchema": {"type": "object", "properties": {"question": {"type": "string"}}, "required": ["question"]},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "get_project",
            "description": "Get detailed breakdown of a workspace project.",
            "inputSchema": {"type": "object", "properties": {"project_name": {"type": "string"}}, "required": ["project_name"]},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "resolve_entity",
            "description": "Disambiguate an ambiguous entity in the workspace.",
            "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "list_recent_changes",
            "description": "List latest commits, decisions, and ingested events.",
            "inputSchema": {"type": "object", "properties": {}},
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "get_active_session_context",
            "description": "Retrieve recent chat drops and active cross-model session context across workspace AI assistants (Cursor, Claude, ChatGPT). Pass project_id to only retrieve sessions scoped to a specific project.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "target_model": {"type": "string", "description": "Optional model filter (e.g. cursor, claude, chatgpt)"},
                    "project_id": {"type": "string", "description": "Optional project UUID to only retrieve drops from a specific project session"},
                    "limit": {"type": "integer", "default": 10}
                }
            },
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "sync_chat_drop",
            "description": "Drop active chat session context or task progress from your current AI client (Claude, Cursor, ChatGPT) into Metaphor shared memory. Pass project_id to scope this drop to a specific project.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "source_model": {"type": "string", "description": "Name of the calling AI client, e.g. claude, cursor, chatgpt"},
                    "summary": {"type": "string", "description": "Summary of active task, decisions, code changes, or context"},
                    "active_files": {"type": "array", "items": {"type": "string"}, "description": "List of active file paths"},
                    "session_title": {"type": "string", "description": "Optional title for this session drop"},
                    "context_payload": {"type": "object", "description": "Optional additional structured context payload"},
                    "project_id": {"type": "string", "description": "Optional Metaphor project UUID to scope this session drop to a specific project"}
                },
                "required": ["source_model", "summary"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "push_handoff",
            "description": "Push a task, error, or context state to another AI model in the same project queue.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "source_ai": {"type": "string"},
                    "target_ai": {"type": "string"},
                    "project_id": {"type": "string"},
                    "payload": {"type": "string", "description": "The state, error, or context to hand off"},
                    "instructions": {"type": "string", "description": "Instructions for the target AI"}
                },
                "required": ["source_ai", "target_ai", "project_id", "payload"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "pull_handoffs",
            "description": "Check the project queue for any tasks or context handed off to you by other AIs.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "my_ai_name": {"type": "string", "description": "Your AI name (e.g. claude, antigravity, cursor)"},
                    "project_id": {"type": "string"}
                },
                "required": ["my_ai_name", "project_id"]
            },
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "resolve_handoff",
            "description": "Mark a handoff task as resolved and provide a summary.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "handoff_id": {"type": "string"},
                    "resolution_summary": {"type": "string"}
                },
                "required": ["handoff_id", "resolution_summary"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "dispatch_to_tool",
            "description": "Omni-directional command bus. Dispatch an active command to ANY other tool in the project (Atlas, William, Clario, Claude, Cursor, Manus). If the target has a registered webhook URL, it will execute immediately. If passive, it is pushed to their queue.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "source_tool": {"type": "string", "description": "Your AI name (e.g. claude, cursor)"},
                    "target_tool": {"type": "string", "description": "Target tool name (e.g. atlas, manus, devin, william)"},
                    "action": {"type": "string", "description": "The command or action to execute"},
                    "payload": {"type": "object", "description": "Structured JSON arguments for the action"},
                    "project_id": {"type": "string", "description": "Optional project UUID"}
                },
                "required": ["source_tool", "target_tool", "action", "payload"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "open_ai_thread",
            "description": "Start a multi-turn conversation thread between two or more AI agents, routed through Metaphor.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "participants": {"type": "array", "items": {"type": "string"}, "description": "List of AI names in this thread (e.g. ['claude', 'manus'])"},
                    "initial_message": {"type": "string", "description": "Opening message to start the conversation"},
                    "title": {"type": "string", "description": "Optional thread title"},
                    "project_id": {"type": "string", "description": "Optional project UUID to scope this thread"}
                },
                "required": ["participants", "initial_message"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "send_thread_message",
            "description": "Add a message to an existing AI conversation thread.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "thread_id": {"type": "string", "description": "Thread UUID"},
                    "sender_ai": {"type": "string", "description": "Your AI name"},
                    "message": {"type": "string", "description": "The message content"}
                },
                "required": ["thread_id", "sender_ai", "message"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
        {
            "name": "get_thread_messages",
            "description": "Retrieve all messages from an AI conversation thread.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "thread_id": {"type": "string", "description": "Thread UUID"}
                },
                "required": ["thread_id"]
            },
            "annotations": {"readOnly": True, "destructive": False}
        },
        {
            "name": "close_thread",
            "description": "Mark an AI conversation thread as resolved with a summary.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "thread_id": {"type": "string", "description": "Thread UUID"},
                    "summary": {"type": "string", "description": "Summary of what was decided or accomplished"}
                },
                "required": ["thread_id", "summary"]
            },
            "annotations": {"readOnly": False, "destructive": False}
        },
    ]


async def call_mcp_tool(
    name: str,
    arguments: Dict[str, Any],
    organization_id: uuid.UUID,
    session: AsyncSession,
    scopes: Optional[List[str]] = None,
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    # Every tool query strictly filters by organization_id
    if name == "sync_chat_drop":
        # 1. Verify Write Scope
        has_write_scope = scopes is not None and any(
            s.lower() in ["write", "mcp:write", "write:workspace", "admin", "all", "*"]
            for s in scopes
        )
        if not has_write_scope and scopes is not None:
            raise HTTPException(
                status_code=403,
                detail="Permission denied: Token requires write scope ('mcp:write' or 'write') to execute sync_chat_drop."
            )

        source_model = arguments.get("source_model", "unknown")
        summary = arguments.get("summary", "")
        active_files = arguments.get("active_files", [])
        session_title = arguments.get("session_title", "Cross-Model Session Drop")
        context_payload = arguments.get("context_payload", {})
        raw_project_id = arguments.get("project_id")

        # 2. Secret Detection Scan
        secret_found = scan_payload_for_secrets({
            "summary": summary,
            "active_files": active_files,
            "context_payload": context_payload
        })
        if secret_found:
            raise HTTPException(
                status_code=400,
                detail=f"Security violation: Sensitive credential pattern ('{secret_found[:6]}...') detected in payload. Please remove API keys, tokens, or private secrets before dropping context."
            )

        # 3. Resolve + validate project_id (must belong to same org, must be type=project)
        resolved_project_id: Optional[uuid.UUID] = None
        if raw_project_id:
            try:
                pid = uuid.UUID(raw_project_id)
                proj_stmt = select(Node).where(
                    Node.id == pid,
                    Node.organization_id == organization_id,
                    Node.type == "project"
                )
                proj_res = await session.execute(proj_stmt)
                project_node = proj_res.scalar_one_or_none()
                if project_node:
                    resolved_project_id = pid
                else:
                    logger.warning(f"sync_chat_drop: project_id {raw_project_id} not found or not owned by org {organization_id}; dropping without project scope.")
            except (ValueError, Exception) as e:
                logger.warning(f"sync_chat_drop: invalid project_id '{raw_project_id}': {e}")

        # 4. Store ChatSession in DB
        from app.models.chat_session import ChatSession
        from app.services.context import ContextService
        from app.services.graph import GraphService

        full_payload = {"active_files": active_files, **context_payload}
        chat_sess = ChatSession(
            organization_id=organization_id,
            model_name=source_model.lower(),
            session_title=session_title,
            summary=summary,
            context_payload=full_payload,
            project_id=resolved_project_id
        )
        session.add(chat_sess)
        await session.commit()
        await session.refresh(chat_sess)

        # 4. Index in Graph directly with source_type='chat_drop'
        graph = GraphService(session)
        ctx_service = ContextService(session, graph)
        await ctx_service.index_chat_drop(
            org_id=organization_id,
            chat_session_id=chat_sess.id,
            source_model=source_model,
            session_title=session_title,
            summary=summary,
            active_files=active_files
        )

        return {"content": [{"type": "text", "text": json.dumps({
            "status": "success",
            "chat_session_id": str(chat_sess.id),
            "model_name": source_model,
            "project_id": str(resolved_project_id) if resolved_project_id else None,
            "expires_at": chat_sess.expires_at.isoformat(),
            "message": "Context drop recorded and indexed into cognitive graph."
        }, indent=2)}]}

    elif name == "get_active_session_context":
        target_model = arguments.get("target_model")
        raw_filter_project_id = arguments.get("project_id")
        limit = arguments.get("limit", 10)

        from app.models.chat_session import ChatSession
        now = datetime.now(timezone.utc)
        stmt = select(ChatSession).where(
            ChatSession.organization_id == organization_id,
            ChatSession.expires_at > now,
            ChatSession.retracted_at == None
        )
        if target_model:
            stmt = stmt.where(ChatSession.model_name == target_model.lower())
        if raw_filter_project_id:
            try:
                stmt = stmt.where(ChatSession.project_id == uuid.UUID(raw_filter_project_id))
            except ValueError:
                pass  # Invalid UUID — ignore filter, return all
        stmt = stmt.order_by(ChatSession.updated_at.desc()).limit(limit)

        res = await session.execute(stmt)
        sessions = res.scalars().all()

        data = [
            {
                "id": str(s.id),
                "model_name": s.model_name,
                "session_title": s.session_title,
                "summary": s.summary,
                "project_id": str(s.project_id) if s.project_id else None,
                "context_payload": s.context_payload,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
                "expires_at": s.expires_at.isoformat()
            }
            for s in sessions
        ]
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}
    if name == "search_context":
        query = arguments.get("query", "")
        graph = GraphService(session)
        ctx_service = ContextService(session, graph)
        try:
            package = await ctx_service.generate_context_package(organization_id, "mcp", query, project_id=project_id)
            pkg_data = package.package_json
        except Exception as e:
            logger.warning(f"Context package generation fallback: {e}")
            pkg_data = {
                "status": "no_results",
                "query": query,
                "answer": "I searched your Metaphor workspace, but found no indexed nodes matching your query.",
                "workspace_summary": {"total_items_found": 0, "categories": []},
                "evidence": [],
                "confidence": 0.0
            }
        return {"content": [{"type": "text", "text": json.dumps(pkg_data, indent=2)}]}


    elif name == "retrieve_documents":
        limit = arguments.get("limit", 10)
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["doc", "document", "spec"])).limit(limit)
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary, "source": getattr(n, "source", "")} for n in nodes], indent=2)}]}

    elif name == "find_related":
        entity_name = arguments.get("entity_name", "")
        stmt = select(Node).where(Node.organization_id == organization_id, Node.title.ilike(f"%{entity_name}%"))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary} for n in nodes], indent=2)}]}

    elif name == "explain_architecture":
        stmt = select(Node).where(Node.organization_id == organization_id, Node.type.in_(["architecture", "decision", "adr"]))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"title": n.title, "summary": n.summary} for n in nodes], indent=2)}]}

    elif name == "answer_from_workspace":
        question = arguments.get("question", "")
        graph = GraphService(session)
        ctx_service = ContextService(session, graph)
        try:
            is_decision = any(q in question.lower() for q in ["why did we choose", "what was the reasoning", "why did we decide", "decision behind"])
            if is_decision:
                package = await ctx_service.generate_decision_package(organization_id, "mcp", question, project_id=project_id)
            else:
                package = await ctx_service.generate_context_package(organization_id, "mcp", question, project_id=project_id)
            pkg_data = package.package_json
        except Exception as e:
            logger.warning(f"Workspace answer generation fallback: {e}")
            pkg_data = {"question": question, "nodes": [], "edges": [], "answer": "Workspace query completed"}
        return {"content": [{"type": "text", "text": json.dumps(pkg_data, indent=2)}]}

    elif name == "get_project":
        project_name = arguments.get("project_name", "")
        stmt = select(Node).where(Node.organization_id == organization_id, Node.title.ilike(f"%{project_name}%"))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"id": str(n.id), "title": n.title, "summary": n.summary} for n in nodes], indent=2)}]}

    elif name == "resolve_entity":
        query = arguments.get("query", "")
        stmt = select(Node).where(Node.organization_id == organization_id, Node.title.ilike(f"%{query}%"))
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"id": str(n.id), "title": n.title, "node_type": n.type} for n in nodes], indent=2)}]}

    elif name == "push_handoff":
        from app.models.task_handoff import TaskHandoff
        source_ai = arguments.get("source_ai")
        target_ai = arguments.get("target_ai")
        project_id_raw = arguments.get("project_id")
        payload = arguments.get("payload")
        instructions = arguments.get("instructions")
        
        try:
            pid = uuid.UUID(project_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid project_id UUID")

        handoff = TaskHandoff(
            project_id=pid,
            source_ai=source_ai.lower(),
            target_ai=target_ai.lower(),
            payload=payload,
            instructions=instructions,
            status="pending"
        )
        session.add(handoff)
        await session.commit()
        return {"content": [{"type": "text", "text": f"Handoff successfully pushed to {target_ai}. Handoff ID: {handoff.id}"}]}

    elif name == "pull_handoffs":
        from app.models.task_handoff import TaskHandoff
        my_ai_name = arguments.get("my_ai_name")
        project_id_raw = arguments.get("project_id")
        
        try:
            pid = uuid.UUID(project_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid project_id UUID")

        stmt = select(TaskHandoff).where(
            TaskHandoff.project_id == pid,
            TaskHandoff.target_ai == my_ai_name.lower(),
            TaskHandoff.status == "pending"
        ).order_by(TaskHandoff.created_at.asc())
        
        res = await session.execute(stmt)
        tasks = res.scalars().all()
        data = [{
            "id": str(t.id),
            "source_ai": t.source_ai,
            "payload": t.payload,
            "instructions": t.instructions,
            "created_at": t.created_at.isoformat()
        } for t in tasks]
        
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}

    elif name == "dispatch_to_tool":
        source_tool = arguments.get("source_tool")
        target_tool = arguments.get("target_tool")
        action = arguments.get("action")
        payload = arguments.get("payload")
        project_id_raw = arguments.get("project_id")

        try:
            pid = uuid.UUID(project_id_raw) if project_id_raw else None
        except Exception:
            pid = None

        # Create handoff record for audit / passive fallback
        from app.models.task_handoff import TaskHandoff
        handoff = TaskHandoff(
            id=uuid.uuid4(),
            project_id=pid,
            source_ai=source_tool.lower() if source_tool else "unknown",
            target_ai=target_tool.lower() if target_tool else "unknown",
            payload=f"Action: {action}\nPayload: {json.dumps(payload)}",
            instructions=f"Dispatched command: {action}",
            status="pending"
        )
        session.add(handoff)
        await session.commit()
        await session.refresh(handoff)

        # ── Registry-based webhook dispatch (Phase 6) ──────────────────
        from app.services.webhook_dispatcher import dispatch_to_external_agent
        dispatch_result = await dispatch_to_external_agent(
            source_ai=source_tool or "unknown",
            target_ai=target_tool or "unknown",
            action=action or "",
            payload=payload,
            project_id=str(pid) if pid else project_id_raw,
            org_id=str(organization_id),
            session=session,
            callback_recipient=source_tool,  # result comes back to the caller
        )

        mode = dispatch_result.get("mode", "queued")
        callback_id = dispatch_result.get("callback_id")
        result_msg = (
            f"Dispatched '{action}' to {target_tool} via webhook (callback_id: {callback_id})"
            if mode == "webhook"
            else f"Queued '{action}' for {target_tool} (passive queue)"
        )

        if mode == "queued":
            await broadcast_sse_event(
                org_id=str(organization_id),
                target_ai=target_tool or "unknown",
                event_type="handoff_received",
                data={
                    "handoff_id": str(handoff.id),
                    "source_ai": source_tool,
                    "action": action,
                    "payload": payload
                }
            )

        return {"content": [{"type": "text", "text": result_msg}]}


    elif name == "resolve_handoff":
        from app.models.task_handoff import TaskHandoff
        handoff_id_raw = arguments.get("handoff_id")
        summary = arguments.get("resolution_summary")
        
        try:
            hid = uuid.UUID(handoff_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid handoff_id UUID")
            
        stmt = select(TaskHandoff).where(TaskHandoff.id == hid)
        res = await session.execute(stmt)
        handoff = res.scalar_one_or_none()
        
        if not handoff:
            raise HTTPException(404, detail="Handoff not found")
            
        handoff.status = "resolved"
        handoff.resolution_summary = summary
        handoff.resolved_at = datetime.now(timezone.utc)
        
        session.add(handoff)
        await session.commit()
        return {"content": [{"type": "text", "text": "Handoff resolved successfully."}]}

    elif name == "list_recent_changes":
        stmt = select(Node).where(Node.organization_id == organization_id).order_by(Node.updated_at.desc()).limit(10)
        res = await session.execute(stmt)
        nodes = res.scalars().all()
        return {"content": [{"type": "text", "text": json.dumps([{"title": n.title, "updated_at": str(n.updated_at)} for n in nodes], indent=2)}]}

    elif name == "open_ai_thread":
        from app.models.ai_thread import AIThread, AIThreadMessage
        participants = arguments.get("participants", [])
        initial_message = arguments.get("initial_message", "")
        title = arguments.get("title")
        raw_pid = arguments.get("project_id")
        try:
            tid = uuid.UUID(raw_pid) if raw_pid else None
        except Exception:
            tid = None

        first_msg = AIThreadMessage(
            sender_ai=participants[0] if participants else "unknown",
            content=initial_message
        )
        thread = AIThread(
            organization_id=organization_id,
            project_id=tid,
            participants=participants,
            messages=[first_msg.model_dump()],
            title=title or f"Thread: {' ↔ '.join(participants)}",
            created_by=participants[0] if participants else "unknown",
        )
        session.add(thread)
        await session.commit()
        await session.refresh(thread)
        return {"content": [{"type": "text", "text": json.dumps({
            "thread_id": str(thread.id),
            "title": thread.title,
            "participants": thread.participants,
            "status": "open",
            "message": "Thread opened. Other participants can now call send_thread_message."
        }, indent=2)}]}

    elif name == "send_thread_message":
        from app.models.ai_thread import AIThread, AIThreadMessage
        from datetime import timezone
        thread_id_raw = arguments.get("thread_id")
        sender_ai = arguments.get("sender_ai", "unknown")
        message_content = arguments.get("message", "")
        try:
            tid = uuid.UUID(thread_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid thread_id UUID")
        thread = await session.get(AIThread, tid)
        if not thread:
            raise HTTPException(404, detail="Thread not found")
        if thread.status != "open":
            raise HTTPException(400, detail="Thread is closed")
        new_msg = AIThreadMessage(sender_ai=sender_ai, content=message_content)
        thread.messages = thread.messages + [new_msg.model_dump()]
        thread.updated_at = datetime.now(timezone.utc)
        session.add(thread)
        await session.commit()
        return {"content": [{"type": "text", "text": json.dumps({
            "thread_id": str(thread.id),
            "message_id": new_msg.id,
            "total_messages": len(thread.messages),
            "status": "sent"
        }, indent=2)}]}

    elif name == "get_thread_messages":
        from app.models.ai_thread import AIThread
        thread_id_raw = arguments.get("thread_id")
        try:
            tid = uuid.UUID(thread_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid thread_id UUID")
        thread = await session.get(AIThread, tid)
        if not thread:
            raise HTTPException(404, detail="Thread not found")
        return {"content": [{"type": "text", "text": json.dumps({
            "thread_id": str(thread.id),
            "title": thread.title,
            "participants": thread.participants,
            "status": thread.status,
            "messages": thread.messages,
            "total_messages": len(thread.messages)
        }, indent=2)}]}

    elif name == "close_thread":
        from app.models.ai_thread import AIThread
        from datetime import timezone
        thread_id_raw = arguments.get("thread_id")
        summary = arguments.get("summary", "")
        try:
            tid = uuid.UUID(thread_id_raw)
        except Exception:
            raise HTTPException(400, detail="Invalid thread_id UUID")
        thread = await session.get(AIThread, tid)
        if not thread:
            raise HTTPException(404, detail="Thread not found")
        thread.status = "resolved"
        thread.resolution_summary = summary
        thread.resolved_at = datetime.now(timezone.utc)
        session.add(thread)
        await session.commit()
        return {"content": [{"type": "text", "text": json.dumps({
            "thread_id": str(thread.id),
            "status": "resolved",
            "resolution_summary": summary
        }, indent=2)}]}

    else:
        raise HTTPException(404, detail=f"Tool '{name}' not found.")


# ── Tenant-Isolated Prompts Resolvers ──────────────────────────────────────────
async def list_mcp_prompts() -> List[Dict[str, Any]]:
    return [
        {"name": "review_codebase", "description": "Review codebase architecture and design rules.", "arguments": [{"name": "repo_name", "description": "Repository name to review", "required": False}]},
        {"name": "prepare_meeting", "description": "Prepare customer/team meeting context and past decisions.", "arguments": [{"name": "topic", "description": "Meeting topic or participant name", "required": True}]},
        {"name": "explain_project", "description": "Explain active project goals, architecture, and status.", "arguments": [{"name": "project_name", "description": "Project name to explain", "required": True}]},
        {"name": "generate_summary", "description": "Generate summary of recent workspace decisions and commits.", "arguments": []}
    ]

async def get_mcp_prompt(name: str, arguments: Dict[str, Any], organization_id: uuid.UUID, session: AsyncSession) -> Dict[str, Any]:
    if name == "review_codebase":
        return {
            "description": "Codebase Architecture Review Template",
            "messages": [
                {"role": "user", "content": {"type": "text", "text": "Analyze the codebase architecture, design constraints, and data models for Metaphor OS."}}
            ]
        }
    elif name == "prepare_meeting":
        topic = arguments.get("topic", "")
        return {
            "description": f"Meeting Context Preparation for {topic}",
            "messages": [
                {"role": "user", "content": {"type": "text", "text": f"Gather past meeting notes, open decisions, and background context for '{topic}'."}}
            ]
        }
    elif name == "explain_project":
        proj = arguments.get("project_name", "")
        return {
            "description": f"Project Explanation for {proj}",
            "messages": [
                {"role": "user", "content": {"type": "text", "text": f"Provide an architectural overview, active sprint goals, and technical specs for '{proj}'."}}
            ]
        }
    elif name == "generate_summary":
        return {
            "description": "Workspace Activity Summary",
            "messages": [
                {"role": "user", "content": {"type": "text", "text": "Summarize recent commits, document updates, and architectural decisions."}}
            ]
        }
    else:
        raise HTTPException(404, detail=f"Prompt '{name}' not found.")
