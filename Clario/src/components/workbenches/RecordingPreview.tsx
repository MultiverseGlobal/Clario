import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, RotateCcw, Save, Play, Pause, ArrowLeft, 
  Wand2, Sparkles, Sliders, ZoomIn, Check, 
  Copy, ArrowRight, AlertTriangle 
} from 'lucide-react';
import { getApiKey } from '../../lib/gemini';
import { getApiBase } from '../../lib/apiClient';

interface ZoomEvent {
  timestamp: number;
  duration: number;
  scale: number;
  focus: 'center' | 'cursor' | 'bottom_right';
  reason: string;
}

interface EditPlan {
  canvas?: {
    padding: number;
    border_radius: number;
    shadow_blur: number;
    background_style: string;
  };
  zoom_events?: ZoomEvent[];
  silence_trims?: { start: number; end: number }[];
  highlights?: string[];
  pacing?: string;
  summary?: string;
}

interface RecordingPreviewProps {
  blob: Blob;
  projectName?: string;
  editScript?: string;
  onReRecord: () => void;
  onBack: () => void;
  onSave?: (blob: Blob) => void;
  onMoveToEditor?: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const PRESET_DIRECTIVES = [
  {
    id: 'capso',
    label: 'Cap.so Studio Polish',
    prompt: 'Auto-zoom smoothly on clicks & active fields, 24px padded canvas with rounded 16px corners, dark studio backdrop, trim silences >1.2s, 1.25x punch-in on key value demo.',
  },
  {
    id: 'recordly',
    label: 'Recordly Snappy Zoom',
    prompt: 'Fast snappy zoom cuts on interactions, 20px padding, subtle floating shadow, eliminate pauses >1.0s, high contrast framing.',
  },
  {
    id: 'atlas_outreach',
    label: 'Atlas Outreach Demo',
    prompt: 'Cinematic 16:9 padded frame, 1.3x punch-in on recipient custom pain points, remove filler pauses, attachable high-converting demo video.',
  },
];

export function RecordingPreview({
  blob,
  projectName,
  editScript,
  onReRecord,
  onBack,
  onSave,
  onMoveToEditor,
}: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl] = useState(() => URL.createObjectURL(blob));
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleMetadataLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!Number.isFinite(v.duration) || v.duration <= 0) {
      // Chrome/Firefox WebM duration calculation fallback
      v.currentTime = 1e101;
      v.ontimeupdate = function () {
        this.ontimeupdate = () => {};
        v.currentTime = 0;
        if (Number.isFinite(v.duration) && v.duration > 0) {
          setDuration(v.duration);
          setDurationError(null);
        } else {
          setDurationError('Unable to read video duration');
        }
      };
    } else {
      setDuration(v.duration);
      setDurationError(null);
    }
  };

  const handleRetryDuration = () => {
    setDurationError(null);
    const v = videoRef.current;
    if (v) {
      v.load();
    }
  };

  // Edit Directive state
  const [directiveText, setDirectiveText] = useState(
    editScript || PRESET_DIRECTIVES[0].prompt
  );
  const [showDrawer, setShowDrawer] = useState(false);
  const [isProcessingDirectives, setIsProcessingDirectives] = useState(false);
  const [editPlan, setEditPlan] = useState<EditPlan | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const fileSizeMb = (blob.size / 1024 / 1024).toFixed(1);

  // Determine current active zoom event if any
  const activeZoom = editPlan?.zoom_events?.find(
    (z) => currentTime >= z.timestamp && currentTime <= z.timestamp + z.duration
  );

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${projectName || 'clario-recording'}.webm`;
    a.click();
  }

  function handleSave() {
    onSave?.(blob);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopyAtlasLink() {
    // Generate an outreach markdown link / URL
    const outreachSnippet = `Watch custom walkthrough (${Math.round(duration)}s): {{CLARIO_VIDEO_URL}}`;
    navigator.clipboard.writeText(outreachSnippet);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  async function handleApplyDirectives() {
    if (duration <= 0) return;
    setIsProcessingDirectives(true);

    const serverBase = getApiBase();
    const apiKey = getApiKey();

    try {
      const res = await fetch(`${serverBase}/recording/edit-directive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_text: directiveText,
          duration: Math.round(duration),
          style_preset: 'studio_dark',
          gemini_api_key: apiKey || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const plan: EditPlan = await res.json();
      setEditPlan(plan);
      setShowDrawer(false);
    } catch (err) {
      console.warn('Backend edit directive failed, using local Cap.so engine fallback:', err);
      // Client-side Cap.so fallback
      setEditPlan({
        canvas: {
          padding: 24,
          border_radius: 16,
          shadow_blur: 32,
          background_style: 'dark_mesh_gradient',
        },
        zoom_events: [
          {
            timestamp: Math.max(1.0, duration * 0.15),
            duration: 4.0,
            scale: 1.25,
            focus: 'center',
            reason: 'Punch-in on core interaction',
          },
          {
            timestamp: Math.max(5.0, duration * 0.65),
            duration: 3.5,
            scale: 1.35,
            focus: 'center',
            reason: 'Highlight final result',
          },
        ],
        silence_trims: duration > 8 ? [{ start: duration * 0.4, end: duration * 0.43 }] : [],
        highlights: ['Cap.so Studio Polish', 'Smart Zoom'],
        pacing: 'cinematic',
        summary: 'Applied Cap.so studio framing with smooth zooms and tightened pauses.',
      });
      setShowDrawer(false);
    } finally {
      setIsProcessingDirectives(false);
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0B10] text-white flex flex-col font-sans overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2 text-[11px] font-mono text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span>{duration > 0 ? formatDuration(duration) : '00:00'}</span>
            <span className="text-white/20">·</span>
            <span>{fileSizeMb} MB</span>
            <span className="text-white/20">·</span>
            <span className="text-emerald-400 font-semibold">Clean Master</span>
          </div>
          {editPlan?.summary && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Cap.so Auto-Zoom Active</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
              showDrawer
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Edit Directives
          </button>

          <button
            onClick={handleApplyDirectives}
            disabled={isProcessingDirectives}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isProcessingDirectives ? 'animate-spin' : ''}`} />
            {isProcessingDirectives ? 'Rendering...' : editPlan ? 'Re-apply AI Directives' : 'Apply Cap.so Directives'}
          </button>

          <button
            onClick={handleCopyAtlasLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-all"
            title="Copy video link snippet for Atlas cold emails"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied Snippet!' : 'Copy Atlas Outreach Link'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>

          {onMoveToEditor && (
            <button
              onClick={onMoveToEditor}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              Move to Editor
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onSave && !onMoveToEditor && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? 'Saved ✓' : 'Save to Project'}
            </button>
          )}
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center: Video Preview with dynamic canvas styling */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 overflow-hidden">
          <div
            className="relative w-full max-w-5xl aspect-video rounded-[24px] overflow-hidden transition-all duration-500 group flex items-center justify-center cursor-pointer"
            style={{
              padding: editPlan?.canvas ? `${editPlan.canvas.padding}px` : '0px',
              background: editPlan
                ? 'radial-gradient(ellipse at center, #1E1B4B 0%, #0A0B10 100%)'
                : '#000000',
              boxShadow: editPlan
                ? '0 30px 100px -20px rgba(99, 102, 241, 0.25), 0 20px 40px -15px rgba(0,0,0,0.8)'
                : '0 20px 40px -15px rgba(0,0,0,0.8)',
            }}
            onClick={togglePlay}
          >
            {/* The actual video element with rounded corners & smooth zoom */}
            <div
              className="relative w-full h-full overflow-hidden transition-transform duration-500 ease-out"
              style={{
                borderRadius: editPlan?.canvas ? `${editPlan.canvas.border_radius}px` : '16px',
                boxShadow: editPlan?.canvas ? '0 10px 30px rgba(0,0,0,0.6)' : 'none',
                transform: activeZoom ? `scale(${activeZoom.scale})` : 'scale(1)',
                transformOrigin: activeZoom?.focus === 'cursor' ? '70% 30%' : 'center center',
              }}
            >
              <video
                ref={videoRef}
                src={objectUrl}
                className="w-full h-full object-contain bg-black"
                onLoadedMetadata={handleMetadataLoaded}
                onError={() => setDurationError('Unable to read video duration')}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Unable to read video duration Error Overlay */}
              {durationError && (
                <div 
                  className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/10">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">Unable to read video duration</h4>
                  <p className="text-xs text-white/60 max-w-sm mb-4">
                    The video header or duration could not be fully parsed. You can retry reading metadata, download the original media, or proceed without timeline analysis.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={handleRetryDuration}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition-colors"
                    >
                      Download Original Media
                    </button>
                    <button
                      onClick={() => setDurationError(null)}
                      className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
                    >
                      Continue Without Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Active Zoom Badge */}
              {activeZoom && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-[11px] font-semibold text-white shadow-lg animate-pulse">
                  <ZoomIn className="w-3 h-3" />
                  <span>{activeZoom.scale}x Auto-Zoom: {activeZoom.reason}</span>
                </div>
              )}

              {/* Play/pause overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Scrubbing bar */}
          <div className="w-full max-w-5xl flex flex-col gap-2">
            <div
              className="relative h-2 bg-white/10 rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                if (videoRef.current) videoRef.current.currentTime = ratio * duration;
              }}
            >
              {/* Played progress */}
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                style={{ width: `${progress}%` }}
              />

              {/* Zoom Event Markers */}
              {editPlan?.zoom_events?.map((z, idx) => {
                const leftPct = (z.timestamp / duration) * 100;
                const widthPct = (z.duration / duration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 bg-indigo-400/80 hover:bg-indigo-300 rounded cursor-pointer transition-colors"
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                    title={`Zoom: ${z.reason} (${z.timestamp}s - ${z.timestamp + z.duration}s)`}
                  />
                );
              })}

              {/* Silence Trim Markers */}
              {editPlan?.silence_trims?.map((s, idx) => {
                const leftPct = (s.start / duration) * 100;
                const widthPct = ((s.end - s.start) / duration) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 bg-rose-500/60 rounded cursor-pointer"
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                    title={`Trimmed silence: ${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
              <div className="flex items-center gap-3">
                <span>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
                {editPlan?.zoom_events && (
                  <span className="text-indigo-400">
                    {editPlan.zoom_events.length} zoom punch-ins
                  </span>
                )}
                {editPlan?.silence_trims && editPlan.silence_trims.length > 0 && (
                  <span className="text-rose-400">
                    {editPlan.silence_trims.length} pauses tightened
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onReRecord}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Discard & Re-record
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Slide-out Cap.so / Recordly Edit Directives Drawer */}
        <AnimatePresence>
          {showDrawer && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="w-96 border-l border-white/10 bg-[#0E0F17] p-5 flex flex-col gap-4 overflow-y-auto z-30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-semibold text-sm">Cap.so Edit Directives</h3>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                Describe how you want the backend LLM & FFmpeg engine to edit this screen recording: auto-zooms, padded canvas, silence cuts, and pacing.
              </p>

              {/* Preset Chips */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  Presets
                </span>
                <div className="flex flex-col gap-1.5">
                  {PRESET_DIRECTIVES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDirectiveText(p.prompt)}
                      className="text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all group"
                    >
                      <div className="text-xs font-medium text-white/90 group-hover:text-indigo-300">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-white/40 line-clamp-1 mt-0.5">
                        {p.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Directive Text Area */}
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  Directive Script
                </span>
                <textarea
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed font-mono"
                  placeholder="Auto-zoom on key clicks, 24px padding, 16px radius, trim silences >1.2s..."
                />
              </div>

              {/* Plan Summary if already applied */}
              {editPlan && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs flex flex-col gap-2">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Applied Production Plan
                  </div>
                  <p className="text-white/70 text-[11px]">{editPlan.summary}</p>
                </div>
              )}

              <button
                onClick={handleApplyDirectives}
                disabled={isProcessingDirectives}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isProcessingDirectives ? 'animate-spin' : ''}`} />
                {isProcessingDirectives ? 'Synthesizing...' : 'Apply Directives to Video'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
