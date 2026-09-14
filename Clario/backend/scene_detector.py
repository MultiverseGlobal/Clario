from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import tempfile
import os
import subprocess
import uuid
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
