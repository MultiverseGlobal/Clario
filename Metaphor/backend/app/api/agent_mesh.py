"""
FastAPI REST router for Metaphor Agent Mesh.
Provides clean HTTP endpoints for ChatGPT Custom Actions, web agents (Manus, Perplexity),
and local/remote tools to collaborate on a shared project task board.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from app.services.agent_mesh import AgentMeshService

router = APIRouter(prefix="/mesh", tags=["Agent Mesh"])

# ── Pydantic Request / Response Schemas ───────────────────────────────────────

class RecommendAgentRequest(BaseModel):
    task_description: str = Field(..., description="Description of the task to be performed")

class CreateTaskRequest(BaseModel):
    title: str = Field(..., description="Short title of the task")
    description: str = Field(..., description="Detailed instructions and context for the task")
    assigned_to: str = Field(..., description="Target AI agent: antigravity, chatgpt, atlas, clario, claude, manus, perplexity, orion")
    created_by: str = Field("chatgpt", description="Identifier of the creating agent (e.g. chatgpt, antigravity, user)")
    priority: str = Field("normal", description="Task priority: low, normal, high, critical")
    context_summary: Optional[str] = Field("", description="Relevant background context or architectural constraints")

class PostCheckpointRequest(BaseModel):
    task_id: str = Field(..., description="ID of the task")
    agent_name: str = Field(..., description="Name of the calling AI agent")
    summary: str = Field(..., description="Summary of work completed, decisions made, or current status")
    files_touched: Optional[List[str]] = Field(None, description="List of file paths modified or created")
    next_steps: Optional[str] = Field(None, description="Recommended next steps for the next collaborating AI")
    new_status: Optional[str] = Field(None, description="Optional new status: in_progress, review_needed, completed, blocked")

class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., description="New status: pending, in_progress, review_needed, completed, blocked")
    notes: Optional[str] = Field("", description="Reason or handover notes")
    handoff_to: Optional[str] = Field(None, description="Optional agent to hand off to: antigravity, chatgpt, atlas, etc.")

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/agents")
async def get_agent_directory():
    """Returns the full directory of available AI agents, their roles, and best use cases."""
    service = AgentMeshService()
    return service.get_directory()

@router.post("/recommend-agent")
async def recommend_agent_for_task(payload: RecommendAgentRequest):
    """Analyzes a task description and returns the best-suited AI agent with rationale."""
    service = AgentMeshService()
    return service.recommend_agent(payload.task_description)

@router.get("/tasks")
async def list_board_tasks(
    status: Optional[str] = Query(None, description="Filter by status: pending, in_progress, completed, review_needed"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned agent: antigravity, chatgpt, atlas, clario, etc.")
):
    """Lists active and completed tasks on the shared cross-AI board."""
    service = AgentMeshService()
    tasks = service.list_tasks(status=status, assigned_to=assigned_to)
    return {"tasks": tasks, "count": len(tasks)}

@router.post("/tasks")
async def create_board_task(payload: CreateTaskRequest):
    """Creates a new collaborative task on the shared board for another AI agent."""
    service = AgentMeshService()
    task = service.create_task(
        title=payload.title,
        description=payload.description,
        assigned_to=payload.assigned_to,
        created_by=payload.created_by,
        priority=payload.priority,
        context_summary=payload.context_summary or "",
    )
    return {"success": True, "task": task}

@router.post("/checkpoints")
async def post_task_checkpoint(payload: PostCheckpointRequest):
    """Posts a progress checkpoint to a task with files touched and next steps."""
    service = AgentMeshService()
    res = service.post_checkpoint(
        task_id=payload.task_id,
        agent_name=payload.agent_name,
        summary=payload.summary,
        files_touched=payload.files_touched,
        next_steps=payload.next_steps,
        new_status=payload.new_status,
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res

@router.patch("/tasks/{task_id}")
async def update_task_status(task_id: str, payload: UpdateTaskStatusRequest):
    """Updates the status of a task and optionally hands it off to another AI agent."""
    service = AgentMeshService()
    res = service.update_task_status(
        task_id=task_id,
        status=payload.status,
        notes=payload.notes or "",
        handoff_to=payload.handoff_to,
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res

@router.get("/chatgpt-openapi.json")
async def get_chatgpt_openapi_schema(request: Request):
    """Returns an OpenAPI 3.1 schema specifically configured for 1-click import into ChatGPT Custom GPT Actions."""
    base_url = str(request.base_url).rstrip("/")
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "Metaphor Universal AI Agent Mesh",
            "description": "Collaborative API allowing ChatGPT to coordinate with Antigravity, Atlas, Clario, Claude, Manus, and Perplexity.",
            "version": "2.0.0"
        },
        "servers": [
            {"url": f"{base_url}/api/v1/mesh"}
        ],
        "paths": {
            "/agents": {
                "get": {
                    "operationId": "getAgentDirectory",
                    "summary": "Get the directory of all AI agents and their specialties",
                    "responses": {"200": {"description": "List of available agents and roles"}}
                }
            },
            "/recommend-agent": {
                "post": {
                    "operationId": "recommendAgent",
                    "summary": "Find out who is best for a specific job or role",
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/RecommendAgentRequest"}}}
                    },
                    "responses": {"200": {"description": "Recommendation with rationale and handoff guidelines"}}
                }
            },
            "/tasks": {
                "get": {
                    "operationId": "listTasks",
                    "summary": "List tasks on the shared cross-AI board",
                    "parameters": [
                        {"name": "status", "in": "query", "schema": {"type": "string"}},
                        {"name": "assigned_to", "in": "query", "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Active tasks on the board"}}
                },
                "post": {
                    "operationId": "createTask",
                    "summary": "Create a task for Antigravity or another AI to execute",
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateTaskRequest"}}}
                    },
                    "responses": {"200": {"description": "Created task details"}}
                }
            },
            "/checkpoints": {
                "post": {
                    "operationId": "postCheckpoint",
                    "summary": "Log progress, files touched, or results for collaborating AIs",
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/PostCheckpointRequest"}}}
                    },
                    "responses": {"200": {"description": "Logged checkpoint"}}
                }
            },
            "/tasks/{task_id}": {
                "patch": {
                    "operationId": "updateTask",
                    "summary": "Update task status or hand off to another AI",
                    "parameters": [
                        {"name": "task_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/UpdateTaskStatusRequest"}}}
                    },
                    "responses": {"200": {"description": "Updated task"}}
                }
            }
        },
        "components": {
            "schemas": {
                "RecommendAgentRequest": {
                    "type": "object",
                    "required": ["task_description"],
                    "properties": {
                        "task_description": {"type": "string", "description": "What needs to be done"}
                    }
                },
                "CreateTaskRequest": {
                    "type": "object",
                    "required": ["title", "description", "assigned_to"],
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "assigned_to": {"type": "string", "enum": ["antigravity", "chatgpt", "atlas", "clario", "claude", "manus", "perplexity", "orion"]},
                        "created_by": {"type": "string", "default": "chatgpt"},
                        "priority": {"type": "string", "enum": ["low", "normal", "high", "critical"], "default": "normal"},
                        "context_summary": {"type": "string"}
                    }
                },
                "PostCheckpointRequest": {
                    "type": "object",
                    "required": ["task_id", "agent_name", "summary"],
                    "properties": {
                        "task_id": {"type": "string"},
                        "agent_name": {"type": "string"},
                        "summary": {"type": "string"},
                        "files_touched": {"type": "array", "items": {"type": "string"}},
                        "next_steps": {"type": "string"},
                        "new_status": {"type": "string"}
                    }
                },
                "UpdateTaskStatusRequest": {
                    "type": "object",
                    "required": ["status"],
                    "properties": {
                        "status": {"type": "string", "enum": ["pending", "in_progress", "review_needed", "completed", "blocked"]},
                        "notes": {"type": "string"},
                        "handoff_to": {"type": "string"}
                    }
                }
            }
        }
    }
