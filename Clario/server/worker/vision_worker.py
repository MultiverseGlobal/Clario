import os
import json
import base64
from typing import Dict, Any, List
import google.generativeai as genai
from PIL import Image

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-2.0-flash")
    return None

def analyze_shot_frame(
    image_path: str,
    shot_id: str,
    start_sec: float,
    end_sec: float
) -> Dict[str, Any]:
    """
    Multimodal intelligence analysis for a single video reference frame.
    """
    model = get_gemini_client()
    duration = round(end_sec - start_sec, 2)

    fallback_result = {
        "visual_description": "Subject in medium close-up, dynamic studio lighting.",
        "editor_text": "",
        "source_text": "",
        "content_type": "b_roll",
        "source_type": "unresolved",
        "likely_source": "Unresolved Candidate",
        "confidence": "possible",
        "exact_source_found": False,
        "clean_source_url": "",
        "license_status": "copyrighted_reference_only",
        "replacement_needed": True,
        "replacement_prompt": "Cinematic 35mm film shot of anonymous professional working under moody directional lighting, shallow depth of field, 8k, vertical 9:16 --no watermark, text, blur",
        "search_queries": [
            f"reference shot {shot_id} 4k clean master",
            "cinematic studio directional lighting footage",
            "documentary b-roll archive 4k"
        ],
        "notes": "Reference excerpt only. Do not deliver captioned reel frame as clean clip."
    }

    if not model or not os.path.exists(image_path):
        return fallback_result

    try:
        pil_img = Image.open(image_path)
        prompt = f"""You are a world-class film researcher and creative asset intelligence analyst.
Analyze this video reference frame from Shot {shot_id} (timestamp {start_sec}s - {end_sec}s).

1. WHAT IS VISIBLE? Describe subject, action, lighting, camera angle.
2. WHAT IS THE UNDERLYING SOURCE? (e.g. film, television, sports, interview/podcast, archive, stock, original footage). Be specific with candidate titles if recognizable (e.g. 'The French Dispatch (2021)', 'Huberman Lab #45', 'Apollo 11 Archive').
3. OCR TEXT SEPARATION: Split text into:
   - "editor_text": Creator added captions/stickers.
   - "source_text": Text physically visible in scene (signs, screens, clothes).
4. REPLACEMENT ASSET PROMPT: Original functional equivalent prompt for Midjourney / Kling / Runway / Flux (9:16 vertical) that preserves composition and pacing WITHOUT copying protected actors or trademarks.

Respond ONLY in valid JSON matching this schema:
{{
  "visual_description": "description",
  "editor_text": "text or empty",
  "source_text": "text or empty",
  "content_type": "a_roll | b_roll | ui_screen | graphic | archive | film_tv | sports | abstract",
  "source_type": "film_tv | interview_podcast | sports | archive | stock | original | generated | unresolved",
  "likely_source": "specific candidate title or 'Unresolved'",
  "confidence": "confirmed | likely | possible | unresolved",
  "exact_source_found": false,
  "clean_source_url": "",
  "license_status": "copyrighted_reference_only | licensed_clean_available | public_domain_candidate | original_replacement_needed",
  "replacement_needed": true,
  "replacement_prompt": "Midjourney/Kling prompt 9:16",
  "search_queries": ["query 1", "query 2", "query 3", "query 4"],
  "notes": "archivist caveats"
}}"""

        response = model.generate_content([prompt, pil_img], generation_config={"temperature": 0.2, "response_mime_type": "application/json"})
        parsed = json.loads(response.text)
        return {**fallback_result, **parsed}
    except Exception as e:
        print(f"Vision worker analysis error for {shot_id}: {e}")
        return fallback_result
