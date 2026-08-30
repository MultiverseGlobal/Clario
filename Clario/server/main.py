import os
import shutil
import uuid
import asyncio
import zipfile
import re
import tempfile
from typing import Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
supabase: Client | None = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not supabase:
        return None
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

from models.schemas import (
    HarvestProject,
    ShotRecord,
    SlideHarvestRecord,
    ProvenanceRecord,
    IngestUrlRequest,
    JobStatusResponse,
    CutSegmentRequest
)
from worker.ffmpeg_worker import (
    detect_scenes_ffmpeg,
    extract_frame_at_timestamp,
    generate_contact_sheet_pillow,
    cut_segment_ffmpeg
)
from worker.vision_worker import analyze_shot_frame

# ── App & Storage Scaffolding ────────────────────────────────────────────────

app = FastAPI(title="Clario Asset Intelligence Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_ROOT = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(MEDIA_ROOT, exist_ok=True)

class CORSMediaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
        return response

app.mount("/media", CORSMediaStaticFiles(directory=MEDIA_ROOT), name="media")

# Projects in-memory (TODO: move to Supabase as well)
PROJECTS_DB: Dict[str, HarvestProject] = {}

def update_job(job_id: str, updates: dict):
    if not supabase: return
    try:
        updates["id"] = job_id
        supabase.table("clario_jobs").upsert(updates).execute()
    except Exception as e:
        print(f"Error updating job in Supabase: {e}")

def get_job(job_id: str):
    if not supabase: return None
    try:
        res = supabase.table("clario_jobs").select("*").eq("id", job_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None

# ── Async Media Pipeline Worker ──────────────────────────────────────────────

async def process_video_harvest_job(job_id: str, project_id: str, video_path: str, reference_url: str = ""):
    try:
        update_job(job_id, {
            "status": "processing",
            "progress_pct": 10,
            "status_msg": "Detecting shot boundaries with FFmpeg…"
        })

        project_dir = os.path.join(MEDIA_ROOT, project_id)
        os.makedirs(project_dir, exist_ok=True)

        # 1. Scene detection
        intervals = detect_scenes_ffmpeg(video_path, threshold=0.3)
        update_job(job_id, {
            "progress_pct": 30,
            "status_msg": f"Extracted {len(intervals)} shots. Slicing keyframes…"
        })

        shots: List[ShotRecord] = []
        frame_paths: List[str] = []
        labels: List[str] = []

        # 2. Keyframe extraction & multimodal vision
        for idx, (start_sec, end_sec) in enumerate(intervals):
            shot_id = f"shot_{str(idx + 1).zfill(3)}"
            mid_sec = round((start_sec + end_sec) / 2.0, 2)
            frame_filename = f"{shot_id}.jpg"
            frame_disk_path = os.path.join(project_dir, frame_filename)

            extract_frame_at_timestamp(video_path, mid_sec, frame_disk_path)
            frame_paths.append(frame_disk_path)
            labels.append(f"{shot_id.upper()} · {start_sec}s-{end_sec}s")

            # Vision intelligence
            intel = analyze_shot_frame(frame_disk_path, shot_id, start_sec, end_sec)

            frame_web_url = f"/media/{project_id}/{frame_filename}"

            shot_record = ShotRecord(
                project_id=project_id,
                shot_id=shot_id,
                start_seconds=start_sec,
                end_seconds=end_sec,
                duration=round(end_sec - start_sec, 2),
                frame_url=frame_web_url,
                visual_description=intel["visual_description"],
                editor_text=intel["editor_text"],
                source_text=intel["source_text"],
                content_type=intel["content_type"],
                source_type=intel["source_type"],
                likely_source=intel["likely_source"],
                confidence=intel["confidence"],
                exact_source_found=intel["exact_source_found"],
                clean_source_url=intel["clean_source_url"],
                license_status=intel["license_status"],
                replacement_needed=intel["replacement_needed"],
                replacement_prompt=intel["replacement_prompt"],
                search_queries=intel["search_queries"],
                notes=intel["notes"],
            )
            shots.append(shot_record)

            progress = 30 + int(70 * (idx + 1) / len(intervals))
            update_job(job_id, {
                "progress_pct": progress,
                "status_msg": f"Analyzed shot {idx + 1}/{len(intervals)}…"
            })

        update_job(job_id, {"status_msg": "Generating composite contact sheet…"})
        contact_sheet_filename = "contact_sheet.jpg"
        contact_sheet_path = os.path.join(project_dir, contact_sheet_filename)
        generate_contact_sheet_pillow(frame_paths, labels, contact_sheet_path)

        # 4. Assemble Project Record
        video_filename = os.path.basename(video_path)
        video_media_url = f"/media/{project_id}/{video_filename}"
        project = HarvestProject(
            id=project_id,
            name=f"Harvest {project_id[:8]}",
            mode="video_harvester",
            reference_url=video_media_url,
            source_file_name=video_filename,
            shots=shots,
            slides=[],
            provenance=[
                ProvenanceRecord(
                    asset_id=s.shot_id,
                    asset_name=f"{s.shot_id} ({s.content_type})",
                    provenance_type="exact_source" if s.exact_source_found else "generated_replacement",
                    source_url=s.clean_source_url or reference_url,
                    license_note=s.license_status,
                    confidence=s.confidence,
                    timestamp=int(asyncio.get_event_loop().time() * 1000),
                    intended_use="Video Asset Intelligence",
                )
                for s in shots
            ],
            created_at=int(asyncio.get_event_loop().time() * 1000),
            updated_at=int(asyncio.get_event_loop().time() * 1000),
        )

        PROJECTS_DB[project_id] = project
        update_job(job_id, {
            "status": "completed",
            "progress_pct": 100,
            "status_msg": "Harvest completed successfully.",
            "result": project.model_dump()
        })

    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "status_msg": f"Failed: {str(e)}",
            "result": {"error": str(e)}
        })

# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "service": "Clario Media Intelligence Studio"}

from pydantic import BaseModel
import google.generativeai as genai

class DownloadVideoRequest(BaseModel):
    url: str

class InsightsRequest(BaseModel):
    url: str
    gemini_api_key: str

@app.post("/api/v1/insights/transcribe")
async def generate_media_insights(req: InsightsRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not req.gemini_api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required")
        
    unique_prefix = f"clario_insight_{uuid.uuid4().hex}"
    out_template = os.path.join(tempfile.gettempdir(), f"{unique_prefix}.%(ext)s")
    
    # Download AUDIO only for faster transcription
    cmd = [
        "python", "-m", "yt_dlp",
        "-f", "bestaudio/best",
        "--extractor-args", "youtube:player_client=android",
        "--max-filesize", "100M",
        "-o", out_template,
        req.url
    ]
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=stderr.decode())
            
        temp_dir = tempfile.gettempdir()
        downloaded_file = next((f for f in os.listdir(temp_dir) if f.startswith(unique_prefix)), None)
        if not downloaded_file:
            raise HTTPException(status_code=404, detail="Downloaded file not found")
            
        file_path = os.path.join(temp_dir, downloaded_file)
        
        # Configure Gemini
        genai.configure(api_key=req.gemini_api_key)
        
        # Upload to Gemini using new File API
        uploaded_file = genai.upload_file(path=file_path)
        
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = "Listen to this audio. Provide a detailed transcription, and then write a 'Core Idea & Key Takeaways' section summarizing the absolute most useful information. Format it beautifully with markdown headers and bullet points."
        
        response = model.generate_content([prompt, uploaded_file])
        
        # Cleanup
        try:
            genai.delete_file(uploaded_file.name)
            os.unlink(file_path)
        except Exception:
            pass
        
        return {"status": "success", "insights": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download-video")
async def download_video(req: DownloadVideoRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    unique_prefix = f"clario_{uuid.uuid4().hex}"
    out_template = os.path.join(tempfile.gettempdir(), f"{unique_prefix}.%(ext)s")
    
    cmd = [
        "python", "-m", "yt_dlp",
        "-f", "best[ext=mp4]/best",
        "--extractor-args", "youtube:player_client=android",
        "--no-playlist",
        "--max-filesize", "100M",
        "-o", out_template,
        req.url
    ]
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=stderr.decode())
            
        temp_dir = tempfile.gettempdir()
        downloaded_file = next((f for f in os.listdir(temp_dir) if f.startswith(unique_prefix)), None)
        
        if not downloaded_file:
            raise HTTPException(status_code=404, detail="Downloaded file not found")
            
        file_path = os.path.join(temp_dir, downloaded_file)
        
        from starlette.background import BackgroundTask
        def cleanup():
            try:
                os.unlink(file_path)
            except Exception:
                pass
                
        return FileResponse(
            path=file_path, 
            filename=downloaded_file, 
            media_type="video/mp4",
            background=BackgroundTask(cleanup)
        )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/harvest/ingest-file")
async def ingest_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form("video_harvester"),
):
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    os.makedirs(project_dir, exist_ok=True)

    # Sanitize filename
    orig_ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    safe_filename = f"reference{orig_ext}"
    file_path = os.path.join(project_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Make sure we grab the user_id if we want to secure it, but for ingest it might be unauth'd for now
    update_job(job_id, {
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Queued for processing",
        "input_url": file.filename
    })

    background_tasks.add_task(process_video_harvest_job, job_id, project_id, file_path)

    return {"job_id": job_id, "project_id": project_id, "status": "queued"}

@app.get("/api/v1/harvest/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/v1/jobs")
async def get_user_jobs(user_id: str = Depends(get_current_user_id)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    res = supabase.table("clario_jobs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data

@app.get("/api/v1/projects/{project_id}/manifest")
async def get_project_manifest(project_id: str):
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")
    return PROJECTS_DB[project_id]

@app.post("/api/v1/projects/{project_id}/segments/cut")
async def cut_segment(project_id: str, req: CutSegmentRequest):
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")

    project = PROJECTS_DB[project_id]
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    
    if not project.source_file_name:
        raise HTTPException(status_code=400, detail="Original source file unknown for this project.")
        
    video_path = os.path.join(project_dir, project.source_file_name)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Original source file not found on server.")

    segment_filename = f"{req.shot_id}_reference_segment.mp4"
    output_path = os.path.join(project_dir, segment_filename)

    success = cut_segment_ffmpeg(video_path, req.start_seconds, req.end_seconds, output_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cut segment.")

    return {
        "status": "success",
        "url": f"/media/{project_id}/{segment_filename}",
        "filename": segment_filename
    }

@app.post("/api/v1/projects/{project_id}/export-zip")
async def export_project_zip(project_id: str):
    if project_id not in PROJECTS_DB:
        raise HTTPException(status_code=404, detail="Project not found")

    project = PROJECTS_DB[project_id]
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    zip_path = os.path.join(project_dir, f"{project_id}_harvest_pack.zip")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(project_dir):
            for file in files:
                if file.endswith(".zip"):
                    continue
                file_full = os.path.join(root, file)
                arcname = os.path.relpath(file_full, project_dir)
                zipf.write(file_full, arcname)

    return FileResponse(zip_path, filename=f"{project.name.replace(' ', '_')}_pack.zip")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
