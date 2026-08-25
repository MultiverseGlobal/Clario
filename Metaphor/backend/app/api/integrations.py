import asyncio
import logging
import jwt
import httpx
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.session import get_session
from app.core.security import get_user_via_api_key
from app.models.identity import User
from app.services.reflection import ReflectionService
from app.services.integrations.github import fetch_public_repository
from app.services.integrations.notion import fetch_notion_workspace
from app.services.integrations.linear import fetch_linear_workspace
from app.services.integrations.google import fetch_google_workspace

router = APIRouter()
logger = logging.getLogger(__name__)

class IntegrationSyncRequest(BaseModel):
    sources: List[str]
    github_repo: Optional[str] = None
    github_token: Optional[str] = None
    notion_token: Optional[str] = None

class ContextDropRequest(BaseModel):
    source: str
    content: str

# process_integration_sync has been moved to arq_worker.py to support the Arq queue

@router.post("/sync")
async def trigger_integration_sync(
    request: IntegrationSyncRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Triggers an asynchronous synchronization of connected integrations.
    Returns 202 Accepted immediately while the background task processes the data.
    """
    # Find the user's primary organization (for simplicity, just grab the first one)
    from sqlmodel import select
    from app.models.identity import OrganizationMember
    
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()
    
    if not org_member:
        raise HTTPException(status_code=400, detail="User does not belong to an organization")
        
    org_id = str(org_member.organization_id)
    
    from app.models.operations import SyncJob
    
    # Create the job synchronously so we don't lose it if we crash
    job = SyncJob(
        organization_id=uuid.UUID(org_id),
        provider="metaphor_onboarding",
        status="Initializing synchronization..."
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    
    try:
        from arq import create_pool
        from arq.connections import RedisSettings
        from app.core.config import settings
        import urllib.parse
        
        parsed = urllib.parse.urlparse(settings.REDIS_URL)
        redis_host = parsed.hostname or "localhost"
        redis_port = parsed.port or 6379
        
        redis = await create_pool(RedisSettings(host=redis_host, port=redis_port))
        await redis.enqueue_job(
            "process_integration_sync",
            user_id=str(user.id),
            org_id=org_id,
            sources=request.sources,
            github_repo=request.github_repo,
            job_id=job.id
        )
        return {"status": "sync_started", "message": "Integration sync running in the background via Arq."}
    except Exception as redis_err:
        logger.error(f"Redis queue unavailable ({redis_err}). Sync request failed.")
        job.status = f"failed: queue unavailable ({str(redis_err)})"
        session.add(job)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Background job queue service unavailable: {str(redis_err)}"
        )

@router.post("/drop")
async def context_drop(
    request: ContextDropRequest,
    db: AsyncSession = Depends(get_session)
):
    """
    Accepts raw text drops from ChatGPT, Claude, or any text source.
    """
    from app.services.identity import IdentityService
    identity = IdentityService(db)
    org = await identity.get_or_create_default_organization()
    
    from app.models.operations import WebhookEvent
    event = WebhookEvent(
        provider=request.source,
        event_type="context_drop",
        payload={"content": request.content},
        organization_id=org.id
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    from app.services.graph import GraphService
    from app.services.reflection import ReflectionService
    graph = GraphService(db)
    reflection = ReflectionService(graph)
    
    await reflection.process_event(event, org.id)
    
    return {"status": "success", "message": "Context drop processed."}

@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def list_user_integrations(
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Lists all active integrations for the authenticated user's organization.
    """
    from sqlmodel import select
    from app.models.identity import OrganizationMember
    from app.models.operations import Integration

    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()

    if org_member:
        stmt_int = select(Integration).where(
            (Integration.user_id == user.id) | (Integration.organization_id == org_member.organization_id)
        )
    else:
        stmt_int = select(Integration).where(Integration.user_id == user.id)

    result_int = await session.execute(stmt_int)
    integrations = result_int.scalars().all()

    return [
        {
            "id": str(i.id),
            "provider": i.provider,
            "status": i.status or "active"
        }
        for i in integrations
    ]

@router.get("/status")
async def check_integration_status(
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Checks if there are any nodes in the graph for the user's primary organization.
    This serves as a polling endpoint to know if the background sync has completed.
    Returns the latest progress message from the SyncJob table.
    """
    from sqlmodel import select, desc
    from app.models.identity import OrganizationMember
    from app.models.graph import Node
    from app.models.operations import SyncJob
    
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()
    
    if not org_member:
        return {"status": "no_org", "has_data": False, "message": ""}
        
    stmt_nodes = select(Node).where(Node.organization_id == org_member.organization_id).limit(1)
    result_nodes = await session.execute(stmt_nodes)
    node = result_nodes.scalars().first()
    
    stmt_job = select(SyncJob).where(
        SyncJob.organization_id == org_member.organization_id, 
        SyncJob.provider == "metaphor_onboarding"
    ).order_by(desc(SyncJob.started_at)).limit(1)
    result_job = await session.execute(stmt_job)
    latest_job = result_job.scalars().first()
    
    job_msg = latest_job.status if latest_job else ("completed" if node else "Initializing synchronization...")
    if latest_job and latest_job.status == "failed":
        job_msg = "failed"
    
    return {
        "status": "completed" if (latest_job and latest_job.status == "completed") or (not latest_job and node) else job_msg,
        "message": job_msg,
        "has_data": node is not None
    }

@router.get("/drops")
async def list_chat_drops(
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Lists all cross-model chat session drops for the organization audit feed.
    """
    from sqlmodel import select, desc
    from app.models.identity import OrganizationMember
    from app.models.chat_session import ChatSession

    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()

    if not org_member:
        return []

    stmt_drops = select(ChatSession).where(
        ChatSession.organization_id == org_member.organization_id
    ).order_by(desc(ChatSession.created_at)).limit(50)
    
    res = await session.execute(stmt_drops)
    drops = res.scalars().all()
    now = datetime.now(timezone.utc)

    return [
        {
            "id": str(d.id),
            "model_name": d.model_name,
            "session_title": d.session_title,
            "summary": d.summary,
            "active_files": d.context_payload.get("active_files", []) if isinstance(d.context_payload, dict) else [],
            "created_at": d.created_at.isoformat(),
            "expires_at": d.expires_at.isoformat(),
            "retracted_at": d.retracted_at.isoformat() if d.retracted_at else None,
            "is_expired": d.expires_at <= now,
            "is_retracted": d.retracted_at is not None
        }
        for d in drops
    ]

@router.delete("/drops/{drop_id}")
async def retract_chat_drop(
    drop_id: uuid.UUID,
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Retracts a chat session drop, immediately excluding it from MCP queries.
    """
    from sqlmodel import select
    from app.models.identity import OrganizationMember
    from app.models.chat_session import ChatSession

    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()

    if not org_member:
        raise HTTPException(status_code=403, detail="User not part of organization")

    stmt_drop = select(ChatSession).where(
        ChatSession.id == drop_id,
        ChatSession.organization_id == org_member.organization_id
    )
    res = await session.execute(stmt_drop)
    drop = res.scalars().first()

    if not drop:
        raise HTTPException(status_code=404, detail="Chat drop not found")

    drop.retracted_at = datetime.now(timezone.utc)
    session.add(drop)
    await session.commit()

    return {"status": "success", "message": f"Drop {drop_id} successfully retracted."}

def get_base_url(request: Request | None = None) -> str:
    from app.core.config import settings
    # 1. If BACKEND_URL in settings is valid and not localhost, use it
    if settings.BACKEND_URL and "localhost" not in settings.BACKEND_URL and "127.0.0.1" not in settings.BACKEND_URL:
        return settings.BACKEND_URL.rstrip('/')
    
    # 2. Check incoming request headers
    if request:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto", "https")
        if forwarded_host:
            clean_host = forwarded_host.split(":")[0]
            if clean_host not in ("localhost", "127.0.0.1", "0.0.0.0"):
                return f"{forwarded_proto}://{forwarded_host}".rstrip('/')
    
    # 3. Cloud fallback for Render / Vercel
    if os.getenv("RENDER") or os.getenv("VERCEL") or os.getenv("PORT"):
        return "https://metaphor-backend.onrender.com"
        
    return settings.BACKEND_URL.rstrip('/')

@router.get("/{provider}/authorize")
async def authorize_integration(
    provider: str,
    request: Request,
    user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    from app.models.identity import OrganizationMember
    from sqlmodel import select
    from app.core.config import settings
    
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    result = await session.execute(stmt)
    org_member = result.scalars().first()
    
    if not org_member:
        from app.models.identity import Organization, OrganizationMember
        org = Organization(name=f"{user.name}'s Workspace", slug=f"workspace-{user.id}")
        session.add(org)
        await session.flush()
        org_member = OrganizationMember(user_id=user.id, organization_id=org.id, role="owner")
        session.add(org_member)
        await session.commit()
        await session.refresh(org_member)
        
    org_id = str(org_member.organization_id)
    
    # Create state token
    frontend_url = request.headers.get("origin") or settings.FRONTEND_URL
    if frontend_url and frontend_url.endswith("/"):
        frontend_url = frontend_url[:-1]
        
    state_payload = {
        "org_id": org_id,
        "user_id": str(user.id),
        "provider": provider,
        "frontend_url": frontend_url,
        "exp": int(datetime.now(timezone.utc).timestamp()) + 3600
    }
    state_token = jwt.encode(state_payload, settings.SECRET_KEY, algorithm="HS256")
    
    base_url = get_base_url(request)
    
    if provider == "github":
        client_id = settings.GITHUB_CLIENT_ID
        if not client_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub OAuth Client ID is not configured on the server.")
        redirect_uri = f"{base_url}{settings.API_PREFIX}/integrations/github/callback"
        auth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&state={state_token}&scope=repo"
        return {"url": auth_url}
        
    elif provider == "notion":
        client_id = settings.NOTION_CLIENT_ID
        if not client_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notion OAuth Client ID is not configured on the server.")
        redirect_uri = f"{base_url}{settings.API_PREFIX}/integrations/notion/callback"
        auth_url = f"https://api.notion.com/v1/oauth/authorize?client_id={client_id}&response_type=code&owner=user&redirect_uri={urllib.parse.quote(redirect_uri)}&state={state_token}"
        return {"url": auth_url}
        
    elif provider == "linear":
        client_id = settings.LINEAR_CLIENT_ID
        if not client_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linear OAuth Client ID is not configured on the server.")
        redirect_uri = f"{base_url}{settings.API_PREFIX}/integrations/linear/callback"
        auth_url = f"https://linear.app/oauth/authorize?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&response_type=code&state={state_token}&scope=read"
        return {"url": auth_url}
        
    elif provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google integration is not configured. Please set GOOGLE_CLIENT_ID in the environment.")
        redirect_uri = f"{base_url}{settings.API_PREFIX}/integrations/google/callback"
        scopes = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly"
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={urllib.parse.quote(redirect_uri)}&response_type=code&state={state_token}&scope={urllib.parse.quote(scopes)}&access_type=offline&prompt=consent"
        return {"url": auth_url}
        
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")


@router.get("/{provider}/callback")
async def integration_callback(
    provider: str,
    code: str,
    state: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    from app.core.config import settings
    from sqlmodel import select
    from app.models.operations import Integration
    from fastapi.responses import RedirectResponse
    from app.core.security import encrypt_token
    import base64
    
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
        org_id = payload.get("org_id")
        user_id = payload.get("user_id")
        frontend_url = payload.get("frontend_url", settings.FRONTEND_URL)
        if not org_id or not user_id or payload.get("provider") != provider:
            raise ValueError("Invalid state payload")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired state token")

    access_token = None
    base_url = get_base_url(request)
    
    async with httpx.AsyncClient() as client:
        if provider == "github":
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{base_url}{settings.API_PREFIX}/integrations/github/callback"
                },
                headers={"Accept": "application/json"}
            )
            if resp.status_code == 200:
                data = resp.json()
                access_token = data.get("access_token")
                
        elif provider == "notion":
            auth_str = f"{settings.NOTION_CLIENT_ID}:{settings.NOTION_CLIENT_SECRET}"
            b64_auth = base64.b64encode(auth_str.encode()).decode()
            resp = await client.post(
                "https://api.notion.com/v1/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": f"{base_url}{settings.API_PREFIX}/integrations/notion/callback"
                },
                headers={
                    "Authorization": f"Basic {b64_auth}",
                    "Content-Type": "application/json"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                access_token = data.get("access_token")

        elif provider == "linear":
            resp = await client.post(
                "https://api.linear.app/oauth/token",
                data={
                    "client_id": settings.LINEAR_CLIENT_ID,
                    "client_secret": settings.LINEAR_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{base_url}{settings.API_PREFIX}/integrations/linear/callback",
                    "grant_type": "authorization_code"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                access_token = data.get("access_token")

        elif provider == "google":
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": f"{base_url}{settings.API_PREFIX}/integrations/google/callback",
                    "grant_type": "authorization_code"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                access_token = data.get("access_token")
                refresh_token = data.get("refresh_token") # Could store this in the future

    if access_token:
        # Upsert integration
        stmt = select(Integration).where(
            Integration.organization_id == uuid.UUID(org_id),
            Integration.user_id == uuid.UUID(user_id),
            Integration.provider == provider
        )
        result = await session.execute(stmt)
        integration = result.scalars().first()
        
        encrypted_token = encrypt_token(access_token)
        
        if integration:
            integration.access_token = encrypted_token
        else:
            integration = Integration(
                organization_id=uuid.UUID(org_id),
                user_id=uuid.UUID(user_id),
                provider=provider,
                access_token=encrypted_token
            )
            session.add(integration)
            
        await session.commit()
        
    return RedirectResponse(url=f"{frontend_url}/onboarding?success={provider}")
