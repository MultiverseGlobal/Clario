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
from app.routes.ai_registry import router as ai_registry_router
from app.routes.callbacks import router as callbacks_router
from app.routes.events import router as events_router
from .agent_mesh import router as agent_mesh_router
from .handoffs import router as handoffs_router

api_router = APIRouter()
api_router.include_router(integrations_router, prefix="/integrations", tags=["integrations"])
api_router.include_router(context_router, prefix="/context", tags=["context"])
api_router.include_router(graph_router, prefix="/graph", tags=["graph"])
api_router.include_router(handoffs_router)
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(apikeys_router, prefix="/auth/apikeys", tags=["API Keys"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(mcp_router, prefix="/mcp", tags=["mcp"])
api_router.include_router(pipeline_router, prefix="/pipeline", tags=["pipeline"])
api_router.include_router(system_router, prefix="/system", tags=["system"])
api_router.include_router(ai_registry_router, prefix="/orchestration", tags=["AI Orchestration"])
api_router.include_router(callbacks_router, prefix="/callbacks", tags=["Callbacks"])
api_router.include_router(events_router) # prefix is defined inside the router file
api_router.include_router(agent_mesh_router)

