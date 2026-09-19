import re

with open('app/core/security.py', 'r') as f:
    content = f.read()

new_logic = """
from app.models.identity import Consumer, Workspace

async def get_authorized_consumer(request: Request, session: AsyncSession = Depends(get_session)) -> Consumer:
    \"\"\"
    Authenticates the request and resolves the Consumer identity and its allowed scope.
    \"\"\"
    # 1. Try X-API-Key
    api_key = request.headers.get("X-API-Key", "")
    if api_key:
        import hashlib
        from app.models.operations import APIKey
        hashed_api_key = hashlib.sha256(api_key.encode('utf-8')).hexdigest()
        
        stmt = select(APIKey).where(APIKey.hashed_key == hashed_api_key)
        db_key = (await session.execute(stmt)).scalars().first()
        
        if db_key and db_key.consumer_id:
            consumer = await session.get(Consumer, db_key.consumer_id)
            if consumer:
                return consumer
        
        if db_key:
            # Fallback for old API keys without consumer ID
            return Consumer(
                id=uuid.uuid4(),
                organization_id=db_key.organization_id,
                name="Legacy API Key Consumer",
                allowed_scopes=["global", "workspace:*", "project:*"]
            )

    # 2. Try Bearer JWT
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
                    from app.models.identity import OrganizationMember
                    stmt = select(OrganizationMember).where(OrganizationMember.user_id == user.id)
                    member = (await session.execute(stmt)).scalars().first()
                    
                    if member:
                        # For users logging in via UI, we generate a synthetic Consumer object 
                        # granting them full access to their active organization.
                        return Consumer(
                            id=user.id, # Use user ID for tracking
                            organization_id=member.organization_id,
                            name=f"User {user.email}",
                            type="user",
                            allowed_scopes=["global", "workspace:*", "project:*"]
                        )
            except Exception as e:
                logger.warning(f"Bearer token validation failed: {e}.")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Consumer authentication failed. Provide a valid Bearer token or X-API-Key mapped to a Consumer.",
        headers={"WWW-Authenticate": "Bearer"},
    )
"""

content = content + "\n" + new_logic

with open('app/core/security.py', 'w') as f:
    f.write(content)

print("Modified security.py")
