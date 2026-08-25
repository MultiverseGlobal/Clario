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
    confidence: ConfidenceLevel = "possible"
    exact_source_found: bool = False
    clean_source_url: str = ""
    license_status: LicenseStatus = "copyrighted_reference_only"
    replacement_needed: bool = True
    replacement_prompt: str = ""
    search_queries: List[str] = Field(default_factory=list)
    notes: str = ""

# ── Slide & Design Token Records ─────────────────────────────────────────────

class SlideGraphicElement(BaseModel):
    id: str
    label: Optional[str] = None
    image_url: str
    x: float = 0.0
    y: float = 0.0
    width: float = 100.0
    height: Optional[float] = None
    type: Literal["icon", "badge", "sticker", "dock", "logo"] = "icon"

class TypographyTokens(BaseModel):
    headline_font: str = "Inter"
    font_size: str = "48px"
    font_weight: str = "800"
    letter_spacing: str = "-0.03em"
    body_font: Optional[str] = "Inter 16px"

class LayoutTokens(BaseModel):
    archetype: str = "Framework"
    structure: str = "Container with items"
    aspect_ratio: str = "1:1"

class SlideHarvestRecord(BaseModel):
    slide_id: str
    slide_index: int
    image_url: str
    ocr_transcript: str = ""
    ocr_confidence: float = 0.95
    typography_tokens: TypographyTokens = Field(default_factory=TypographyTokens)
    palette_tokens: List[str] = Field(default_factory=list)
    layout_tokens: LayoutTokens = Field(default_factory=LayoutTokens)
    isolated_elements: List[SlideGraphicElement] = Field(default_factory=list)
    source_candidates: List[str] = Field(default_factory=list)
    claude_code_prompt: str = ""
    replacement_prompt: str = ""

# ── Provenance & Project Manifest ────────────────────────────────────────────

class ProvenanceRecord(BaseModel):
    asset_id: str
    asset_name: str
    provenance_type: Literal[
        "exact_source",
        "licensed_alternative",
        "self_recorded",
        "public_domain",
        "generated_replacement",
    ]
    source_url: Optional[str] = None
    license_note: str = ""
    confidence: ConfidenceLevel = "possible"
    timestamp: int
    intended_use: str = ""

class HarvestProject(BaseModel):
    id: str
    name: str
    mode: Literal["video_harvester", "slide_harvester"]
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
