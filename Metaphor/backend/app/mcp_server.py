import uuid
import json
from typing import Optional, List
from fastmcp import FastMCP
from app.database.session import async_session_maker
from sqlmodel import select

from app.models.identity import Participant, Project
from app.models.task_handoff import Task, Handoff, Execution
from app.services.mcp_client import mcp_client

mcp = FastMCP("Metaphor Universal Agent Mesh", instructions="Metaphor is the connective layer between AI agents, MCP tools, projects, and shared context.")

@mcp.tool()
async def get_project_context(project_id: str) -> str:
    """
    Returns the current state, constraints, and active tasks for a project.
    """
    async with async_session_maker() as session:
        try:
            pid = uuid.UUID(project_id)
            project = await session.get(Project, pid)
            if not project:
                return json.dumps({"error": "Project not found"})
            
            # Fetch active tasks
            stmt = select(Task).where(Task.project_id == pid, Task.status != "completed")
            active_tasks = (await session.execute(stmt)).scalars().all()
            
            return json.dumps({
                "project": {"id": str(project.id), "name": project.name, "description": project.description},
                "active_tasks": [{"id": str(t.id), "title": t.title, "status": t.status} for t in active_tasks]
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

@mcp.tool()
async def list_capabilities() -> str:
    """
    Returns a list of all unique capabilities that the Metaphor network (agents and tools) can provide.
    """
    async with async_session_maker() as session:
        stmt = select(Participant)
        participants = (await session.execute(stmt)).scalars().all()
        
        all_capabilities = set()
        for p in participants:
            for cap in p.capabilities:
                all_capabilities.add(cap)
                
        return json.dumps({
            "capabilities": list(all_capabilities),
            "participant_count": len(participants)
        }, indent=2)

@mcp.tool()
async def find_capable_participants(required_capabilities: List[str]) -> str:
    """
    Returns Level 2 capability matches: Participants (Agents or Tools) that have the required capabilities.
    """
    async with async_session_maker() as session:
        stmt = select(Participant)
        all_participants = (await session.execute(stmt)).scalars().all()
        
        matches = []
        for p in all_participants:
            # Check if participant has ALL required capabilities
            if all(req in p.capabilities for req in required_capabilities):
                matches.append({
                    "id": str(p.id),
                    "name": p.name,
                    "type": p.type,
                    "capabilities": p.capabilities
                })
                
        return json.dumps({"matches": matches}, indent=2)

@mcp.tool()
async def create_task(objective: str, project_id: str, title: str, required_capabilities: List[str] = []) -> str:
    """
    Initializes new work (a Task).
    """
    async with async_session_maker() as session:
        try:
            pid = uuid.UUID(project_id)
            project = await session.get(Project, pid)
            if not project:
                return json.dumps({"error": "Project not found"})
                
            task = Task(
                organization_id=project.organization_id,
                project_id=pid,
                title=title,
                objective=objective,
                required_capabilities=required_capabilities,
                status="pending"
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)
            
            return json.dumps({
                "success": True,
                "task_id": str(task.id),
                "title": task.title,
                "status": task.status
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

@mcp.tool()
async def create_handoff(task_id: str, from_participant_id: str, to_participant_id: str, expected_output: str, context_package: dict = {}) -> str:
    """
    Passes the baton to another participant to continue work on a task.
    """
    async with async_session_maker() as session:
        try:
            tid = uuid.UUID(task_id)
            task = await session.get(Task, tid)
            if not task:
                return json.dumps({"error": "Task not found"})
                
            from_pid = uuid.UUID(from_participant_id)
            to_pid = uuid.UUID(to_participant_id)
            
            handoff = Handoff(
                task_id=tid,
                from_participant_id=from_pid,
                to_participant_id=to_pid,
                expected_output=expected_output,
                context_refs=context_package,
                status="pending"
            )
            session.add(handoff)
            
            task.owner_participant_id = to_pid
            task.status = "in_progress"
            
            await session.commit()
            await session.refresh(handoff)
            
            return json.dumps({
                "success": True,
                "handoff_id": str(handoff.id),
                "task_id": str(task.id),
                "owner_participant_id": str(task.owner_participant_id)
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

@mcp.tool()
async def submit_result(task_id: str, participant_id: str, action: str, result_summary: str, evidence_refs: dict = {}) -> str:
    """
    Completes work and records the execution log.
    """
    async with async_session_maker() as session:
        try:
            tid = uuid.UUID(task_id)
            task = await session.get(Task, tid)
            if not task:
                return json.dumps({"error": "Task not found"})
                
            pid = uuid.UUID(participant_id)
            
            execution = Execution(
                task_id=tid,
                participant_id=pid,
                action=action,
                result=result_summary,
                evidence_refs=evidence_refs
            )
            session.add(execution)
            
            task.status = "completed"
            
            await session.commit()
            await session.refresh(execution)
            
            return json.dumps({
                "success": True,
                "execution_id": str(execution.id),
                "task_status": task.status
            }, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

@mcp.tool()
async def request_tool_action(participant_id: str, tool_name: str, arguments: dict) -> str:
    """
    Proxies a tool call to an external MCP server (Participant) via Metaphor.
    """
    async with async_session_maker() as session:
        try:
            pid = uuid.UUID(participant_id)
            participant = await session.get(Participant, pid)
            if not participant:
                return json.dumps({"error": "Participant not found"})
                
            config = participant.connection_config
            if not config or "command" not in config:
                return json.dumps({"error": "Participant has no connection config"})
                
            command = config["command"]
            args = config.get("args", [])
            env = config.get("env", None)
            
            # Ensure connection
            await mcp_client.connect_to_server(
                server_id=str(participant.id),
                command=command,
                args=args,
                env=env
            )
            
            # Call tool
            result = await mcp_client.call_tool(
                server_id=str(participant.id),
                tool_name=tool_name,
                arguments=arguments
            )
            
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

