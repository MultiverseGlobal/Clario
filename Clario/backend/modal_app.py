import modal
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional
import tempfile
import os
import subprocess
import uuid
import json
import requests
import cv2
import numpy as np

app = modal.App("clario-ai-engine")

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "libsm6", "libxext6")
    .pip_install(
        "fastapi",
        "python-multipart",
        "opencv-python-headless",
        "scenedetect",
        "easyocr",
        "demucs",
        "numpy",
        "requests"
    )
)

# We use a volume to persist files between the processing and serving
volume = modal.Volume.from_name("clario-media-volume", create_if_missing=True)

web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@web_app.post("/detect-scenes")
async def detect_scenes_endpoint(file: UploadFile = File(...)):
    from scenedetect import detect, AdaptiveDetector
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        scene_list = detect(tmp_path, AdaptiveDetector(adaptive_threshold=3.0))
        
        results = []
        for i, scene in enumerate(scene_list):
            start_time = scene[0].get_seconds()
            end_time = scene[1].get_seconds()
            results.append({
                "index": i,
                "start_time": start_time,
                "end_time": end_time,
                "duration": end_time - start_time
            })
            
        os.remove(tmp_path)
        return {"scenes": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web_app.post("/split-audio")
async def split_audio_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        job_id = str(uuid.uuid4())
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        subprocess.run([
            "demucs", "--two-stems", "vocals", 
            "-o", "/data/output", 
            tmp_path
        ], check=True)
        
        volume.commit() # Ensure files are persisted to volume
        
        filename_without_ext = os.path.splitext(os.path.basename(tmp_path))[0]
        # In a real environment, this should dynamically determine the host or be configured via env
        base_url = "https://multiverseglobals--clario-ai-engine-fastapi-app.modal.run"
        
        os.remove(tmp_path)
        return {
            "vocals": f"{base_url}/media/htdemucs/{filename_without_ext}/vocals.wav",
            "accompaniment": f"{base_url}/media/htdemucs/{filename_without_ext}/no_vocals.wav"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web_app.post("/inpaint-video")
async def inpaint_video_endpoint(file: UploadFile = File(...)):
    import easyocr
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        job_id = str(uuid.uuid4())
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        output_filename = f"{job_id}_cleaned.mp4"
        os.makedirs("/data/output", exist_ok=True)
        output_path = os.path.join("/data/output", output_filename)
        
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        y_start = int(height * 0.6)
        MAX_FRAMES = 150 
        count = 0
        reader = easyocr.Reader(['en'], gpu=True)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or count >= MAX_FRAMES:
                break
                
            mask = np.zeros((height, width), dtype=np.uint8)
            bottom_third = frame[y_start:height, 0:width]
            results = reader.readtext(bottom_third)
            
            has_text = False
            for (bbox, text, prob) in results:
                if prob > 0.25:
                    has_text = True
                    (tl, tr, br, bl) = bbox
                    x_min = max(0, int(min(tl[0], bl[0])) - 8)
                    y_min = max(0, int(min(tl[1], tr[1])) + y_start - 8)
                    x_max = min(width, int(max(tr[0], br[0])) + 8)
                    y_max = min(height, int(max(br[1], bl[1])) + y_start + 8)
                    cv2.rectangle(mask, (x_min, y_min), (x_max, y_max), 255, -1)
            
            if has_text:
                inpainted_frame = cv2.inpaint(frame, mask, 5, cv2.INPAINT_TELEA)
                out.write(inpainted_frame)
            else:
                out.write(frame)
            count += 1
            
        cap.release()
        out.release()
        os.remove(tmp_path)
        
        subprocess.run([
            "ffmpeg", "-y", "-i", output_path, "-vcodec", "libx264", f"{output_path}_web.mp4"
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(f"{output_path}_web.mp4"):
            os.replace(f"{output_path}_web.mp4", output_path)
            
        volume.commit()
        
        base_url = "https://multiverseglobals--clario-ai-engine-fastapi-app.modal.run"
        return {
            "cleaned_video": f"{base_url}/media/{output_filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web_app.post("/render-timeline")
async def render_timeline_endpoint(
    timeline_edl: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    try:
        edl = json.loads(timeline_edl)
        clips = edl.get("clips", [])
        audio_tracks = edl.get("audioTracks", [])
        project_name = edl.get("projectName", "clario_project")
        safe_name = "".join(c for c in project_name if c.isalnum() or c in ("-", "_")).lower() or "clario_cut"
        
        job_id = str(uuid.uuid4())
        work_dir = tempfile.mkdtemp(prefix=f"render_{job_id}_")
        
        # 1. Handle uploaded base file if provided
        uploaded_source_path = None
        if file and file.filename:
            suffix = os.path.splitext(file.filename)[1] or ".mp4"
            uploaded_source_path = os.path.join(work_dir, f"uploaded_source{suffix}")
            content = await file.read()
            with open(uploaded_source_path, "wb") as f:
                f.write(content)

        # 2. Extract and render each clip segment in EDL sequence
        rendered_clip_paths = []
        for idx, clip in enumerate(clips):
            in_point = float(clip.get("inPoint", 0.0) or 0.0)
            duration = float(clip.get("duration", 0.0) or 0.0)
            if duration <= 0.0:
                duration = float(clip.get("outPoint", in_point + 1.0) - in_point)
            if duration <= 0.0:
                duration = 1.0

            # Determine source file for this clip
            clip_source_path = None
            clip_url = clip.get("url") or clip.get("videoUrl")

            if uploaded_source_path and (not clip_url or "blob:" in clip_url or "uploaded" in str(clip.get("sourceType", ""))):
                clip_source_path = uploaded_source_path
            elif clip_url:
                # Check if it references local media in volume
                if "/media/" in clip_url:
                    rel_path = clip_url.split("/media/")[-1]
                    vol_path = os.path.join("/data/output", rel_path)
                    if os.path.exists(vol_path):
                        clip_source_path = vol_path
                
                # If not found in volume and is http URL, download it
                if not clip_source_path and clip_url.startswith("http"):
                    clip_dl_path = os.path.join(work_dir, f"dl_clip_{idx}.mp4")
                    resp = requests.get(clip_url, timeout=30)
                    if resp.status_code == 200:
                        with open(clip_dl_path, "wb") as f:
                            f.write(resp.content)
                        clip_source_path = clip_dl_path

            if not clip_source_path and uploaded_source_path:
                clip_source_path = uploaded_source_path

            if not clip_source_path:
                continue

            clip_out = os.path.join(work_dir, f"cut_{idx:03d}.mp4")
            # Precise cut with re-encoding for timestamp and aspect alignment
            cmd = [
                "ffmpeg", "-y",
                "-ss", f"{in_point:.3f}",
                "-i", clip_source_path,
                "-t", f"{duration:.3f}",
                "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                "-avoid_negative_ts", "make_zero",
                clip_out
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if os.path.exists(clip_out):
                rendered_clip_paths.append(clip_out)

        if not rendered_clip_paths:
            raise HTTPException(status_code=400, detail="No valid video clips could be rendered from timeline.")

        # 3. Concatenate all cut clips
        concat_txt = os.path.join(work_dir, "concat_list.txt")
        with open(concat_txt, "w") as f:
            for p in rendered_clip_paths:
                escaped = p.replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        os.makedirs("/data/output", exist_ok=True)
        final_filename = f"{job_id}_{safe_name}.mp4"
        final_output_path = os.path.join("/data/output", final_filename)

        concat_cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_txt,
            "-c:v", "libx264", "-preset", "fast", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            final_output_path
        ]
        subprocess.run(concat_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

        volume.commit()

        base_url = "https://multiverseglobals--clario-ai-engine-fastapi-app.modal.run"
        return {
            "status": "completed",
            "job_id": job_id,
            "filename": f"{safe_name}.mp4",
            "rendered_url": f"{base_url}/media/{final_filename}",
            "clip_count": len(rendered_clip_paths)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@web_app.get("/media/{path:path}")
async def serve_media(path: str):
    volume.reload()
    file_path = f"/data/output/{path}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


@app.function(image=image, volumes={"/data": volume}, gpu="T4", timeout=300)
@modal.asgi_app()
def fastapi_app():
    return web_app
