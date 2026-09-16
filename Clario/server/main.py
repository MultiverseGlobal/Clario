import os
import shutil
import uuid
import asyncio
import zipfile
import re
import tempfile
from typing import Dict, Any, List, Optional
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

security = HTTPBearer(auto_error=False)

async def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    if not supabase or not credentials:
        return None
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        return user_response.user.id if user_response and user_response.user else None
    except Exception:
        return None

from models.schemas import (
    HarvestProject,
    ShotRecord,
    SlideHarvestRecord,
    ProvenanceRecord,
    IngestUrlRequest,
    IngestRemoteRequest,
    JobStatusResponse,
    CutSegmentRequest
)
from worker.ffmpeg_worker import (
    detect_scenes_ffmpeg,
    extract_frame_at_timestamp,
    generate_contact_sheet_pillow,
    cut_segment_ffmpeg,
    remove_captions_ffmpeg,
    apply_capso_styling
)
from worker.vision_worker import analyze_shot_frame

# ── App & Storage Scaffolding ────────────────────────────────────────────────

app = FastAPI(title="Clario Asset Intelligence Engine", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173,https://clariovid.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_ROOT = os.path.abspath(os.path.join(tempfile.gettempdir(), "clario_media"))
os.makedirs(MEDIA_ROOT, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(200 * 1024 * 1024)))  # 200MB default

class CORSMediaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
        return response

app.mount("/media", CORSMediaStaticFiles(directory=MEDIA_ROOT), name="media")

jobs_cache: dict = {}
projects_cache: dict = {}

def update_job(job_id: str, updates: dict):
    if job_id not in jobs_cache:
        jobs_cache[job_id] = {"id": job_id}
    jobs_cache[job_id].update(updates)
    if not supabase: return
    try:
        updates["id"] = job_id
        supabase.table("clario_jobs").upsert(updates).execute()
    except Exception as e:
        print(f"Error updating job in Supabase: {e}")

def get_job(job_id: str, user_id: str = None):
    cached = jobs_cache.get(job_id)
    if not supabase:
        return cached
    try:
        query = supabase.table("clario_jobs").select("*").eq("id", job_id)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        if res.data:
            return res.data[0]
        return cached
    except Exception:
        return cached

def update_project(project_id: str, user_id: str, project_data: dict):
    projects_cache[project_id] = project_data
    if not supabase: return
    try:
        supabase.table("clario_projects").upsert({
            "id": project_id,
            "user_id": user_id,
            "name": project_data.get("name", "Untitled Project"),
            "mode": project_data.get("mode", "video_harvester"),
            "project_data": project_data
        }).execute()
    except Exception as e:
        print(f"Error updating project in Supabase: {e}")

def get_project(project_id: str, user_id: str = None):
    cached = projects_cache.get(project_id)
    if not supabase:
        return cached
    try:
        query = supabase.table("clario_projects").select("*").eq("id", project_id)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        if res.data:
            return res.data[0].get("project_data")
        return cached
    except Exception:
        return cached

def upload_to_supabase(file_path: str, bucket: str, destination_path: str) -> str:
    target_disk_path = os.path.join(MEDIA_ROOT, destination_path)
    if os.path.abspath(file_path) != os.path.abspath(target_disk_path):
        os.makedirs(os.path.dirname(target_disk_path), exist_ok=True)
        try:
            shutil.copy2(file_path, target_disk_path)
        except Exception:
            pass

    if not supabase: return f"/media/{destination_path}"
    try:
        with open(file_path, 'rb') as f:
            supabase.storage.from_(bucket).upload(
                path=destination_path,
                file=f,
                file_options={"upsert": "true"}
            )
        return supabase.storage.from_(bucket).get_public_url(destination_path)
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        return f"/media/{destination_path}"

def download_from_supabase(bucket: str, source_path: str, destination_path: str) -> bool:
    if not supabase: return False
    try:
        res = supabase.storage.from_(bucket).download(source_path)
        with open(destination_path, "wb") as f:
            f.write(res)
        return True
    except Exception as e:
        print(f"Error downloading from Supabase: {e}")
        return False

# ── Async Media Pipeline Worker ──────────────────────────────────────────────

# Global semaphore to limit heavy FFmpeg concurrent processing
processing_semaphore = asyncio.Semaphore(2)

async def process_video_harvest_job(job_id: str, project_id: str, video_path: str, user_id: str, reference_url: str = "", is_remote: bool = False):
    async with processing_semaphore:
        try:
            update_job(job_id, {
                "status": "processing",
                "progress_pct": 5,
                "status_msg": "Downloading remote asset..." if is_remote else "Detecting shot boundaries with FFmpeg…"
            })

            project_dir = os.path.join(MEDIA_ROOT, project_id)
            os.makedirs(project_dir, exist_ok=True)

            video_filename = os.path.basename(video_path)
            local_video_path = video_path

            if is_remote:
                local_video_path = os.path.join(project_dir, video_filename)
                success = download_from_supabase("clario-raw", video_path, local_video_path)
                if not success:
                    raise Exception("Failed to download remote asset from clario-raw bucket.")
                update_job(job_id, {"progress_pct": 10, "status_msg": "Cleaning video & removing captions..."})

            # 0. Clean captions and subtitle tracks
            update_job(job_id, {
                "progress_pct": 15,
                "status_msg": "Removing captions & stripping subtitle streams..."
            })
            clean_video_filename = f"clean_{video_filename}"
            clean_video_path = os.path.join(project_dir, clean_video_filename)
            if remove_captions_ffmpeg(local_video_path, clean_video_path):
                local_video_path = clean_video_path
                video_filename = clean_video_filename

            video_media_url = upload_to_supabase(local_video_path, "clario-exports", f"{project_id}/{video_filename}")

            # 1. Cinematic scene detection
            intervals = detect_scenes_ffmpeg(local_video_path, threshold=0.25)
            # If no scene breaks found, treat whole video as one shot
            if not intervals:
                dur = get_video_duration(local_video_path)
                intervals = [(0.0, dur)]
            update_job(job_id, {
                "progress_pct": 30,
                "status_msg": f"Extracted {len(intervals)} shots. Slicing keyframes…"
            })
    
            shots: List[ShotRecord] = []
            frame_paths: List[str] = []
            labels: List[str] = []
    
            # 2. Keyframe extraction & multimodal vision
            for idx, (start_sec, end_sec) in enumerate(intervals):
                shot_id = f"shot_{uuid.uuid4().hex[:8]}"
                dur = end_sec - start_sec
                # Extract keyframe in middle of shot
                mid_sec = start_sec + (dur / 2.0)
                frame_filename = f"{shot_id}.jpg"
                frame_disk_path = os.path.join(project_dir, frame_filename)
    
                extract_frame_at_timestamp(local_video_path, mid_sec, frame_disk_path)
                frame_paths.append(frame_disk_path)
                labels.append(f"{shot_id.upper()} · {start_sec}s-{end_sec}s")
    
                # Vision intelligence
                intel = analyze_shot_frame(frame_disk_path, shot_id, start_sec, end_sec)
    
                frame_web_url = upload_to_supabase(frame_disk_path, "clario-frames", f"{project_id}/{frame_filename}")
    
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
            upload_to_supabase(contact_sheet_path, "clario-frames", f"{project_id}/{contact_sheet_filename}")
    
            # 4. Assemble Project Record (using clean export video filename and public Supabase url)
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
    
            project_dump = project.model_dump()
            update_project(project_id, user_id, project_dump)
            update_job(job_id, {
                "status": "completed",
                "progress_pct": 100,
                "status_msg": "Harvest completed successfully.",
                "result": project_dump
            })
    
        except Exception as e:
            update_job(job_id, {
                "status": "failed",
                "status_msg": f"Failed: {str(e)}",
                "result": {"error": str(e)}
            })
        finally:
            try:
                if 'local_video_path' in locals() and os.path.exists(local_video_path):
                    os.unlink(local_video_path)
                if not is_remote and 'video_path' in locals() and os.path.exists(video_path) and video_path != local_video_path:
                    os.unlink(video_path)
            except Exception:
                pass
            try:
                if supabase and 'project_dir' in locals():
                    shutil.rmtree(project_dir, ignore_errors=True)
            except Exception:
                pass

# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok", 
        "service": "Clario Media Intelligence Studio",
        "supabase_connected": supabase is not None,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

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
        
        model = genai.GenerativeModel(os.getenv('GEMINI_MODEL', 'gemini-2.0-flash'))
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
async def download_video(
    req: DownloadVideoRequest,
    user_id: str = Depends(get_current_user_id)
):
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
    user_id: str = Depends(get_current_user_id)
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

    # Reject files that are too large
    file_size = os.path.getsize(file_path)
    if file_size > MAX_UPLOAD_BYTES:
        os.unlink(file_path)
        raise HTTPException(status_code=413, detail=f"File too large ({file_size} bytes). Max: {MAX_UPLOAD_BYTES} bytes.")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    update_job(job_id, {
        "title": file.filename or "Video Harvest",
        "user_id": user_id,
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Queued for processing",
        "input_url": file.filename
    })

    background_tasks.add_task(process_video_harvest_job, job_id, project_id, file_path, user_id)

    return {"job_id": job_id, "project_id": project_id, "status": "queued"}

@app.post("/api/v1/harvest/ingest-remote")
async def ingest_remote(
    background_tasks: BackgroundTasks,
    req: IngestRemoteRequest,
    user_id: str = Depends(get_current_user_id)
):
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    os.makedirs(project_dir, exist_ok=True)

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    update_job(job_id, {
        "title": req.filename or "Video Harvest",
        "user_id": user_id,
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Queued for remote processing",
        "input_url": req.filename
    })

    background_tasks.add_task(process_video_harvest_job, job_id, project_id, req.file_path, user_id, is_remote=True)

    return {"job_id": job_id, "project_id": project_id, "status": "queued"}


class ScriptEditRequest(BaseModel):
    video_url: Optional[str] = None
    file_path: Optional[str] = None  # file path in clario-raw
    prompt: Optional[str] = "Make this look like a Cap.so recording with sleek studio padding and dark aesthetic"
    aspect_ratio: Optional[str] = "16:9"  # 16:9, 9:16, 1:1, 4:5
    padding_pct: Optional[float] = 0.08
    background_type: Optional[str] = "blur"  # blur, solid
    background_color: Optional[str] = "#0A0B0E"
    remove_captions: Optional[bool] = True
    crop_silence: Optional[bool] = False
    project_id: Optional[str] = None


@app.post("/api/v1/harvest/script-edit")
async def script_edit_video(
    req: ScriptEditRequest,
    user_id: Optional[str] = Depends(get_current_user_id)
):
    """
    Script-Driven / Cap.so Video Production:
    - User gives natural language instructions (prompt) e.g. "Vertical reel with dark purple background and no captions"
    - Gemini / Heuristic decomposes instructions into rendering flags (aspect ratio, padding, background, captions)
    - FFmpeg renders padded video with background and normalized audio
    - Result uploaded to clario-exports and public URL returned
    """
    if not req.video_url and not req.file_path:
        raise HTTPException(status_code=400, detail="video_url or file_path in clario-raw is required")

    effective_user_id = user_id or "service-user"
    export_id = f"capso_{uuid.uuid4().hex[:10]}"
    work_dir = os.path.join(MEDIA_ROOT, export_id)
    os.makedirs(work_dir, exist_ok=True)
    local_input = os.path.join(work_dir, "input.mp4")
    local_output = os.path.join(work_dir, f"{export_id}.mp4")

    # 1. Acquire source file
    if req.file_path:
        success = download_from_supabase("clario-raw", req.file_path, local_input)
        if not success:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=404, detail=f"File {req.file_path} not found in clario-raw bucket")
    elif req.video_url:
        import urllib.request
        try:
            urllib.request.urlretrieve(req.video_url, local_input)
        except Exception as e:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Failed to download video from URL: {e}")

    # 2. Decompose prompt parameters
    aspect_ratio = req.aspect_ratio or "16:9"
    padding_pct = req.padding_pct if req.padding_pct is not None else 0.08
    background_type = req.background_type or "blur"
    background_color = req.background_color or "#0A0B0E"
    remove_captions = True if req.remove_captions is None else req.remove_captions
    crop_silence = bool(req.crop_silence)

    if req.prompt:
        p_lower = req.prompt.lower()
        if any(w in p_lower for w in ["vertical", "reel", "shorts", "tiktok", "9:16", "phone", "story"]):
            aspect_ratio = "9:16"
        elif any(w in p_lower for w in ["square", "1:1", "feed"]):
            aspect_ratio = "1:1"
        elif any(w in p_lower for w in ["16:9", "horizontal", "landscape", "youtube", "widescreen"]):
            aspect_ratio = "16:9"

        if "solid" in p_lower or "clean color" in p_lower:
            background_type = "solid"
        elif "blur" in p_lower or "ambient" in p_lower or "cap.so" in p_lower:
            background_type = "blur"

        if "purple" in p_lower:
            background_color = "#1E1035"
        elif "blue" in p_lower:
            background_color = "#0B1528"
        elif "black" in p_lower or "dark" in p_lower:
            background_color = "#0A0B0E"

        if "silence" in p_lower or "pause" in p_lower or "breath" in p_lower:
            crop_silence = True
        if "keep caption" in p_lower or "with caption" in p_lower:
            remove_captions = False

    # 3. Apply Cap.so / Studio styling
    success = apply_capso_styling(
        video_path=local_input,
        output_path=local_output,
        aspect_ratio=aspect_ratio,
        padding_pct=padding_pct,
        background_type=background_type,
        background_color=background_color,
        remove_captions=remove_captions,
        crop_silence=crop_silence
    )

    if not success or not os.path.exists(local_output):
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="FFmpeg video styling failed")

    # 4. Upload to Supabase clario-exports
    dest_path = f"exports/{export_id}.mp4"
    public_url = upload_to_supabase(local_output, "clario-exports", dest_path)

    # Cleanup local temp
    shutil.rmtree(work_dir, ignore_errors=True)

    return {
        "success": True,
        "export_id": export_id,
        "export_url": public_url,
        "parameters": {
            "aspect_ratio": aspect_ratio,
            "padding_pct": padding_pct,
            "background_type": background_type,
            "background_color": background_color,
            "remove_captions": remove_captions,
            "crop_silence": crop_silence,
            "prompt_applied": req.prompt
        }
    }


@app.post("/api/v1/harvest/ingest-url")
async def ingest_url(
    background_tasks: BackgroundTasks,
    req: IngestUrlRequest,
    user_id: str = Depends(get_current_user_id)
):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    unique_prefix = f"clario_ingest_{uuid.uuid4().hex[:8]}"
    out_template = os.path.join(project_dir, f"{unique_prefix}.%(ext)s")
    
    cmd = [
        "python", "-m", "yt_dlp",
        "-f", "best[ext=mp4]/best",
        "--extractor-args", "youtube:player_client=android",
        "--no-playlist",
        "--max-filesize", "100M",
        "-o", out_template,
        req.url
    ]
    
    # Download synchronously so we can queue the correct file path, or we can queue the download itself.
    # We will queue a wrapper task that downloads then processes.
    
    async def download_and_process(job_id_inner, project_id_inner, url_inner, out_template_inner, project_dir_inner, user_id_inner):
        update_job(job_id_inner, {
            "status": "processing",
            "progress_pct": 5,
            "status_msg": "Downloading video via yt-dlp..."
        })
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise Exception(stderr.decode())
                
            downloaded_file = next((f for f in os.listdir(project_dir_inner) if f.startswith(unique_prefix)), None)
            if not downloaded_file:
                raise Exception("Downloaded file not found")
                
            file_path = os.path.join(project_dir_inner, downloaded_file)
            await process_video_harvest_job(job_id_inner, project_id_inner, file_path, user_id_inner, url_inner)
            
        except Exception as e:
            update_job(job_id_inner, {
                "status": "failed",
                "status_msg": f"Download failed: {str(e)}",
                "result": {"error": str(e)}
            })
            
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    update_job(job_id, {
        "title": req.url,
        "user_id": user_id,
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Queued for download and processing",
        "input_url": req.url
    })
    
    background_tasks.add_task(download_and_process, job_id, project_id, req.url, out_template, project_dir, user_id)
    return {"job_id": job_id, "project_id": project_id, "status": "queued"}

@app.get("/api/v1/harvest/jobs/{job_id}")
async def get_job_status(job_id: str, user_id: str = Depends(get_current_user_id)):
    job = get_job(job_id, user_id)
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
async def get_project_manifest(project_id: str, user_id: str = Depends(get_current_user_id)):
    project_data = get_project(project_id, user_id)
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_data

@app.post("/api/v1/projects/{project_id}/segments/cut")
async def cut_segment(
    project_id: str, 
    req: CutSegmentRequest,
    user_id: str = Depends(get_current_user_id)
):
    project_data = get_project(project_id, user_id)
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")

    project = HarvestProject(**project_data)
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    
    if not project.source_file_name:
        raise HTTPException(status_code=400, detail="Original source file unknown for this project.")
        
    video_path = os.path.join(project_dir, project.source_file_name)
    if not os.path.exists(video_path):
        os.makedirs(project_dir, exist_ok=True)
        success = download_from_supabase("clario-exports", f"{project_id}/{project.source_file_name}", video_path)
        if not success:
            raise HTTPException(status_code=404, detail="Original source file not found on server or Supabase.")

    segment_filename = f"{req.shot_id}_reference_segment.mp4"
    output_path = os.path.join(project_dir, segment_filename)

    success = cut_segment_ffmpeg(video_path, req.start_seconds, req.end_seconds, output_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cut segment.")

    segment_url = upload_to_supabase(output_path, "clario-exports", f"{project_id}/{segment_filename}")

    return {
        "status": "success",
        "url": segment_url,
        "filename": segment_filename
    }

@app.api_route("/api/v1/projects/{project_id}/export-zip", methods=["GET", "POST"])
async def export_project_zip(project_id: str, user_id: Optional[str] = Depends(get_current_user_id)):
    project_data = get_project(project_id, user_id)
    if not project_data and user_id:
        project_data = get_project(project_id, None)
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")

    project = HarvestProject(**project_data)
    temp_dir = tempfile.mkdtemp(prefix=f"clario_export_{project_id}_")
    
    # Download source video if available
    if project.source_file_name:
        download_from_supabase("clario-exports", f"{project_id}/{project.source_file_name}", os.path.join(temp_dir, project.source_file_name))
        
    # Download contact sheet
    download_from_supabase("clario-frames", f"{project_id}/contact_sheet.jpg", os.path.join(temp_dir, "contact_sheet.jpg"))
    
    # Download keyframes
    for shot in project.shots:
        frame_filename = f"{shot.shot_id}.jpg"
        download_from_supabase("clario-frames", f"{project_id}/{frame_filename}", os.path.join(temp_dir, frame_filename))

    zip_filename = f"{project_id}_harvest_pack.zip"
    zip_path = os.path.join(tempfile.gettempdir(), zip_filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(temp_dir):
            for file in files:
                file_full = os.path.join(root, file)
                arcname = os.path.relpath(file_full, temp_dir)
                zipf.write(file_full, arcname)

    # Cleanup temp directory
    shutil.rmtree(temp_dir, ignore_errors=True)

    from starlette.background import BackgroundTask
    def cleanup_zip():
        try:
            os.unlink(zip_path)
        except Exception:
            pass

    return FileResponse(
        path=zip_path, 
        filename=f"{project.name.replace(' ', '_')}_pack.zip",
        background=BackgroundTask(cleanup_zip)
    )


# ── Reference Library Endpoints ──────────────────────────────────────────────

class ReferenceIngestUrlRequest(BaseModel):
    url: str
    gemini_api_key: str | None = None

class ScriptMatchRequest(BaseModel):
    script_text: str
    top_k: int = 8
    gemini_api_key: str | None = None


def _get_gemini_embedding(text: str, api_key: str | None = None) -> list[float] | None:
    """Get a 768-dim embedding from Gemini text-embedding-004."""
    try:
        import google.generativeai as genai
        key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not key:
            return None
        genai.configure(api_key=key)
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        return result["embedding"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


async def _process_reference_ingest(
    job_id: str,
    video_path: str,
    source_url: str,
    source_type: str,
    user_id: str,
    gemini_api_key: str | None,
):
    """Background worker: scene detect → keyframes → vision → embed → upsert to Supabase."""
    async with processing_semaphore:
        project_id = f"ref_{uuid.uuid4().hex[:10]}"
        project_dir = os.path.join(MEDIA_ROOT, project_id)
        os.makedirs(project_dir, exist_ok=True)
    
        try:
            update_job(job_id, {"status": "processing", "progress_pct": 10, "status_msg": "Detecting scenes…"})
    
            intervals = detect_scenes_ffmpeg(video_path, threshold=0.3)
            update_job(job_id, {"progress_pct": 25, "status_msg": f"{len(intervals)} shots found. Extracting keyframes…"})
    
            rows = []
            for idx, (start_sec, end_sec) in enumerate(intervals):
                shot_id = f"shot_{str(idx + 1).zfill(3)}"
                frame_filename = f"{shot_id}.jpg"
                frame_path = os.path.join(project_dir, frame_filename)
                mid_sec = round((start_sec + end_sec) / 2.0, 2)
    
                extract_frame_at_timestamp(video_path, mid_sec, frame_path)
                intel = analyze_shot_frame(frame_path, shot_id, start_sec, end_sec)
    
                # Build rich text for embedding: description + content type
                embed_text = f"{intel['visual_description']} {intel.get('editor_text', '')} {intel.get('content_type', '')}"
                embedding = _get_gemini_embedding(embed_text, gemini_api_key)
    
                frame_url = f"/media/{project_id}/{frame_filename}"
                row = {
                    "user_id": user_id,
                    "source_url": source_url,
                    "source_type": source_type,
                    "title": os.path.basename(video_path),
                    "shot_id": shot_id,
                    "start_sec": start_sec,
                    "end_sec": end_sec,
                    "duration": round(end_sec - start_sec, 2),
                    "frame_url": frame_url,
                    "description": intel["visual_description"],
                    "content_type": intel.get("content_type", ""),
                    "embedding": embedding,
                }
                rows.append(row)
    
                progress = 25 + int(65 * (idx + 1) / len(intervals))
                update_job(job_id, {"progress_pct": progress, "status_msg": f"Processed shot {idx + 1}/{len(intervals)}"})
    
            # Upsert to Supabase (filter out rows without embeddings if key missing)
            if supabase and rows:
                # pgvector expects embedding as a list; Supabase Python client handles serialization
                supabase.table("reference_library").insert(rows).execute()
    
            update_job(job_id, {
                "status": "completed",
                "progress_pct": 100,
                "status_msg": f"Ingested {len(rows)} shots into Reference Library.",
                "result": {"shot_count": len(rows), "project_id": project_id},
            })
    
        except Exception as e:
            update_job(job_id, {"status": "failed", "status_msg": f"Failed: {str(e)}", "result": {"error": str(e)}})
        finally:
            # Clean up the entire temporary project directory to prevent cloud disk filling
            try:
                if supabase and 'project_dir' in locals():
                    shutil.rmtree(project_dir, ignore_errors=True)
            except Exception:
                pass
    

@app.post("/api/v1/reference/ingest-url")
async def reference_ingest_url(
    background_tasks: BackgroundTasks,
    req: ReferenceIngestUrlRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Download a YouTube/Instagram/Drive URL via yt-dlp, detect scenes,
    extract keyframes, generate Gemini embeddings, and store in reference_library.
    Returns a job_id to poll for status.
    """
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id = f"ref_job_{uuid.uuid4().hex[:10]}"
    unique_prefix = f"clario_ref_{uuid.uuid4().hex}"
    out_template = os.path.join(tempfile.gettempdir(), f"{unique_prefix}.%(ext)s")

    # Detect source type from URL
    source_type = "upload"
    url_lower = req.url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        source_type = "youtube"
    elif "instagram.com" in url_lower:
        source_type = "instagram"
    elif "drive.google.com" in url_lower:
        source_type = "drive"

    update_job(job_id, {
        "status": "queued",
        "progress_pct": 0,
        "status_msg": f"Downloading from {source_type}…",
        "input_url": req.url,
    })

    # Download video
    cmd = [
        "python", "-m", "yt_dlp",
        "-f", "best[ext=mp4]/best",
        "--extractor-args", "youtube:player_client=android",
        "--no-playlist",
        "--max-filesize", "500M",
        "-o", out_template,
        req.url,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        update_job(job_id, {"status": "failed", "status_msg": stderr.decode()[:500]})
        raise HTTPException(status_code=500, detail=f"Download failed: {stderr.decode()[:300]}")

    tmp_dir = tempfile.gettempdir()
    downloaded = next((f for f in os.listdir(tmp_dir) if f.startswith(unique_prefix)), None)
    if not downloaded:
        raise HTTPException(status_code=404, detail="Downloaded file not found")

    video_path = os.path.join(tmp_dir, downloaded)
    background_tasks.add_task(
        _process_reference_ingest,
        job_id, video_path, req.url, source_type, user_id, req.gemini_api_key,
    )

    return {"job_id": job_id, "status": "queued", "source_type": source_type}


@app.post("/api/v1/reference/ingest-file")
async def reference_ingest_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    gemini_api_key: str = Form(""),
):
    """Upload a video file directly into the Reference Library."""
    job_id = f"ref_job_{uuid.uuid4().hex[:10]}"
    orig_ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    tmp_path = os.path.join(tempfile.gettempdir(), f"clario_ref_{uuid.uuid4().hex}{orig_ext}")

    with open(tmp_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    update_job(job_id, {
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Upload received. Processing…",
        "input_url": file.filename,
    })

    background_tasks.add_task(
        _process_reference_ingest,
        job_id, tmp_path, file.filename or "", "upload",
        user_id, gemini_api_key or None,
    )

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/v1/reference/library")
async def get_reference_library(
    user_id: str = Depends(get_current_user_id),
    page: int = 1,
    page_size: int = 24,
):
    """Return paginated reference library clips for a user."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    offset = (page - 1) * page_size
    res = (
        supabase.table("reference_library")
        .select("id, shot_id, title, source_url, source_type, frame_url, description, start_sec, end_sec, duration, content_type, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return {"clips": res.data, "page": page, "page_size": page_size}


@app.post("/api/v1/script/match")
async def script_match(
    req: ScriptMatchRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Match a script against the Reference Library using pgvector cosine similarity.
    Chunks the script by line/sentence, embeds each chunk via Gemini text-embedding-004,
    and returns top-k matched clips per chunk plus a global ranked list.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    if not req.script_text.strip():
        raise HTTPException(status_code=400, detail="script_text is required")

    # 1. Chunk script — split on double newlines or single newlines
    raw_chunks = [c.strip() for c in req.script_text.split("\n") if c.strip()]
    # Merge very short lines (< 30 chars) with the next chunk
    chunks: list[str] = []
    buffer = ""
    for line in raw_chunks:
        buffer = (buffer + " " + line).strip() if buffer else line
        if len(buffer) >= 30:
            chunks.append(buffer)
            buffer = ""
    if buffer:
        chunks.append(buffer)

    if not chunks:
        raise HTTPException(status_code=400, detail="No scriptable content found")

    # 2. Embed each chunk and run pgvector match via RPC
    chunk_results = []
    seen_clip_ids: dict[str, float] = {}  # clip_id → best similarity (for ranked view)

    for i, chunk in enumerate(chunks):
        embedding = _get_gemini_embedding(chunk, req.gemini_api_key)
        if embedding is None:
            chunk_results.append({
                "chunk_index": i,
                "chunk_text": chunk,
                "matches": [],
                "error": "Embedding failed — check GEMINI_API_KEY",
            })
            continue

        rpc_res = supabase.rpc(
            "match_reference_library",
            {
                "query_embedding": embedding,
                "match_user_id": user_id,
                "match_count": req.top_k,
            },
        ).execute()

        matches = rpc_res.data or []
        chunk_results.append({
            "chunk_index": i,
            "chunk_text": chunk,
            "matches": matches,
        })

        for m in matches:
            clip_id = m.get("id", "")
            sim = m.get("similarity", 0.0)
            if clip_id not in seen_clip_ids or seen_clip_ids[clip_id] < sim:
                seen_clip_ids[clip_id] = sim

    # 3. Build global ranked clip list (deduplicated, sorted by best similarity)
    ranked_clip_ids = sorted(seen_clip_ids.items(), key=lambda x: x[1], reverse=True)
    # Fetch full clip records for the ranked list
    if ranked_clip_ids and supabase:
        ids = [cid for cid, _ in ranked_clip_ids[: req.top_k * 2]]
        clips_res = supabase.table("reference_library").select(
            "id, shot_id, title, source_url, source_type, frame_url, description, start_sec, end_sec, duration"
        ).in_("id", ids).execute()
        clips_map = {c["id"]: c for c in (clips_res.data or [])}
        ranked_clips = [
            {**clips_map[cid], "similarity": sim}
            for cid, sim in ranked_clip_ids[: req.top_k * 2]
            if cid in clips_map
        ]
    else:
        ranked_clips = []

    return {
        "chunks": chunk_results,
        "ranked_clips": ranked_clips,
        "total_chunks": len(chunks),
        "total_unique_clips": len(ranked_clip_ids),
    }


import httpx

class GenerateImageRequest(BaseModel):
    prompt: str
    reference_url: str | None = None

@app.post("/api/v1/reference/generate-image")
async def reference_generate_image(req: GenerateImageRequest):
    """
    Generate an image using OpenAI DALL-E 3 (for inpainting/reconstruction workflows).
    Requires OPENAI_API_KEY environment variable.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured on the server.")

    # In a real inpainting workflow we might use an edit endpoint, but DALL-E 3 only supports generation currently.
    # We pass the reference URL as part of the prompt context.
    augmented_prompt = req.prompt
    if req.reference_url:
        augmented_prompt += f"\n\n(Style match reference: {req.reference_url})"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "dall-e-3",
                    "prompt": augmented_prompt,
                    "n": 1,
                    "size": "1024x1024",
                    "quality": "standard"
                }
            )
            
            if resp.status_code != 200:
                err_data = resp.json()
                raise HTTPException(status_code=resp.status_code, detail=f"OpenAI error: {err_data}")
                
            data = resp.json()
            image_url = data["data"][0]["url"]
            
            return {"status": "success", "url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class EditDirectiveRequest(BaseModel):
    script_text: str
    duration: float = 30.0
    style_preset: str = "cap_so_studio"
    gemini_api_key: str | None = None

@app.post("/api/v1/recording/edit-directive")
async def process_edit_directive(req: EditDirectiveRequest):
    """
    Cap.so / Recordly style script-driven edit planner.
    Analyzes the user's video editing directive prompt and generates structured
    visual production decisions: auto-zooms, framing, padded canvas, silence cuts,
    and pacing rules.
    """
    import json
    api_key = req.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
    
    prompt = f"""You are an elite Cap.so and Recordly style automated video production director.
A creator recorded a {req.duration}s screen/walkthrough video.
They supplied this Edit Directive Script:
"{req.script_text}"

Style Preset: {req.style_preset}

Produce a structured JSON editing plan specifying:
1. canvas: padding (px, e.g. 24), border_radius (px, e.g. 16), shadow_blur (px, e.g. 32), background_style ("dark_mesh_gradient", "minimal_studio", or "custom")
2. zoom_events: list of dynamic punch-in/zoom moments based on their instructions (timestamp in seconds, duration in seconds, scale between 1.1x and 1.45x, focus: "center"|"cursor"|"bottom_right", and reason)
3. silence_trims: list of dead air intervals to tighten (e.g. [{{"start": 4.1, "end": 5.2}}])
4. highlights: list of text callout pills or spotlight moments
5. pacing: "fast" | "cinematic" | "balanced"
6. summary: 1 sentence summary of the Cap.so style production applied.

Respond ONLY with valid JSON matching this schema:
{{
  "canvas": {{ "padding": 24, "border_radius": 16, "shadow_blur": 32, "background_style": "dark_mesh_gradient" }},
  "zoom_events": [
    {{ "timestamp": 2.5, "duration": 3.0, "scale": 1.3, "focus": "center", "reason": "Focus on interaction" }}
  ],
  "silence_trims": [],
  "highlights": [],
  "pacing": "fast",
  "summary": "Applied Cap.so studio framing with smooth zooms and tightened pauses"
}}"""

    if api_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)
        except Exception as e:
            print(f"Gemini edit directive generation error: {e}")

    # Heuristic fallback if Gemini is offline
    is_clean_shots = "clean shot" in req.script_text.lower() or "auto scene detection" in req.script_text.lower()

    return {
        "canvas": { "padding": 0 if is_clean_shots else 24, "border_radius": 0 if is_clean_shots else 16, "shadow_blur": 0 if is_clean_shots else 32, "background_style": "none" if is_clean_shots else "dark_mesh_gradient" },
        "zoom_events": [] if is_clean_shots else [
            { "timestamp": max(1.0, req.duration * 0.15), "duration": 4.0, "scale": 1.25, "focus": "center", "reason": "Initial punch-in on core demonstration" },
            { "timestamp": max(5.0, req.duration * 0.65), "duration": 3.5, "scale": 1.35, "focus": "cursor", "reason": "Detail zoom on product outcome" }
        ],
        "silence_trims": [] if is_clean_shots else (
            [ { "start": req.duration * 0.4, "end": req.duration * 0.43 } ] if req.duration > 10 else []
        ),
        "highlights": [] if is_clean_shots else ["Cap.so Studio Polish", "Recordly Smooth Zoom"],
        "pacing": "original" if is_clean_shots else "fast",
        "summary": "Original shots preserved without alterations." if is_clean_shots else "Studio padded canvas with 16px rounded corners, smooth zooms, and dead-air tightening."
    }

async def process_inpaint_job(job_id: str, project_id: str, video_path: str, user_id: str):
    async with processing_semaphore:
        try:
            update_job(job_id, {
                "status": "processing",
                "progress_pct": 10,
                "status_msg": "Removing captions via FFmpeg (local AI mock)..."
            })
            
            project_dir = os.path.join(MEDIA_ROOT, project_id)
            safe_name = os.path.splitext(os.path.basename(video_path))[0]
            cleaned_path = os.path.join(project_dir, f"{safe_name}_cleaned.mp4")
            
            from worker.ffmpeg_worker import remove_captions_ffmpeg
            remove_captions_ffmpeg(video_path, cleaned_path, punch_in=True)
            
            rel_path = os.path.relpath(cleaned_path, MEDIA_ROOT).replace("\\", "/")
            public_url = f"/media/{rel_path}"
            
            update_job(job_id, {
                "status": "completed",
                "progress_pct": 100,
                "status_msg": "Inpainting complete.",
                "result": {"cleaned_video": public_url}
            })
            
        except Exception as e:
            update_job(job_id, {
                "status": "failed",
                "status_msg": f"Inpainting failed: {str(e)}"
            })

@app.post("/api/v1/harvest/inpaint-video")
async def inpaint_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    project_dir = os.path.join(MEDIA_ROOT, project_id)
    os.makedirs(project_dir, exist_ok=True)

    orig_ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    safe_filename = f"reference{orig_ext}"
    file_path = os.path.join(project_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    update_job(job_id, {
        "title": file.filename or "Video Inpaint",
        "user_id": user_id,
        "status": "queued",
        "progress_pct": 0,
        "status_msg": "Queued for AI Inpainting",
        "input_url": file.filename
    })

    background_tasks.add_task(process_inpaint_job, job_id, project_id, file_path, user_id)
    return {"job_id": job_id, "project_id": project_id, "status": "queued"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
