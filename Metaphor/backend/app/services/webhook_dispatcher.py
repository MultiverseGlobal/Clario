"""
webhook_dispatcher.py — Async Webhook Dispatcher
When dispatch_to_tool targets an external AI agent (Manus, Devin, etc.),
this module proactively fires the HTTP call instead of passive queuing.
"""

import uuid
import hmac
import hashlib
import logging
import httpx
from typing import Optional, Any
from datetime import datetime, timezone

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_registry import AIAgent

logger = logging.getLogger("metaphor.webhook_dispatcher")

# ── Callback tracking ─────────────────────────────────────────────
# Maps callback_id → {recipient_ai, project_id, created_at}
PENDING_CALLBACKS: dict[str, dict] = {}


def generate_callback_id() -> str:
    return str(uuid.uuid4())


def sign_payload(secret: str, payload: str) -> str:
    """Generate HMAC-SHA256 signature for callback validation."""
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


async def get_agent_by_name(name: str, session: AsyncSession) -> Optional[AIAgent]:
    """Look up a registered AI agent by name."""
    result = await session.exec(
        select(AIAgent).where(AIAgent.name == name, AIAgent.is_active == True)
    )
    return result.first()


async def dispatch_to_external_agent(
    *,
    source_ai: str,
    target_ai: str,
    action: str,
    payload: Any,
    project_id: Optional[str],
    org_id: str,
    session: AsyncSession,
    callback_recipient: Optional[str] = None,  # which AI should receive the result
) -> dict:
    """
    Attempt to proactively dispatch a task to an externally registered AI agent.

    Returns:
        dict with keys: mode ("webhook" | "queued"), callback_id (if webhook)
    """
    agent = await get_agent_by_name(target_ai, session)

    if not agent or not agent.webhook_url:
        # Fall back to passive queue — existing behavior
        logger.info(f"[Dispatcher] No webhook for '{target_ai}' — using passive queue.")
        return {"mode": "queued", "target_ai": target_ai}

    callback_id = generate_callback_id()

    # Track who should receive the result when the agent calls back
    PENDING_CALLBACKS[callback_id] = {
        "source_ai": source_ai,
        "target_ai": target_ai,
        "recipient_ai": callback_recipient or source_ai,
        "project_id": project_id,
        "org_id": org_id,
        "action": action,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Build the dispatch payload
    dispatch_body = {
        "metaphor_dispatch": True,
        "callback_id": callback_id,
        "source_ai": source_ai,
        "action": action,
        "payload": payload,
        "project_id": project_id,
        # Metaphor's callback URL — the agent POSTs results here when done
        "callback_url": f"http://localhost:8000/api/v1/callbacks/{callback_id}",
    }

    headers = {"Content-Type": "application/json"}
    if agent.auth_header:
        headers["Authorization"] = agent.auth_header

    # Add HMAC signature if agent has a callback_secret
    if agent.callback_secret:
        import json
        body_str = json.dumps(dispatch_body, default=str)
        headers["X-Metaphor-Signature"] = sign_payload(agent.callback_secret, body_str)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(agent.webhook_url, json=dispatch_body, headers=headers)
        
        if resp.status_code >= 400:
            logger.warning(f"[Dispatcher] Agent '{target_ai}' returned {resp.status_code}. Falling back to queue.")
            PENDING_CALLBACKS.pop(callback_id, None)
            return {"mode": "queued", "target_ai": target_ai}

        logger.info(f"[Dispatcher] Dispatched to '{target_ai}' via webhook. callback_id={callback_id}")
        return {
            "mode": "webhook",
            "target_ai": target_ai,
            "webhook_url": agent.webhook_url,
            "callback_id": callback_id,
            "status": "dispatched",
        }

    except httpx.TimeoutException:
        logger.warning(f"[Dispatcher] Timeout reaching '{target_ai}'. Falling back to queue.")
        PENDING_CALLBACKS.pop(callback_id, None)
        return {"mode": "queued", "target_ai": target_ai, "reason": "timeout"}

    except Exception as e:
        logger.error(f"[Dispatcher] Error dispatching to '{target_ai}': {e}")
        PENDING_CALLBACKS.pop(callback_id, None)
        return {"mode": "queued", "target_ai": target_ai, "reason": str(e)[:200]}
