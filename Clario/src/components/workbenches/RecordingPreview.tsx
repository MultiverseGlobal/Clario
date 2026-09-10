import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, Save, Play, Pause, ArrowLeft, Wand2 } from 'lucide-react';

interface RecordingPreviewProps {
  blob: Blob;
  projectName?: string;
  onReRecord: () => void;
  onBack: () => void;
  onSave?: (blob: Blob) => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function RecordingPreview({ blob, projectName, onReRecord, onBack, onSave }: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl] = useState(() => URL.createObjectURL(blob));
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [edits, setEdits] = useState<{ time: number; label: string }[]>([]);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const fileSizeMb = (blob.size / 1024 / 1024).toFixed(1);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
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

  function handleAIPolish() {
    setIsPolishing(true);
    setTimeout(() => {
      setEdits([
        { time: duration * 0.1, label: 'Auto-Zoom Applied' },
        { time: duration * 0.4, label: 'Silence Trimmed' },
        { time: duration * 0.8, label: 'Dynamic BG Inserted' }
      ]);
      setIsPolishing(false);
    }, 2000);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans overflow-hidden clario-mesh-gradient">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {/* File metadata */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-white/40 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            {duration > 0 && <span>{formatDuration(duration)}</span>}
            {duration > 0 && <span className="text-white/20">·</span>}
            <span>{fileSizeMb} MB</span>
            <span className="text-white/20">·</span>
            <span>WebM</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onReRecord}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <RotateCcw className="w-4 h-4" />
            Re-record
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-sm font-semibold hover:bg-white/15 transition-colors backdrop-blur-md"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          <button
            onClick={handleAIPolish}
            disabled={isPolishing || edits.length > 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors backdrop-blur-md
              ${edits.length > 0 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 cursor-default' : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'}
              ${isPolishing ? 'opacity-50 cursor-wait' : ''}`}
          >
            <Wand2 className={`w-4 h-4 ${isPolishing ? 'animate-spin' : ''}`} />
            {isPolishing ? 'Analyzing...' : edits.length > 0 ? 'AI Polished ✨' : 'Apply AI Polish'}
          </button>

          {onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved ✓' : 'Save to Project'}
            </button>
          )}
        </div>
      </div>

      {/* Video player */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 pb-8 gap-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl aspect-video rounded-[24px] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10 clario-frame-card bg-black cursor-pointer group"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={objectUrl}
            className="w-full h-full object-contain"
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Play/pause overlay */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              {isPlaying
                ? <Pause className="w-7 h-7 text-white" />
                : <Play  className="w-7 h-7 text-white ml-1" />
              }
            </div>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full max-w-5xl">
          <div
            className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              if (videoRef.current) videoRef.current.currentTime = ratio * duration;
            }}
          >
            <motion.div
              className="h-full bg-white/80 rounded-full origin-left"
              style={{ scaleX: progress / 100, transformOrigin: 'left' }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.1 }}
            />
            {/* EDL Overlays */}
            {edits.map((edit, idx) => {
              const pos = (edit.time / duration) * 100;
              return (
                <div key={idx} className="absolute top-0 bottom-0 w-1 bg-indigo-400 group-hover:w-2 transition-all cursor-pointer" style={{ left: `${pos}%` }}>
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-4 -translate-x-1/2 whitespace-nowrap bg-indigo-600/90 text-[10px] px-2 py-1 rounded">
                    {edit.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono text-white/30">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
