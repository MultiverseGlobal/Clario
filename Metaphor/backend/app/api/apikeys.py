import secrets
import hashlib
from typing import List
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.database.session import get_session
from app.core.security import get_user_via_api_key
from app.models.identity import User, OrganizationMember
from app.models.operations import APIKey

router = APIRouter()

@router.get("")
async def list_api_keys(
    current_user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == current_user.id)
    result = await session.execute(stmt)
    memberships = result.scalars().all()
    
    if not memberships:
        return []
    
    # Just list keys from the first org for now
    org_id = memberships[0].organization_id
    
    stmt = select(APIKey).where(APIKey.organization_id == org_id)
    result = await session.execute(stmt)
    keys = result.scalars().all()
    
    # Do not return the hashed key directly to clients, just id and name
    return [{"id": k.id, "name": k.name, "last_used": k.last_used} for k in keys]


@router.post("")
async def create_api_key(
    current_user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    stmt = select(OrganizationMember).where(OrganizationMember.user_id == current_user.id)
    result = await session.execute(stmt)
    memberships = result.scalars().all()
    
    if not memberships:
        from app.models.identity import Organization
        org = Organization(name=f"{current_user.name}'s Workspace", slug=f"workspace-{current_user.id}")
        session.add(org)
        await session.flush()
        member = OrganizationMember(user_id=current_user.id, organization_id=org.id, role="owner")
        session.add(member)
        await session.flush()
        org_id = org.id
    else:
        org_id = memberships[0].organization_id
    
    raw_token = f"metaphor_{secrets.token_urlsafe(32)}"
    hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    
    new_key = APIKey(
        organization_id=org_id,
        name="Metaphor Workspace Key",
        hashed_key=hashed_token
    )
    session.add(new_key)
    await session.commit()
    await session.refresh(new_key)
    
    return {
        "id": new_key.id,
        "name": new_key.name,
        "raw_token": raw_token,
        "key": raw_token
    }
