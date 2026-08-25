import json
import logging
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("metaphor.services.llm")

class LLMService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None

    async def query_llm(self, prompt: str, system_prompt: str = "", temperature: float = 0.7) -> str:
        if not self.client:
            logger.warning("No LLM configured or key missing.")
            raise ValueError("LLM not configured: missing GEMINI_API_KEY")
            
        response = await self.client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
            )
        )
        return response.text

    async def generate_embedding(self, text: str) -> list[float]:
        if not self.client:
            raise ValueError("LLM not configured: missing GEMINI_API_KEY for embedding generation")
            
        result = await self.client.aio.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT"
            )
        )
        return result.embeddings[0].values

llm_service = LLMService()
