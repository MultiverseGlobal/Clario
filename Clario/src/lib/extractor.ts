import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type {
  ShotRecord,
  SlideHarvestRecord,
  SlideGraphicElement,
  HarvestProject,
  ExtractionResult,
} from "../types/assets";
import { analyzeShotIntelligence, analyzeSlideHarvestWithGemini } from "./gemini";

// ─── Extract dominant colors via Canvas pixel sampling ───────────────────────
export function extractDominantColors(imageUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 64, 64);
      const { data } = ctx.getImageData(0, 0, 64, 64);

      const colors: string[] = [];
      const samples = [0, 8, 16, 24, 32, 40, 48, 56];
      for (const x of samples) {
        for (const y of samples.slice(0, 4)) {
          const idx = (y * 64 + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          if (!colors.includes(hex)) colors.push(hex);
        }
      }
      resolve(colors.slice(0, 6));
    };
    img.onerror = () => resolve(["#0F1015", "#181922", "#F8FAFC", "#94A3B8", "#10B981"]);
    img.src = imageUrl;
  });
}

// ─── Crop a rectangular region with Super-Sampling ────────────────────────────
function cropRect(
  img: HTMLImageElement,
  sxRatio: number,
  syRatio: number,
  swRatio: number,
  shRatio: number,
  minDimension: number = 300
): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const sx = Math.max(0, Math.round(w * sxRatio));
  const sy = Math.max(0, Math.round(h * syRatio));
  const sw = Math.min(w - sx, Math.max(1, Math.round(w * swRatio)));
  const sh = Math.min(h - sy, Math.max(1, Math.round(h * shRatio)));

  const scale = Math.max(1, Math.ceil(minDimension / Math.min(sw, sh)));
  const targetW = sw * scale;
  const targetH = sh * scale;

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/png");
}

// ─── Flood Fill to Isolate Transparent PNG Icons ─────────────────────────────
function isolateTransparentIcon(croppedDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width;
      const H = img.height;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, W, H);
      const { data } = imageData;

      // Sample corner color
      const cornerIndices = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + (W - 1)) * 4];
      const bgR = cornerIndices.reduce((sum, i) => sum + data[i], 0) / 4;
      const bgG = cornerIndices.reduce((sum, i) => sum + data[i + 1], 0) / 4;
      const bgB = cornerIndices.reduce((sum, i) => sum + data[i + 2], 0) / 4;

      const tolerance = 24;
      const colorMatch = (idx: number) => {
        const dr = Math.abs(data[idx] - bgR);
        const dg = Math.abs(data[idx + 1] - bgG);
        const db = Math.abs(data[idx + 2] - bgB);
        return dr + dg + db < tolerance * 3;
      };

      const visited = new Uint8Array(W * H);
      const queue: number[] = [];

      // Seed borders
      for (let x = 0; x < W; x++) {
        for (const y of [0, H - 1]) {
          const p = y * W + x;
          if (!visited[p] && colorMatch(p * 4)) { queue.push(p); visited[p] = 1; }
        }
      }
      for (let y = 1; y < H - 1; y++) {
        for (const x of [0, W - 1]) {
          const p = y * W + x;
          if (!visited[p] && colorMatch(p * 4)) { queue.push(p); visited[p] = 1; }
        }
      }

      let qi = 0;
      while (qi < queue.length) {
        const p = queue[qi++];
        const x = p % W, y = Math.floor(p / W);
        data[p * 4 + 3] = 0; // Set alpha to 0

        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const np = ny * W + nx;
          if (!visited[np] && colorMatch(np * 4)) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(croppedDataUrl);
    img.src = croppedDataUrl;
  });
}

// ─── Native In-Browser Visual Scene Extractor (Luma-Difference) ──────────────
export function extractVideoFramesHTML5(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ duration: number; rawShots: Array<{ start: number; end: number; frameDataUrl: string }> }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 10;
        
        // Downscaled canvas for fast pixel differencing
        const diffCanvas = document.createElement("canvas");
        diffCanvas.width = 64;
        diffCanvas.height = 64;
        const diffCtx = diffCanvas.getContext("2d", { willReadFrequently: true })!;

        // Full-res canvas for actual frame extraction
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = video.videoWidth || 720;
        frameCanvas.height = video.videoHeight || 1280;
        const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true })!;

        const cuts: number[] = [0];
        const fps = 4; // Sample at 4 FPS for cut detection
        const step = 1 / fps;
        let prevData: Uint8ClampedArray | null = null;

        // Pass 1: Detect Cuts
        const totalSteps = Math.floor(duration / step);
        for (let i = 0; i <= totalSteps; i++) {
          const t = i * step;
          video.currentTime = t;
          await new Promise<void>((seekResolve) => {
            const onSeek = () => { video.removeEventListener("seeked", onSeek); seekResolve(); };
            video.addEventListener("seeked", onSeek);
          });

          diffCtx.drawImage(video, 0, 0, 64, 64);
          const currentData = diffCtx.getImageData(0, 0, 64, 64).data;

          if (prevData) {
            let diffSum = 0;
            for (let j = 0; j < currentData.length; j += 4) {
              const r = Math.abs(currentData[j] - prevData[j]);
              const g = Math.abs(currentData[j+1] - prevData[j+1]);
              const b = Math.abs(currentData[j+2] - prevData[j+2]);
              diffSum += r + g + b;
            }
            const diffRatio = diffSum / (4096 * 765); // 4096 pixels, 765 max diff per pixel
            
            // Hard cut threshold: 12% pixel difference
            if (diffRatio > 0.12) {
              // Avoid microscopic cuts (minimum 1 second per shot)
              if (t - cuts[cuts.length - 1] > 1.0) {
                cuts.push(t);
              }
            }
          }
          prevData = new Uint8ClampedArray(currentData);
          onProgress?.(Math.round(((i / totalSteps) * 50))); // First 50% is cut detection
        }
        
        cuts.push(duration);

        // Pass 2: Extract mid-frames for each detected shot
        const rawShots: Array<{ start: number; end: number; frameDataUrl: string }> = [];
        for (let c = 0; c < cuts.length - 1; c++) {
          const startSec = cuts[c];
          const endSec = cuts[c + 1];
          const midSec = startSec + (endSec - startSec) * 0.5;

          video.currentTime = midSec;
          await new Promise<void>((seekResolve) => {
            const onSeek = () => { video.removeEventListener("seeked", onSeek); seekResolve(); };
            video.addEventListener("seeked", onSeek);
          });

          frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
          const frameDataUrl = frameCanvas.toDataURL("image/jpeg", 0.90);
          
          rawShots.push({
            start: Number(startSec.toFixed(1)),
            end: Number(endSec.toFixed(1)),
            frameDataUrl,
          });
          onProgress?.(50 + Math.round(((c + 1) / (cuts.length - 1)) * 50));
        }

        URL.revokeObjectURL(blobUrl);
        resolve({ duration, rawShots });
      } catch (err) {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Unable to decode video file. Please verify it is a standard MP4/MOV/WebM video."));
    };
  });
}

// ─── Mode A: Video Harvester Pipeline ─────────────────────────────────────────
export async function harvestVideoProject(
  file: File,
  referenceUrl: string,
  _ffmpeg: FFmpeg,
  onProgress: (msg: string, pct: number) => void
): Promise<{ project: HarvestProject; contactSheetUrl: string }> {
  onProgress("Decoding video & segmenting shots…", 15);

  const { rawShots } = await extractVideoFramesHTML5(file, (pct) => {
    onProgress("Slicing shot frames…", 15 + Math.round(pct * 0.35));
  });

  onProgress("Analyzing shot intelligence & OCR text…", 55);

  const shots: ShotRecord[] = [];
  for (let i = 0; i < rawShots.length; i++) {
    const raw = rawShots[i];
    onProgress(`Analyzing Shot ${i + 1} of ${rawShots.length}…`, 55 + Math.floor((i / rawShots.length) * 30));

    const intel = await analyzeShotIntelligence(
      raw.frameDataUrl,
      i,
      raw.start,
      raw.end,
      referenceUrl
    );

    shots.push({
      project_id: `proj_${Date.now()}`,
      reference_url: referenceUrl || file.name,
      shot_id: intel.shot_id || `shot_${String(i + 1).padStart(3, "0")}`,
      start_seconds: intel.start_seconds ?? raw.start,
      end_seconds: intel.end_seconds ?? raw.end,
      duration: intel.duration ?? Number((raw.end - raw.start).toFixed(1)),
      frame_url: raw.frameDataUrl,
      visual_description: intel.visual_description || "Video reference frame",
      editor_text: intel.editor_text || "",
      source_text: intel.source_text || "",
      content_type: intel.content_type || "b_roll",
      source_type: intel.source_type || "unresolved",
      likely_source: intel.likely_source || "Unresolved",
      confidence: intel.confidence || "possible",
      exact_source_found: intel.exact_source_found || false,
      clean_source_url: intel.clean_source_url || "",
      license_status: intel.license_status || "copyrighted_reference_only",
      replacement_needed: intel.replacement_needed ?? true,
      replacement_prompt: intel.replacement_prompt || "",
      search_queries: intel.search_queries || [],
      notes: intel.notes || "",
      selected: false,
    });
  }

  onProgress("Rendering composite contact sheet…", 90);
  const contactSheetUrl = await generateContactSheet(shots);

  const project: HarvestProject = {
    id: `harvest_${Date.now()}`,
    name: file.name.replace(/\.[^/.]+$/, "") + " (Asset Harvest)",
    mode: "video_harvester",
    reference_url: referenceUrl,
    source_file_name: file.name,
    shots,
    slides: [],
    generated_prompts: [],
    provenance: shots.map((s) => ({
      asset_id: s.shot_id,
      asset_name: `${s.shot_id} (${s.content_type})`,
      provenance_type:
        s.license_status === "public_domain_candidate"
          ? "public_domain"
          : s.license_status === "licensed_clean_available"
          ? "licensed_alternative"
          : "generated_replacement",
      source_url: s.clean_source_url || s.reference_url,
      license_note: s.license_status,
      confidence: s.confidence,
      timestamp: Date.now(),
      intended_use: "Short-form video asset replacement",
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  return { project, contactSheetUrl };
}

// ─── Mode B: Slide Harvester Pipeline ─────────────────────────────────────────
export async function harvestSlideProject(
  files: File[],
  referenceUrl: string = "",
  onProgress: (msg: string, pct: number) => void
): Promise<{ project: HarvestProject }> {
  onProgress("Reading slide images…", 15);

  const slides: SlideHarvestRecord[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(`Deconstructing Slide ${i + 1} of ${files.length}…`, 20 + Math.floor((i / files.length) * 60));

    const imageUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    });

    const palette = await extractDominantColors(imageUrl);

    // Extract isolated icon elements via canvas contour & flood-fill
    const isolatedElements: SlideGraphicElement[] = [];
    try {
      const img = new Image();
      await new Promise<void>((r) => { img.onload = () => r(); img.src = imageUrl; });

      // Extract 4 potential icon badge zones across horizontal middle
      const badgePositions = [0.15, 0.38, 0.62, 0.85];
      for (let bi = 0; bi < badgePositions.length; bi++) {
        const cx = badgePositions[bi];
        const cropped = cropRect(img, cx - 0.08, 0.45, 0.16, 0.16, 256);
        const cleanTransparentIcon = await isolateTransparentIcon(cropped);
        isolatedElements.push({
          id: `icon_${i + 1}_${bi + 1}`,
          label: `Badge / Icon ${bi + 1}`,
          imageUrl: cleanTransparentIcon,
          x: cx * 100,
          y: 53,
          width: 14,
          type: "icon",
        });
      }
    } catch (err) {
      console.warn("Icon isolation warning:", err);
    }

    // Call Gemini for OCR, typography tokens, and Claude code prompt
    const intel = await analyzeSlideHarvestWithGemini(imageUrl, i);

    slides.push({
      slide_id: intel.slide_id || `slide_${String(i + 1).padStart(2, "0")}`,
      slide_index: i,
      image_url: imageUrl,
      ocr_transcript: intel.ocr_transcript || "Extracted Slide Content",
      ocr_confidence: intel.ocr_confidence || 0.95,
      typography_tokens: intel.typography_tokens || {
        headlineFont: "Inter / Space Grotesk",
        fontSize: "48px",
        fontWeight: "800 ExtraBold",
        letterSpacing: "-0.03em",
      },
      palette_tokens: intel.palette_tokens && intel.palette_tokens.length ? intel.palette_tokens : palette,
      layout_tokens: intel.layout_tokens || {
        archetype: "Tool Roundup / Framework Grid",
        structure: "Header pill, title, 4-card matrix, takeaway banner",
        aspectRatio: "1:1",
      },
      isolated_elements: isolatedElements,
      source_candidates: intel.source_candidates || ["Creator Carousel Reference"],
      claude_code_prompt: intel.claude_code_prompt || "",
      replacement_prompt: intel.replacement_prompt || "",
      selected: false,
    });
  }

  const project: HarvestProject = {
    id: `slide_harvest_${Date.now()}`,
    name: files[0].name.replace(/\.[^/.]+$/, "") + " Deck (Asset Harvest)",
    mode: "slide_harvester",
    reference_url: referenceUrl,
    source_file_name: files.map((f) => f.name).join(", "),
    shots: [],
    slides,
    generated_prompts: [],
    provenance: slides.map((s) => ({
      asset_id: s.slide_id,
      asset_name: `Slide ${s.slide_index + 1}`,
      provenance_type: "generated_replacement",
      source_url: referenceUrl,
      license_note: "Extracted design system for code reproduction",
      confidence: "confirmed",
      timestamp: Date.now(),
      intended_use: "Design tokens and Claude artifact React reproduction",
    })),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  return { project };
}

// ─── Labeled Composite Contact Sheet Generator ───────────────────────────────
export async function generateContactSheet(shots: ShotRecord[]): Promise<string> {
  if (shots.length === 0) return "";

  const cols = Math.min(3, shots.length);
  const rows = Math.ceil(shots.length / cols);
  const cellW = 360;
  const cellH = 640; // 9:16 vertical
  const pad = 16;
  const headerH = 80;

  const canvas = document.createElement("canvas");
  canvas.width = cellW * cols + pad * (cols + 1);
  canvas.height = cellH * rows + pad * (rows + 1) + headerH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0A0B0E";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillText("CLARIO ASSET HARVESTER · CONTACT SHEET", pad + 8, 40);

  ctx.fillStyle = "#94A3B8";
  ctx.font = '13px "Space Mono", monospace';
  ctx.fillText(`TOTAL SHOTS: ${shots.length} · ASPECT: 9:16 VERTICAL`, pad + 8, 64);

  // Load and render images in grid
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + pad);
    const y = headerH + pad + row * (cellH + pad);

    const img = new Image();
    await new Promise<void>((r) => {
      img.onload = () => r();
      img.onerror = () => r();
      img.src = shot.frame_url;
    });

    // Draw frame
    ctx.drawImage(img, x, y, cellW, cellH);

    // Border
    ctx.strokeStyle = "#2A2D3A";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellW, cellH);

    // Top Shot ID Pill
    ctx.fillStyle = "rgba(10, 11, 14, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, 180, 32, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.font = 'bold 12px "Space Mono", monospace';
    ctx.fillText(`${shot.shot_id.toUpperCase()} · ${shot.duration.toFixed(1)}s`, x + 20, y + 31);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

// Backward-compatible stubs
export async function extractMultiVideoAssets(_files: File[], _onProgress: any): Promise<ExtractionResult> {
  return { project: {} as any, assets: [] };
}
export async function extractCarouselAssets(_files: File[], _onProgress: any): Promise<ExtractionResult> {
  return { project: {} as any, assets: [] };
}
