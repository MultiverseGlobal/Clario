import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("metaphor")

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database.session import init_db
    try:
        await init_db()
        logger.info("Database tables initialized/verified.")
    except Exception as e:
        logger.error(f"Error initializing DB tables: {e}")
    from app.workers import resume_stuck_jobs
    import asyncio
    asyncio.create_task(resume_stuck_jobs())
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Metaphor is a Context Engine built on a Multi-Tenant Graph.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=500)

import os

allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.rate_limiter import RateLimiter
global_rate_limiter = RateLimiter(requests_per_minute=200)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/") or request.url.path.startswith("/.well-known/"):
        try:
            await global_rate_limiter(request)
        except Exception as e:
            if hasattr(e, "status_code") and e.status_code == 429:
                return JSONResponse(
                    status_code=429,
                    content={"detail": str(e.detail)},
                    headers=e.headers
                )
            raise e
    return await call_next(request)

app.include_router(api_router, prefix=settings.API_PREFIX)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

@app.get("/.well-known/oauth-protected-resource")
@app.get("/api/v1/mcp/.well-known/oauth-protected-resource")
async def root_oauth_protected_resource(request: Request):
    base_url = str(request.base_url).rstrip("/")
    resource_id = getattr(settings, "WORKOS_MCP_RESOURCE_ID", None) or f"{base_url}/api/v1/mcp"
    return {
        "resource": resource_id,
        "authorization_servers": [base_url],
        "bearer_methods_supported": ["header"]
    }


@app.get("/.well-known/oauth-authorization-server")
@app.get("/api/v1/mcp/.well-known/oauth-authorization-server")
async def root_oauth_authorization_server(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "issuer": base_url,
        "authorization_endpoint": f"{base_url}/api/v1/mcp/oauth/authorize",
        "token_endpoint": f"{base_url}/api/v1/mcp/oauth/token",
        "registration_endpoint": f"{base_url}/api/v1/mcp/oauth/register",
        "revocation_endpoint": f"{base_url}/api/v1/mcp/oauth/revoke",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "code_challenge_methods_supported": ["S256", "plain"],
        "token_endpoint_auth_methods_supported": ["none"]
    }



@app.get("/build-version")
async def build_version():
    return {"build_time": "2026-08-02T19:00:00Z", "commit": "a3724eb_v2", "mcp_auth_redirect": "enabled"}

@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "status": "healthy", "version": "2.0.0"}

