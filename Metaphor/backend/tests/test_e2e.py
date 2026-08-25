import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_e2e_lore_and_chat(async_client: AsyncClient, setup_test_user):
    """
    End-to-End test that validates the entire backend pipeline:
    1. Authentication using real SHA-256 hashed API Keys.
    2. Reflection Engine hitting Gemini to parse 'lore' and extract knowledge.
    3. Graph Service creating Nodes with Gemini vector embeddings in pgvector.
    4. Context Service performing Vector Search and retrieving the new nodes.
    5. LLM Service generating an accurate answer using the contextual payload.
    """
    
    # 1. Provide Lore (this triggers Reflection + Embeddings)
    lore_payload = {
        "content": "Metaphor E2E Testing Protocol: The E2E protocol requires that all data inserted during automated tests must be strictly contained within a sandbox organization and cleaned up immediately after."
    }
    
    res_lore = await async_client.post("/api/v1/context/lore", json=lore_payload)
    print("STATUS:", res_lore.status_code)
    print("TEXT:", res_lore.text)
    assert res_lore.status_code == 200, f"Lore endpoint failed: {res_lore.text}"
    
    lore_data = res_lore.json()
    assert lore_data["status"] == "success"
    assert len(lore_data["created_nodes"]) > 0, "Reflection Engine failed to extract nodes."
    
    # 2. Query Chat (this triggers Vector Search + Context Package + LLM Generation)
    chat_payload = {
        "query": "Integration Test: What does the Metaphor E2E protocol require?",
        "ai_consumer": "playground"
    }
    
    res_chat = await async_client.post("/api/v1/context/chat", json=chat_payload)
    assert res_chat.status_code == 200, f"Chat endpoint failed: {res_chat.text}"
    
    chat_data = res_chat.json()
    
    assert "answer" in chat_data
    assert "context" in chat_data
    
    answer = chat_data["answer"].lower()
    assert "sandbox organization" in answer or "cleaned up" in answer, "LLM failed to retrieve context or generate accurate answer."
