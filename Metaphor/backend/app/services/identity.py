import uuid
from typing import Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.identity import Organization, User, OrganizationMember
from app.models.operations import APIKey

class IdentityService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_default_organization(self) -> Organization:
        """
        For V1, we auto-provision a default developer organization to 
        satisfy the multi-tenant schema without requiring an OAuth login screen.
        """
        stmt = select(Organization).where(Organization.slug == "v1-dev-workspace")
        result = await self.session.execute(stmt)
        org = result.scalar_one_or_none()
        
        if not org:
            org = Organization(
                name="V1 Dev Workspace",
                slug="v1-dev-workspace",
                plan="pro"
            )
            self.session.add(org)
            await self.session.commit()
            await self.session.refresh(org)
            
        return org

    async def get_user_organization(self, user_id: uuid.UUID) -> Optional[Organization]:
        stmt = select(Organization).join(OrganizationMember).where(OrganizationMember.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_or_create_default_user(self) -> User:
        stmt = select(User).where(User.email == "dev@metaphor.local")
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email="dev@metaphor.local",
                name="Default Developer",
                hashed_password="hashed_dev_password_123"
            )
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)
            
        return user
