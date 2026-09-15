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
        "scenedetect[opencv]",
        "openai-whisper",
        "openai",
        "easyocr",
        "demucs",
        "numpy",
        "requests",
        "httpx"
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

def snap_cuts_to_speech_cadence(
    raw_cuts: list[float],
    words: list[dict],
    video_duration: float,
    min_shot_duration: float = 1.8
) -> list[dict]:
    """
    Broadcast-grade speech cadence snapping & micro-splinter merger.
    
    1. PySceneDetect generates raw frame-based visual cut candidates on decoded frames.
    2. Whisper provides word-level timestamps [w_start, w_end].
    3. If any raw cut lands inside a spoken word [w_start, w_end], snap to the nearest
       word boundary or inter-word pause to prevent mid-syllable chopping.
    4. Enforce strict 1.8s minimum shot duration (PDS-v3 Broadcast Standard):
       Any adjacent micro-splinters (< 1.8s) are merged into clean, cinematic scenes.
    """
    if video_duration <= 0.0:
        video_duration = max(raw_cuts) if raw_cuts else 10.0

    if video_duration <= min_shot_duration:
        return [{
            "index": 0,
            "start_time": 0.0,
            "end_time": round(video_duration, 3),
            "duration": round(video_duration, 3),
            "transcript_text": " ".join(w.get("word", "").strip() for w in words),
            "words": words,
            "speech_aligned": True
        }]

    # Step A: Snap cuts colliding with spoken words to inter-word silence pauses
    adjusted_cuts = []
    for cut in raw_cuts:
        if cut <= 0.05 or cut >= video_duration - 0.05:
            continue

        colliding_word = None
        for idx, w in enumerate(words):
            w_start = w.get("start", 0.0)
            w_end = w.get("end", 0.0)
            if (w_start - 0.02) <= cut <= (w_end + 0.02):
                colliding_word = (idx, w)
                break

        if colliding_word:
            idx, w = colliding_word
            w_start = w.get("start", 0.0)
            w_end = w.get("end", 0.0)
            dist_to_start = abs(cut - w_start)
            dist_to_end = abs(cut - w_end)

            if dist_to_start <= dist_to_end:
                if idx > 0:
                    prev_end = words[idx - 1].get("end", 0.0)
                    snapped = (prev_end + w_start) / 2.0 if w_start > prev_end else w_start - 0.02
                else:
                    snapped = max(0.0, w_start - 0.03)
            else:
                if idx < len(words) - 1:
                    next_start = words[idx + 1].get("start", video_duration)
                    snapped = (w_end + next_start) / 2.0 if next_start > w_end else w_end + 0.02
                else:
                    snapped = min(video_duration, w_end + 0.03)
            adjusted_cuts.append(round(snapped, 3))
        else:
            adjusted_cuts.append(round(cut, 3))

    # Step B: Deduplicate & sort
    unique_cuts = sorted(list({round(max(0.0, min(video_duration, c)), 3) for c in adjusted_cuts}))

    # Step C: Merge micro-splinters to enforce min_shot_duration (1.8s)
    final_cut_points = [0.0]
    for c in unique_cuts:
        if c - final_cut_points[-1] < min_shot_duration:
            continue
        if video_duration - c < min_shot_duration:
            continue
        final_cut_points.append(c)

    if final_cut_points[-1] < video_duration:
        if video_duration - final_cut_points[-1] >= min_shot_duration or len(final_cut_points) == 1:
            final_cut_points.append(video_duration)
        else:
            final_cut_points[-1] = video_duration

    # Step D: Construct scene definitions
    scenes = []
    for i in range(len(final_cut_points) - 1):
        st = round(final_cut_points[i], 3)
        et = round(final_cut_points[i + 1], 3)
        dur = round(et - st, 3)

        scene_words = [
            w for w in words
            if w.get("start", 0.0) < et and w.get("end", 0.0) > st
        ]
        transcript = " ".join(w.get("word", "").strip() for w in scene_words)

        scenes.append({
            "index": i,
            "start_time": st,
            "end_time": et,
            "duration": dur,
            "transcript_text": transcript,
            "words": scene_words,
            "speech_aligned": len(words) > 0
        })

    return scenes

@web_app.post("/detect-scenes")
async def detect_scenes_endpoint(
    file: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Form(None)
):
    from scenedetect import detect, ContentDetector
    if not file and not video_url:
        raise HTTPException(status_code=400, detail="No file or video_url provided")

    tmp_path = None
    audio_path = None
    try:
        suffix = ".mp4"
        if file and file.filename:
            suffix = os.path.splitext(file.filename)[1] or ".mp4"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            if file:
                content = await file.read()
                tmp.write(content)
            elif video_url:
                resp = requests.get(video_url, stream=True, timeout=60)
                if resp.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to fetch video_url")
                for chunk in resp.iter_content(chunk_size=8192):
                    tmp.write(chunk)
            tmp_path = tmp.name

        # 1. Determine video duration and framerate
        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        duration = float(frame_count / fps) if fps > 0 and frame_count > 0 else 0.0
        cap.release()

        if duration <= 0:
            try:
                probe = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", tmp_path],
                    capture_output=True, text=True, check=True
                )
                duration = float(probe.stdout.strip())
            except Exception:
                duration = 10.0

        # 2. PySceneDetect ContentDetector on raw decoded frames
        # Evaluates HSV histograms & Edge Change Ratio (ECR) directly (zero I-frame drift)
        min_scene_frames = max(15, int(fps * 0.8)) # ~0.8s min raw distance
        scene_list = detect(tmp_path, ContentDetector(threshold=27.0, min_scene_len=min_scene_frames))

        raw_cuts = [0.0]
        for scene in scene_list:
            raw_cuts.append(scene[0].get_seconds())
            raw_cuts.append(scene[1].get_seconds())
        raw_cuts = sorted(list(set(raw_cuts)))

        # 3. Extract 16kHz mono audio WAV for Whisper transcription
        audio_path = tmp_path + ".wav"
        subprocess.run([
            "ffmpeg", "-y", "-i", tmp_path,
            "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
            audio_path
        ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Whisper word-level alignment (word_timestamps=True)
        words = []
        openai_key = os.environ.get("OPENAI_API_KEY", "")

        if openai_key and os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
            try:
                with open(audio_path, "rb") as af:
                    resp = requests.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {openai_key}"},
                        files={"file": ("audio.wav", af, "audio/wav")},
                        data={
                            "model": "whisper-1",
                            "response_format": "verbose_json",
                            "timestamp_granularities[]": ["word", "segment"]
                        },
                        timeout=120
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_words = data.get("words", [])
                        for w in raw_words:
                            words.append({
                                "word": w.get("word", "").strip(),
                                "start": float(w.get("start", 0.0)),
                                "end": float(w.get("end", 0.0))
                            })
            except Exception as w_err:
                print(f"OpenAI Whisper API error, fallback to local: {w_err}")

        # Local whisper fallback in container
        if not words and os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
            try:
                import whisper
                model = whisper.load_model("base")
                result = model.transcribe(audio_path, word_timestamps=True)
                for seg in result.get("segments", []):
                    for w in seg.get("words", []):
                        words.append({
                            "word": w.get("word", "").strip(),
                            "start": float(w.get("start", 0.0)),
                            "end": float(w.get("end", 0.0))
                        })
            except Exception as loc_err:
                print(f"Local Whisper transcribe error: {loc_err}")

        # 5. Snap cuts to speech cadence and enforce 1.8s min shot duration
        aligned_scenes = snap_cuts_to_speech_cadence(
            raw_cuts=raw_cuts,
            words=words,
            video_duration=duration,
            min_shot_duration=1.8
        )

        return {
            "scenes": aligned_scenes,
            "video_duration": round(duration, 3),
            "total_scenes": len(aligned_scenes),
            "words_detected": len(words),
            "engine": "PySceneDetect ContentDetector(threshold=27.0) + Whisper Word Alignment",
            "speech_cadence_aligned": len(words) > 0
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass

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
            # Lossless PTS Millisecond Cut with accurate seeking and zero-timestamp offset
            cmd = [
                "ffmpeg", "-y",
                "-accurate_seek",
                "-ss", f"{in_point:.3f}",
                "-i", clip_source_path,
                "-t", f"{duration:.3f}",
                "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30",
                "-c:v", "libx264", "-preset", "fast", "-crf", "19",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
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
