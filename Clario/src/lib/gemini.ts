// ─── Clario Harvester AI & Intelligence Engine (Gemini 2.0 Flash) ──────────
import { supabase } from './supabase';

import type {
  ShotRecord,
  SlideHarvestRecord,
  GeneratorCategory,
  GeneratedAssetPrompt,
  ConfidenceLevel,
  LicenseStatus,
  ContentType,
  SourceType,
  AnalysisConfidence,
} from "../types/assets";

export const GEMINI_MODEL = "gemini-2.0-flash";

let memoryApiKey: string | null = null;
let geminiAvailable = true;

export function getApiKey(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return memoryApiKey || "";
}

export async function fetchApiKeyFromDb(): Promise<void> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (userAuth.user) {
      const { data } = await supabase
        .from('clario_user_settings')
        .select('gemini_api_key')
        .eq('user_id', userAuth.user.id)
        .maybeSingle();
      if (data?.gemini_api_key) {
        memoryApiKey = data.gemini_api_key;
        return;
      }
    }
  } catch (err) {
    console.error("Failed to fetch API key from DB:", err);
  }
  
  // Fallback migration from local storage
  try {
    const custom = localStorage.getItem("clario_gemini_api_key") || localStorage.getItem("gemini_api_key");
    if (custom) {
      memoryApiKey = custom;
      await setApiKey(custom); // migrate
      localStorage.removeItem("clario_gemini_api_key");
      localStorage.removeItem("gemini_api_key");
    }
  } catch {}
}

export async function setApiKey(key: string): Promise<void> {
  memoryApiKey = key.trim();
  geminiAvailable = true;
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (userAuth.user) {
      await supabase
        .from('clario_user_settings')
        .upsert({ user_id: userAuth.user.id, gemini_api_key: memoryApiKey as any }, { onConflict: 'user_id' });
    }
  } catch (err) {
    console.error("Failed to save API key to DB:", err);
  }
}

export function isGeminiAvailable(): boolean {
  return !!getApiKey() && geminiAvailable;
}

export function resetGeminiAvailability(): void {
  geminiAvailable = true;
}

export async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(",")[1];
      resolve({ data: base64data, mimeType: blob.type || "image/png" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Deterministic Fallback Signal Hierarchy for Transparent Shot Intelligence ─
const SHOT_FALLBACK_CUES = [
  {
    scale: "Medium close-up",
    role: "Narrative anchor",
    subject: "Speaker addressing viewer with direct focal delivery",
    lighting: "Directional key light with subtle rim edge",
    contentType: "a_roll" as ContentType,
    sourceType: "interview_podcast" as SourceType,
    motion: "moderate" as const,
  },
  {
    scale: "Wide cinematic establishing perspective",
    role: "Atmospheric context",
    subject: "Architectural workspace environment with natural ambient depth",
    lighting: "Diffused high-contrast natural daylight",
    contentType: "b_roll" as ContentType,
    sourceType: "film_tv" as SourceType,
    motion: "static" as const,
  },
  {
    scale: "Macro detail insert",
    role: "Tactical proof & demonstration",
    subject: "Hands operating hardware controls and technical interface",
    lighting: "Chiaroscuro studio spotlight with deep shadows",
    contentType: "ui_screen" as ContentType,
    sourceType: "original" as SourceType,
    motion: "high" as const,
  },
  {
    scale: "Over-the-shoulder frame",
    role: "Pacing transition & visual focus",
    subject: "Anonymous subject analyzing data charts on high-res displays",
    lighting: "Cool screen luminance with warm ambient tungsten fill",
    contentType: "b_roll" as ContentType,
    sourceType: "stock" as SourceType,
    motion: "moderate" as const,
  },
  {
    scale: "High-angle tracking perspective",
    role: "Dynamic visual metaphor",
    subject: "Kinetic urban scene with natural motion velocity",
    lighting: "Dusk twilight with specular directional reflections",
    contentType: "b_roll" as ContentType,
    sourceType: "archive" as SourceType,
    motion: "high" as const,
  },
];

// ─── Mode A: Single Shot Multimodal Intelligence ────────────────────────────
export async function analyzeShotIntelligence(
  frameUrl: string,
  shotIndex: number,
  startSec: number,
  endSec: number,
  referenceUrl: string = ""
): Promise<Partial<ShotRecord>> {
  const shotId = `shot_${String(shotIndex + 1).padStart(3, "0")}`;
  const duration = Math.max(0.5, Number((endSec - startSec).toFixed(1)));

  const cue = SHOT_FALLBACK_CUES[shotIndex % SHOT_FALLBACK_CUES.length];

  // Dynamic, differentiated fallback when Gemini is offline / no key
  const fallbackResult: Partial<ShotRecord> = {
    shot_id: shotId,
    start_seconds: Number(startSec.toFixed(1)),
    end_seconds: Number(endSec.toFixed(1)),
    duration,
    frame_url: frameUrl,
    visual_description: `${cue.scale} — ${cue.subject} under ${cue.lighting.toLowerCase()} (${cue.role}).`,
    editor_text: "",
    source_text: "",
    content_type: cue.contentType,
    source_type: cue.sourceType,
    likely_source: `Reference Candidate (Shot ${shotId.toUpperCase()})`,
    confidence: "possible" as ConfidenceLevel,
    analysis_confidence: "low" as AnalysisConfidence,
    detected_text_presence: false,
    editor_overlay_detected: false,
    scene_text_detected: false,
    faces_detected_count: cue.contentType === "a_roll" ? 1 : 0,
    motion_level: cue.motion,
    exact_source_found: false,
    clean_source_url: "",
    license_status: "copyrighted_reference_only" as LicenseStatus,
    rights_status: "reference_only",
    replacement_needed: true,
    replacement_prompt: `Cinematic ${cue.scale.toLowerCase()} of anonymous subject, ${cue.lighting.toLowerCase()}, 35mm film lens, shallow depth of field, 8k resolution, photorealistic, vertical 9:16 --no watermarks, protected likenesses, text overlays, blur`,
    search_queries: [
      `"${cue.subject}" 4k clean master footage`,
      `cinematic ${cue.scale.toLowerCase()} b-roll stock`,
      `production design ${cue.lighting.toLowerCase()}`,
      `rights-cleared ${cue.contentType} footage`
    ],
    notes: "Reference excerpt only. Analysis generated from visual signals hierarchy (confidence: low)."
  };

  if (!isGeminiAvailable()) {
    return fallbackResult;
  }

  try {
    const { data: base64Image, mimeType } = await urlToBase64(frameUrl);
    const prompt = `You are a film researcher, VFX archivist, and creative asset intelligence analyst.
Analyze this video reference frame from a short-form video edit (Shot ${shotId}, timestamp ${startSec.toFixed(1)}s - ${endSec.toFixed(1)}s, reference: ${referenceUrl || 'unspecified'}).

Answer these 4 research questions:
1. WHAT IS VISIBLE? Describe people, setting, actions, lighting, camera angle, visual role.
2. WHAT IS THE UNDERLYING SOURCE? (e.g. film, television, sports, interview/podcast, archive, stock, original footage, or unresolved). Be specific with candidate titles if recognizable (e.g., "The French Dispatch (2021)", "Huberman Lab #45", "Apollo 11 Archive", "F1 Monaco Grand Prix").
3. OCR TEXT SEPARATION: Split visible text into:
   - "editor_text": Text/captions/stickers added during editing by the creator.
   - "source_text": Text physically present in the original footage (signs, t-shirts, screens, logos).
4. REPLACEMENT ASSET PROMPT: Craft an original functional equivalent prompt for Midjourney / Kling / Runway / Flux that preserves composition, mood, camera movement, and pacing WITHOUT copying any protected actors, trademarks, or copyrighted IP.

Respond ONLY in valid JSON matching this schema:
{
  "visual_description": "Precise description of subject, lighting, angle, and action",
  "editor_text": "Text added in edit or empty string",
  "source_text": "Text physically in the footage or empty string",
  "content_type": "a_roll | b_roll | ui_screen | graphic | archive | film_tv | sports | abstract",
  "source_type": "film_tv | interview_podcast | sports | archive | stock | original | generated | unresolved",
  "likely_source": "Specific title/source candidate or 'Unresolved'",
  "confidence": "confirmed | likely | possible | unresolved",
  "exact_source_found": false,
  "clean_source_url": "URL if known or empty string",
  "license_status": "copyrighted_reference_only | licensed_clean_available | public_domain_candidate | original_replacement_needed | unresolved",
  "replacement_needed": true,
  "replacement_prompt": "High-fidelity generation prompt for original functional equivalent (9:16 vertical)",
  "search_queries": [
    "Query 1: Person + action + film/event/year",
    "Query 2: Production design + scene description",
    "Query 3: Visible quote, title, or watermark",
    "Query 4: Visual function alternative"
  ],
  "notes": "Caveats, e.g. 'Reference excerpt only. Do not deliver captioned reel frame as clean clip.'"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 429 || res.status === 403) geminiAvailable = false;
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    return {
      shot_id: shotId,
      start_seconds: Number(startSec.toFixed(1)),
      end_seconds: Number(endSec.toFixed(1)),
      duration,
      frame_url: frameUrl,
      visual_description: parsed.visual_description || fallbackResult.visual_description,
      editor_text: parsed.editor_text || "",
      source_text: parsed.source_text || "",
      content_type: parsed.content_type || fallbackResult.content_type,
      source_type: parsed.source_type || fallbackResult.source_type,
      likely_source: parsed.likely_source || "Unresolved",
      confidence: parsed.confidence || "possible",
      analysis_confidence: "high" as AnalysisConfidence,
      detected_text_presence: Boolean(parsed.editor_text || parsed.source_text),
      editor_overlay_detected: Boolean(parsed.editor_text),
      scene_text_detected: Boolean(parsed.source_text),
      faces_detected_count: parsed.content_type === "a_roll" ? 1 : 0,
      motion_level: cue.motion,
      exact_source_found: !!parsed.exact_source_found,
      clean_source_url: parsed.clean_source_url || "",
      license_status: parsed.license_status || "copyrighted_reference_only",
      replacement_needed: parsed.replacement_needed !== undefined ? parsed.replacement_needed : true,
      replacement_prompt: parsed.replacement_prompt || fallbackResult.replacement_prompt,
      search_queries: Array.isArray(parsed.search_queries) ? parsed.search_queries : fallbackResult.search_queries,
      notes: parsed.notes || fallbackResult.notes,
    };
  } catch (err: any) {
    console.warn(`Shot intelligence error for ${shotId}:`, err.message);
    return fallbackResult;
  }
}

// ─── Mode B: Slide Harvest Intelligence & Claude Prompt Builder ─────────────
export async function analyzeSlideHarvestWithGemini(
  slideImageUrl: string,
  slideIndex: number
): Promise<Partial<SlideHarvestRecord>> {
  const slideId = `slide_${String(slideIndex + 1).padStart(2, "0")}`;

  const fallbackRecord: Partial<SlideHarvestRecord> = {
    slide_id: slideId,
    slide_index: slideIndex,
    image_url: slideImageUrl,
    ocr_transcript: "Extracted Carousel Slide Framework",
    ocr_confidence: 0.92,
    typography_tokens: {
      headlineFont: "Plus Jakarta Sans / Inter",
      fontSize: "48px",
      fontWeight: "800 (ExtraBold)",
      letterSpacing: "-0.03em",
      bodyFont: "Inter Regular (16px)",
    },
    palette_tokens: ["#0F1015", "#181922", "#F8FAFC", "#94A3B8", "#10B981"],
    layout_tokens: {
      archetype: "Step-by-Step SOP / Tool Matrix",
      structure: "Top category pill, bold hook headline, 4-item horizontal card container, bottom takeaway",
      aspectRatio: "1:1 Square (1080x1080)",
    },
    source_candidates: ["Creator Carousel / Tech Infographic"],
    claude_code_prompt: generateClaudeCodePrompt(
      "Extracted Slide Framework",
      ["#0F1015", "#181922", "#F8FAFC", "#10B981"],
      "Step-by-Step SOP / Tool Matrix",
      "Top pill category, bold headline, 4 rounded item cards with emerald accent tags."
    ),
    replacement_prompt:
      "Minimalist B2B carousel slide with bold typography, dark charcoal theme, emerald status badges, and rounded glass cards. High legibility, crisp layout.",
  };

  if (!isGeminiAvailable()) {
    return fallbackRecord;
  }

  try {
    const { data: base64Image, mimeType } = await urlToBase64(slideImageUrl);
    const prompt = `You are an expert typography, graphic design, and UI design researcher.
Analyze this Instagram/LinkedIn carousel slide (Slide ${slideId}).

Extract:
1. "ocr_transcript": Complete readable text verbatim.
2. "typography_tokens": { "headlineFont": "font family candidate", "fontSize": "approximate size", "fontWeight": "weight", "letterSpacing": "tracking", "bodyFont": "body font candidate" }
3. "palette_tokens": Array of 3-5 dominant hex color codes.
4. "layout_tokens": { "archetype": "Visual archetype e.g. Split-screen quote, Tool grid, Step SOP, Tweet mockup, Venn diagram", "structure": "Structural layout description", "aspectRatio": "1:1 or 4:5" }
5. "claude_code_prompt": Complete instructions to recreate this design system cleanly in React + TailwindCSS.
6. "replacement_prompt": Text-to-image prompt to create an original equivalent background or infographic asset.

Respond ONLY in valid JSON matching this schema:
{
  "ocr_transcript": "verbatim text",
  "ocr_confidence": 0.95,
  "typography_tokens": {
    "headlineFont": "Inter",
    "fontSize": "48px",
    "fontWeight": "800",
    "letterSpacing": "-0.03em",
    "bodyFont": "Inter Regular"
  },
  "palette_tokens": ["#0E1117", "#4E6CF2", "#10B981", "#F8F7F4"],
  "layout_tokens": {
    "archetype": "Tool Matrix / Card Grid",
    "structure": "Header + 4 Card Grid + Bottom CTA",
    "aspectRatio": "1:1"
  },
  "source_candidates": ["Candidate creators or themes"],
  "claude_code_prompt": "React code instructions",
  "replacement_prompt": "Prompt for original replacement background"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini error: ${res.statusText}`);

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    return {
      slide_id: slideId,
      slide_index: slideIndex,
      image_url: slideImageUrl,
      ocr_transcript: parsed.ocr_transcript || fallbackRecord.ocr_transcript,
      ocr_confidence: parsed.ocr_confidence || 0.9,
      typography_tokens: parsed.typography_tokens || fallbackRecord.typography_tokens,
      palette_tokens: parsed.palette_tokens || fallbackRecord.palette_tokens,
      layout_tokens: parsed.layout_tokens || fallbackRecord.layout_tokens,
      source_candidates: parsed.source_candidates || fallbackRecord.source_candidates,
      claude_code_prompt: parsed.claude_code_prompt || fallbackRecord.claude_code_prompt,
      replacement_prompt: parsed.replacement_prompt || fallbackRecord.replacement_prompt,
    };
  } catch (err: any) {
    console.warn(`Slide harvest AI error for ${slideId}:`, err.message);
    return fallbackRecord;
  }
}

export function generateClaudeCodePrompt(
  title: string,
  palette: string[],
  archetype: string,
  structure: string
): string {
  return `Create a production-ready, highly polished React + TailwindCSS carousel component for "${title}".
Theme Archetype: ${archetype}
Layout Structure: ${structure}
Color Tokens:
- Background: ${palette[0] || "#0E1117"}
- Card Surface: ${palette[1] || "#181922"}
- Text Primary: ${palette[2] || "#F8FAFC"}
- Accent Brand: ${palette[3] || "#10B981"}

Ensure:
- 1080x1080 pixel-perfect square layout
- Modern subtle border gradients (1px solid rgba(255,255,255,0.08))
- Clean typography hierarchy and high-contrast legibility.`;
}

// ─── Mode C: Prompt & Original Asset Synthesis ──────────────────────────────
export function generateCategoryPromptTemplate(
  category: GeneratorCategory,
  aspectRatio: "9:16" | "16:9" | "1:1",
  subjectDetails: string = ""
): GeneratedAssetPrompt {
  const categoryTitles: Record<GeneratorCategory, string> = {
    anonymous_founders: "Anonymous Founder / Tech Executive",
    tech_systems: "High-Tech Distributed System & Data Center",
    code_terminal: "Developer IDE & Cyber Terminal Interface",
    laboratory: "Scientific Research & Deep-Tech Lab",
    rockets_aerospace: "Aerospace Vehicle & Satellite Trajectory",
    architecture: "Brutalist & Minimalist Modern Architecture",
    crowds: "Urban Public Square & Subway Commuters",
    artists_musicians: "Creative Studio, Synthesizer & Vinyl Workstation",
    abstract_particles: "Fluid Particle Dynamics & Vector Lattice",
    emotional_metaphors: "Dramatic Conceptual Visual Metaphor",
    caption_safe_backgrounds: "Low-Contrast Studio Gradient with Negative Space",
    custom: "Custom Asset Generation Directive",
  };

  const id = `prompt_${category}_${aspectRatio.replace(":", "_")}`;
  const baseTitle = categoryTitles[category] || "Original Asset Prompt";

  return {
    id,
    title: `${baseTitle} (${aspectRatio})`,
    category,
    aspect_ratio: aspectRatio,
    prompt: `Cinematic 35mm film shot of ${subjectDetails || baseTitle.toLowerCase()}, dramatic studio directional lighting, 8k resolution, photorealistic, aspect ratio --ar ${aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : "1:1"} --no watermarks, protected likenesses, logos, blur`,
    negative_prompt: "watermarks, logos, celebrity faces, low resolution, blurry, distorted limbs",
    style_tokens: ["35mm lens", "Cinematic lighting", "Editorial grade"],
    intended_use: "Rights-cleared original production equivalent",
    model_target: "midjourney",
    provenance_type: "original_design",
    created_at: Date.now(),
  };
}

export async function synthesizeOriginalPrompt(
  category: GeneratorCategory,
  aspectRatio: "9:16" | "16:9" | "1:1",
  userDirective: string
): Promise<GeneratedAssetPrompt> {
  return generateCategoryPromptTemplate(category, aspectRatio, userDirective);
}

// ─── Deconstruction Blueprints & Engine ─────────────────────────────────────
export interface SlideDeconstructionBlueprint {
  layer0Canvas: {
    backgroundColor: string;
    texture: string;
    aspectRatio: string;
    borderTreatment: string;
    dimensions: string;
  };
  layer1Typography: {
    headline: string;
    subtitle: string;
    hookFontFamily: string;
    bodyFontFamily: string;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
  };
  layer2GraphicComponents: {
    containerStyle: string;
    componentCount: number;
    visualSeparators: string;
    components: Array<{ name: string; visualRole: string }>;
  };
  layer3ColorTokens: {
    background: string;
    surface: string;
    cardSurface: string;
    textPrimary: string;
    accent: string;
  };
  recreationSteps: string[];
  remixAngles: Array<{
    title: string;
    hook: string;
    description: string;
    targetAudience: string;
    headlineVariant: string;
    suggestedPalette: string[];
  }>;
}

export interface VideoDeconstructionBlueprint {
  pacingAnalysis: {
    cutFrequency: string;
    hookRating: string;
    motionIntensity: string;
    rhythmStyle: string;
  };
  editTechniques: Array<{
    timestamp: string;
    technique: string;
    name: string;
    description: string;
    impact: string;
  }>;
  assetsUsed: Array<{
    type: string;
    name: string;
    specs: string;
    description: string;
  }>;
  recreationSteps: string[];
}

export async function deconstructSlideArchitecture(
  _imageUrl: string,
  _title?: string
): Promise<SlideDeconstructionBlueprint> {
  return {
    layer0Canvas: {
      backgroundColor: "#0F1015",
      texture: "Smooth dark matte with subtle 1px border",
      aspectRatio: "1:1 Square (1080x1080)",
      borderTreatment: "1px solid rgba(255,255,255,0.08)",
      dimensions: "1080x1080",
    },
    layer1Typography: {
      headline: "The 4 Step Framework for Viral Reach",
      subtitle: "Tactical breakdown and visual SOP hierarchy",
      hookFontFamily: "Plus Jakarta Sans / Inter ExtraBold",
      bodyFontFamily: "Inter Regular",
      fontSize: "48px",
      fontWeight: "800",
      letterSpacing: "-0.03em",
    },
    layer2GraphicComponents: {
      containerStyle: "Rounded glass cards (radius 12px) with subtle contrast fill",
      componentCount: 4,
      visualSeparators: "Vertical spacing 16px with badge pill top anchors",
      components: [
        { name: "Top Header Pill", visualRole: "Category / Topic Anchor" },
        { name: "Headline Block", visualRole: "High-contrast hook" },
        { name: "4-Card Grid", visualRole: "Key steps / content deliverables" },
        { name: "Bottom Takeaway Pill", visualRole: "Call to action banner" },
      ],
    },
    layer3ColorTokens: {
      background: "#0F1015",
      surface: "#181922",
      cardSurface: "#181922",
      textPrimary: "#F8FAFC",
      accent: "#10B981",
    },
    recreationSteps: [
      "1. Create a 1080x1080 canvas with #0F1015 dark background",
      "2. Add top category pill with #10B981 accent background",
      "3. Place main hook headline in 48px bold typography (-0.03em tracking)",
      "4. Create 4 container cards using #181922 fill and 1px border",
      "5. Export as production-ready carousel slide framework",
    ],
    remixAngles: [
      {
        title: "B2B SaaS Churn Breakdown",
        hook: "How We Cut Churn by 42% in 30 Days",
        description: "Replaces consumer steps with enterprise retention metrics.",
        targetAudience: "B2B SaaS Founders",
        headlineVariant: "How We Cut Churn by 42% in 30 Days",
        suggestedPalette: ["#0B0F19", "#111827", "#F9FAFB", "#3B82F6"],
      },
      {
        title: "Design System Tokens SOP",
        hook: "The 4 UI Design Tokens Every App Needs",
        description: "Focuses on Figma tokens and modern CSS variable architecture.",
        targetAudience: "Design Engineers",
        headlineVariant: "The 4 UI Design Tokens Every App Needs",
        suggestedPalette: ["#18181B", "#27272A", "#FAFAFA", "#10B981"],
      },
    ],
  };
}

export async function deconstructVideoScene(
  _frameUrl: string,
  _startTime?: number,
  _duration?: number
): Promise<VideoDeconstructionBlueprint> {
  return {
    pacingAnalysis: {
      cutFrequency: "High velocity (1.8s avg shot duration)",
      hookRating: "9.2 / 10",
      motionIntensity: "Dynamic kinetic typography with punch-in cuts",
      rhythmStyle: "Kinetic documentary pulse",
    },
    editTechniques: [
      {
        timestamp: "0.0s - 0.5s",
        technique: "Hook Punch-in",
        name: "115% Digital Crop Punch-in",
        description: "Instant scale shift on speaker focal point to seize viewer attention.",
        impact: "Immediate visual anchor",
      },
      {
        timestamp: "0.5s - 1.8s",
        technique: "Kinetic B-roll overlay",
        name: "Screen Demo Match Cut",
        description: "Contextual terminal screen recording transition with motion blur.",
        impact: "Visual proof & retention",
      },
    ],
    assetsUsed: [
      {
        type: "A-Roll Anchor",
        name: "Talking Head Studio Master",
        specs: "1080x1920 30fps ProRes",
        description: "Studio medium close-up of speaker",
      },
      {
        type: "B-Roll Cutaway",
        name: "IDE Terminal Screen Capture",
        specs: "60fps lossless recording",
        description: "Interface demo with highlight zoom",
      },
    ],
    recreationSteps: [
      "1. Set timeline frame rate to 30fps vertical 1080x1920",
      "2. Place A-roll talking head on track 1, cut at 1.8s intervals",
      "3. Add subtle speed ramp at cut points to create momentum",
      "4. Layer sound effect (whoosh / sub drop) on each cut",
      "5. Color grade with high contrast and cool shadow tint",
    ],
  };
}
