import { useState, useRef, useCallback, useEffect } from "react";
import type { VideoClipAsset, Asset, VideoTrackItem } from "../../types/assets";
import { analyzeAudioEnergy } from "../../lib/audioAnalyser";

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
  onSaveAssetPack?: () => void;
  onMakeNewVideo?: () => void;
  projectName?: string;
  targetPurpose?: 'sales_outreach' | 'content_creator';
  category?: 'sales' | 'content';
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
  onSaveAssetPack, onMakeNewVideo, projectName, targetPurpose, category,
}: VideoCanvasProps) {
  const isSalesOutreach = targetPurpose === 'sales_outreach' || category === 'sales';
  const [zoom, setZoom] = useState(1);
  const [showSwapDrawer, setShowSwapDrawer] = useState(false);
  const [showCaptionsOverlay, setShowCaptionsOverlay] = useState(true);
  const [captionStripMode, setCaptionStripMode] = useState<"none" | "punch_in" | "blur_mask">("none");
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [waveformSamples, setWaveformSamples] = useState<number[]>([]);
  const [isReassembling, setIsReassembling] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const rulerRef = useRef<HTMLDivElement>(null);
  const videoElemRef = useRef<HTMLVideoElement | null>(null);
  const canvasFileInputRef = useRef<HTMLInputElement>(null);

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
  const currentVideoSrc = activeItem?.videoUrl || (activeItem as any)?.url || videoUrl || "";
  const currentVideoTargetTime = activeItem ? (activeItem.inPoint || 0) + timeInItem : currentTime;

  // Sync internal playback seek and src
  useEffect(() => {
    if (!videoElemRef.current || !currentVideoSrc) return;
    if (videoElemRef.current.src !== currentVideoSrc) {
      videoElemRef.current.src = currentVideoSrc;
      setVideoError(false);
    }
    if (Math.abs(videoElemRef.current.currentTime - currentVideoTargetTime) > 0.3) {
      videoElemRef.current.currentTime = currentVideoTargetTime;
    }
  }, [currentVideoSrc, currentVideoTargetTime]);

  // Real Play / Pause controller
  useEffect(() => {
    if (!videoElemRef.current) return;
    if (isPlaying) {
      videoElemRef.current.play().catch(() => {});
    } else {
      videoElemRef.current.pause();
    }
  }, [isPlaying]);

  // Real Audio Waveform Analyzer
  useEffect(() => {
    if (!currentVideoSrc) return;
    let active = true;
    analyzeAudioEnergy(currentVideoSrc)
      .then((res) => {
        if (active && res.waveformSamples.length > 0) {
          setWaveformSamples(res.waveformSamples);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentVideoSrc]);

  // Audio track muting sync
  useEffect(() => {
    if (!videoElemRef.current) return;
    videoElemRef.current.muted = isVoiceMuted && isMusicMuted;
  }, [isVoiceMuted, isMusicMuted]);

  const handleLoadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoError(false);
    if (trackItems.length > 0) {
      const updated = trackItems.map((item, idx) => idx === 0 ? { ...item, videoUrl: url, url } : item);
      onChange(updated);
    } else {
      onChange([{
        id: `track_${Date.now()}`,
        title: file.name,
        startTime: 0,
        endTime: 30,
        duration: 30,
        type: 'video',
        url,
        videoUrl: url,
        isBroll: false,
        beatType: 'beat'
      }]);
    }
  };

  const handleLoadSample = () => {
    const sampleUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    setVideoError(false);
    if (trackItems.length > 0) {
      const updated = trackItems.map((item, idx) => idx === 0 ? { ...item, videoUrl: sampleUrl, url: sampleUrl } : item);
      onChange(updated);
    } else {
      onChange([{
        id: `track_${Date.now()}`,
        title: "Demo Sample Footage",
        startTime: 0,
        endTime: 15,
        duration: 15,
        type: 'video',
        url: sampleUrl,
        videoUrl: sampleUrl,
        isBroll: false,
        beatType: 'beat'
      }]);
    }
  };

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current || !effectiveDuration) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = frac * effectiveDuration;

    // Magnetic snapping: snap to track item boundaries within 0.25s
    let acc = 0;
    const snapPoints: number[] = [0];
    for (const item of trackItems) {
      acc += item.duration;
      snapPoints.push(acc);
    }
    const closestSnap = snapPoints.find(pt => Math.abs(pt - targetTime) <= 0.25);
    const finalTime = closestSnap !== undefined ? closestSnap : targetTime;

    onSeek(parseFloat(finalTime.toFixed(1)));
  }, [effectiveDuration, onSeek, trackItems]);

  // ── "Try Again & Make Better" Dopamine Re-Assembly ─────────────────────────
  const handleReassembleDopamine = () => {
    if (trackItems.length === 0) return;
    setIsReassembling(true);

    setTimeout(() => {
      const videoTracks = trackItems.filter(t => t.type === 'video');
      const audioTracks = trackItems.filter(t => t.type === 'audio');

      // Sort video tracks by dopamineScore descending
      const sortedByDopamine = [...videoTracks].sort((a, b) => (b.dopamineScore || 5) - (a.dopamineScore || 5));
      
      // Extract beat types
      const hooks = sortedByDopamine.filter(t => t.beatType === 'hook');
      const bestHook = hooks.length > 0 ? hooks[0] : sortedByDopamine[0];
      
      const problems = sortedByDopamine.filter(t => t.beatType === 'problem' && t.id !== bestHook?.id);
      const proofs = sortedByDopamine.filter(t => (t.beatType === 'proof' || t.beatType === 'b_roll' || t.isBroll) && t.id !== bestHook?.id);
      const ctas = sortedByDopamine.filter(t => t.beatType === 'cta' && t.id !== bestHook?.id);
      
      // Assemble new sequence
      const newVideoSequence: VideoTrackItem[] = [];
      if (bestHook) newVideoSequence.push(bestHook);
      
      if (isSalesOutreach) {
        // Sales Conversion Arc: Hook -> Problem Pain-Point -> Product Demonstration -> Next Steps CTA
        if (problems.length > 0) newVideoSequence.push(problems[0]);
        for (const pr of proofs) {
          newVideoSequence.push(pr);
        }
        for (let i = 1; i < problems.length; i++) {
          newVideoSequence.push(problems[i]);
        }
        if (ctas.length > 0) newVideoSequence.push(ctas[0]);
      } else {
        // TikTok / Viral Content Arc: Fast interleaving of A-roll and B-roll
        let pIdx = 0, prIdx = 0;
        while (newVideoSequence.length < videoTracks.length) {
          if (pIdx < problems.length) newVideoSequence.push(problems[pIdx++]);
          if (prIdx < proofs.length) newVideoSequence.push(proofs[prIdx++]);
          if (pIdx >= problems.length && prIdx >= proofs.length) break;
        }
        if (ctas.length > 0) newVideoSequence.push(ctas[0]);
      }
      
      // Add any remaining
      const usedIds = new Set(newVideoSequence.map(t => t.id));
      for (const t of sortedByDopamine) {
        if (!usedIds.has(t.id)) newVideoSequence.push(t);
      }
      
      // Recalculate start times and enforce intelligent pacing
      let offset = 0;
      const reassembled = newVideoSequence.map((item) => {
        let idealDur = item.duration;
        if (isSalesOutreach) {
          // B2B Sales Pacing: Natural conversational delivery so prospects absorb the pitch
          if (item.beatType === 'hook') idealDur = Math.max(item.duration, 4.0);
          else if (item.beatType === 'problem') idealDur = Math.max(item.duration, 5.5);
          else if (item.beatType === 'cta') idealDur = Math.max(item.duration, 4.0);
          else idealDur = item.duration;
        } else {
          // TikTok pacing rules: rapid dopamine cuts
          if (item.beatType === 'hook') idealDur = Math.min(item.duration, 1.5);
          else if (item.isBroll || item.beatType === 'b_roll') idealDur = Math.min(item.duration, 1.2);
          else idealDur = Math.min(item.duration, 2.5);
        }
        
        const updated: VideoTrackItem = {
          ...item,
          startTime: offset,
          duration: idealDur,
          inPoint: item.inPoint || 0,
          outPoint: (item.inPoint || 0) + idealDur,
        };
        offset += idealDur;
        return updated;
      });

      onChange([...reassembled, ...audioTracks]);
      setIsReassembling(false);
    }, 600);
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

  // ── Cloud Rendering Engine (FFmpeg on Modal) ────────────────────────────────
  const handleExportVideo = async () => {
    if (!currentVideoSrc) return;
    setIsExporting(true);
    setExportProgress(10);

    try {
      const safeName = (projectName || "clario_export").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const apiBase = import.meta.env.VITE_AI_ENGINE_BASE || 'https://multiverseglobals--clario-ai-engine-fastapi-app.modal.run';
      
      const videoTracks = trackItems.filter(t => t.type === 'video');
      const audioTracks = trackItems.filter(t => t.type === 'audio');

      // 1. Prepare timeline Edit Decision List (EDL)
      const edl = {
        projectName: safeName,
        clips: videoTracks.map(t => ({
          url: t.videoUrl || t.url || currentVideoSrc,
          inPoint: t.inPoint ?? t.startTime,
          outPoint: t.outPoint ?? ((t.inPoint ?? t.startTime) + t.duration),
          duration: t.duration,
          startTime: t.startTime,
          beatType: t.beatType,
          sourceType: t.sourceType || 'uploaded',
        })),
        audioTracks: audioTracks.map(a => ({
          url: a.audioUrl || a.url,
          volume: 1.0,
          startTime: a.startTime,
          duration: a.duration,
        }))
      };

      setExportProgress(25);

      // 2. Fetch source blob if local blob URL
      let videoBlob: Blob | null = null;
      if (currentVideoSrc.startsWith('blob:') || currentVideoSrc.startsWith('data:')) {
        try {
          const res = await fetch(currentVideoSrc);
          if (res.ok) videoBlob = await res.blob();
        } catch (e) {
          console.warn("Could not fetch local video blob for upload:", e);
        }
      }

      setExportProgress(45);

      // 3. Dispatch to Modal Cloud FFmpeg Rendering Engine
      const formData = new FormData();
      formData.append('timeline_edl', JSON.stringify(edl));
      if (videoBlob) {
        formData.append('file', videoBlob, `${safeName}.mp4`);
      }

      setExportProgress(65);

      const renderRes = await fetch(`${apiBase}/render-timeline`, {
        method: 'POST',
        body: formData,
      });

      if (renderRes.ok) {
        setExportProgress(90);
        const data = await renderRes.json();
        if (data.rendered_url) {
          // Download the cloud-rendered MP4 video!
          const link = document.createElement("a");
          link.href = data.rendered_url;
          link.download = data.filename || `${safeName}.mp4`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setExportProgress(100);
          return;
        }
      }

      // Graceful fallback if cloud render was offline
      console.warn("Cloud render endpoint did not return 200, using direct local download fallback");
      setExportProgress(85);
      if (videoBlob) {
        const downloadUrl = URL.createObjectURL(videoBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${safeName}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      } else {
        const a = document.createElement("a");
        a.href = currentVideoSrc;
        a.download = `${safeName}.mp4`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setExportProgress(100);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to render video on Cloud Engine. Falling back to preview.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--base)" }}>

      {/* ── Center Stage: Clean Canvas Viewport ────────────────────────────── */}
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const f = e.dataTransfer.files?.[0];
          if (f && f.type.startsWith("video/")) handleLoadFile(f);
        }}
        style={{
          flex: 1,
          minHeight: 0,
          background: "#0A0B0E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: 24,
        }}
      >
        <input 
          type="file" 
          ref={canvasFileInputRef} 
          accept="video/*" 
          style={{ display: "none" }} 
          onChange={(e) => e.target.files?.[0] && handleLoadFile(e.target.files[0])} 
        />

        {currentVideoSrc && !videoError ? (
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
              style={{
                maxHeight: "calc(100vh - 350px)",
                maxWidth: "100%",
                display: "block",
                transform: captionStripMode === "punch_in" ? "scale(1.22) translateY(-7%)" : "none",
                transformOrigin: "center 35%",
                transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={onTogglePlay}
              onError={() => setVideoError(true)}
              onTimeUpdate={(e) => {
                if (isPlaying) {
                  const targetTime = (e.target as HTMLVideoElement).currentTime;
                  onSeek(parseFloat(targetTime.toFixed(1)));
                }
              }}
              onEnded={() => onTogglePlay()}
            />

            {/* Studio Blur Matte (Caption Stripping Mode: Blur Mask) */}
            {captionStripMode === "blur_mask" && (
              <div style={{
                position: "absolute",
                bottom: "10%", left: "6%", right: "6%", height: "18%",
                background: "rgba(10, 11, 14, 0.82)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                zIndex: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", fontFamily: "Space Mono, monospace", letterSpacing: "0.05em" }}>
                  [BURNT-IN CAPTION SUPPRESSED · STUDIO MATTE ACTIVE]
                </span>
              </div>
            )}

            {/* Kinetic Karaoke Caption Overlay */}
            {showCaptionsOverlay && activeItem?.scriptText && (() => {
              const words = activeItem.scriptText.split(/\s+/).filter(Boolean);
              const dur = Math.max(activeItem.duration || 1, 0.1);
              const currentWordIdx = words.length > 0
                ? Math.min(words.length - 1, Math.floor((timeInItem / dur) * words.length))
                : -1;
              return (
                <div style={{
                  position: "absolute",
                  bottom: captionStripMode === "punch_in" ? 48 : 36,
                  left: 16, right: 16,
                  display: "flex", justifyContent: "center",
                  pointerEvents: "none", zIndex: 10,
                  transition: "bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  <div style={{
                    background: "rgba(7, 8, 12, 0.82)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: 12,
                    padding: "8px 18px",
                    maxWidth: "92%",
                    textAlign: "center",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "4px 7px",
                  }}>
                    {words.map((word, wIdx) => {
                      const isActive = wIdx === currentWordIdx;
                      const isPast = wIdx < currentWordIdx;
                      return (
                        <span
                          key={wIdx}
                          style={{
                            display: "inline-block",
                            fontFamily: "var(--font-sans, Inter, sans-serif)",
                            fontWeight: 800,
                            fontSize: isActive ? 16 : 14,
                            letterSpacing: "-0.015em",
                            color: isActive
                              ? "#FBBF24"
                              : isPast
                              ? "#FFFFFF"
                              : "rgba(255, 255, 255, 0.55)",
                            transform: isActive ? "scale(1.12) translateY(-1px)" : "scale(1)",
                            textShadow: isActive ? "0 0 14px rgba(251, 191, 36, 0.8)" : "none",
                            transition: "all 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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
              {projectName && <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{projectName} ·</span>}
              <span>{formatTime(currentTime)} / {formatTime(effectiveDuration)}</span>
              {activeItem && (
                <span style={{ color: BEAT_COLORS[activeItem.beatType || "beat"]?.badge || "#4E6CF2", fontWeight: 700 }}>
                  [{activeItem.beatType?.toUpperCase() || "BEAT"}]
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ 
            textAlign: "center", 
            color: "var(--text-muted)", 
            maxWidth: 440,
            padding: 32,
            borderRadius: 20,
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            boxShadow: "var(--shadow-md)"
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--accent)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {videoError ? "Footage Expired or Inaccessible" : "No Active Video Stream"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
              {videoError 
                ? "The previous session's temporary preview stream has expired. Attach a video file to resume timeline editing."
                : "Attach footage to activate multi-track playback, kinetic captions, and auto re-cut features."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button 
                onClick={() => canvasFileInputRef.current?.click()}
                className="pds-btn-primary"
                style={{ padding: "8px 16px", fontSize: 12, cursor: "pointer" }}
              >
                Select Video File
              </button>
              <button 
                onClick={handleLoadSample}
                className="pds-btn-ghost"
                style={{ padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
              >
                Load Demo Video
              </button>
            </div>
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

          {/* Engine Mode Indicator Badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 8px", borderRadius: 6,
            background: isSalesOutreach ? "rgba(245,158,11,0.12)" : "rgba(168,85,247,0.12)",
            border: `1px solid ${isSalesOutreach ? "rgba(245,158,11,0.3)" : "rgba(168,85,247,0.3)"}`,
            color: isSalesOutreach ? "#FBBF24" : "#C084FC",
            fontSize: 10, fontFamily: "Space Mono, monospace", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.04em"
          }}>
            <span>{isSalesOutreach ? "🎯 Sales Outbound Arc" : "⚡ Viral Dopamine Arc"}</span>
          </div>

          {/* AI Re-Assemble / Try Again Action */}
          <button
            onClick={handleReassembleDopamine}
            disabled={isReassembling || trackItems.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 7,
              background: isSalesOutreach ? "rgba(245,158,11,0.15)" : "var(--emerald-dim)",
              border: `1px solid ${isSalesOutreach ? "rgba(245,158,11,0.35)" : "rgba(16,185,129,0.3)"}`,
              color: isSalesOutreach ? "#FBBF24" : "var(--emerald)", fontSize: 11, fontWeight: 600,
              cursor: isReassembling || trackItems.length === 0 ? "default" : "pointer",
            }}
            title={isSalesOutreach ? "Re-orders narrative for high B2B sales conversion (Hook -> Problem -> Proof -> CTA)" : "Automatically re-times and swaps clips for high engagement flow"}
          >
            {isReassembling ? "⚡ Re-Cutting Narrative…" : isSalesOutreach ? "✦ Optimize Sales Arc" : "✦ Auto Re-Cut"}
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

          {/* Caption Stripping Mode (Punch-In Crop / Studio Matte / Off) */}
          <button
            onClick={() => setCaptionStripMode(m => m === "none" ? "punch_in" : m === "punch_in" ? "blur_mask" : "none")}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 7,
              background: captionStripMode !== "none" ? "rgba(244,63,94,0.12)" : "var(--surface)",
              border: `1px solid ${captionStripMode !== "none" ? "rgba(244,63,94,0.4)" : "var(--border)"}`,
              color: captionStripMode !== "none" ? "#F43F5E" : "var(--text-muted)", fontSize: 11, fontWeight: 600,
              cursor: "pointer",
            }}
            title="Strip burnt-in pixel captions: Punch-in zoom crop (cuts lower 22% subtitle zone) or studio blur matte"
          >
            {captionStripMode === "punch_in" ? "✂️ Strip (Punch-In)" : captionStripMode === "blur_mask" ? "🌫️ Strip (Matte)" : "🚫 Strip Off"}
          </button>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* Save Asset Pack to Reference Library */}
          {onSaveAssetPack && (
            <button
              onClick={() => {
                onSaveAssetPack();
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 7,
                background: "var(--surface-2)", border: "1px solid var(--border-strong)",
                color: "var(--text-primary)", fontSize: 11, fontWeight: 600,
                cursor: "pointer",
              }}
              title="Saves video cuts, isolated audio, music, and keyframes into the Reference Library"
            >
              📦 Save Asset Pack to Library
            </button>
          )}

          {/* Make New Video Action */}
          {onMakeNewVideo && (
            <button
              onClick={onMakeNewVideo}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 7,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                color: "var(--accent)", fontSize: 11, fontWeight: 600,
                cursor: "pointer",
              }}
              title="Use these harvested assets to create a brand new video"
            >
              🪄 Make New Video
            </button>
          )}

          {/* Export / Download Video */}
          <button
            onClick={handleExportVideo}
            disabled={isExporting || !currentVideoSrc}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 14px", borderRadius: 7,
              background: "linear-gradient(135deg, #10B981, #059669)",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "#FFFFFF", fontSize: 11, fontWeight: 700,
              cursor: isExporting || !currentVideoSrc ? "not-allowed" : "pointer",
              boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
              opacity: isExporting || !currentVideoSrc ? 0.6 : 1,
              transition: "all 0.15s ease",
            }}
            title="Download the rendered video cut to your computer"
          >
            {isExporting ? (
              <>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                <span>Exporting ({exportProgress}%)…</span>
              </>
            ) : (
              <>
                <span>⬇️</span>
                <span>Export Video</span>
              </>
            )}
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
          {/* Track Header Labels Column */}
          <div style={{ width: 84, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 24, borderBottom: "1px solid var(--border)" }} />
            {/* Track 1: Video Scenes */}
            <div style={{ height: 72, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 8px", gap: 4 }}>
              <span style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>🎬 SCENES</span>
            </div>
            {/* Track 2: Voice Track */}
            <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 8px", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: isVoiceMuted ? "var(--text-muted)" : "var(--emerald)", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>🎙️ VOICE</span>
              <button
                onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                title={isVoiceMuted ? "Unmute Voice Track" : "Mute Voice Track"}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, padding: 0, opacity: isVoiceMuted ? 0.4 : 0.9 }}
              >
                {isVoiceMuted ? "🔇" : "🔊"}
              </button>
            </div>
            {/* Track 3: Music Bed */}
            <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 8px", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: isMusicMuted ? "var(--text-muted)" : "var(--accent)", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>🎵 MUSIC</span>
              <button
                onClick={() => setIsMusicMuted(!isMusicMuted)}
                title={isMusicMuted ? "Unmute Music Bed" : "Mute Music Bed"}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, padding: 0, opacity: isMusicMuted ? 0.4 : 0.9 }}
              >
                {isMusicMuted ? "🔇" : "🔊"}
              </button>
            </div>
            {/* Track 4: Captions */}
            <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 8px" }}>
              <span style={{ fontSize: 9, color: "var(--amber)", fontWeight: 700, fontFamily: "Space Mono, monospace" }}>💬 CAPTION</span>
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

              {/* 1. SCENES TRACK */}
              <div style={{ height: 72, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 6px", gap: 4 }}>
                {trackItems.length === 0 ? (
                  <div style={{ flex: 1, height: 56, borderRadius: 8, border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No scene cuts detected</span>
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
                          height: 58,
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
                          padding: "4px 8px",
                          boxShadow: isSelected ? "var(--shadow-md)" : "none",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt=""
                            draggable={false}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, pointerEvents: "none" }}
                          />
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2, whiteSpace: "nowrap", overflow: "hidden" }}>
                          <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", color: beatStyle.badge, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.beatType?.toUpperCase() || "SCENE"}
                          </span>
                          <span style={{ fontSize: 8, color: "var(--text-secondary)", fontFamily: "Space Mono, monospace", marginLeft: 4 }}>
                            {item.duration.toFixed(1)}s
                          </span>
                        </div>

                        <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", zIndex: 2 }}>
                          {item.title || item.scriptText || item.label}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2, whiteSpace: "nowrap", overflow: "hidden" }}>
                          <span style={{ fontSize: 7.5, color: "var(--text-muted)", background: "var(--surface)", padding: "1px 4px", borderRadius: 3, flexShrink: 0 }}>
                            {item.isBroll ? "⚡ B-Roll" : "📹 A-Roll"}
                          </span>
                          {isSelected && (
                            <div style={{ display: "flex", gap: 2, marginLeft: 4, flexShrink: 0 }}>
                              <button onClick={e => { e.stopPropagation(); duplicateItem(item.id); }} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 3, padding: "1px 4px", cursor: "pointer", fontSize: 8 }}>⧉</button>
                              <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--rose)", borderRadius: 3, padding: "1px 4px", cursor: "pointer", fontSize: 8 }}>×</button>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <>
                            <div onMouseDown={e => startTrim(e, item.id, "left", item.duration, item.inPoint || 0)} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: "var(--accent)", cursor: "ew-resize", zIndex: 10 }} />
                            <div onMouseDown={e => startTrim(e, item.id, "right", item.duration, item.inPoint || 0)} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, background: "var(--accent)", cursor: "ew-resize", zIndex: 10 }} />
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 2. VOICE TRACK (Speech Audio Waveform) */}
              <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 6px", gap: 4, background: "rgba(16,185,129,0.03)" }}>
                {trackItems.map((item) => {
                  const widthPct = Math.max(4, (item.duration / effectiveDuration) * 100);
                  const totalBars = waveformSamples.length > 0 ? waveformSamples.length : 60;
                  const startIdx = Math.floor(((item.startTime || 0) / effectiveDuration) * totalBars);
                  const endIdx = Math.ceil(((item.endTime || item.duration) / effectiveDuration) * totalBars);
                  const itemSamples = waveformSamples.length > 0
                    ? waveformSamples.slice(startIdx, Math.max(startIdx + 8, endIdx))
                    : [0.3, 0.6, 0.9, 0.4, 0.7, 0.5, 0.8, 0.4, 0.6, 0.2];

                  return (
                    <div
                      key={`voice_${item.id}`}
                      style={{
                        width: `${widthPct}%`,
                        height: 28,
                        borderRadius: 6,
                        background: isVoiceMuted ? "rgba(100,116,139,0.08)" : "rgba(16,185,129,0.12)",
                        border: `1px solid ${isVoiceMuted ? "rgba(100,116,139,0.2)" : "rgba(16,185,129,0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        padding: "0 6px",
                        gap: 3,
                        overflow: "hidden",
                        opacity: isVoiceMuted ? 0.35 : 1,
                        transition: "opacity 0.2s",
                      }}
                      title="Clean Speech Audio (Isolated Vocals)"
                    >
                      <span style={{ fontSize: 8, color: isVoiceMuted ? "var(--text-muted)" : "var(--emerald)", fontWeight: 700, flexShrink: 0 }}>🎙️ Speech</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, height: "100%", padding: "4px 0" }}>
                        {itemSamples.map((sample, sIdx) => {
                          const barH = Math.max(4, Math.min(22, sample * 24));
                          return (
                            <div
                              key={sIdx}
                              style={{
                                flex: 1,
                                minWidth: 1.5,
                                maxWidth: 3,
                                height: barH,
                                background: isVoiceMuted ? "var(--text-muted)" : "var(--emerald)",
                                borderRadius: 1,
                                opacity: 0.85
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. MUSIC TRACK (Background Music Bed) */}
              <div style={{ height: 38, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 6px", background: "rgba(99,102,241,0.03)" }}>
                <div style={{
                  width: "100%",
                  height: 28,
                  borderRadius: 6,
                  background: isMusicMuted ? "rgba(100,116,139,0.08)" : "rgba(99,102,241,0.12)",
                  border: `1px solid ${isMusicMuted ? "rgba(100,116,139,0.2)" : "rgba(99,102,241,0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  gap: 6,
                  opacity: isMusicMuted ? 0.35 : 1,
                  transition: "opacity 0.2s",
                }}>
                  <span style={{ fontSize: 8, color: isMusicMuted ? "var(--text-muted)" : "var(--accent)", fontWeight: 700 }}>🎵 Soundtrack (Ambient Bed)</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, opacity: isMusicMuted ? 0.2 : 0.5 }}>
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} style={{ width: 3, height: (i % 3 === 0 ? 16 : 8), background: isMusicMuted ? "var(--text-muted)" : "var(--accent)", borderRadius: 1 }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. CAPTIONS TRACK */}
              <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 6px", gap: 4, background: "rgba(245,158,11,0.02)" }}>
                {trackItems.map((item) => {
                  const widthPct = Math.max(4, (item.duration / effectiveDuration) * 100);
                  return (
                    <div
                      key={`caption_${item.id}`}
                      style={{
                        width: `${widthPct}%`,
                        height: 24,
                        borderRadius: 5,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 6px",
                        overflow: "hidden",
                      }}
                      title={item.scriptText || "Kinetic Caption Segment"}
                    >
                      <span style={{ fontSize: 8, color: "var(--amber)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        💬 {item.scriptText || "Caption phrase"}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
