import logging
from typing import List, Optional
import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from app.core.config import settings

logger = logging.getLogger("metaphor.provider")

class LLMProvider:
    def __init__(self):
        # Initialize clients lazily if keys are available, otherwise fail gracefully on actual calls.
        self._openai_client: Optional[AsyncOpenAI] = None
        self._anthropic_client: Optional[AsyncAnthropic] = None

    @property
    def openai_client(self) -> AsyncOpenAI:
        if not self._openai_client:
            key = settings.OPENAI_API_KEY
            if not key:
                logger.warning("OPENAI_API_KEY is not set. Embedding calls will fail.")
            self._openai_client = AsyncOpenAI(api_key=key)
        return self._openai_client

    @property
    def anthropic_client(self) -> AsyncAnthropic:
        pass

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate 768-dimension embeddings using Gemini text-embedding-004.
        Raises ValueError if GEMINI_API_KEY is not configured.
        """
        if not settings.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set.")
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")

        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text.replace("\n", " ")}]
                }
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=30.0)
                resp.raise_for_status()
                data = resp.json()
                return data["embedding"]["values"]
        except Exception as e:
            logger.error(f"Error generating Gemini embedding: {e}")
            raise e

    async def query_llm(self, prompt: str, system_prompt: str = "You are Metaphor, a context engine.", max_tokens: int = 4000, temperature: float = 0.0) -> str:
        """
        Query Gemini for reasoning, parsing, and reflection tasks.
        Raises ValueError if GEMINI_API_KEY is not configured.
        """
        if not settings.GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY is not set.")
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")

        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                }
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=60.0)
                resp.raise_for_status()
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
        except Exception as e:
            logger.error(f"Error querying Gemini: {e}")
            raise e

llm_provider = LLMProvider()
