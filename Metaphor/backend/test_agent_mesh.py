"""
Verification test for Metaphor Agent Mesh service and FastAPI routes.
"""
import asyncio
import json
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.agent_mesh import AgentMeshService, AGENT_REGISTRY

def test_agent_mesh_service():
    print("── 1. Testing Agent Registry ──")
    service = AgentMeshService()
    dir_data = service.get_directory()
    assert dir_data["total_agents"] == 9, f"Expected 9 agents, got {dir_data['total_agents']}"
    print(f"✓ Successfully registered {dir_data['total_agents']} agents:")
    for key, agent in dir_data["agents"].items():
        print(f"  • {agent['name']} ({agent['role']}) - Best for: {agent['best_for'][0]}")

    print("\n── 2. Testing Intelligent Role Routing ──")
    test_prompts = [
        ("Write a TypeScript React component with Tailwind and unit tests", "antigravity"),
        ("Draft a high-converting cold email pitch for agency founders", "chatgpt"),
        ("Source digital marketing agencies in New York from Clutch with 10-30 staff", "atlas"),
        ("Generate a personalized synthetic Loom video demo from founder audio", "clario"),
        ("Find the latest 2026 market statistics with citations for generative AI adoption", "perplexity"),
        ("Scrape pricing data from an interactive multi-step dynamic SPA portal", "manus"),
    ]

    for prompt, expected_agent in test_prompts:
        rec = service.recommend_agent(prompt)
        assert rec["recommended_agent"] == expected_agent, f"For prompt '{prompt}', expected {expected_agent}, got {rec['recommended_agent']}"
        print(f"  ✓ Prompt: '{prompt[:45]}...' -> Routed to {rec['agent_name']} (Confidence: {rec['confidence']})")

    print("\n── 3. Testing Shared Task Board & Handoffs ──")
    new_task = service.create_task(
        title="Implement B2B Onboarding Flow",
        description="Build the 3-step agency onboarding sequence with form validation",
        assigned_to="antigravity",
        created_by="chatgpt",
        priority="high",
        context_summary="Playbook ICP: Agencies 5-15 employees needing automated reporting",
    )
    task_id = new_task["id"]
    print(f"  ✓ ChatGPT created task '{new_task['title']}' [ID: {task_id}] assigned to {new_task['assigned_to']}")

    # Antigravity posts progress checkpoint
    cp_res = service.post_checkpoint(
        task_id=task_id,
        agent_name="antigravity",
        summary="Built React onboarding step forms and connected to Supabase auth.",
        files_touched=["src/pages/Onboarding.tsx", "src/components/OnboardingStep1.tsx"],
        next_steps="Review copy and add welcoming header text.",
        new_status="in_progress",
    )
    assert cp_res["success"], "Failed to post checkpoint"
    print(f"  ✓ Antigravity posted checkpoint: '{cp_res['checkpoint']['summary']}'")

    # Update status and hand off back to ChatGPT for copy polish
    update_res = service.update_task_status(
        task_id=task_id,
        status="review_needed",
        notes="Code implementation complete. Handing over to ChatGPT for polish.",
        handoff_to="chatgpt",
    )
    assert update_res["success"], "Failed to update task status"
    assert update_res["task"]["assigned_to"] == "chatgpt", "Handoff to ChatGPT failed"
    print(f"  ✓ Task successfully handed off to {update_res['task']['assigned_to'].upper()} with status '{update_res['task']['status']}'")

    print("\n✓ ALL AGENT MESH UNIT TESTS PASSED!")

if __name__ == "__main__":
    test_agent_mesh_service()
