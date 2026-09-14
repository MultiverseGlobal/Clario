import modal
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import tempfile
import os
import subprocess
import uuid
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
        "spleeter",
        "numpy"
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
    from scenedetect import detect, ContentDetector
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        scene_list = detect(tmp_path, ContentDetector(threshold=27.0))
        
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
            "spleeter", "separate", 
            "-p", "spleeter:2stems", 
            "-o", "/data/output", 
            tmp_path
        ], check=True)
        
        volume.commit() # Ensure files are persisted to volume
        
        filename_without_ext = os.path.splitext(os.path.basename(tmp_path))[0]
        # In a real environment, this should dynamically determine the host or be configured via env
        base_url = "https://multiverseglobal--clario-ai-engine-fastapi-app-dev.modal.run"
        
        os.remove(tmp_path)
        return {
            "vocals": f"{base_url}/media/{filename_without_ext}/vocals.wav",
            "accompaniment": f"{base_url}/media/{filename_without_ext}/accompaniment.wav"
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
        
        base_url = "https://multiverseglobal--clario-ai-engine-fastapi-app-dev.modal.run"
        return {
            "cleaned_video": f"{base_url}/media/{output_filename}"
        }
    except Exception as e:
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
