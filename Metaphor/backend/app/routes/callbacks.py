"""
routes/callbacks.py — Callback Receiver for External AI Agents
External agents (Manus, Devin, etc.) POST their results here when done.
Metaphor validates the signature, stores the result, and notifies
the recipient AI via SSE or their own queue.
"""

import hmac
import hashlib
import json
import logging
import uuid
from typing import Optional, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.models.ai_registry import AIAgent
from app.services.webhook_dispatcher import PENDING_CALLBACKS

logger = logging.getLogger("metaphor.callbacks")
router = APIRouter(prefix="/callbacks", tags=["Callbacks"])

# In-memory store of resolved callback results (keyed by callback_id)
# In production this would be written to a DB table
RESOLVED_CALLBACKS: dict[str, dict] = {}


class CallbackResult(BaseModel):
    callback_id: str
    result: Any
    status: str = "success"  # "success" | "error"
    error_message: Optional[str] = None
    metadata: Optional[dict] = None


def verify_hmac(secret: str, payload: str, signature: str) -> bool:
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/{callback_id}")
async def receive_callback(
    callback_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """
    Receive a result callback from an external AI agent.
    The agent POSTs here when it finishes a dispatched task.
    """
    # Validate callback_id exists in pending store
    pending = PENDING_CALLBACKS.get(callback_id)
    if not pending:
        raise HTTPException(status_code=404, detail=f"No pending callback with id '{callback_id}'")

    # Read raw body for HMAC validation
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # Validate HMAC signature if agent has a secret configured
    sig_header = request.headers.get("X-Metaphor-Signature")
    if sig_header:
        agent = await session.exec(
            select(AIAgent).where(AIAgent.name == pending["target_ai"])
        )
        agent = agent.first()
        if agent and agent.callback_secret:
            if not verify_hmac(agent.callback_secret, body_str, sig_header):
                raise HTTPException(status_code=401, detail="Invalid callback signature")

    # Parse body
    try:
        body = json.loads(body_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    result_data = {
        "callback_id": callback_id,
        "source_ai": pending["target_ai"],  # The agent that just completed the task
        "recipient_ai": pending["recipient_ai"],  # Who should get this result
        "project_id": pending.get("project_id"),
        "action": pending.get("action"),
        "result": body.get("result") or body,
        "status": body.get("status", "success"),
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }

    # Store resolved result
    RESOLVED_CALLBACKS[callback_id] = result_data

    # Remove from pending
    PENDING_CALLBACKS.pop(callback_id, None)

    # TODO (Phase 8): Fire SSE notification to recipient_ai if connected
    # For now log it
    logger.info(
        f"[Callback] Received result from '{result_data['source_ai']}' "
        f"for '{result_data['recipient_ai']}'. callback_id={callback_id}"
    )

    return {
        "status": "received",
        "callback_id": callback_id,
        "routed_to": result_data["recipient_ai"],
    }


@router.get("/{callback_id}/result")
async def get_callback_result(callback_id: str):
    """
    Poll for the result of a callback. Returns 202 if still pending, 200 if resolved.
    """
    if callback_id in RESOLVED_CALLBACKS:
        return {"status": "resolved", "data": RESOLVED_CALLBACKS[callback_id]}
    if callback_id in PENDING_CALLBACKS:
        return {"status": "pending", "pending_since": PENDING_CALLBACKS[callback_id]["created_at"]}
    raise HTTPException(status_code=404, detail="Callback not found")


@router.get("/resolved")
async def list_resolved_callbacks(limit: int = 20):
    """List recently resolved callbacks (newest first)."""
    results = list(RESOLVED_CALLBACKS.values())[-limit:]
    return {"callbacks": list(reversed(results)), "total": len(RESOLVED_CALLBACKS)}
