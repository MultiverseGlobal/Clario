import { useState, useRef, useEffect, useCallback } from "react";
import type { Asset, ContentMode, CarouselSlideItem, VideoTrackItem, SlideGraphicElement } from "../types/assets";
import { SlideCanvas } from "../components/canvas/SlideCanvas";
import { VideoCanvas } from "../components/canvas/VideoCanvas";
import { AssetGrid } from "../components/blocks/AssetGrid";
import { getStoredApiKey, setStoredApiKey, rewriteText } from "../lib/ai";
import { getBrandKit } from "../lib/brandKit";
import { useUndoRedo } from "../lib/useUndoRedo";

interface EditorPhaseProps {
  mode: ContentMode;
  assets: Asset[];
  initialTrackItems?: VideoTrackItem[];
  sourceFile?: File;
  onBack: () => void;
  onExport: (slides: CarouselSlideItem[], trackItems: VideoTrackItem[]) => void;
}

const BEAT_ROLES = [
  { type: "hook", label: "Hook", icon: "🎯", color: "#F43F5E" },
  { type: "dopamine", label: "Dopamine", icon: "⚡", color: "#34D399" },
  { type: "problem", label: "Problem", icon: "🧩", color: "#A78BFA" },
  { type: "proof", label: "Proof", icon: "📊", color: "#38BDF8" },
  { type: "cta", label: "CTA", icon: "🚀", color: "#FBBF24" },
  { type: "beat", label: "Beat", icon: "⏱", color: "#818CF8" },
] as const;

// ─── Inspector: text properties panel ────────────────────────────────────────
function TextInspector({
  text, onUpdate, onDelete,
}: {
  text: CarouselSlideItem["texts"][number];
  onUpdate: (patch: Partial<typeof text>) => void;
  onDelete: () => void;
}) {
  const [rewriting, setRewriting] = useState(false);

  const handleAiRewrite = async (style: "punchy" | "minimal" | "bold") => {
    setRewriting(true);
    try {
      const result = await rewriteText(text.content, style);
      onUpdate({ content: result });
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
          Typography
        </span>
        {text.tag && (
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
            {text.tag}
          </span>
        )}
      </div>

      {/* Content preview/edit */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Text Content</label>
        <textarea
          value={text.content}
          onChange={e => onUpdate({ content: e.target.value })}
          rows={3}
          style={{
            width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-primary)",
            fontFamily: "var(--font-sans)", resize: "vertical", outline: "none",
          }}
        />
      </div>

      {/* AI Rephrase Pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>✦ AI Rephrase</label>
        <div style={{ display: "flex", gap: 5 }}>
          {(["punchy", "minimal", "bold"] as const).map(st => (
            <button
              key={st}
              onClick={() => handleAiRewrite(st)}
              disabled={rewriting}
              style={{
                flex: 1, height: 26, borderRadius: 6,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: rewriting ? "var(--text-muted)" : "var(--accent)", fontSize: 10, fontWeight: 600,
                cursor: rewriting ? "default" : "pointer", textTransform: "capitalize",
                transition: "all 0.15s",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Font Size</label>
          <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>
            {text.fontSize}px
          </span>
        </div>
        <input
          type="range" min={12} max={96} value={text.fontSize}
          onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>

      {/* Font Weight */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Weight</label>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { w: 400, label: "Regular" },
            { w: 600, label: "Semi" },
            { w: 700, label: "Bold" },
            { w: 800, label: "Black" },
          ].map(({ w, label }) => (
            <button
              key={w}
              onClick={() => onUpdate({ fontWeight: w })}
              style={{
                flex: 1, height: 26, borderRadius: 6,
                background: text.fontWeight === w ? "var(--accent)" : "var(--surface)",
                border: `1px solid ${text.fontWeight === w ? "var(--accent)" : "var(--border)"}`,
                color: text.fontWeight === w ? "#fff" : "var(--text-secondary)",
                fontSize: 10, fontWeight: w >= 700 ? 700 : 500, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Swatches */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Color</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {(() => {
            const kit = getBrandKit();
            const brandSwatches = [kit.primaryColor, kit.accentColor, kit.textColor];
            const baseSwatches = ["#FFFFFF", "#0F172A", "#F43F5E", "#34D399", "#FBBF24", "#38BDF8"];
            const all = [...new Set([...brandSwatches, ...baseSwatches])];
            return all.map(c => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                style={{
                  width: 22, height: 22, borderRadius: 6, background: c,
                  border: `2px solid ${text.color === c ? "var(--accent)" : "var(--border)"}`,
                  cursor: "pointer", flexShrink: 0, transition: "transform 0.15s",
                  transform: text.color === c ? "scale(1.1)" : "scale(1)",
                }}
              />
            ));
          })()}
          <label style={{
            width: 22, height: 22, borderRadius: 6,
            border: "1px dashed var(--border-strong)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+</span>
            <input
              type="color" value={text.color}
              onChange={e => onUpdate({ color: e.target.value })}
              style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Alignment */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Alignment</label>
        <div style={{ display: "flex", gap: 4 }}>
          {(["left", "center", "right"] as const).map(a => (
            <button
              key={a}
              onClick={() => onUpdate({ align: a })}
              style={{
                flex: 1, height: 26, borderRadius: 6,
                background: text.align === a ? "var(--surface-2)" : "var(--surface)",
                border: `1px solid ${text.align === a ? "var(--accent-border)" : "var(--border)"}`,
                color: text.align === a ? "var(--accent)" : "var(--text-muted)",
                fontSize: 10, cursor: "pointer", textTransform: "capitalize",
                fontWeight: text.align === a ? 700 : 500,
                transition: "all 0.15s",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--rose)", fontSize: 11, fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s", marginTop: 6,
        }}
      >
        Delete Text Block
      </button>
    </div>
  );
}

// ─── Inspector: graphic / sticker element panel ──────────────────────────────
function ElementInspector({
  element, onUpdate, onDelete, onDuplicate,
}: {
  element: SlideGraphicElement;
  onUpdate: (patch: Partial<SlideGraphicElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
        {element.label || "Graphic Component"}
      </div>

      {/* Preview Card */}
      <div style={{
        width: "100%", height: 74, background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", padding: 6,
      }}>
        <img src={element.imageUrl} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
      </div>

      {/* Size / Scale */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Scale</label>
          <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>
            {Math.round(element.width)}%
          </span>
        </div>
        <input
          type="range" min={8} max={95} value={element.width}
          onChange={e => onUpdate({ width: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>

      {/* Opacity */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Opacity</label>
          <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>
            {Math.round((element.opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range" min={0.1} max={1} step={0.05} value={element.opacity ?? 1}
          onChange={e => onUpdate({ opacity: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>

      {/* Snap to Center */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Positioning</label>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onUpdate({ x: 50 })}
            style={{
              flex: 1, padding: "6px 8px", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-secondary)", fontSize: 10, cursor: "pointer", fontWeight: 600,
            }}
          >
            Center Horizontally
          </button>
          <button
            onClick={() => onUpdate({ y: 50 })}
            style={{
              flex: 1, padding: "6px 8px", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-secondary)", fontSize: 10, cursor: "pointer", fontWeight: 600,
            }}
          >
            Center Vertically
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <button
          onClick={onDuplicate}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Duplicate Element
        </button>

        <button
          onClick={onDelete}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--rose)", fontSize: 11, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Delete Element
        </button>
      </div>
    </div>
  );
}

// ─── Inspector: slide properties ───────────────────────────────────────────
function SlideInspector({
  slide, onUpdate,
}: {
  slide: CarouselSlideItem;
  onUpdate: (patch: Partial<CarouselSlideItem>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
        Slide Canvas
      </div>

      {/* Background Color */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Background</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["#FFFFFF", "#F8F7F4", "#F1F0EC", "#0F172A", "#1E293B", "#000000"].map(c => (
            <button
              key={c}
              onClick={() => onUpdate({ backgroundColor: c })}
              style={{
                width: 26, height: 26, borderRadius: 6, background: c,
                border: `2px solid ${slide.backgroundColor === c ? "var(--accent)" : "var(--border)"}`,
                cursor: "pointer", transition: "transform 0.15s",
                transform: slide.backgroundColor === c ? "scale(1.1)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Layer breakdown summary */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Slide Summary
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: "var(--text-muted)" }}>Graphic Layers</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>{(slide.elements || []).length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)" }}>Text Blocks</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>{(slide.texts || []).length}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Inspector: clip properties panel ─────────────────────────────────────────
function ClipInspector({
  clip, onUpdate, onDelete, onDuplicate,
}: {
  clip: VideoTrackItem;
  onUpdate: (patch: Partial<VideoTrackItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
          Selected Clip
        </span>
        <span style={{
          fontSize: 9, padding: "2px 6px", borderRadius: 4,
          background: clip.isBroll ? "rgba(52,211,153,0.12)" : "rgba(99,102,241,0.12)",
          color: clip.isBroll ? "var(--emerald)" : "var(--accent)", fontWeight: 700,
        }}>
          {clip.isBroll ? "⚡ B-Roll" : "📹 A-Roll"}
        </span>
      </div>

      {/* Beat Role Selection */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Narrative Role</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {BEAT_ROLES.map(role => {
            const isCurrent = (clip.beatType || "beat") === role.type;
            return (
              <button
                key={role.type}
                onClick={() => onUpdate({ beatType: role.type as any })}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 8px",
                  borderRadius: 6,
                  background: isCurrent ? "var(--surface-2)" : "var(--surface)",
                  border: `1px solid ${isCurrent ? role.color : "var(--border)"}`,
                  color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: 10, fontWeight: isCurrent ? 700 : 500, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span>{role.icon}</span>
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script Snippet / Label */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Caption / Script</label>
        <input
          type="text"
          value={clip.scriptText || clip.label}
          onChange={e => onUpdate({ scriptText: e.target.value, label: e.target.value })}
          placeholder="Enter hook or beat description..."
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 10px", fontSize: 12,
            color: "var(--text-primary)", outline: "none",
          }}
        />
      </div>

      {/* Duration Slider + Presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Duration</label>
          <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>
            {clip.duration.toFixed(1)}s
          </span>
        </div>
        <input
          type="range" min={0.5} max={30} step={0.5} value={clip.duration}
          onChange={e => onUpdate({ duration: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
        {/* Quick presets */}
        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
          {[1.5, 3.0, 5.0, 8.0].map(sec => (
            <button
              key={sec}
              onClick={() => onUpdate({ duration: sec })}
              style={{
                flex: 1, height: 22, borderRadius: 5,
                background: Math.abs(clip.duration - sec) < 0.2 ? "var(--surface-2)" : "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 9, fontFamily: "Space Mono, monospace",
                cursor: "pointer",
              }}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* Role Toggle: A-Roll vs B-Roll */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Treat as B-Roll overlay</span>
        <input
          type="checkbox"
          checked={!!clip.isBroll}
          onChange={e => onUpdate({ isBroll: e.target.checked })}
          style={{ accentColor: "var(--accent)", cursor: "pointer" }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <button
          onClick={onDuplicate}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Duplicate Clip
        </button>

        <button
          onClick={onDelete}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--rose)", fontSize: 11, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Remove from Track
        </button>
      </div>
    </div>
  );
}

// ─── Main EditorPhase ─────────────────────────────────────────────────────────
export function EditorPhase({ mode, assets, initialTrackItems, sourceFile, onBack, onExport }: EditorPhaseProps) {
  const [panelAssets, setPanelAssets] = useState<Asset[]>(assets);

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [trackItems, setTrackItems] = useState<VideoTrackItem[]>(() => {
    if (mode !== "video") return [];
    if (initialTrackItems && initialTrackItems.length > 0) return initialTrackItems;
    const clipAssets = assets.filter(a => a.type === "video-clip") as import("../types/assets").VideoClipAsset[];
    let offset = 0;
    return clipAssets.map(c => {
      const item: VideoTrackItem = {
        id: crypto.randomUUID(),
        assetId: c.id,
        startTime: offset,
        duration: c.duration,
        label: c.label,
        thumbnail: c.thumbnail,
        videoUrl: c.blobUrl,
        sourceFileName: c.sourceFileName,
        sourceFileIndex: c.sourceFileIndex,
        inPoint: c.startTime,
        outPoint: c.startTime + c.duration,
        beatType: "beat",
        isBroll: (c.sourceFileIndex ?? 0) > 0,
      };
      offset += c.duration;
      return item;
    });
  });

  // Carousel state
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const initialSlides = (): CarouselSlideItem[] => {
    if (mode !== "carousel") return [];
    const slideAssets = assets.filter(a => a.type === "slide");
    return slideAssets.map(a => {
      const sa = a as import("../types/assets").SlideAsset;
      const initialBg = sa.dominantColors?.[0] || "#ffffff";
      return {
        id: crypto.randomUUID(),
        assetId: sa.id,
        backgroundUrl: sa.blobUrl,
        backgroundColor: initialBg,
        showBackdrop: false,
        elements: sa.deconstructedElements && sa.deconstructedElements.length > 0
          ? sa.deconstructedElements
          : [],
        texts: sa.deconstructedTexts && sa.deconstructedTexts.length > 0
          ? sa.deconstructedTexts
          : (sa.extractedText ? [{
              id: crypto.randomUUID(),
              content: sa.extractedText,
              x: 50, y: 30,
              fontSize: 28, fontWeight: 700,
              color: initialBg === "#ffffff" ? "#0f172a" : "#ffffff",
              align: "center" as const,
            }] : []),
        width: sa.width || 1080,
        height: sa.height || 1080,
      };
    });
  };

  const {
    state: slides,
    set: setSlides,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<CarouselSlideItem[]>(initialSlides(), { maxHistory: 40, enableKeyboard: true });

  // API Key modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey());

  useEffect(() => {
    if (mode === "video" && sourceFile) {
      const url = URL.createObjectURL(sourceFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [mode, sourceFile]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { videoRef.current.play(); setIsPlaying(true); }
  }, [isPlaying]);

  const handleSeek = (t: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = t; setCurrentTime(t);
  };

  const toggleAsset = (id: string) => {
    setPanelAssets(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  // Get active slide and selected components
  const activeSlide = slides[activeSlideIdx];
  const selectedText = selectedTextId && activeSlide
    ? (activeSlide.texts || []).find(t => t.id === selectedTextId) ?? null
    : null;

  const selectedElement = selectedElementId && activeSlide
    ? (activeSlide.elements || []).find(el => el.id === selectedElementId) ?? null
    : null;

  const updateSelectedText = (patch: Partial<CarouselSlideItem["texts"][number]>) => {
    if (!selectedTextId) return;
    setSlides(prev => prev.map((s, i) => i !== activeSlideIdx ? s : {
      ...s,
      texts: (s.texts || []).map(t => t.id === selectedTextId ? { ...t, ...patch } : t),
    }));
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    setSlides(prev => prev.map((s, i) => i !== activeSlideIdx ? s : {
      ...s, texts: (s.texts || []).filter(t => t.id !== selectedTextId),
    }));
    setSelectedTextId(null);
  };

  const updateSelectedElement = (patch: Partial<SlideGraphicElement>) => {
    if (!selectedElementId) return;
    setSlides(prev => prev.map((s, i) => i !== activeSlideIdx ? s : {
      ...s,
      elements: (s.elements || []).map(el => el.id === selectedElementId ? { ...el, ...patch } : el),
    }));
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    setSlides(prev => prev.map((s, i) => i !== activeSlideIdx ? s : {
      ...s, elements: (s.elements || []).filter(el => el.id !== selectedElementId),
    }));
    setSelectedElementId(null);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElementId || !selectedElement) return;
    const dupe: SlideGraphicElement = {
      ...selectedElement,
      id: crypto.randomUUID(),
      x: Math.min(90, selectedElement.x + 5),
      y: Math.min(90, selectedElement.y + 5),
      label: `${selectedElement.label || "Element"} (copy)`,
    };
    setSlides(prev => prev.map((s, i) => i !== activeSlideIdx ? s : {
      ...s, elements: [...(s.elements || []), dupe],
    }));
    setSelectedElementId(dupe.id);
  };

  const updateActiveSlide = (patch: Partial<CarouselSlideItem>) => {
    setSlides(prev => prev.map((s, i) => i === activeSlideIdx ? { ...s, ...patch } : s));
  };

  // Selected clip for inspector
  const selectedClip = selectedClipId
    ? trackItems.find(i => i.id === selectedClipId) ?? null
    : null;

  const updateSelectedClip = (patch: Partial<VideoTrackItem>) => {
    if (!selectedClipId) return;
    setTrackItems(prev => prev.map(i => i.id === selectedClipId ? { ...i, ...patch } : i));
  };

  const deleteSelectedClip = () => {
    if (!selectedClipId) return;
    setTrackItems(prev => prev.filter(i => i.id !== selectedClipId));
    setSelectedClipId(null);
  };

  const duplicateSelectedClip = () => {
    if (!selectedClipId) return;
    const idx = trackItems.findIndex(i => i.id === selectedClipId);
    if (idx === -1) return;
    const orig = trackItems[idx];
    const dupe: VideoTrackItem = {
      ...orig,
      id: crypto.randomUUID(),
      label: `${orig.label} (copy)`,
    };
    const updated = [...trackItems];
    updated.splice(idx + 1, 0, dupe);
    setTrackItems(updated);
    setSelectedClipId(dupe.id);
  };

  const saveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setShowApiKeyModal(false);
  };

  return (
    <div className="phase-enter" style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--base)", overflow: "hidden" }}>
      {/* Hidden video for audio sync */}
      {mode === "video" && videoUrl && (
        <video ref={videoRef} src={videoUrl} style={{ display: "none" }}
          onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
          onEnded={() => setIsPlaying(false)} />
      )}

      {/* ── Top Header: Clean Breadcrumbs & Actions ───────────────────────── */}
      <div style={{
        height: 52, background: "var(--panel)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 14, flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={onBack} className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2L3 6.5l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Assets
        </button>

        <div style={{ width: 1, height: 16, background: "var(--border)" }} />

        {/* Phase Pipeline Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Clario Studio
          </span>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 999,
            background: "var(--surface-2)", color: "var(--text-secondary)", fontWeight: 600,
          }}>
            {mode === "carousel" ? "Slide Deconstructor" : "Timeline Editor"}
          </span>
        </div>

        {/* Undo / Redo controls */}
        {mode === "carousel" && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, marginLeft: 8 }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6,
                background: "transparent", border: "none",
                color: canUndo ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: canUndo ? "pointer" : "default",
                opacity: canUndo ? 1 : 0.4,
              }}
            >
              Undo
            </button>
            <div style={{ width: 1, height: 12, background: "var(--border)" }} />
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6,
                background: "transparent", border: "none",
                color: canRedo ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 11, fontWeight: 600, cursor: canRedo ? "pointer" : "default",
                opacity: canRedo ? 1 : 0.4,
              }}
            >
              Redo
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="btn-ghost"
            style={{ fontSize: 11, padding: "5px 10px" }}
            title="Configure Gemini API key"
          >
            <span style={{ color: getStoredApiKey() ? "var(--emerald)" : "var(--accent)" }}>✦</span> AI Config
          </button>

          <button onClick={() => onExport(slides, trackItems)} className="btn-primary" style={{ fontSize: 12, padding: "6px 16px" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v7M3.5 6.5l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1.5 10.5h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* ── Main 3-Column Studio Layout ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Source Asset Pool */}
        <div style={{
          width: 240, background: "var(--panel)", borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
              Assets ({panelAssets.length})
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Drag to stage
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
            <AssetGrid assets={panelAssets} onToggle={toggleAsset} />
          </div>
        </div>

        {/* Center: Stage & Timeline */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mode === "carousel" ? (
            <SlideCanvas
              slides={slides}
              assets={panelAssets}
              activeIdx={activeSlideIdx}
              selectedTextId={selectedTextId}
              selectedElementId={selectedElementId}
              onChange={setSlides}
              onActiveChange={setActiveSlideIdx}
              onSelectText={setSelectedTextId}
              onSelectElement={setSelectedElementId}
            />
          ) : (
            <VideoCanvas
              trackItems={trackItems}
              assets={panelAssets}
              videoUrl={videoUrl ?? undefined}
              duration={duration}
              currentTime={currentTime}
              isPlaying={isPlaying}
              selectedItemId={selectedClipId}
              onChange={setTrackItems}
              onSeek={handleSeek}
              onTogglePlay={togglePlay}
              onSelectItem={setSelectedClipId}
            />
          )}
        </div>

        {/* Right: Contextual Inspector */}
        <div style={{
          width: 250, background: "var(--panel)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
        }}>
          <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 14px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", textTransform: "uppercase" }}>
              Inspector
            </span>
          </div>

          {mode === "carousel" ? (
            selectedText ? (
              <TextInspector
                text={selectedText}
                onUpdate={updateSelectedText}
                onDelete={deleteSelectedText}
              />
            ) : selectedElement ? (
              <ElementInspector
                element={selectedElement}
                onUpdate={updateSelectedElement}
                onDelete={deleteSelectedElement}
                onDuplicate={duplicateSelectedElement}
              />
            ) : activeSlide ? (
              <SlideInspector slide={activeSlide} onUpdate={updateActiveSlide} />
            ) : (
              <div style={{ padding: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Select an element, text block, or slide to inspect properties.
              </div>
            )
          ) : (
            selectedClip ? (
              <ClipInspector
                clip={selectedClip}
                onUpdate={updateSelectedClip}
                onDelete={deleteSelectedClip}
                onDuplicate={duplicateSelectedClip}
              />
            ) : (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    Composition Stats
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-muted)" }}>Clips on Timeline</span>
                    <span style={{ color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>{trackItems.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Total Duration</span>
                    <span style={{ color: "var(--text-primary)", fontFamily: "Space Mono, monospace" }}>
                      {Math.round(trackItems.reduce((s, i) => s + i.duration, 0))}s
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Select any clip on the timeline to customize its narrative role, trim duration, or swap footage.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* AI Key Modal */}
      {showApiKeyModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}>
          <div style={{
            width: 380, background: "var(--panel)",
            border: "1px solid var(--border)", borderRadius: 14,
            padding: "22px 20px", display: "flex", flexDirection: "column", gap: 14,
            boxShadow: "var(--shadow-lg)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Gemini AI Configuration</h3>
              <button onClick={() => setShowApiKeyModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Optional: Enter a Gemini API Key to enable AI rephrasing and prompt generation.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text-primary)",
                outline: "none", fontFamily: "Space Mono, monospace",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="btn-ghost"
                style={{ fontSize: 11, padding: "6px 12px" }}
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                className="btn-primary"
                style={{ fontSize: 11, padding: "6px 14px" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
