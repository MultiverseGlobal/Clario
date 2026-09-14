from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import tempfile
import os
import subprocess
import uuid
import cv2
import numpy as np
import easyocr
from scenedetect import detect, ContentDetector

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("output", exist_ok=True)
app.mount("/output", StaticFiles(directory="output"), name="output")

# Initialize OCR reader globally (CPU mode for broader compatibility)
reader = easyocr.Reader(['en'], gpu=False)

@app.post("/detect-scenes")
async def detect_scenes_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Save to temp file
    try:
        suffix = os.path.splitext(file.filename)[1]
        if not suffix:
            suffix = ".mp4"
            
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Detect scenes using ContentDetector
        scene_list = detect(tmp_path, ContentDetector(threshold=27.0))
        
        # Format results
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
            
        # Clean up
        os.remove(tmp_path)
        
        return {"scenes": results}
        
    except Exception as e:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/split-audio")
async def split_audio_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        suffix = os.path.splitext(file.filename)[1]
        if not suffix:
            suffix = ".mp4"
            
        # Give the file a unique name so spleeter output folder is predictable
        job_id = str(uuid.uuid4())
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Run spleeter via subprocess
        # output will go to output/<filename_without_ext>/vocals.wav and accompaniment.wav
        filename_without_ext = os.path.splitext(os.path.basename(tmp_path))[0]
        
        subprocess.run([
            "spleeter", "separate", 
            "-p", "spleeter:2stems", 
            "-o", "output", 
            tmp_path
        ], check=True)
        
        # Cleanup input file
        os.remove(tmp_path)
        
        return {
            "vocals": f"http://localhost:8000/output/{filename_without_ext}/vocals.wav",
            "accompaniment": f"http://localhost:8000/output/{filename_without_ext}/accompaniment.wav"
        }
        
    except Exception as e:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/inpaint-video")
async def inpaint_video_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        suffix = os.path.splitext(file.filename)[1]
        if not suffix:
            suffix = ".mp4"
            
        job_id = str(uuid.uuid4())
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
            
        output_filename = f"{job_id}_cleaned.mp4"
        output_path = os.path.join("output", output_filename)
        
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Use mp4v for writing locally, then ffmpeg to h264 for web
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        y_start = int(height * 0.6)
        MAX_FRAMES = 150 # Limit to 5s at 30fps to avoid massive CPU load during testing
        count = 0
        
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
                    
                    x_min = int(min(tl[0], bl[0]))
                    y_min = int(min(tl[1], tr[1])) + y_start
                    x_max = int(max(tr[0], br[0]))
                    y_max = int(max(br[1], bl[1])) + y_start
                    
                    pad = 8
                    x_min = max(0, x_min - pad)
                    y_min = max(0, y_min - pad)
                    x_max = min(width, x_max + pad)
                    y_max = min(height, y_max + pad)
                    
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
        
        # Convert to Web-Friendly H264 via FFmpeg
        subprocess.run([
            "ffmpeg", "-y", "-i", output_path, "-vcodec", "libx264", f"{output_path}_web.mp4"
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(f"{output_path}_web.mp4"):
            os.replace(f"{output_path}_web.mp4", output_path)
        
        return {
            "cleaned_video": f"http://localhost:8000/output/{output_filename}"
        }
    except Exception as e:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
