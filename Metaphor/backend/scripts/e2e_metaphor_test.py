import asyncio
import uuid
import json
from sqlmodel import select, SQLModel
from app.database.session import async_session_maker, engine
from app.models.identity import Organization, Project, Participant
from app.models.task_handoff import Task, Handoff, Execution

# We can import the tool functions directly to test their logic
from app.mcp_server import (
    get_project_context,
    list_capabilities,
    find_capable_participants,
    create_task,
    create_handoff,
    submit_result,
    request_tool_action
)

async def run_e2e_test():
    print("Starting Metaphor E2E Test...")
    
    # Create tables
    async with engine.begin() as conn:
        # For a clean test, you might drop_all first, but here we just create
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session_maker() as session:
        # 1. Setup Data
        print("1. Setting up Organization, Project, and Participants...")
        org = Organization(name="Pseudonyms Inc", slug="pseudonyms-inc-test")
        session.add(org)
        await session.flush()
        
        project = Project(organization_id=org.id, name="Pseudonyms Auth Integration")
        session.add(project)
        
        chatgpt = Participant(
            organization_id=org.id,
            name="ChatGPT",
            type="agent",
            capabilities=["planning", "coordination", "code_review"]
        )
        
        auth_tool = Participant(
            organization_id=org.id,
            name="Auth Generator MCP",
            type="tool",
            capabilities=["generate_auth_scaffold", "setup_oauth"],
            # Normally this would be something like 'node', 'auth_mcp.js'
            connection_config={"command": "echo", "args": ["mock_auth_generator"]}
        )
        
        session.add(chatgpt)
        session.add(auth_tool)
        await session.commit()
        
        project_id = str(project.id)
        chatgpt_id = str(chatgpt.id)
        auth_tool_id = str(auth_tool.id)
        
        print(f"Project ID: {project_id}")
        
        # 2. ChatGPT queries capabilities
        print("\n2. ChatGPT querying capabilities...")
        caps_json = await list_capabilities()
        caps = json.loads(caps_json)
        print(f"Found capabilities: {caps['capabilities']}")
        assert "generate_auth_scaffold" in caps['capabilities']
        
        # 3. ChatGPT finds a capable participant
        print("\n3. ChatGPT looking for auth generator...")
        participants_json = await find_capable_participants(["generate_auth_scaffold"])
        participants = json.loads(participants_json)
        print(f"Capable participants: {[p['name'] for p in participants['matches']]}")
        assert len(participants['matches']) == 1
        assert participants['matches'][0]['id'] == auth_tool_id
        
        # 4. ChatGPT creates a Task
        print("\n4. ChatGPT creates Task: Add authentication to Pseudonyms")
        task_json = await create_task(
            objective="Add authentication to Pseudonyms using NextAuth.",
            project_id=project_id,
            title="Implement Auth",
            required_capabilities=["generate_auth_scaffold"]
        )
        task_data = json.loads(task_json)
        print(f"Task created: {task_data}")
        task_id = task_data["task_id"]
        
        # 5. ChatGPT hands off to the Auth Tool
        print("\n5. ChatGPT hands off task to Auth Tool...")
        handoff_json = await create_handoff(
            task_id=task_id,
            from_participant_id=chatgpt_id,
            to_participant_id=auth_tool_id,
            expected_output="NextAuth boilerplate configured with Google provider.",
            context_package={"docs": "https://next-auth.js.org/"}
        )
        handoff_data = json.loads(handoff_json)
        print(f"Handoff created: {handoff_data}")
        
        # 6. Auth Tool performs work and submits result
        print("\n6. Auth Tool completes work and submits result...")
        result_json = await submit_result(
            task_id=task_id,
            participant_id=auth_tool_id,
            action="Generated NextAuth boilerplate in app/api/auth/[...nextauth]/route.ts",
            result_summary="Successfully scaffolded auth.",
            evidence_refs={"file_path": "route.ts"}
        )
        result_data = json.loads(result_json)
        print(f"Execution logged: {result_data}")
        
        # 7. Check Context Continuity
        print("\n7. Verifying context continuity...")
        context_json = await get_project_context(project_id=project_id)
        context_data = json.loads(context_json)
        print(f"Final Project Context: {context_data}")
        
        # The task should no longer be in 'active_tasks' since it is completed
        assert len(context_data["active_tasks"]) == 0
        
        # Fetch the task directly to confirm status
        final_task = await session.get(Task, uuid.UUID(task_id))
        assert final_task.status == "completed"
        assert final_task.owner_participant_id == uuid.UUID(auth_tool_id)
        
        # Optional: Test request_tool_action (proxying)
        # We mapped Auth Tool to echo mock_auth_generator, but stdio mcp client needs a real MCP server.
        # We will skip the real Stdio connection test here since we don't have a real MCP server handy for the echo command to speak MCP protocol.
        
        print("\nE2E Test Passed Successfully! Context continuity is preserved across models.")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
