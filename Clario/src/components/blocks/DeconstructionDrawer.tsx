import { useState, useEffect } from "react";
import type { Asset, VideoClipAsset, SlideAsset, ImageFrameAsset } from "../../types/assets";
import {
  deconstructSlideArchitecture,
  deconstructVideoScene,
  type SlideDeconstructionBlueprint,
  type VideoDeconstructionBlueprint,
} from "../../lib/gemini";

interface DeconstructionDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onApplyRemix?: (hookText: string) => void;
}

export function DeconstructionDrawer({ asset, onClose, onApplyRemix }: DeconstructionDrawerProps) {
  const [activeTab, setActiveTab] = useState<"layers" | "recipe" | "remix">("layers");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slideBlueprint, setSlideBlueprint] = useState<SlideDeconstructionBlueprint | null>(null);
  const [videoBlueprint, setVideoBlueprint] = useState<VideoDeconstructionBlueprint | null>(null);

  const isVideo = asset?.type === "video-clip";
  const isSlide = asset?.type === "slide" || asset?.type === "image-frame";

  useEffect(() => {
    if (!asset) return;
    setLoading(true);

    const run = async () => {
      try {
        if (isVideo) {
          const clip = asset as VideoClipAsset;
          const res = await deconstructVideoScene(clip.thumbnail || "", clip.startTime, clip.duration);
          setVideoBlueprint(res);
        } else if (isSlide) {
          const thumb = "blobUrl" in asset ? (asset as SlideAsset | ImageFrameAsset).blobUrl || (asset as any).thumbnail : (asset as any).thumbnail;
          const res = await deconstructSlideArchitecture(thumb || "");
          setSlideBlueprint(res);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [asset, isVideo, isSlide]);

  if (!asset) return null;

  const copyBlueprint = () => {
    let text = "";
    if (slideBlueprint) {
      text = [
        `🎨 CLARIO SLIDE DECONSTRUCTION BLUEPRINT`,
        `Asset: ${asset.label}`,
        ``,
        `─── LAYER STACK ──────────────────────────`,
        `Layer 0 (Canvas): ${slideBlueprint.layer0Canvas.backgroundColor} | ${slideBlueprint.layer0Canvas.texture}`,
        `Layer 1 (Typography): ${slideBlueprint.layer1Typography.hookFontFamily} (${slideBlueprint.layer1Typography.fontSize}, ${slideBlueprint.layer1Typography.letterSpacing})`,
        `Layer 2 (Graphics): ${slideBlueprint.layer2GraphicComponents.containerStyle}`,
        `Layer 3 (Palette): Base ${slideBlueprint.layer3ColorTokens.background} · Accent ${slideBlueprint.layer3ColorTokens.accent}`,
        ``,
        `─── RECREATION STEPS (Figma / Canva) ─────`,
        ...slideBlueprint.recreationSteps,
      ].join("\n");
    } else if (videoBlueprint) {
      text = [
        `🎬 CLARIO VIDEO EDITING DECONSTRUCTION`,
        `Clip: ${asset.label}`,
        ``,
        `─── EDITING CRAFT & PACING ──────────────`,
        `Pacing: ${videoBlueprint.pacingAnalysis.cutFrequency}`,
        `Hook Rating: ${videoBlueprint.pacingAnalysis.hookRating}`,
        ``,
        `─── TIMELINE RECIPE (CapCut / Premiere) ─`,
        ...videoBlueprint.recreationSteps,
      ].join("\n");
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxWidth: "100%",
          height: "100%",
          background: "var(--panel)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{isVideo ? "🎬" : "🔍"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>
                Creative Deconstruction Engine
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                {asset.label} · {isVideo ? "Frame-by-Frame Craft" : "Blank Canvas → Final Deck"}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}>
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
          <button
            onClick={() => setActiveTab("layers")}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "layers" ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === "layers" ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              cursor: "pointer",
            }}
          >
            {isVideo ? "Editing Craft" : "Layer Stack"}
          </button>
          <button
            onClick={() => setActiveTab("recipe")}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === "recipe" ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === "recipe" ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              cursor: "pointer",
            }}
          >
            Recreation Recipe
          </button>
          {isSlide && (
            <button
              onClick={() => setActiveTab("remix")}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 600,
                color: activeTab === "remix" ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: activeTab === "remix" ? "2px solid var(--accent)" : "2px solid transparent",
                background: "none",
                borderTop: "none", borderLeft: "none", borderRight: "none",
                cursor: "pointer",
              }}
            >
              💡 Viral Remixes
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 24, height: 24, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Deconstructing creative craftsmanship…</div>
            </div>
          ) : (
            <>
              {/* ─── SLIDE VIEW ──────────────────────────────────────────────── */}
              {isSlide && slideBlueprint && (
                <>
                  {activeTab === "layers" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Layer 0: Canvas */}
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#818CF8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            Layer 0 · Canvas Foundation
                          </span>
                          <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: "var(--text-muted)" }}>
                            {slideBlueprint.layer0Canvas.dimensions}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: slideBlueprint.layer0Canvas.backgroundColor, border: "1px solid rgba(255,255,255,0.2)" }} />
                          <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                            <strong>{slideBlueprint.layer0Canvas.backgroundColor}</strong> — {slideBlueprint.layer0Canvas.texture}
                          </div>
                        </div>
                      </div>

                      {/* Layer 1: Typography */}
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#34D399", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                          Layer 1 · Typography Hierarchy
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                          "{slideBlueprint.layer1Typography.headline}"
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                          {slideBlueprint.layer1Typography.subtitle}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 4, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                            Font: {slideBlueprint.layer1Typography.hookFontFamily}
                          </span>
                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 4, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                            Size: {slideBlueprint.layer1Typography.fontSize}
                          </span>
                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 4, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                            Tracking: {slideBlueprint.layer1Typography.letterSpacing}
                          </span>
                        </div>
                      </div>

                      {/* Layer 2: Graphic Components */}
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                          Layer 2 · UI Components & Card Structure
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                          {slideBlueprint.layer2GraphicComponents.containerStyle}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {slideBlueprint.layer2GraphicComponents.components.map((comp, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.25)", padding: "6px 10px", borderRadius: 6, fontSize: 11 }}>
                              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{comp.name}</span>
                              <span style={{ color: "var(--text-muted)" }}>{comp.visualRole}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Layer 3: Color Tokens */}
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#F472B6", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                          Layer 3 · Design Token Palette
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[
                            ["Canvas", slideBlueprint.layer3ColorTokens.background],
                            ["Surface", slideBlueprint.layer3ColorTokens.surface],
                            ["Text Primary", slideBlueprint.layer3ColorTokens.textPrimary],
                            ["Accent Highlight", slideBlueprint.layer3ColorTokens.accent],
                          ].map(([label, hex]) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.25)", padding: "6px 8px", borderRadius: 6 }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, background: hex, border: "1px solid rgba(255,255,255,0.15)" }} />
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{label}</span>
                                <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: "var(--text-primary)" }}>{hex}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "recipe" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Follow this step-by-step blueprint to rebuild this exact slide layout from scratch in Figma or Canva:
                      </div>
                      {slideBlueprint.recreationSteps.map((step, idx) => (
                        <div key={idx} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "remix" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        Click any viral remix angle to repurpose this exact design architecture:
                      </div>
                      {slideBlueprint.remixAngles.map((remix, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            cursor: "pointer",
                            transition: "border-color 0.15s, transform 0.15s",
                          }}
                          onClick={() => {
                            if (onApplyRemix) onApplyRemix(remix.hook);
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                              {remix.title}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>Apply Remix →</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#818CF8", fontWeight: 600 }}>
                            "{remix.hook}"
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                            {remix.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ─── VIDEO VIEW ──────────────────────────────────────────────── */}
              {isVideo && videoBlueprint && (
                <>
                  {activeTab === "layers" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Pacing Banner */}
                      <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: "12px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#818CF8", marginBottom: 4 }}>
                          ⚡ PACING & RHYTHM
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                          {videoBlueprint.pacingAnalysis.cutFrequency}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                          Hook Score: <strong style={{ color: "#34D399" }}>{videoBlueprint.pacingAnalysis.hookRating}</strong> · Style: {videoBlueprint.pacingAnalysis.rhythmStyle}
                        </div>
                      </div>

                      {/* Editing Techniques */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Frame-by-Frame Editing Craft
                      </div>
                      {videoBlueprint.editTechniques.map((tech, i) => (
                        <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{tech.name}</span>
                            <span style={{ fontSize: 10, fontFamily: "Space Mono, monospace", color: "var(--accent)" }}>{tech.timestamp}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 6 }}>
                            {tech.description}
                          </div>
                          <div style={{ fontSize: 10, color: "#34D399", fontWeight: 600 }}>
                            Impact: {tech.impact}
                          </div>
                        </div>
                      ))}

                      {/* Required Assets */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Assets Used to Build This Scene
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {videoBlueprint.assetsUsed.map((item, i) => (
                          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                            <div>
                              <strong style={{ color: "var(--text-primary)" }}>{item.name}</strong>
                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.specs}</div>
                            </div>
                            <span style={{ fontSize: 9, textTransform: "uppercase", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--text-muted)" }}>
                              {item.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "recipe" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Step-by-step editing timeline sequence for CapCut, Premiere, or DaVinci:
                      </div>
                      {videoBlueprint.recreationSteps.map((step, idx) => (
                        <div key={idx} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button onClick={copyBlueprint} className="btn-primary" style={{ fontSize: 12, gap: 6, width: "100%" }}>
            {copied ? "✓ Copied to Clipboard" : "📋 Copy Recreation Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
