from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database.session import get_session
from app.core.security import get_current_user, get_user_via_api_key
from app.models.identity import User

router = APIRouter()

from pydantic import BaseModel
from typing import Optional

class UpdateUserProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    settings: Optional[dict] = None

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Returns the currently authenticated user's information.
    """
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "settings": current_user.settings or {}
    }

@router.put("/me")
async def update_current_user_info(
    payload: UpdateUserProfileRequest,
    current_user: User = Depends(get_user_via_api_key),
    session: AsyncSession = Depends(get_session)
):
    """
    Updates the currently authenticated user's profile information.
    """
    if payload.name and payload.name.strip():
        current_user.name = payload.name.strip()
    if payload.email and payload.email.strip():
        current_user.email = payload.email.strip()
    if payload.settings is not None:
        current_user.settings = payload.settings
    
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "settings": current_user.settings or {}
    }


