import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import pytest_asyncio
from app.parsers.google_services import GoogleParser
from app.parsers.notion import NotionParser
from app.parsers.github import GitHubParser
from app.provider import LLMProvider
from app.core.config import settings

@pytest.mark.asyncio
async def test_google_parser_raises_without_creds(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_SERVICE_ACCOUNT_JSON_PATH", "/invalid/path.json")
    parser = GoogleParser()
    with pytest.raises(RuntimeError, match="Google Drive/Calendar integration is not configured"):
        await parser.fetch_documents()

@pytest.mark.asyncio
async def test_notion_parser_raises_without_token(monkeypatch):
    monkeypatch.setattr(settings, "NOTION_INTEGRATION_TOKEN", "")
    parser = NotionParser()
    with pytest.raises(RuntimeError, match="Notion integration token is missing or invalid"):
        await parser.fetch_documents()

@pytest.mark.asyncio
async def test_github_parser_raises_without_token(monkeypatch):
    monkeypatch.setattr(settings, "GITHUB_PERSONAL_ACCESS_TOKEN", "")
    parser = GitHubParser()
    with pytest.raises(RuntimeError, match="GitHub access token is missing or invalid"):
        await parser.fetch_documents()

@pytest.mark.asyncio
async def test_llm_provider_raises_without_gemini_key(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    provider = LLMProvider()
    with pytest.raises(ValueError, match="GEMINI_API_KEY environment variable is not configured"):
        await provider.generate_embedding("test text")
    with pytest.raises(ValueError, match="GEMINI_API_KEY environment variable is not configured"):
        await provider.query_llm("test prompt")
