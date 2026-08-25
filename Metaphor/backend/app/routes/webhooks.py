import logging
import hmac
import hashlib
import os
import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.ingestion.normalizer import normalizer
from app.reflection import reflection_engine

logger = logging.getLogger("metaphor.routes.webhooks")
router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# Webhook Signature Verification (Production HMAC-SHA256 Security)
# ──────────────────────────────────────────────────────────────────────────────

async def verify_github_signature(request: Request):
    """
    Verifies GitHub X-Hub-Signature-256 HMAC-SHA256 signature against GITHUB_WEBHOOK_SECRET.
    Rejects forged or unsigned requests with 401 Unauthorized.
    """
    secret = os.getenv("GITHUB_WEBHOOK_SECRET")
    if not secret:
        # If secret is not configured in production, reject unauthenticated webhooks
        logger.warning("GITHUB_WEBHOOK_SECRET is not configured. Rejecting request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret not configured on server."
        )

    signature_header = request.headers.get("X-Hub-Signature-256")
    if not signature_header or not signature_header.startswith("sha256="):
        logger.warning("Missing or malformed X-Hub-Signature-256 header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing GitHub signature header."
        )

    body = await request.body()
    expected_signature = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature_header, expected_signature):
        logger.warning("GitHub webhook HMAC signature mismatch.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub webhook HMAC signature verification failed."
        )

    return True


async def verify_notion_signature(request: Request):
    """
    Verifies Notion X-Notion-Signature header against NOTION_WEBHOOK_SECRET.
    Rejects forged requests with 401 Unauthorized.
    """
    secret = os.getenv("NOTION_WEBHOOK_SECRET")
    if not secret:
        logger.warning("NOTION_WEBHOOK_SECRET is not configured. Rejecting request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret not configured on server."
        )

    signature_header = request.headers.get("X-Notion-Signature")
    if not signature_header:
        logger.warning("Missing X-Notion-Signature header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Notion signature header."
        )

    body = await request.body()
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()

    # Notion headers may be formatted as v0=<hex> or raw <hex>
    clean_signature = signature_header.replace("v0=", "").strip()
    if not hmac.compare_digest(clean_signature, expected_signature):
        logger.warning("Notion webhook HMAC signature mismatch.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Notion webhook HMAC signature verification failed."
        )

    return True


async def verify_google_signature(request: Request):
    """
    Verifies Google Push Notification X-Goog-Channel-Token header against GOOGLE_WEBHOOK_SECRET.
    """
    secret = os.getenv("GOOGLE_WEBHOOK_SECRET")
    if not secret:
        logger.warning("GOOGLE_WEBHOOK_SECRET is not configured. Rejecting request.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret not configured on server."
        )

    channel_token = request.headers.get("X-Goog-Channel-Token")
    if not channel_token or not hmac.compare_digest(channel_token, secret):
        logger.warning("Google webhook channel token mismatch.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google push notification verification failed."
        )

    return True


# ──────────────────────────────────────────────────────────────────────────────
# Webhook Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/supabase", response_model=Dict[str, Any])
async def supabase_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Receives webhooks from Supabase (e.g. from Atlas IO).
    Uses a secret header X-Supabase-Signature for validation.
    """
    secret = os.getenv("SUPABASE_WEBHOOK_SECRET")
    if secret:
        signature = request.headers.get("X-Supabase-Signature")
        if not signature or signature != secret:
            logger.warning("Supabase webhook signature mismatch or missing.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase webhook verification failed."
            )
            
    try:
        payload = await request.json()
        logger.info(f"Received Supabase webhook: {payload.get('type')}")
        
        # Process the payload based on table and action
        # This acts as the bridge where Metaphor is notified of Atlas events
        # E.g. trigger the curiosity loop analysis when a new lead is added
        
        return {"status": "success", "received": True}
        
    except Exception as e:
        logger.error(f"Error processing Supabase webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github", response_model=Dict[str, Any])
async def github_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    _valid: bool = Depends(verify_github_signature)
):
    try:
        payload = await request.json()
        event_type = request.headers.get("X-GitHub-Event", "unknown")
        logger.info(f"Received verified GitHub webhook event: {event_type}")

        raw_doc = {
            "id": str(uuid.uuid4()),
            "source": "github",
            "metadata": {
                "type": "commit" if event_type == "push" else "issue" if "issue" in event_type else "generic",
                "event": event_type,
                "repo": payload.get("repository", {}).get("full_name", "unknown"),
                "author": payload.get("sender", {}).get("login", "Unknown"),
            },
            "title": f"GitHub Event: {event_type}",
            "content": str(payload)
        }

        report = await reflection_engine.reflect_and_evolve(session, [raw_doc])
        await session.commit()
        return {"status": "success", "event": event_type, "report": report}

    except Exception as e:
        logger.error(f"Failed to process GitHub webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notion", response_model=Dict[str, Any])
async def notion_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    _valid: bool = Depends(verify_notion_signature)
):
    try:
        payload = await request.json()
        logger.info("Received verified Notion webhook event")

        raw_doc = {
            "id": str(uuid.uuid4()),
            "source": "notion",
            "metadata": {
                "type": "page",
                "author": "Notion Integration",
                "url": payload.get("url", "unknown-url")
            },
            "title": payload.get("title", "Updated Notion Document"),
            "content": str(payload)
        }

        report = await reflection_engine.reflect_and_evolve(session, [raw_doc])
        await session.commit()
        return {"status": "success", "report": report}

    except Exception as e:
        logger.error(f"Failed to process Notion webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google", response_model=Dict[str, Any])
async def google_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
    _valid: bool = Depends(verify_google_signature)
):
    try:
        payload = await request.json()
        logger.info("Received verified Google Push notification")

        raw_doc = {
            "id": str(uuid.uuid4()),
            "source": "google",
            "metadata": {
                "type": "doc",
                "author": "Google Drive Integration",
            },
            "title": payload.get("title", "Updated Google Document"),
            "content": str(payload)
        }

        report = await reflection_engine.reflect_and_evolve(session, [raw_doc])
        await session.commit()
        return {"status": "success", "report": report}

    except Exception as e:
        logger.error(f"Failed to process Google webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))
