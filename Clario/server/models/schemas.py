from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

# ── Content & Source Enums ───────────────────────────────────────────────────

ContentType = Literal[
    "a_roll",
    "b_roll",
    "ui_screen",
    "graphic",
    "archive",
    "film_tv",
    "sports",
    "abstract",
]

SourceType = Literal[
    "film_tv",
    "interview_podcast",
    "sports",
    "archive",
    "stock",
    "original",
    "generated",
    "unresolved",
]

ConfidenceLevel = Literal["confirmed", "likely", "possible", "unresolved"]

LicenseStatus = Literal[
    "copyrighted_reference_only",
    "licensed_clean_available",
    "public_domain_candidate",
    "original_replacement_needed",
    "unresolved",
]

# ── Shot & Evidence Records ──────────────────────────────────────────────────

class SourceCandidate(BaseModel):
    title: str = Field(..., description="Candidate title or origin (e.g. 'The French Dispatch (2021)')")
    evidence_snippet: str = Field(..., description="Visual or textual evidence supporting this attribution")
    confidence: ConfidenceLevel = "possible"
    rights_status: LicenseStatus = "copyrighted_reference_only"
    clean_url: Optional[str] = None
    search_queries: List[str] = Field(default_factory=list)

class ShotRecord(BaseModel):
    project_id: str
    shot_id: str
    start_seconds: float
    end_seconds: float
    duration: float
    frame_url: str
    visual_description: str
    editor_text: str = ""
    source_text: str = ""
    content_type: ContentType = "b_roll"
    source_type: SourceType = "unresolved"
    likely_source: str = "Unresolved"
    likely_source_confidence: ConfidenceLevel = "unresolved"
    primary_subject: str = "Unknown"
    camera_angle: str = "Unknown"
    motion_type: str = "Unknown"
    lighting_type: str = "Unknown"
    color_palette: List[str] = Field(default_factory=list)
    setting: str = "Unknown"
    text_on_screen: str = ""
    audio_transcript: str = ""
    audio_tags: List[str] = Field(default_factory=list)
    brands_logos: List[str] = Field(default_factory=list)
    faces_detected: int = 0
    music_detected: bool = False
    speech_detected: bool = False
    source_candidates: List[SourceCandidate] = Field(default_factory=list)
    embedding: Optional[List[float]] = None

class SlideHarvestRecord(BaseModel):
    project_id: str
    slide_id: str
    time_seconds: float
    frame_url: str
    extracted_text: str = ""
    extracted_charts: List[str] = Field(default_factory=list)
    visual_description: str = ""
    slide_type: Literal["title", "data", "text", "diagram", "image", "unknown"] = "unknown"
    key_takeaway: str = ""

# ── Provenance & Rights Models ───────────────────────────────────────────────

class ProvenanceRecord(BaseModel):
    shot_id: str
    rights_status: LicenseStatus
    clearance_method: Literal["auto", "manual_override", "license_purchase", "pending"]
    cleared_by: Optional[str] = None
    cleared_at: Optional[int] = None
    notes: str = ""
    evidence_links: List[str] = Field(default_factory=list)

class CleanAssetRecord(BaseModel):
    id: str
    shot_id: str
    title: str
    url: str
    mime_type: str
    rights_status: LicenseStatus
    production_eligible: bool = True
    rights_note: str = ""
    created_at: int

class ReplacementRecord(BaseModel):
    id: str
    shot_id: str
    replacement_type: str
    title: str
    url: str
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    model_provider: Optional[str] = None
    dimensions: Optional[str] = None
    rights_status: str
    production_eligible: bool = True
    rights_note: str = ""
    transformation_history: List[str] = Field(default_factory=list)
    created_at: int

# ── Project Model ────────────────────────────────────────────────────────────

class HarvestProject(BaseModel):
    id: str
    name: str
    created_by: str
    reference_url: Optional[str] = None
    source_file_name: Optional[str] = None
    shots: List[ShotRecord] = Field(default_factory=list)
    slides: List[SlideHarvestRecord] = Field(default_factory=list)
    provenance: List[ProvenanceRecord] = Field(default_factory=list)
    created_at: int
    updated_at: int

# ── Ingest & Job Requests ────────────────────────────────────────────────────

class IngestUrlRequest(BaseModel):
    url: str
    mode: Literal["video_harvester", "slide_harvester"] = "video_harvester"
    project_name: Optional[str] = None

class CutSegmentRequest(BaseModel):
    shot_id: str
    start_seconds: float
    end_seconds: float

class JobStatusResponse(BaseModel):
    job_id: str
    project_id: str
    type: Literal["video_analysis", "slide_analysis", "zip_export"]
    status: Literal["pending", "processing", "completed", "failed"]
    progress_pct: int
    status_msg: str
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., description="The image generation prompt")
    reference_url: Optional[str] = Field(None, description="Optional reference image URL")
