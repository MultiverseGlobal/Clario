from fastapi import APIRouter
from .context import router as context_router
from .graph import router as graph_router
from .integrations import router as integrations_router
from .webhooks import router as webhooks_router
from .apikeys import router as apikeys_router
from .auth import router as auth_router
from .mcp import router as mcp_router
from .pipeline import router as pipeline_router
from .system import router as system_router

api_router = APIRouter()
api_router.include_router(integrations_router, prefix="/integrations", tags=["integrations"])
api_router.include_router(context_router, prefix="/context", tags=["context"])
api_router.include_router(graph_router, prefix="/graph", tags=["graph"])
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(apikeys_router, prefix="/auth/apikeys", tags=["API Keys"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(mcp_router, prefix="/mcp", tags=["mcp"])
api_router.include_router(pipeline_router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(system_router, prefix="/system", tags=["system"])
