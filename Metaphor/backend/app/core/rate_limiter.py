import time
import os
import logging
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.session import get_session

logger = logging.getLogger("metaphor.rate_limiter")

# In-memory sliding window fallback store if Redis is unconfigured
# Format: { rate_key: [timestamp1, timestamp2, ...] }
_IN_MEMORY_RATE_STORE: Dict[str, List[float]] = {}

class RateLimiter:
    """
    Per-Tenant & Per-User Sliding Window Rate Limiter.
    Protects LLM-backed endpoints (Gemini calls, vector searches, ambiguity generation)
    from abuse or single-tenant denial-of-service hammering.
    """
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60

    async def __call__(self, request: Request):
        # Determine rate limit key by org_id or user_id or API key or IP fallback
        rate_key = "anonymous"
        
        # Check authorization header / state if user is authenticated
        api_key = request.headers.get("X-API-Key")
        auth_header = request.headers.get("Authorization")
        client_ip = request.client.host if request.client else "127.0.0.1"

        if api_key:
            rate_key = f"key:{api_key[:16]}"
        elif auth_header:
            rate_key = f"auth:{auth_header[:32]}"
        else:
            rate_key = f"ip:{client_ip}"

        route_path = request.url.path
        full_key = f"ratelimit:{route_path}:{rate_key}"

        now = time.time()
        window_start = now - self.window_seconds

        # Clean old requests and check window count
        if full_key not in _IN_MEMORY_RATE_STORE:
            _IN_MEMORY_RATE_STORE[full_key] = []

        timestamps = [t for t in _IN_MEMORY_RATE_STORE[full_key] if t > window_start]
        _IN_MEMORY_RATE_STORE[full_key] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            retry_after = int(self.window_seconds - (now - timestamps[0]))
            logger.warning(f"Rate limit exceeded for key '{full_key}'. Count: {len(timestamps)}/min.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute allowed.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        _IN_MEMORY_RATE_STORE[full_key].append(now)
        return True

# Rate Limiter Dependencies for LLM endpoints
llm_rate_limiter = RateLimiter(requests_per_minute=30)
