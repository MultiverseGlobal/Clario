import os
import subprocess
import json
import math
import re
from typing import List, Dict, Any, Tuple
from PIL import Image, ImageDraw, ImageFont

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = "ffmpeg"

# ── Video Probe ──────────────────────────────────────────────────────────────

def get_video_info(video_path: str) -> dict:
    """
    Get video duration and frame rate using ffprobe-style ffmpeg banner parsing.
    Returns dict with 'duration' (float seconds) and 'fps' (float).
    """
    result = {"duration": 10.0, "fps": 30.0}
    try:
        cmd = [FFMPEG_BIN, "-i", video_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        banner = res.stderr

        # Duration
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", banner)
        if dur_match:
            h, m, s = dur_match.groups()
            result["duration"] = int(h) * 3600 + int(m) * 60 + float(s)

        # FPS (look for "X fps" or "X tbr")
        fps_match = re.search(r"(\d+(?:\.\d+)?)\s+(?:fps|tbr)", banner)
        if fps_match:
            result["fps"] = float(fps_match.group(1))

    except Exception as e:
        print(f"Video info probe error: {e}")
    return result


def get_video_duration(video_path: str) -> float:
    return get_video_info(video_path)["duration"]


# ── Scene Detection ──────────────────────────────────────────────────────────

# ── Audio Silence & Speech Pause Detection ──────────────────────────────────

def detect_audio_silences(video_path: str, noise_db: float = -30.0, min_duration: float = 0.25) -> List[Tuple[float, float]]:
    """
    Detect natural audio pauses/silences using FFmpeg silencedetect.
    Returns list of (silence_start, silence_end) in seconds.
    """
    silences: List[Tuple[float, float]] = []
    try:
        cmd = [
            FFMPEG_BIN,
            "-i", video_path,
            "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
            "-f", "null",
            "-"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        curr_start = None
        for line in proc.stderr.split("\n"):
            if "silence_start:" in line:
                try:
                    curr_start = float(line.split("silence_start:")[1].strip().split()[0])
                except Exception:
                    pass
            elif "silence_end:" in line and curr_start is not None:
                try:
                    end = float(line.split("silence_end:")[1].strip().split()[0])
                    silences.append((curr_start, end))
                    curr_start = None
                except Exception:
                    pass
    except Exception as e:
        print(f"Audio silence detection error: {e}")
    return silences


# ── Scene Detection with Speech Alignment ─────────────────────────────────────

def detect_scenes_ffmpeg(video_path: str, threshold: float = 0.22) -> List[Tuple[float, float]]:
    """
    Run multi-pass FFmpeg scene detection with speech-pause alignment.
    1. Multi-threshold visual detection (scdet + select).
    2. Snap cuts to closest audio silence (speech pause) within +/- 0.4s.
    3. If visual detection finds 0 cuts (talking head/screen recording), segment along natural speech pauses.
    """
    info = get_video_info(video_path)
    total_duration = info["duration"]
    fps = info["fps"]
    frame_duration = 1.0 / fps

    # 1. Collect audio silence pauses for clean speech alignment
    silences = detect_audio_silences(video_path, noise_db=-28.0, min_duration=0.20)
    silence_midpoints = [(s + e) / 2.0 for (s, e) in silences]

    def snap_to_silence(t: float, max_delta: float = 0.45) -> float:
        for mid in silence_midpoints:
            if abs(t - mid) <= max_delta:
                return round(mid, 3)
        return t

    # 2. Multi-threshold visual detection
    timestamps = [0.0]
    for test_thresh in [threshold, 0.15, 0.10]:
        scene_cmd = [
            FFMPEG_BIN,
            "-i", video_path,
            "-vf", f"scdet=threshold={test_thresh * 100}",
            "-f", "null",
            "-"
        ]
        try:
            proc = subprocess.run(scene_cmd, capture_output=True, text=True, timeout=180)
            for line in proc.stderr.split("\n"):
                if "lavfi.scd.time=" in line:
                    try:
                        raw_t = float(line.split("lavfi.scd.time=")[1].strip().split()[0])
                        snapped_t = snap_to_silence(raw_t + frame_duration)
                        if snapped_t > timestamps[-1] + 0.6:
                            timestamps.append(snapped_t)
                    except Exception:
                        continue
            if len(timestamps) >= 2:
                break
        except Exception as e:
            print(f"Visual scene detection pass ({test_thresh}) error: {e}")

    # Fallback to secondary select filter if still no cuts
    if len(timestamps) < 2:
        try:
            filter_str = f"select='gt(scene,{threshold})',showinfo"
            old_cmd = [FFMPEG_BIN, "-i", video_path, "-filter:v", filter_str, "-f", "null", "-"]
            proc2 = subprocess.run(old_cmd, capture_output=True, text=True, timeout=180)
            for line in proc2.stderr.split("\n"):
                if "pts_time:" in line:
                    try:
                        raw_t = float(line.split("pts_time:")[1].split()[0])
                        snapped_t = snap_to_silence(raw_t)
                        if snapped_t > timestamps[-1] + 0.6:
                            timestamps.append(snapped_t)
                    except Exception:
                        continue
        except Exception:
            pass

    # 3. Speech-pause fallback if visual changes are continuous (e.g. talking head or podcast)
    if len(timestamps) < 2 and len(silence_midpoints) >= 2:
        print(f"Using speech pauses for narrative segmentation ({len(silence_midpoints)} pauses found)")
        last_t = 0.0
        timestamps = [0.0]
        for mid in silence_midpoints:
            if mid - last_t >= 1.5 and mid < total_duration - 0.8:
                timestamps.append(round(mid, 3))
                last_t = mid

    # Final fallback: adaptive uniform grid
    if len(timestamps) < 2:
        step = max(2.5, total_duration / 6.0)
        curr = 0.0
        timestamps = []
        while curr < total_duration - 0.5:
            timestamps.append(round(curr, 3))
            curr += step

    # Build clean intervals
    intervals = []
    for i in range(len(timestamps)):
        start = round(timestamps[i], 3)
        if i + 1 < len(timestamps):
            end = round(timestamps[i + 1] - frame_duration, 3)
        else:
            end = round(total_duration, 3)
        
        if end - start >= 0.4:
            intervals.append((start, end))

    print(f"Speech-aligned scene detection found {len(intervals)} shots in {total_duration:.1f}s video")
    return intervals


# ── Frame Extraction ─────────────────────────────────────────────────────────

def extract_frame_at_timestamp(video_path: str, timestamp: float, output_image_path: str) -> bool:
    """
    Extract single keyframe at timestamp using native FFmpeg.
    Uses -ss BEFORE -i for fast seek (thumbnail extraction, not frame-accurate needed).
    """
    cmd = [
        FFMPEG_BIN,
        "-ss", str(timestamp),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        output_image_path
    ]
    res = subprocess.run(cmd, capture_output=True)
    return res.returncode == 0 and os.path.exists(output_image_path)


# ── Contact Sheet ─────────────────────────────────────────────────────────────

def generate_contact_sheet_pillow(
    frame_paths: List[str],
    labels: List[str],
    output_sheet_path: str,
    columns: int = 3
) -> str:
    """
    Assemble high-res labeled composite contact sheet with timecodes and classification chips.
    """
    if not frame_paths:
        return ""

    images = [Image.open(p).convert("RGB") for p in frame_paths if os.path.exists(p)]
    if not images:
        return ""

    num_images = len(images)
    cols = min(columns, num_images)
    rows = math.ceil(num_images / cols)

    cell_w = 480
    cell_h = 854  # 9:16 vertical ratio
    padding = 16
    header_h = 100

    canvas_w = (cell_w * cols) + (padding * (cols + 1))
    canvas_h = (cell_h * rows) + (padding * (rows + 1)) + header_h

    sheet = Image.new("RGB", (canvas_w, canvas_h), "#0A0B0E")
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.text((padding + 8, 30), "CLARIO ASSET HARVESTER · REFERENCE CONTACT SHEET", fill="#FFFFFF")
    draw.text((padding + 8, 60), f"SEGMENTED SHOTS: {num_images} | SOURCE RESOLUTION: NATIVE 4K/1080P", fill="#94A3B8")

    # Render grid cells
    for idx, img in enumerate(images):
        r = idx // cols
        c = idx % cols
        x = padding + c * (cell_w + padding)
        y = header_h + padding + r * (cell_h + padding)

        resized = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(resized, (x, y))

        draw.rectangle([x, y, x + cell_w, y + cell_h], outline="#2A2D3A", width=2)

        label_text = labels[idx] if idx < len(labels) else f"SHOT {idx+1}"
        draw.rectangle([x + 10, y + 10, x + 200, y + 42], fill="#12141D", outline="#38BDF8", width=1)
        draw.text((x + 20, y + 18), label_text, fill="#38BDF8")

    sheet.save(output_sheet_path, "JPEG", quality=92)
    return output_sheet_path


# ── Segment Cutting ───────────────────────────────────────────────────────────

def cut_segment_ffmpeg(video_path: str, start_sec: float, end_sec: float, output_path: str) -> bool:
    """
    Cut a segment from a video with frame-accurate encoding.

    Strategy:
    - Always re-encode (never stream copy) to guarantee frame-accurate in/out points.
    - Place -ss AFTER -i so FFmpeg decodes the exact frame at start_sec.
    - Use -to (absolute timestamp) instead of -t (relative duration) for precision.
    - Reset output timestamps with setpts/asetpts so the clip starts at 0.
    - Use +faststart for instant browser streaming.
    """
    duration = round(end_sec - start_sec, 4)
    if duration <= 0:
        print(f"Invalid segment duration: {start_sec} → {end_sec}")
        return False

    # Primary: frame-accurate re-encode
    # -ss AFTER -i = slow accurate seek (decodes from beginning)
    # -vf setpts=PTS-STARTPTS resets output timestamps to 0
    cmd = [
        FFMPEG_BIN,
        "-i", video_path,
        "-ss", str(start_sec),
        "-to", str(end_sec),
        "-vf", "setpts=PTS-STARTPTS",
        "-af", "asetpts=PTS-STARTPTS",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-profile:v", "high",
        "-level", "4.1",
        "-c:a", "aac",
        "-b:a", "128k",
        "-avoid_negative_ts", "make_zero",
        "-movflags", "+faststart",
        "-y",
        output_path
    ]
    
    print(f"Cutting segment {start_sec}→{end_sec} ({duration:.2f}s) from {os.path.basename(video_path)}")
    res = subprocess.run(cmd, capture_output=True)
    
    if res.returncode != 0 or not os.path.exists(output_path) or os.path.getsize(output_path) < 1000:
        err_msg = res.stderr.decode("utf-8", errors="replace")[-3000:]
        print(f"Segment cut failed:\n{err_msg}")
        return False

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Segment cut success: {output_path} ({size_kb:.0f} KB)")
    return True
