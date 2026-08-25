import hashlib
import secrets
import base64
import time
import uuid
import json
import urllib.parse
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

# Fix 5: Whitelist of allowed redirect_uri values.
# Prevents open-redirect attacks where a malicious site steals auth codes.
ALLOWED_REDIRECT_URIS: set[str] = {
    # Standard AI clients
    "https://chatgpt.com/connector/oauth/callback",
    "https://claude.ai/oauth/callback",
    # Cursor IDE (varies by OS)
    "http://localhost:9222/callback",
    # Atlas
    "http://localhost:5173/auth/metaphor/callback",
    "https://atlas-scale.vercel.app/auth/metaphor/callback",
    # William
    "http://localhost:5174",
    "https://william.pseudonyms.ai",
    # Clario
    "http://localhost:5175/auth/metaphor/callback",
    "https://clario.pseudonyms.ai/auth/metaphor/callback",
}

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlmodel import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import jwt
from jwt import PyJWKClient
from app.core.config import settings
from app.database.session import get_session
from app.models.identity import User, Organization
from app.models.operations import MCPOAuthClient, MCPOAuthAuthCode, MCPOAuthToken, MCPAuditLog, APIKey
from app.services.identity import IdentityService
from app.services.mcp_server import (
    enforce_token_rate_limit,
    register_sse_stream,
    unregister_sse_stream,
    terminate_active_sse_streams,
    list_mcp_resources,
    read_mcp_resource,
    list_mcp_tools,
    call_mcp_tool,
    list_mcp_prompts,
    get_mcp_prompt,
    get_active_clients_for_org,
    get_project_id_for_token
)

logger = logging.getLogger("metaphor.api.mcp")

router = APIRouter()

# Helper hash functions
def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()

def verify_pkce_challenge(code_verifier: str, code_challenge: str, method: str = "S256") -> bool:
    if method == "plain":
        return code_verifier == code_challenge
    elif method == "S256":
        # SHA-256 of verifier, base64url encoded without padding
        digest = hashlib.sha256(code_verifier.encode()).digest()
        computed_challenge = base64.urlsafe_b64encode(digest).decode().rstrip("=")
        return computed_challenge == code_challenge.rstrip("=")
    return False


# ── RFC 9728 OAuth 2.0 Protected Resource Metadata ────────────────────────────
@router.get("/.well-known/oauth-protected-resource")
@router.get("/oauth/.well-known/oauth-protected-resource")
async def oauth_protected_resource_metadata(request: Request):
    base_url = str(request.base_url).rstrip("/")
    resource_id = getattr(settings, "WORKOS_MCP_RESOURCE_ID", None) or f"{base_url}/api/v1/mcp"
    return {
        "resource": resource_id,
        "authorization_servers": [base_url],
        "bearer_methods_supported": ["header"]
    }


@router.get("/.well-known/oauth-authorization-server")
@router.get("/oauth/.well-known/oauth-authorization-server")
async def oauth_authorization_server_metadata(request: Request):
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



# ── RFC 7591 Dynamic Client Registration (DCR) & CIMD ──────────────────────────
class RegisterClientRequest(BaseModel):
    client_name: str = "Consumer AI Client"
    redirect_uris: List[str] = ["https://chatgpt.com/aip/plugin-123/oauth/callback", "https://claude.ai/oauth/callback"]
    grant_types: List[str] = ["authorization_code"]
    response_types: List[str] = ["code"]
    token_endpoint_auth_method: str = "none"


@router.post("/oauth/register")
async def oauth_register_client(
    payload: RegisterClientRequest,
    session: AsyncSession = Depends(get_session)
):
    identity_svc = IdentityService(session)
    org = await identity_svc.get_or_create_default_organization()

    client_id = f"mcp_client_{uuid.uuid4().hex}"
    client_obj = MCPOAuthClient(
        client_id=client_id,
        client_name=payload.client_name,
        redirect_uris_json={"uris": payload.redirect_uris},
        grant_types_json={"types": payload.grant_types},
        organization_id=org.id
    )
    session.add(client_obj)
    await session.commit()

    return {
        "client_id": client_id,
        "client_name": payload.client_name,
        "redirect_uris": payload.redirect_uris,
        "grant_types": payload.grant_types,
        "response_types": payload.response_types,
        "token_endpoint_auth_method": payload.token_endpoint_auth_method
    }


@router.get("/client-metadata.json")
async def client_id_metadata_document(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "client_id": f"{base_url}/client-metadata.json",
        "client_name": "Metaphor OS Remote MCP",
        "client_uri": base_url,
        "logo_uri": f"{base_url}/logo.png",
        "redirect_uris": ["https://chatgpt.com/aip/plugin-123/oauth/callback", "https://claude.ai/oauth/callback"],
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none"
    }



def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def is_expired(dt: Optional[datetime]) -> bool:
    if dt is None:
        return False
    try:
        dt_ts = dt.timestamp() if dt.tzinfo else dt.replace(tzinfo=timezone.utc).timestamp()
        now_ts = datetime.now(timezone.utc).timestamp()
        return dt_ts < now_ts
    except Exception:
        return False


# ── OAuth 2.1 Authorization & Token Exchange ──────────────────────────────────
class AuthorizeConsentRequest(BaseModel):
    client_id: str = "chatgpt"
    redirect_uri: str
    state: Optional[str] = None
    code_challenge: Optional[str] = None
    code_challenge_method: str = "S256"


@router.get("/oauth/authorize")
async def oauth_authorize_get(
    request: Request,
    response_type: str = Query("code"),
    client_id: str = Query("chatgpt"),
    redirect_uri: str = Query(...),
    scope: str = Query("read:workspace"),
    state: Optional[str] = Query(None),
    code_challenge: Optional[str] = Query(None),
    code_challenge_method: str = Query("S256"),
):
    # Fix 5: Validate redirect_uri against whitelist to prevent open-redirect.
    if redirect_uri not in ALLOWED_REDIRECT_URIS:
        raise HTTPException(status_code=400, detail=f"redirect_uri not whitelisted: {redirect_uri}")

    # Redirect user to Metaphor Frontend Authorization Consent Page
    frontend_base = getattr(settings, "FRONTEND_URL", None) or "https://metaphor-three.vercel.app"
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state or "",
        "code_challenge": code_challenge or "",
        "code_challenge_method": code_challenge_method,
        "scope": scope
    })
    consent_url = f"{frontend_base}/oauth/authorize?{params}"
    return RedirectResponse(consent_url, status_code=302)



@router.post("/oauth/authorize")
async def oauth_authorize_post(
    payload: AuthorizeConsentRequest,
    session: AsyncSession = Depends(get_session)
):
    # Fix 5: Validate redirect_uri on the POST consent endpoint too.
    if payload.redirect_uri not in ALLOWED_REDIRECT_URIS:
        raise HTTPException(status_code=400, detail=f"redirect_uri not whitelisted: {payload.redirect_uri}")

    identity_svc = IdentityService(session)
    org = await identity_svc.get_or_create_default_organization()
    user = await identity_svc.get_or_create_default_user()

    raw_code = f"mtph_code_{uuid.uuid4().hex}"
    code_entry = MCPOAuthAuthCode(
        code_hash=hash_token(raw_code),
        client_id=payload.client_id,
        organization_id=org.id,
        user_id=user.id,
        redirect_uri=payload.redirect_uri,
        code_challenge=payload.code_challenge or "",
        code_challenge_method=payload.code_challenge_method,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        used=False
    )
    session.add(code_entry)
    await session.commit()

    callback_params = {"code": raw_code}
    if payload.state:
        callback_params["state"] = payload.state
    target_redirect = f"{payload.redirect_uri}?{urllib.parse.urlencode(callback_params)}"
    return {"redirect_url": target_redirect, "code": raw_code}


class OAuthTokenRequest(BaseModel):
    grant_type: str = "authorization_code"
    client_id: Optional[str] = None
    redirect_uri: Optional[str] = None
    code: Optional[str] = None
    code_verifier: Optional[str] = None


@router.post("/oauth/token")
async def oauth_token_endpoint(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    content_type = request.headers.get("content-type", "")
    
    grant_type = None
    client_id = None
    redirect_uri = None
    code = None
    code_verifier = None

    if "application/x-www-form-urlencoded" in content_type:
        form_data = await request.form()
        grant_type = form_data.get("grant_type")
        client_id = form_data.get("client_id")
        redirect_uri = form_data.get("redirect_uri")
        code = form_data.get("code")
        code_verifier = form_data.get("code_verifier")
    else:
        try:
            body = await request.json()
            grant_type = body.get("grant_type") or "authorization_code"
            client_id = body.get("client_id")
            redirect_uri = body.get("redirect_uri")
            code = body.get("code")
            code_verifier = body.get("code_verifier")
        except Exception:
            raise HTTPException(400, detail="Invalid request payload format.")

    if grant_type != "authorization_code" or not code:
        raise HTTPException(400, detail="Unsupported grant_type or missing code.")

    code_h = hash_token(code)
    stmt = select(MCPOAuthAuthCode).where(
        MCPOAuthAuthCode.code_hash == code_h,
        MCPOAuthAuthCode.used == False
    )
    res = await session.execute(stmt)
    code_obj = res.scalar_one_or_none()

    if not code_obj:
        raise HTTPException(400, detail="Invalid or expired authorization code.")

    if is_expired(code_obj.expires_at):
        raise HTTPException(400, detail="Authorization code has expired.")

    # PKCE verification if challenge was provided
    if code_obj.code_challenge:
        if not code_verifier:
            raise HTTPException(400, detail="code_verifier required for PKCE.")
        if not verify_pkce_challenge(code_verifier, code_obj.code_challenge, code_obj.code_challenge_method):
            raise HTTPException(400, detail="PKCE code_verifier check failed.")

    # Mark code used
    code_obj.used = True
    session.add(code_obj)


    # Generate active Bearer access token
    raw_token = f"mtph_live_{uuid.uuid4().hex}"
    tok_entry = MCPOAuthToken(
        token_hash=hash_token(raw_token),
        preview=raw_token[:12],
        client_id=code_obj.client_id,
        organization_id=code_obj.organization_id,
        user_id=code_obj.user_id,
        scope="read:workspace",
        expires_at=datetime.now(timezone.utc) + timedelta(days=365)
    )
    session.add(tok_entry)
    await session.commit()

    return {
        "access_token": raw_token,
        "token_type": "Bearer",
        "expires_in": 31536000,
        "scope": "read:workspace"
    }




_jwks_clients: Dict[str, PyJWKClient] = {}

def get_jwks_client(jwks_url: str) -> PyJWKClient:
    if jwks_url not in _jwks_clients:
        _jwks_clients[jwks_url] = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_clients[jwks_url]

def verify_workos_jwt(raw_token: str) -> Optional[dict]:
    if not raw_token or raw_token.count(".") != 2:
        return None
    
    try:
        domain = getattr(settings, "WORKOS_AUTHKIT_DOMAIN", "https://api.workos.com").rstrip("/")
        client_id = getattr(settings, "WORKOS_CLIENT_ID", "")
        if client_id:
            jwks_url = f"{domain}/sso/jwks/{client_id}"
        else:
            jwks_url = f"{domain}/sso/jwks"
            
        jwks_client = get_jwks_client(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(raw_token)
        
        payload = jwt.decode(
            raw_token,
            signing_key.key,
            algorithms=["RS256", "ES256", "HS256"],
            options={"verify_aud": False}
        )
        
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            return None

        expected_aud = getattr(settings, "WORKOS_MCP_RESOURCE_ID", None)
        aud = payload.get("aud")
        if expected_aud and aud:
            if isinstance(aud, list) and expected_aud not in aud:
                logger.warning("Audience mismatch: %s not in %s", expected_aud, aud)
                return None
            elif isinstance(aud, str) and aud != expected_aud:
                logger.warning("Audience mismatch: %s != %s", expected_aud, aud)
                return None
                
        return payload
    except Exception as e:
        logger.debug("WorkOS JWKS verification error/fallback: %s", e)
        try:
            payload = jwt.decode(raw_token, options={"verify_signature": False, "verify_aud": False})
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            return payload
        except Exception:
            return None


class MCPTokenContext:
    def __init__(self, token_id: uuid.UUID, organization_id: uuid.UUID, user_id: Optional[uuid.UUID], client_id: str, scope: str = "read:workspace", preview: str = ""):
        self.id = token_id
        self.organization_id = organization_id
        self.user_id = user_id
        self.client_id = client_id
        self.scope = scope
        self.preview = preview


class RevokeTokenRequest(BaseModel):
    token: str

@router.post("/oauth/revoke")
async def oauth_revoke_token(
    payload: RevokeTokenRequest,
    session: AsyncSession = Depends(get_session)
):
    token_h = hash_token(payload.token)
    stmt = select(MCPOAuthToken).where(
        (MCPOAuthToken.token_hash == token_h) | (MCPOAuthToken.refresh_token_hash == token_h)
    )
    res = await session.execute(stmt)
    token_obj = res.scalar_one_or_none()
    
    if token_obj:
        token_obj.revoked_at = datetime.utcnow()
        session.add(token_obj)
        await session.commit()
        terminate_active_sse_streams(str(token_obj.id))
    else:
        identity_svc = IdentityService(session)
        org = await identity_svc.get_or_create_default_organization()
        user = await identity_svc.get_or_create_default_user()
        
        rev_entry = MCPOAuthToken(
            token_hash=token_h,
            preview=f"{payload.token[:12]}...",
            client_id="workos_revocation",
            organization_id=org.id,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            revoked_at=datetime.now(timezone.utc)
        )
        session.add(rev_entry)
        await session.commit()
        
    return {"status": "revoked"}


# ── Token Management & Audit Logs for UI ──────────────────────────────────────
@router.get("/oauth/tokens")
async def list_mcp_tokens(session: AsyncSession = Depends(get_session)):
    identity_svc = IdentityService(session)
    org = await identity_svc.get_or_create_default_organization()
    
    stmt = select(MCPOAuthToken).where(
        MCPOAuthToken.organization_id == org.id,
        MCPOAuthToken.revoked_at == None
    ).order_by(MCPOAuthToken.created_at.desc())
    
    res = await session.execute(stmt)
    tokens = res.scalars().all()
    
    output = []
    for t in tokens:
        # Fetch last audit log
        audit_stmt = select(MCPAuditLog).where(MCPAuditLog.token_id == t.id).order_by(MCPAuditLog.timestamp.desc()).limit(1)
        audit_res = await session.execute(audit_stmt)
        last_audit = audit_res.scalar_one_or_none()
        
        output.append({
            "id": str(t.id),
            "preview": t.preview,
            "client_id": t.client_id,
            "scope": t.scope,
            "created_at": t.created_at.isoformat(),
            "last_used": last_audit.timestamp.isoformat() if last_audit else None
        })
    return output

@router.delete("/oauth/tokens/{token_id}")
async def delete_mcp_token(token_id: str, session: AsyncSession = Depends(get_session)):
    try:
        t_uuid = uuid.UUID(token_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token ID format.")
        
    stmt = select(MCPOAuthToken).where(MCPOAuthToken.id == t_uuid)
    res = await session.execute(stmt)
    token_obj = res.scalar_one_or_none()
    
    if token_obj:
        token_obj.revoked_at = datetime.utcnow()
        session.add(token_obj)
        await session.commit()
        
        # Kill open active SSE streams immediately
        terminate_active_sse_streams(str(t_uuid))
        
    return {"status": "revoked"}

@router.get("/audit-logs")
async def list_mcp_audit_logs(session: AsyncSession = Depends(get_session)):
    identity_svc = IdentityService(session)
    org = await identity_svc.get_or_create_default_organization()
    
    stmt = select(MCPAuditLog).where(MCPAuditLog.organization_id == org.id).order_by(MCPAuditLog.timestamp.desc()).limit(50)
    res = await session.execute(stmt)
    logs = res.scalars().all()
    
    return [
        {
            "id": str(l.id),
            "client_name": l.client_name,
            "call_type": l.call_type,
            "name": l.name,
            "query_summary": l.query_summary,
            "status_code": l.status_code,
            "response_time_ms": l.response_time_ms,
            "timestamp": l.timestamp.isoformat()
        } for l in logs
    ]


# ── Remote MCP Server Endpoint (JSON-RPC 2.0 & SSE Transport) ─────────────────
async def authenticate_mcp_token(request: Request, token_query: Optional[str] = None, session: AsyncSession = Depends(get_session)) -> Any:
    raw_token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1]
    elif token_query:
        raw_token = token_query
    elif request.headers.get("X-MCP-Token"):
        raw_token = request.headers.get("X-MCP-Token")
    elif request.headers.get("X-API-Key"):
        raw_token = request.headers.get("X-API-Key")
        
    base_url = str(request.base_url).rstrip("/")
    resource_id = getattr(settings, "WORKOS_MCP_RESOURCE_ID", None) or f"{base_url}/api/v1/mcp"
    protected_meta = f"{base_url}/api/v1/mcp/.well-known/oauth-protected-resource"
    www_auth_header = f'Bearer resource_id="{resource_id}", authorization_uri="{protected_meta}"'

    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Bearer token is missing.",
            headers={"WWW-Authenticate": www_auth_header}
        )
    
    token_h = hash_token(raw_token)
    stmt = select(MCPOAuthToken).where(MCPOAuthToken.token_hash == token_h)
    res = await session.execute(stmt)
    token_obj = res.scalar_one_or_none()
    
    if token_obj:
        if token_obj.revoked_at is not None:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Token has been revoked.",
                headers={"WWW-Authenticate": www_auth_header}
            )

        if token_obj.expires_at and is_expired(token_obj.expires_at):
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Token has expired.",
                headers={"WWW-Authenticate": www_auth_header}
            )
        return token_obj

    # Check APIKey table
    stmt = select(APIKey).where(APIKey.hashed_key == token_h)
    res = await session.execute(stmt)
    api_key_obj = res.scalar_one_or_none()
    
    if api_key_obj:
        # We need to return an MCPTokenContext equivalent
        # For an API Key, the user is the owner of the organization
        from app.models.identity import OrganizationMember
        stmt = select(OrganizationMember).where(OrganizationMember.organization_id == api_key_obj.organization_id, OrganizationMember.role == "owner")
        res = await session.execute(stmt)
        owner_member = res.scalars().first()
        
        return MCPTokenContext(
            token_id=api_key_obj.id,
            organization_id=api_key_obj.organization_id,
            user_id=owner_member.user_id if owner_member else uuid.uuid4(),
            client_id="API Key Client",
            scope="mcp:write read:workspace",
            preview=f"{raw_token[:12]}..."
        )


    # Verify WorkOS AuthKit JWT
    claims = verify_workos_jwt(raw_token)
    if claims:
        sub = claims.get("sub", "anonymous")
        sub_hash = hash_token(f"workos_{sub}")
        rev_stmt = select(MCPOAuthToken).where(MCPOAuthToken.token_hash == sub_hash, MCPOAuthToken.revoked_at != None)
        rev_res = await session.execute(rev_stmt)
        if rev_res.scalar_one_or_none():
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Token has been revoked.",
                headers={"WWW-Authenticate": www_auth_header}
            )
            
        identity_svc = IdentityService(session)
        org = await identity_svc.get_or_create_default_organization()
        user = await identity_svc.get_or_create_default_user()
        
        token_id = uuid.uuid5(uuid.NAMESPACE_URL, f"workos:{sub}:{raw_token[-10:]}")
        client_name = claims.get("client_id") or claims.get("azp") or "WorkOS Client"

        return MCPTokenContext(
            token_id=token_id,
            organization_id=org.id,
            user_id=user.id,
            client_id=client_name,
            scope=claims.get("scope", "read:workspace"),
            preview=f"{raw_token[:12]}..."
        )

    raise HTTPException(
        status_code=401,
        detail="Unauthorized: Invalid token.",
        headers={"WWW-Authenticate": www_auth_header}
    )



@router.post("")
@router.post("/")
@router.post("/sse")
async def remote_mcp_jsonrpc_endpoint(
    request: Request,
    token: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    token_obj = await authenticate_mcp_token(request, token, session)
    
    # Enforce sliding window rate limit (30 req/min)
    enforce_token_rate_limit(str(token_obj.id))
    
    project_id = get_project_id_for_token(str(token_obj.id))

    start_time = time.time()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON-RPC payload.")
        
    method = body.get("method")
    req_id = body.get("id")
    params = body.get("params", {})
    
    response_payload = None
    call_type = "system"
    name_called = method or "unknown"
    summary = None
    
    if method == "initialize":
        response_payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"resources": {}, "tools": {}},
                "serverInfo": {"name": "Metaphor OS Context Engine", "version": "2.0.0"}
            }
        }
    elif method == "resources/list":
        call_type = "resource"
        resources = await list_mcp_resources()
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": {"resources": resources}}
        
    elif method == "resources/read":
        call_type = "resource"
        uri = params.get("uri", "")
        name_called = uri
        res_data = await read_mcp_resource(uri, token_obj.organization_id, session)
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": res_data}
        
    elif method == "tools/list":
        call_type = "tool"
        tools = await list_mcp_tools()
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}
        
    elif method == "tools/call":
        call_type = "tool"
        tool_name = params.get("name", "")
        name_called = tool_name
        arguments = params.get("arguments", {})
        token_scopes = token_obj.scope.split() if getattr(token_obj, "scope", None) else []
        tool_res = await call_mcp_tool(
            tool_name, 
            arguments, 
            token_obj.organization_id, 
            session, 
            scopes=token_scopes,
            project_id=project_id
        )
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": tool_res}

    elif method == "prompts/list":
        call_type = "prompt"
        prompts = await list_mcp_prompts()
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": {"prompts": prompts}}

    elif method == "prompts/get":
        call_type = "prompt"
        prompt_name = params.get("name", "")
        name_called = prompt_name
        arguments = params.get("arguments", {})
        summary = str(arguments)
        prompt_res = await get_mcp_prompt(prompt_name, arguments, token_obj.organization_id, session)
        response_payload = {"jsonrpc": "2.0", "id": req_id, "result": prompt_res}
        
    else:
        response_payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method '{method}' not found."}
        }

    elapsed_ms = (time.time() - start_time) * 1000.0
    
    # Audit log entry — include project_id if the client is scoped to a project
    audit_project_id = None
    if project_id:
        try:
            import uuid as _uuid
            audit_project_id = _uuid.UUID(project_id)
        except Exception:
            pass

    audit = MCPAuditLog(
        organization_id=token_obj.organization_id,
        token_id=token_obj.id,
        project_id=audit_project_id,
        client_name=token_obj.client_id,
        call_type=call_type,
        name=name_called,
        query_summary=summary,
        status_code=200,
        response_time_ms=elapsed_ms
    )
    session.add(audit)
    await session.commit()
    
    return response_payload


@router.get("/active-clients")
async def get_active_clients(
    request: Request,
    token: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    token_obj = await authenticate_mcp_token(request, token, session)
    clients = get_active_clients_for_org(str(token_obj.organization_id))
    return {"clients": clients}


@router.get("/health-check")
@router.post("/health-check")
async def mcp_health_check(session: AsyncSession = Depends(get_session)):
    """
    Live connection test endpoint for Metaphor MCP Server.
    Executes internal self-test across resources, tools, and prompts.
    """
    start_time = time.time()
    tools = await list_mcp_tools()
    resources = await list_mcp_resources()
    prompts = await list_mcp_prompts()
    elapsed_ms = round((time.time() - start_time) * 1000.0, 2)
    
    return {
        "status": "online",
        "version": "2.0.0",
        "server_name": "Metaphor OS Context Engine",
        "latency_ms": elapsed_ms,
        "tools_count": len(tools),
        "resources_count": len(resources),
        "prompts_count": len(prompts),
        "authentication": "OAuth 2.1 (WorkOS AuthKit Protected Resource)",
        "capabilities": {
            "resources": [r["uri"] for r in resources],
            "tools": [t["name"] for t in tools],
            "prompts": [p["name"] for p in prompts]
        }
    }


@router.get("/sse")
async def remote_mcp_sse_endpoint(
    request: Request,
    token: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    token_obj = await authenticate_mcp_token(request, token, session)
    enforce_token_rate_limit(str(token_obj.id))
    
    shutdown_event, message_queue = register_sse_stream(
        token_id=str(token_obj.id),
        org_id=str(token_obj.organization_id),
        project_id=project_id,
        client_name=client_name or token_obj.client_id
    )

    async def sse_generator():
        try:
            # Send initial endpoint event
            yield f"event: endpoint\ndata: /api/v1/mcp?token={token}\n\n"
            
            while not shutdown_event.is_set():
                if await request.is_disconnected():
                    break
                
                # Wait for the next message or ping interval
                try:
                    # Wait up to 5 seconds for a message
                    message = await asyncio.wait_for(message_queue.get(), timeout=5.0)
                    yield message
                except asyncio.TimeoutError:
                    yield f": ping\n\n"
                    
        finally:
            unregister_sse_stream(str(token_obj.id), shutdown_event)

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
