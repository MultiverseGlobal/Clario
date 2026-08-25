import { useState, useRef, useEffect } from "react";
import type { Asset, VideoClipAsset } from "../../types/assets";

interface AssetPreviewModalProps {
  asset: Asset | null;
  sourceFile?: File;
  onClose: () => void;
}

export function AssetPreviewModal({ asset, sourceFile, onClose }: AssetPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;

    if (asset.type === "video-clip" && sourceFile) {
      const url = URL.createObjectURL(sourceFile);
      setVideoSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [asset, sourceFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && videoRef.current) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!asset) return null;

  const isVideo = asset.type === "video-clip";
  const clip = isVideo ? (asset as VideoClipAsset) : null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    if (clip && videoRef.current.currentTime >= clip.startTime + clip.duration) {
      videoRef.current.currentTime = clip.startTime;
      videoRef.current.play();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(6,6,10,0.85)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: isVideo ? 720 : 540,
          background: "var(--panel)", border: "1px solid var(--border-hover)",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 32px rgba(99,102,241,0.15)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Top Header */}
        <div style={{
          height: 48, borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 18px", background: "var(--surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 10, fontFamily: "Space Mono, monospace", fontWeight: 700,
              color: "#818CF8", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 4,
              border: "1px solid var(--accent-border)",
            }}>
              {asset.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {asset.label}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: "transparent", border: "none",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Media Preview Area */}
        <div style={{
          background: "#000", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 320, maxHeight: 480, overflow: "hidden",
        }}>
          {isVideo && videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              style={{ width: "100%", height: "100%", maxHeight: 480, objectFit: "contain" }}
              onLoadedMetadata={() => {
                if (videoRef.current && clip) {
                  videoRef.current.currentTime = clip.startTime;
                }
              }}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
            />
          ) : 'thumbnail' in asset && asset.thumbnail ? (
            <img
              src={(asset as { thumbnail: string }).thumbnail}
              alt={asset.label}
              style={{ width: "100%", height: "100%", maxHeight: 480, objectFit: "contain" }}
            />
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "Space Mono, monospace" }}>
              No visual preview available
            </div>
          )}

          {/* Play/Pause Overlay Button for Video */}
          {isVideo && (
            <button
              onClick={togglePlay}
              style={{
                position: "absolute", width: 56, height: 56, borderRadius: "50%",
                background: "rgba(14,15,20,0.75)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s, background 0.15s",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="3" y="2" width="4" height="14" rx="1.5" />
                  <rect x="11" y="2" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ marginLeft: 3 }}>
                  <path d="M4 3.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 004 3.5z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Footer / Scrubber */}
        <div style={{
          padding: "14px 18px", background: "var(--panel)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {clip && (
              <span style={{ fontSize: 11, color: "#818CF8", fontFamily: "Space Mono, monospace" }}>
                Length: {clip.duration.toFixed(1)}s (Offset: {clip.startTime.toFixed(1)}s)
              </span>
            )}
            {!clip && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "Space Mono, monospace" }}>
                Ready to assemble into timeline / canvas
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: "6px 14px", fontSize: 11 }}
          >
            Done Preview
          </button>
        </div>
      </div>
    </div>
  );
}
