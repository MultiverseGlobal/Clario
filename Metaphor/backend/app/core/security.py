import logging
from datetime import datetime, timedelta
from typing import Optional, Any, Union
import uuid
import os
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.concurrency import run_in_threadpool
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from supabase import create_client, Client

from app.core.config import settings
from app.database.session import get_session
from app.models.identity import User

logger = logging.getLogger("metaphor.security")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

def get_supabase_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError("Supabase credentials are not set")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

supabase = get_supabase_client()

from sqlmodel import select

async def _ensure_user_in_db(user_id_str: str, email: Optional[str], metadata: Optional[dict], session: AsyncSession) -> User:
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user UUID")

    user = await session.get(User, user_uuid)
    if user is not None:
        return user

    # Fallback lookup by email to avoid UniqueViolation if Supabase ID changed but email exists
    if email:
        stmt = select(User).where(User.email == email)
        res = await session.execute(stmt)
        existing_user = res.scalars().first()
        if existing_user:
            return existing_user

    name = (metadata or {}).get("full_name") or (metadata or {}).get("name") or (email.split("@")[0] if email else "Metaphor Developer")
    user = User(
        id=user_uuid,
        email=email or f"{user_id_str}@user.metaphor",
        hashed_password="",
        name=name
    )
    session.add(user)

    from app.models.identity import Organization, OrganizationMember
    from app.models.operations import APIKey
    import secrets
    import hashlib

    # Check if org already exists for this slug fallback
    stmt = select(Organization).where(Organization.slug == f"workspace-{user_id_str}")
    res = await session.execute(stmt)
    org = res.scalars().first()

    if not org:
        org = Organization(name=f"{name}'s Workspace", slug=f"workspace-{user_id_str}")
        session.add(org)
        await session.flush()

    member = OrganizationMember(user_id=user.id, organization_id=org.id, role="owner")
    session.add(member)

    # Issue initial default API Key for immediate usage
    raw_token = f"metaphor_{secrets.token_urlsafe(32)}"
    hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    default_key = APIKey(
        organization_id=org.id,
        name="Workspace Primary Key",
        hashed_key=hashed_token
    )
    session.add(default_key)

    from sqlalchemy.exc import IntegrityError
    try:
        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        await session.rollback()
        user = await session.get(User, user_uuid)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database user sync failed due to concurrent insert, but user was not found."
        )
    except Exception as commit_err:
        await session.rollback()
        # Fallback fetch in case of concurrent insert
        user = await session.get(User, user_uuid)
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database user sync failed: {str(commit_err)}"
        )
    return user


async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_res = await run_in_threadpool(supabase.auth.get_user, token)
        if not user_res or not user_res.user:
            raise credentials_exception
        user_id = user_res.user.id
    except Exception:
        raise credentials_exception

    user = await _ensure_user_in_db(
        user_id_str=user_id,
        email=user_res.user.email,
        metadata=getattr(user_res.user, "user_metadata", None),
        session=session
    )
    
    from app.models.identity import OrganizationMember
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    member = (await session.execute(stmt)).scalars().first()
    if member:
        from sqlalchemy import text
        await session.execute(text(f"SET LOCAL app.current_org_id = '{member.organization_id}'"))
        
    return user


async def get_user_via_api_key(request: Request, session: AsyncSession = Depends(get_session)) -> User:
    """
    Accepts either a Bearer JWT (Authorization header) or an X-API-Key header.
    """
    # 1. Try Bearer JWT first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token and token not in ("null", "undefined", "none"):
            try:
                user_res = await run_in_threadpool(supabase.auth.get_user, token)
                if user_res and user_res.user:
                    user = await _ensure_user_in_db(
                        user_id_str=user_res.user.id,
                        email=user_res.user.email,
                        metadata=getattr(user_res.user, "user_metadata", None),
                        session=session
                    )
                    # Set Postgres RLS context
                    from app.models.identity import OrganizationMember
                    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
                    member = (await session.execute(stmt)).scalars().first()
                    if member:
                        from sqlalchemy import text
                        await session.execute(text(f"SET LOCAL app.current_org_id = '{member.organization_id}'"))
                    return user
            except Exception as e:
                logger.warning(f"Bearer token validation failed: {e}. Falling back to API key / default user.")

    # 2. Fall back to X-API-Key
    api_key = request.headers.get("X-API-Key", "")
    if api_key:
        import hashlib
        from app.models.operations import APIKey
        from app.models.identity import OrganizationMember
        
        hashed_api_key = hashlib.sha256(api_key.encode('utf-8')).hexdigest()
        
        stmt = select(APIKey).where(APIKey.hashed_key == hashed_api_key)
        result = await session.execute(stmt)
        db_key = result.scalars().first()
        
        if db_key:
            stmt = select(User).join(OrganizationMember).where(OrganizationMember.organization_id == db_key.organization_id)
            result = await session.execute(stmt)
            org_user = result.scalars().first()
            if org_user:
                from sqlalchemy import text
                await session.execute(text(f"SET LOCAL app.current_org_id = '{db_key.organization_id}'"))
                return org_user

    # No valid credentials found — fail explicitly.
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a valid Bearer token or X-API-Key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )

_fernet = None

def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.ENCRYPTION_KEY
        if not key:
            raise ValueError("ENCRYPTION_KEY environment variable is not set. Token encryption requires it.")
        
        try:
            _fernet = Fernet(key.encode('utf-8'))
        except ValueError as e:
            raise ValueError(f"ENCRYPTION_KEY is invalid: {e}")
            
    return _fernet

def encrypt_token(token: str) -> str:
    if not token:
        return token
    f = get_fernet()
    return f.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token
    f = get_fernet()
    return f.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
