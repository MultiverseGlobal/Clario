from fastapi import APIRouter
from pydantic import BaseModel
import os
import json

router = APIRouter()
CONTEXT_FILE = "sovereign_context.json"

class SovereignContext(BaseModel):
    project_id: str

@router.get("/active-context")
async def get_active_context():
    if not os.path.exists(CONTEXT_FILE):
        return {"project_id": None}
    try:
        with open(CONTEXT_FILE, "r") as f:
            data = json.load(f)
        return {"project_id": data.get("project_id")}
    except Exception:
        return {"project_id": None}

@router.post("/active-context")
async def set_active_context(context: SovereignContext):
    with open(CONTEXT_FILE, "w") as f:
        json.dump({"project_id": context.project_id}, f)
    return {"success": True, "project_id": context.project_id}

