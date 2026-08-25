import os
import shutil
import uuid
import asyncio
import zipfile
import re
from typing import Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

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

# In-memory job state (Ready for Redis upgrade)
JOBS_DB: Dict[str, Dict[str, Any]] = {}
PROJECTS_DB: Dict[str, HarvestProject] = {}

# ── Async Media Pipeline Worker ──────────────────────────────────────────────

async def process_video_harvest_job(job_id: str, project_id: str, video_path: str, reference_url: str = ""):
    try:
        JOBS_DB[job_id]["status"] = "processing"
        JOBS_DB[job_id]["progress_pct"] = 10
        JOBS_DB[job_id]["status_msg"] = "Detecting shot boundaries with FFmpeg…"

        project_dir = os.path.join(MEDIA_ROOT, project_id)
        os.makedirs(project_dir, exist_ok=True)

        # 1. Scene detection
        intervals = detect_scenes_ffmpeg(video_path, threshold=0.3)
        JOBS_DB[job_id]["progress_pct"] = 30
        JOBS_DB[job_id]["status_msg"] = f"Extracted {len(intervals)} shots. Slicing keyframes…"

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

            progress = 30 + int(((idx + 1) / len(intervals)) * 50)
            JOBS_DB[job_id]["progress_pct"] = progress
            JOBS_DB[job_id]["status_msg"] = f"Analyzed shot {idx + 1}/{len(intervals)}…"

        # 3. Composite Contact Sheet
        JOBS_DB[job_id]["status_msg"] = "Generating composite contact sheet…"
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

        JOBS_DB[job_id]["status"] = "completed"
        JOBS_DB[job_id]["progress_pct"] = 100
        JOBS_DB[job_id]["status_msg"] = "Harvest completed successfully."
        JOBS_DB[job_id]["result"] = project.model_dump()

    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        JOBS_DB[job_id]["status"] = "failed"
        JOBS_DB[job_id]["error"] = str(e)
        JOBS_DB[job_id]["status_msg"] = f"Failed: {str(e)}"

# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "service": "Clario Media Intelligence Studio"}

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

    JOBS_DB[job_id] = {
        "job_id": job_id,
        "project_id": project_id,
        "type": "video_analysis" if mode == "video_harvester" else "slide_analysis",
        "status": "pending",
        "progress_pct": 0,
        "status_msg": "Queued for processing",
        "error": None,
        "result": None,
    }

    background_tasks.add_task(process_video_harvest_job, job_id, project_id, file_path)

    return {"job_id": job_id, "project_id": project_id, "status": "queued"}

@app.get("/api/v1/harvest/jobs/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS_DB[job_id]

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
