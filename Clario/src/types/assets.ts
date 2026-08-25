// ─── Clario Harvester Data Models & Strict Rights Intelligence Types ─────────

export type ContentType =
  | 'a_roll'
  | 'b_roll'
  | 'ui_screen'
  | 'graphic'
  | 'archive'
  | 'film_tv'
  | 'sports'
  | 'abstract';

export type SourceType =
  | 'uploaded'
  | 'generated'
  | 'reconstructed'
  | 'reference_extract'
  | 'external_candidate'
  | 'film_tv'
  | 'interview_podcast'
  | 'sports'
  | 'archive'
  | 'stock'
  | 'original'
  | 'unresolved';

export type ConfidenceLevel = 'confirmed' | 'likely' | 'possible' | 'unresolved';

export type AnalysisConfidence = 'high' | 'medium' | 'low';

export type LicenseStatus =
  | 'copyrighted_reference_only'
  | 'licensed_clean_available'
  | 'public_domain_candidate'
  | 'original_replacement_needed'
  | 'unresolved';

export type RightsStatus =
  | 'user_owned'
  | 'licensed_clean_source'
  | 'public_domain_candidate'
  | 'generated_original'
  | 'reference_only'
  | 'ai_cleaned_reference'
  | 'unresolved'
  | 'not_cleared';

export type AssetKind =
  | 'reference_evidence'
  | 'reference_segment'
  | 'attached_master'
  | 'generated_original'
  | 'reconstructed_still';

export type ShotResolutionStatus =
  | 'needs_decision'
  | 'searching'
  | 'clean_master_attached'
  | 'generated_original_ready'
  | 'reference_still_reconstructed'
  | 'reference_only'
  | 'rights_unresolved';

export type AssetOutputType =
  | 'reference_evidence'
  | 'reference_segment'
  | 'authorized_asset_master'
  | 'generated_original'
  | 'ai_cleaned_reference_still';

export type HarvesterMode = 'video_harvester' | 'slide_harvester' | 'generator' | 'library';

/**
 * Canonical Persistent Asset Record Model.
 */
export interface AssetRecord {
  id: string;
  projectId: string;
  projectName?: string;
  shotId?: string;
  assetKind: AssetKind;
  rightsStatus: RightsStatus;
  productionEligible: boolean;
  title: string;
  filename?: string;
  mimeType?: string;
  sourceUrl?: string;
  rightsNote?: string;
  blobRef?: string;
  url?: string;
  prompt?: string;
  negativePrompt?: string;
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

/**
 * Real Trimmed Reference Video Segment Record.
 */
export interface ReferenceSegmentRecord {
  id: string;
  project_id: string;
  shot_id: string;
  asset_kind: 'reference_segment';
  rights_status: 'reference_only';
  production_eligible: false;
  title: string;
  filename: string;
  mime_type: 'video/mp4';
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  width: number;
  height: number;
  has_audio: boolean;
  blob_ref?: string;
  url?: string;
  created_at: number;
  updated_at: number;
}

/**
 * Strict Rights Invariant Rule:
 * An asset is production-eligible ONLY if it is:
 * - user_owned
 * - licensed_clean_source
 * - generated_original
 * - public_domain_candidate (ONLY with confirmed evidence)
 * 
 * All unresolved, reference_only, ai_cleaned_reference, and not_cleared items
 * are STRICTLY non-production-eligible.
 */
export function isProductionEligible(
  asset?: AssetRecord | RightsStatus | string | null,
  confirmedEvidence: boolean = false
): boolean {
  if (!asset) return false;
  let rightsStatus = '';
  if (typeof asset === 'string') {
    rightsStatus = asset;
  } else if (typeof asset === 'object' && asset !== null) {
    if ('rightsStatus' in asset && typeof asset.rightsStatus === 'string') {
      rightsStatus = asset.rightsStatus;
    } else if ('rights_status' in asset && typeof (asset as any).rights_status === 'string') {
      rightsStatus = (asset as any).rights_status;
    }
  }

  if (
    rightsStatus === 'user_owned' ||
    rightsStatus === 'licensed_clean_source' ||
    rightsStatus === 'generated_original'
  ) {
    return true;
  }
  if (rightsStatus === 'public_domain_candidate' && confirmedEvidence) {
    return true;
  }
  return false;
}

/**
 * Filter assets strictly eligible for commercial production packs.
 */
export function selectProductionAssets(assets: AssetRecord[]): AssetRecord[] {
  return assets.filter(asset => asset && isProductionEligible(asset));
}

// ─── Mode A: Video Shot Record ────────────────────────────────────────────────
export interface ShotRecord {
  project_id: string;
  reference_url?: string;
  shot_id: string; // e.g. "shot_001"
  start_seconds: number;
  end_seconds: number;
  duration: number;
  frame_url: string; // High-res frame screenshot (data URL or object URL)
  visual_description: string;
  editor_text: string; // Captions/stickers added during editing
  source_text: string; // Text physically visible in original scene
  content_type: ContentType;
  source_type: SourceType;
  likely_source: string; // e.g. "The French Dispatch (2021)"
  confidence: ConfidenceLevel;
  analysis_confidence?: AnalysisConfidence;
  detected_text_presence?: boolean;
  editor_overlay_detected?: boolean;
  scene_text_detected?: boolean;
  faces_detected_count?: number;
  motion_level?: 'static' | 'moderate' | 'high';
  source_confidence?: ConfidenceLevel;
  exact_source_found: boolean;
  clean_source_url: string;
  license_status: LicenseStatus;
  rights_status?: RightsStatus;
  resolution_status?: ShotResolutionStatus;
  next_action_label?: string;
  replacement_needed: boolean;
  replacement_prompt: string;
  search_queries: string[];
  notes: string;
  selected?: boolean;
}

// ─── Mode B: Carousel & Slide Record ──────────────────────────────────────────
export interface SlideGraphicElement {
  id: string;
  assetId?: string;
  label?: string;
  imageUrl: string; // Transparent PNG data URL
  x: number; // 0-100%
  y: number; // 0-100%
  width: number; // %
  height?: number; // %
  opacity?: number;
  rotation?: number;
  zIndex?: number;
  type?: 'icon' | 'badge' | 'sticker' | 'dock' | 'logo';
}

export interface SlideHarvestRecord {
  slide_id: string;
  slide_index: number;
  image_url: string;
  ocr_transcript: string;
  ocr_confidence: number;
  typography_tokens: {
    headlineFont: string;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
    bodyFont?: string;
  };
  palette_tokens: string[]; // Hex color codes
  layout_tokens: {
    archetype: string;
    structure: string;
    aspectRatio: string;
  };
  isolated_elements: SlideGraphicElement[];
  background_url?: string;
  source_candidates: string[];
  claude_code_prompt: string;
  replacement_prompt: string;
  selected?: boolean;
}

// ─── Unified Resolved Output Artifact ─────────────────────────────────────────
export interface ResolvedAssetRecord {
  id: string;
  shot_id: string;
  asset_kind: AssetKind;
  output_type: AssetOutputType;
  title: string;
  media_type: 'video' | 'image' | 'prompt';
  url: string;
  dimensions?: string;
  duration?: number;
  rights_status: RightsStatus;
  production_eligible: boolean;
  source_title?: string;
  source_url?: string;
  rights_note?: string;
  prompt?: string;
  negative_prompt?: string;
  model_target?: string;
  transformation_history: string[];
  created_at: number;
}

// ─── Clean & Replacement Records ──────────────────────────────────────────────
export interface CleanAssetRecord {
  id: string;
  shot_id: string;
  asset_kind?: AssetKind;
  asset_type: 'still' | 'clip';
  title: string;
  url: string;
  dimensions: string;
  duration?: number;
  rights_status: RightsStatus;
  production_eligible?: boolean;
  source_title: string;
  source_url?: string;
  rights_note?: string;
  transformation_history: string[];
  created_at: number;
}

export interface ReplacementRecord {
  id: string;
  shot_id: string;
  asset_kind?: AssetKind;
  replacement_type: 'generated_original' | 'ai_cleaned_reference' | 'crop_reframe';
  title: string;
  url: string;
  prompt: string;
  negative_prompt?: string;
  model_provider: string;
  dimensions: string;
  duration?: number;
  rights_status: RightsStatus;
  production_eligible?: boolean;
  rights_note?: string;
  transformation_history: string[];
  created_at: number;
}

// ─── Vault Indexed Asset Record (Alias for AssetRecord) ───────────────────────
export type VaultAssetRecord = AssetRecord;

export interface VaultQuery {
  query?: string;
  category?:
    | 'all'
    | 'production_eligible'
    | 'reference_segments'
    | 'generated_originals'
    | 'reconstructed_stills'
    | 'unresolved'
    | 'reference_evidence';
}

// ─── Mode C: Asset Generator & Prompt Record ──────────────────────────────────
export type GeneratorCategory =
  | 'anonymous_founders'
  | 'tech_systems'
  | 'code_terminal'
  | 'laboratory'
  | 'rockets_aerospace'
  | 'architecture'
  | 'crowds'
  | 'artists_musicians'
  | 'abstract_particles'
  | 'emotional_metaphors'
  | 'caption_safe_backgrounds'
  | 'custom';

export interface GeneratedAssetPrompt {
  id: string;
  title: string;
  category: GeneratorCategory;
  aspect_ratio: '9:16' | '16:9' | '1:1';
  prompt: string;
  negative_prompt: string;
  style_tokens: string[];
  intended_use: string;
  model_target: 'midjourney' | 'kling' | 'runway' | 'flux' | 'claude';
  provenance_type: 'generated_replacement' | 'original_design';
  created_at: number;
}

// ─── Mode D: Provenance Record ────────────────────────────────────────────────
export interface ProvenanceRecord {
  asset_id: string;
  asset_name: string;
  provenance_type:
    | 'exact_source'
    | 'licensed_alternative'
    | 'self_recorded'
    | 'public_domain'
    | 'generated_replacement';
  source_url?: string;
  license_note: string;
  confidence: ConfidenceLevel;
  timestamp: number;
  intended_use: string;
}

// ─── Project Container ────────────────────────────────────────────────────────
export interface HarvestProject {
  id: string;
  name: string;
  mode: HarvesterMode;
  reference_url?: string;
  source_file_name?: string;
  shots: ShotRecord[];
  slides: SlideHarvestRecord[];
  clean_assets?: CleanAssetRecord[];
  replacements?: ReplacementRecord[];
  reference_segments?: ReferenceSegmentRecord[];
  resolved_assets?: ResolvedAssetRecord[];
  generated_prompts: GeneratedAssetPrompt[];
  provenance: ProvenanceRecord[];
  created_at: number;
  updated_at: number;
}

// Backward compatibility helper types
export type ContentMode = 'video' | 'carousel';
export type Asset = any;
export type CarouselSlideItem = any;
export type VideoTrackItem = any;
export type ExtractionResult = any;
export type VideoClipAsset = any;
export type SlideAsset = any;
export type ImageFrameAsset = any;
export type TextBlockAsset = any;
export type AudioAsset = any;
export type PaletteAsset = any;
export type ScriptBeat = any;
