import { useState, useRef, useCallback, useEffect } from "react";
import type { VideoClipAsset, Asset, VideoTrackItem } from "../../types/assets";

interface VideoCanvasProps {
  trackItems: VideoTrackItem[];
  assets: Asset[];
  videoUrl?: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  selectedItemId: string | null;
  onChange: (items: VideoTrackItem[]) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSelectItem: (id: string | null) => void;
}

function pad(n: number) { return String(Math.floor(n)).padStart(2, "0"); }
function formatTime(t: number) {
  if (isNaN(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 10);
  return `${pad(m)}:${pad(s)}.${ms}`;
}

const BEAT_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  hook: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.5)", badge: "#F43F5E", text: "#FFFFFF" },
  dopamine: { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.5)", badge: "#34D399", text: "#FFFFFF" },
  problem: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.5)", badge: "#A78BFA", text: "#FFFFFF" },
  proof: { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.5)", badge: "#38BDF8", text: "#FFFFFF" },
  cta: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.5)", badge: "#FBBF24", text: "#FFFFFF" },
  beat: { bg: "rgba(78,108,242,0.12)", border: "rgba(78,108,242,0.5)", badge: "#4E6CF2", text: "#FFFFFF" },
};

export function VideoCanvas({
  trackItems, assets, videoUrl, duration, currentTime,
  isPlaying, selectedItemId, onChange, onSeek, onTogglePlay, onSelectItem,
}: VideoCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [showSwapDrawer, setShowSwapDrawer] = useState(false);
  const [showCaptionsOverlay, setShowCaptionsOverlay] = useState(true);
  const [isReassembling, setIsReassembling] = useState(false);

  const rulerRef = useRef<HTMLDivElement>(null);
  const videoElemRef = useRef<HTMLVideoElement | null>(null);

  // Drag-to-reorder state
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Trimming state
  const [trimming, setTrimming] = useState<{ id: string; edge: "left" | "right"; startX: number; origDur: number; origIn: number } | null>(null);

  const clipAssets = assets.filter(a => a.type === "video-clip") as VideoClipAsset[];
  const totalTrackDuration = trackItems.reduce((sum, i) => sum + i.duration, 0);
  const effectiveDuration = totalTrackDuration > 0 ? totalTrackDuration : (duration || 30);
  const playheadPct = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  // Identify currently active track item at currentTime
  let accumulated = 0;
  let activeItem: VideoTrackItem | null = null;
  let timeInItem = 0;

  for (const item of trackItems) {
    if (currentTime >= accumulated && currentTime < accumulated + item.duration) {
      activeItem = item;
      timeInItem = currentTime - accumulated;
      break;
    }
    accumulated += item.duration;
  }
  if (!activeItem && trackItems.length > 0) {
    activeItem = trackItems[trackItems.length - 1];
    timeInItem = activeItem.duration;
  }

  // Active video source URL and seek target
  const currentVideoSrc = activeItem?.videoUrl || videoUrl || "";
  const currentVideoTargetTime = activeItem ? (activeItem.inPoint || 0) + timeInItem : currentTime;

  // Sync internal playback seek and src
  useEffect(() => {
    if (!videoElemRef.current || !currentVideoSrc) return;
    if (videoElemRef.current.src !== currentVideoSrc) {
      videoElemRef.current.src = currentVideoSrc;
    }
    if (Math.abs(videoElemRef.current.currentTime - currentVideoTargetTime) > 0.3) {
      videoElemRef.current.currentTime = currentVideoTargetTime;
    }
  }, [currentVideoSrc, currentVideoTargetTime]);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current || !effectiveDuration) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(frac * effectiveDuration);
  }, [effectiveDuration, onSeek]);

  // ── "Try Again & Make Better" Dopamine Re-Assembly ─────────────────────────
  const handleReassembleDopamine = () => {
    if (trackItems.length === 0 || clipAssets.length === 0) return;
    setIsReassembling(true);

    setTimeout(() => {
      let offset = 0;
      const bRollClips = clipAssets.filter(c => (c.sourceFileIndex ?? 0) > 0);
      const aRollClips = clipAssets.filter(c => (c.sourceFileIndex ?? 0) === 0);

      const reassembled = trackItems.map((item, idx) => {
        let chosenClip: VideoClipAsset;

        if (item.beatType === "dopamine" && bRollClips.length > 0) {
          chosenClip = bRollClips[Math.floor(Math.random() * bRollClips.length)];
        } else if (bRollClips.length > 0 && idx % 2 === 1) {
          chosenClip = bRollClips[Math.floor(Math.random() * bRollClips.length)];
        } else if (aRollClips.length > 0) {
          chosenClip = aRollClips[Math.floor(Math.random() * aRollClips.length)];
        } else {
          chosenClip = clipAssets[Math.floor(Math.random() * clipAssets.length)];
        }

        const dur = item.duration;
        const inPt = chosenClip.startTime || 0;

        const updated: VideoTrackItem = {
          ...item,
          assetId: chosenClip.id,
          startTime: offset,
          thumbnail: chosenClip.thumbnail,
          videoUrl: chosenClip.blobUrl || item.videoUrl,
          sourceFileName: chosenClip.sourceFileName || item.sourceFileName,
          sourceFileIndex: chosenClip.sourceFileIndex ?? 0,
          inPoint: inPt,
          outPoint: inPt + dur,
          isBroll: (chosenClip.sourceFileIndex ?? 0) > 0,
        };

        offset += dur;
        return updated;
      });

      onChange(reassembled);
      setIsReassembling(false);
    }, 400);
  };

  // ── Swap footage for selected beat ─────────────────────────────────────────
  const handleSwapFootage = (newClip: VideoClipAsset) => {
    if (!selectedItemId) return;
    const targetIdx = trackItems.findIndex(i => i.id === selectedItemId);
    if (targetIdx === -1) return;

    const item = trackItems[targetIdx];
    const dur = Math.min(item.duration, newClip.duration || 3.0);
    const inPt = newClip.startTime || 0;

    const updated: VideoTrackItem = {
      ...item,
      assetId: newClip.id,
      duration: dur,
      thumbnail: newClip.thumbnail,
      videoUrl: newClip.blobUrl || item.videoUrl,
      sourceFileName: newClip.sourceFileName || item.sourceFileName,
      sourceFileIndex: newClip.sourceFileIndex ?? 0,
      inPoint: inPt,
      outPoint: inPt + dur,
      isBroll: (newClip.sourceFileIndex ?? 0) > 0,
    };

    const newTrack = [...trackItems];
    newTrack[targetIdx] = updated;

    let offset = 0;
    const retimed = newTrack.map(it => {
      const itUpdated = { ...it, startTime: offset };
      offset += it.duration;
      return itUpdated;
    });

    onChange(retimed);
    setShowSwapDrawer(false);
  };

  const duplicateItem = (id: string) => {
    const idx = trackItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const orig = trackItems[idx];
    const dupe: VideoTrackItem = {
      ...orig,
      id: crypto.randomUUID(),
      label: `${orig.label} (copy)`,
    };
    const updated = [...trackItems];
    updated.splice(idx + 1, 0, dupe);

    let offset = 0;
    const retimed = updated.map(it => {
      const itUpdated = { ...it, startTime: offset };
      offset += it.duration;
      return itUpdated;
    });

    onChange(retimed);
    onSelectItem(dupe.id);
  };

  const removeItem = (id: string) => {
    const updated = trackItems.filter(i => i.id !== id);
    let offset = 0;
    const retimed = updated.map(it => {
      const itUpdated = { ...it, startTime: offset };
      offset += it.duration;
      return itUpdated;
    });
    onChange(retimed);
    if (selectedItemId === id) onSelectItem(null);
  };

  // ── Drag & Drop reorder ────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => { setDragSrcIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };

  const handleDrop = (targetIdx: number) => {
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) {
      setDragSrcIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...trackItems];
    const [moved] = updated.splice(dragSrcIdx, 1);
    updated.splice(targetIdx, 0, moved);

    let offset = 0;
    const retimed = updated.map(it => {
      const itUpdated = { ...it, startTime: offset };
      offset += it.duration;
      return itUpdated;
    });

    onChange(retimed);
    setDragSrcIdx(null);
    setDragOverIdx(null);
    onSelectItem(moved.id);
  };

  // ── Trim handles ───────────────────────────────────────────────────────────
  const startTrim = (e: React.MouseEvent, id: string, edge: "left" | "right", origDur: number, origIn: number) => {
    e.stopPropagation();
    e.preventDefault();
    setTrimming({ id, edge, startX: e.clientX, origDur, origIn });
  };

  useEffect(() => {
    if (!trimming) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - trimming.startX;
      const deltaSec = (deltaPx / 25) / zoom;

      const updated = trackItems.map(item => {
        if (item.id !== trimming.id) return item;
        let newDur = item.duration;
        let newIn = item.inPoint || 0;

        if (trimming.edge === "right") {
          newDur = Math.max(0.5, trimming.origDur + deltaSec);
        } else {
          newDur = Math.max(0.5, trimming.origDur - deltaSec);
          newIn = Math.max(0, trimming.origIn + deltaSec);
        }
        return { ...item, duration: Number(newDur.toFixed(2)), inPoint: Number(newIn.toFixed(2)) };
      });

      let offset = 0;
      const retimed = updated.map(it => {
        const itUpdated = { ...it, startTime: offset };
        offset += it.duration;
        return itUpdated;
      });

      onChange(retimed);
    };

    const handleMouseUp = () => { setTrimming(null); };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimming, zoom, trackItems, onChange]);

  const selectedItem = trackItems.find(i => i.id === selectedItemId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--base)" }}>

      {/* ── Center Stage: Clean Canvas Viewport ────────────────────────────── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        background: "var(--base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 24,
      }}>
        {currentVideoSrc ? (
          <div style={{
            position: "relative",
            maxHeight: "100%",
            maxWidth: "min(100%, 780px)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)",
            background: "#000000",
            border: "1px solid var(--border)",
          }}>
            <video
              ref={videoElemRef}
              src={currentVideoSrc}
              style={{ maxHeight: "calc(100vh - 350px)", maxWidth: "100%", display: "block" }}
              onClick={onTogglePlay}
            />

            {/* Kinetic Caption Overlay */}
            {showCaptionsOverlay && activeItem?.scriptText && (
              <div style={{
                position: "absolute",
                bottom: 36, left: 20, right: 20,
                display: "flex", justifyContent: "center",
                pointerEvents: "none", zIndex: 10,
              }}>
                <div style={{
                  background: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  maxWidth: "90%",
                  textAlign: "center",
                }}>
                  <span style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "-0.01em",
                  }}>
                    {activeItem.scriptText}
                  </span>
                </div>
              </div>
            )}

            {/* Play Button Overlay (when paused) */}
            {!isPlaying && (
              <div
                onClick={onTogglePlay}
                style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  background: "rgba(0,0,0,0.2)",
                  backdropFilter: "blur(2px)",
                  transition: "background 0.2s",
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-text)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginLeft: 2 }}>
                    <path d="M7 4.5l10 5.5-10 5.5V4.5z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Status Pill */}
            <div style={{
              position: "absolute", bottom: 10, left: 12,
              background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(6px)",
              padding: "4px 10px", borderRadius: 6,
              fontSize: 10, fontFamily: "Space Mono, monospace", color: "#fff",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isPlaying ? "var(--emerald)" : "var(--accent)" }} />
              <span>{formatTime(currentTime)} / {formatTime(effectiveDuration)}</span>
              {activeItem && (
                <span style={{ color: BEAT_COLORS[activeItem.beatType || "beat"]?.badge || "#4E6CF2", fontWeight: 700 }}>
                  [{activeItem.beatType?.toUpperCase() || "BEAT"}]
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="2" y="4" width="20" height="16" rx="2.18"/>
                <path d="M7 2v4M17 2v4M2 12h20M2 7h20M2 17h20"/>
              </svg>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>No Footage Active</p>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Add or select video clips from the left pool</p>
          </div>
        )}
      </div>

      {/* ── Timeline Section: Streamlined Magnetic Track ─────────────────── */}
      <div style={{
        height: 240,
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Timeline Control Bar */}
        <div style={{
          height: 42,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "var(--surface)",
        }}>
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="btn-ghost"
            style={{
              height: 28, padding: "0 10px", fontSize: 11,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <span style={{ fontSize: 11, fontFamily: "Space Mono, monospace", color: "var(--text-secondary)" }}>
            {formatTime(currentTime)} <span style={{ color: "var(--text-muted)" }}>/ {formatTime(effectiveDuration)}</span>
          </span>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* AI Re-Assemble / Try Again Action */}
          <button
            onClick={handleReassembleDopamine}
            disabled={isReassembling || trackItems.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 7,
              background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
              color: "var(--emerald)", fontSize: 11, fontWeight: 600,
              cursor: isReassembling || trackItems.length === 0 ? "default" : "pointer",
            }}
            title="Automatically re-times and swaps clips for high engagement flow"
          >
            {isReassembling ? "⚡ Re-Cutting Narrative…" : "✦ Auto Re-Cut"}
          </button>

          {/* Swap Footage Drawer Trigger */}
          {selectedItem && (
            <button
              onClick={() => setShowSwapDrawer(!showSwapDrawer)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 7,
                background: showSwapDrawer ? "var(--surface-2)" : "var(--surface)",
                border: `1px solid ${showSwapDrawer ? "var(--accent-border)" : "var(--border)"}`,
                color: showSwapDrawer ? "var(--accent)" : "var(--text-secondary)", fontSize: 11, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 Swap Footage
            </button>
          )}

          {/* Captions Toggle */}
          <button
            onClick={() => setShowCaptionsOverlay(!showCaptionsOverlay)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 7,
              background: showCaptionsOverlay ? "var(--amber-dim)" : "var(--surface)",
              border: `1px solid ${showCaptionsOverlay ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
              color: showCaptionsOverlay ? "var(--amber)" : "var(--text-muted)", fontSize: 11, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💬 Captions {showCaptionsOverlay ? "ON" : "OFF"}
          </button>

          {/* Zoom Controls */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>ZOOM</span>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}>−</button>
            <div style={{ width: 40, height: 3, background: "var(--border)", borderRadius: 2 }}>
              <div style={{ width: `${((zoom - 0.5) / 1.5) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
            </div>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14 }}>+</button>
          </div>
        </div>

        {/* Footage Swap Drawer (Quick Picker) */}
        {showSwapDrawer && selectedItem && (
          <div style={{
            background: "var(--surface-2)", borderBottom: "1px solid var(--border)",
            padding: "8px 16px", display: "flex", gap: 10, overflowX: "auto",
            alignItems: "center", zIndex: 30,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
              Select Replacement:
            </span>
            {clipAssets.map(clip => (
              <button
                key={clip.id}
                onClick={() => handleSwapFootage(clip)}
                style={{
                  height: 46, width: 76, borderRadius: 6, overflow: "hidden",
                  border: `1.5px solid ${clip.id === selectedItem.assetId ? "var(--accent)" : "var(--border)"}`,
                  background: "var(--surface)", cursor: "pointer", flexShrink: 0, position: "relative",
                  padding: 0,
                }}
                title={`Swap to ${clip.label} (${clip.duration.toFixed(1)}s)`}
              >
                {clip.thumbnail && (
                  <img src={clip.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                <div style={{
                  position: "absolute", bottom: 2, right: 2,
                  background: "rgba(0,0,0,0.8)", borderRadius: 3, padding: "1px 3px",
                  fontSize: 8, color: "#fff", fontFamily: "Space Mono, monospace",
                }}>
                  {clip.duration.toFixed(1)}s
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Timeline Tracks */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Track Header Label */}
          <div style={{ width: 60, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ height: 24, borderBottom: "1px solid var(--border)" }} />
            <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>BEATS</span>
            </div>
          </div>

          {/* Track Scroll Area */}
          <div style={{ flex: 1, overflowX: "auto", position: "relative" }}>
            <div style={{ minWidth: "100%", width: `${100 * zoom}%`, height: "100%", position: "relative" }}>
              {/* Ruler */}
              <div
                ref={rulerRef}
                onClick={handleRulerClick}
                style={{
                  height: 24, background: "var(--surface)", borderBottom: "1px solid var(--border)",
                  cursor: "pointer", position: "relative", overflow: "hidden",
                }}
              >
                {effectiveDuration > 0 && Array.from({ length: Math.min(Math.floor(effectiveDuration), 120) + 1 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: `${(i / effectiveDuration) * 100}%`, top: 0, bottom: 0 }}>
                    <div style={{ marginTop: "auto", width: 1, height: i % 5 === 0 ? 10 : 5, background: "var(--border-strong)" }} />
                    {i % 5 === 0 && (
                      <span style={{ position: "absolute", bottom: 2, left: 3, fontSize: 8, color: "var(--text-muted)", fontFamily: "Space Mono, monospace", whiteSpace: "nowrap" }}>
                        {formatTime(i)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Playhead */}
              <div style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${playheadPct}%`, width: 1,
                background: "var(--accent)", boxShadow: "0 0 6px rgba(78,108,242,0.6)",
                zIndex: 25, pointerEvents: "none",
              }}>
                <div style={{
                  width: 9, height: 9, background: "var(--accent)",
                  borderRadius: "50% 50% 0 0", transform: "translateX(-50%)",
                }} />
              </div>

              {/* Beat Blocks on Timeline */}
              <div style={{ height: 78, display: "flex", alignItems: "center", padding: "0 6px", gap: 4 }}>
                {trackItems.length === 0 ? (
                  <div style={{ flex: 1, height: 60, borderRadius: 8, border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No beats on timeline</span>
                  </div>
                ) : (
                  trackItems.map((item, idx) => {
                    const widthPct = Math.max(4, (item.duration / effectiveDuration) * 100);
                    const isSelected = selectedItemId === item.id;
                    const isDragOver = dragOverIdx === idx;
                    const beatStyle = BEAT_COLORS[item.beatType || "beat"] || BEAT_COLORS.beat;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onClick={() => onSelectItem(item.id)}
                        style={{
                          width: `${widthPct}%`,
                          height: 64,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: `1.5px solid ${isSelected ? "var(--accent)" : isDragOver ? "var(--accent-border)" : beatStyle.border}`,
                          background: beatStyle.bg,
                          cursor: "grab",
                          position: "relative",
                          flexShrink: 0,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          boxShadow: isSelected ? "var(--shadow-md)" : "none",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {/* Background Thumbnail */}
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt=""
                            draggable={false}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, pointerEvents: "none" }}
                          />
                        )}

                        {/* Top: Beat Role Tag + Duration */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
                          <span style={{
                            fontSize: 8, fontWeight: 800, textTransform: "uppercase",
                            color: beatStyle.badge, letterSpacing: "0.04em",
                          }}>
                            {item.beatType?.toUpperCase() || "BEAT"}
                          </span>
                          <span style={{ fontSize: 8, color: "var(--text-secondary)", fontFamily: "Space Mono, monospace" }}>
                            {item.duration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Middle: Script Snippet */}
                        <div style={{
                          fontSize: 9, fontWeight: 600, color: "var(--text-primary)",
                          lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", zIndex: 2,
                        }}>
                          {item.scriptText || item.label}
                        </div>

                        {/* Bottom: Type Tag & Action shortcuts */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
                          <span style={{
                            fontSize: 7.5, color: "var(--text-muted)",
                            background: "var(--surface)", padding: "1px 4px", borderRadius: 3,
                          }}>
                            {item.isBroll ? "⚡ B-Roll" : "📹 A-Roll"}
                          </span>

                          {isSelected && (
                            <div style={{ display: "flex", gap: 2 }}>
                              <button
                                onClick={e => { e.stopPropagation(); duplicateItem(item.id); }}
                                title="Duplicate"
                                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 3, padding: "1px 4px", cursor: "pointer", fontSize: 8 }}
                              >
                                ⧉
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                                title="Delete"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--rose)", borderRadius: 3, padding: "1px 4px", cursor: "pointer", fontSize: 8 }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Left Trim Handle */}
                        {isSelected && (
                          <div
                            onMouseDown={e => startTrim(e, item.id, "left", item.duration, item.inPoint || 0)}
                            style={{
                              position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
                              background: "var(--accent)", cursor: "ew-resize", zIndex: 10,
                            }}
                          />
                        )}

                        {/* Right Trim Handle */}
                        {isSelected && (
                          <div
                            onMouseDown={e => startTrim(e, item.id, "right", item.duration, item.inPoint || 0)}
                            style={{
                              position: "absolute", right: 0, top: 0, bottom: 0, width: 6,
                              background: "var(--accent)", cursor: "ew-resize", zIndex: 10,
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
