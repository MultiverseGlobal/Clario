import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Video, Mic, MicOff, VideoOff,
  ArrowLeft, Maximize, Activity,
  MonitorUp, Target, Sparkles, UploadCloud,
  Play, Pause, RotateCcw, Type, Move,
  Layout, Edit3
} from 'lucide-react';

interface RecordingStudioProps {
  onBack: () => void;
  onFinish: (videoBlob?: Blob, editScript?: string, category?: 'sales' | 'content', uploadedFile?: File) => void;
  initialCategory?: 'sales' | 'content';
}

export const PROMPTER_PRESETS = [
  {
    id: 'sales_loom',
    category: 'sales' as const,
    title: 'B2B Loom Pitch',
    text: "• Hey [First Name]! Saw what you're building and wanted to share a quick insight.\n\n" +
      "• Most teams I talk to are frustrated with manual pipeline stagnation.\n\n" +
      "• We engineered an autonomous engine to solve exactly that in 3 clicks.\n\n" +
      "• Here's a live look at how it extracts and verifies target founders...\n\n" +
      "• Would you be open to a 10-minute walkthrough this Thursday?"
  },
  {
    id: 'sales_pain',
    category: 'sales' as const,
    title: 'Pain-Point Pattern Interrupt',
    text: "• Quick question: how much time is your team losing to lead qualification every week?\n\n" +
      "• If you're like most founders, it's 8 to 12 hours of copy-pasting data between tabs.\n\n" +
      "• Let me show you what happens when autonomous AI handles that entire workflow.\n\n" +
      "• Look at this live extraction happening right here in real time...\n\n" +
      "• Hit reply or grab 10 minutes on my calendar below to test it on your lead list."
  },
  {
    id: 'content_viral',
    category: 'content' as const,
    title: 'Viral Social Hook (3 Steps)',
    text: "• STOP SCROLLING. Here is the 1 growth secret nobody is telling you.\n\n" +
      "• 90% of creators do this completely backwards and wonder why their reach died.\n\n" +
      "• Here's the 3-step breakdown you can execute right now.\n\n" +
      "• Step 1: Hook them in 2 seconds. Step 2: Strip all filler. Step 3: Fast b-roll cuts.\n\n" +
      "• Save this video and comment 'ACCESS' for the complete template."
  },
  {
    id: 'content_demo',
    category: 'content' as const,
    title: 'Feature Launch Teaser',
    text: "• We just shipped the feature our community has been requesting for 6 months.\n\n" +
      "• Instead of editing for hours, you drop your raw clip right here.\n\n" +
      "• The engine automatically isolates vocals, detects scenes, and cuts out dead air.\n\n" +
      "• Watch the export finish in under 10 seconds.\n\n" +
      "• Link in bio to try it free today."
  }
];

const PURPOSE_CONFIG = {
  sales: {
    label: "Sales & Outreach Pitch",
    badge: "Outbound / Loom",
    directive: "Auto-zoom smoothly on clicks & active fields, 24px padded studio canvas with rounded 16px corners, dark mesh backdrop, cut silences >1.2s, 1.25x punch-in on value demo. High conversion B2B outbound framing.",
    teleprompter: PROMPTER_PRESETS[0].text,
  },
  content: {
    label: "Social & Viral Content",
    badge: "Shorts / Reels / YouTube",
    directive: "Fast snappy zoom cuts on key beats, eliminate pauses >0.8s, 9:16 vertical punch-ins, high-contrast framing with caption safe zones. Dynamic dopamine pacing.",
    teleprompter: PROMPTER_PRESETS[2].text,
  }
};

export function RecordingStudio({ onBack, onFinish, initialCategory = 'sales' }: RecordingStudioProps) {
  const screenVideoRef   = useRef<HTMLVideoElement>(null);
  const pipVideoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const compositorRef    = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  
  const [videoPurpose, setVideoPurpose] = useState<'sales' | 'content'>(initialCategory);
  const [scriptMode, setScriptMode] = useState<'edit_script' | 'teleprompter'>('teleprompter');
  const [editDirectiveScript, setEditDirectiveScript] = useState(
    PURPOSE_CONFIG[initialCategory].directive
  );
  const [teleprompterText, setTeleprompterText] = useState(
    PURPOSE_CONFIG[initialCategory].teleprompter
  );

  // Modern Studio Prompter States
  const [prompterLayout, setPrompterLayout] = useState<'hud' | 'sidebar'>('hud');
  const [prompterIsScrolling, setPrompterIsScrolling] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(3);
  const [prompterFontSize, setPrompterFontSize] = useState(22);
  const [prompterOpacity, setPrompterOpacity] = useState(0.85);
  const [prompterEditMode, setPrompterEditMode] = useState(false);

  const prompterHudScrollRef = useRef<HTMLDivElement>(null);
  const prompterSidebarScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll animation loop
  useEffect(() => {
    if (!prompterIsScrolling) return;
    let animFrame: number;
    let lastTime = performance.now();

    const scroll = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const targetRef = prompterLayout === 'hud' ? prompterHudScrollRef : prompterSidebarScrollRef;
      if (targetRef.current) {
        const pixelsPerSec = 16 + prompterSpeed * 10;
        targetRef.current.scrollTop += pixelsPerSec * delta;
        const { scrollTop, scrollHeight, clientHeight } = targetRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 3) {
          setPrompterIsScrolling(false);
          return;
        }
      }
      animFrame = requestAnimationFrame(scroll);
    };

    animFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animFrame);
  }, [prompterIsScrolling, prompterSpeed, prompterLayout]);

  // Spacebar toggle for auto-scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
        if (scriptMode === 'teleprompter') {
          e.preventDefault();
          setPrompterIsScrolling(s => !s);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scriptMode]);

  // Auto-scroll on record start
  useEffect(() => {
    if (isRecording && scriptMode === 'teleprompter') {
      const timer = setTimeout(() => {
        setPrompterIsScrolling(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isRecording, scriptMode]);

  const handleResetPrompter = () => {
    setPrompterIsScrolling(false);
    if (prompterHudScrollRef.current) prompterHudScrollRef.current.scrollTop = 0;
    if (prompterSidebarScrollRef.current) prompterSidebarScrollRef.current.scrollTop = 0;
  };

  const wordCount = teleprompterText.trim() ? teleprompterText.trim().split(/\s+/).length : 0;
  const estSeconds = Math.ceil((wordCount / 130) * 60);
  const readTimeDisplay = estSeconds > 60 ? `${Math.floor(estSeconds / 60)}m ${estSeconds % 60}s` : `${estSeconds}s`;

  const handleSelectPurpose = (next: 'sales' | 'content') => {
    setVideoPurpose(next);
    setEditDirectiveScript(PURPOSE_CONFIG[next].directive);
    setTeleprompterText(PURPOSE_CONFIG[next].teleprompter);
  };

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFinish(file, editDirectiveScript, videoPurpose, file);
    }
  };

  const isReady = !!screenStream;

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Webcam (PIP) â€” request on mount
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(s => {
        setCameraStream(s);
        if (pipVideoRef.current) pipVideoRef.current.srcObject = s;
      })
      .catch(err => console.warn('Camera access denied', err));
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync PIP video element when stream changes
  useEffect(() => {
    if (cameraStream && pipVideoRef.current) pipVideoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  // Bind screen stream to canvas + listen for "Stop sharing" from browser bar
  useEffect(() => {
    if (!screenStream) return;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = screenStream;
    const track = screenStream.getVideoTracks()[0];
    const onEnded = () => {
      setScreenStream(null);
      setIsRecording(false);
      setRecordingTime(0);
      mediaRecorderRef.current?.stop();
    };
    track?.addEventListener('ended', onEnded);
    return () => track?.removeEventListener('ended', onEnded);
  }, [screenStream]);

  // Cleanup all streams on unmount
  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach(t => t.stop());
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShareScreen() {
    setScreenError(null);
    try {
      const s = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      setScreenStream(s);
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        setScreenError('Screen sharing failed - please try again.');
      }
    }
  }

  function handleToggleRecord() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (compositorRef.current !== null) {
        clearTimeout(compositorRef.current);
        compositorRef.current = null;
      }
      setIsRecording(false);
    } else {
      if (!screenStream) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match canvas resolution to screen stream track settings
      const screenTrack = screenStream.getVideoTracks()[0];
      const settings = screenTrack.getSettings();
      canvas.width  = settings.width  || 1920;
      canvas.height = settings.height || 1080;

      const ctx = canvas.getContext('2d')!;
      const screenVid = screenVideoRef.current!;
      const pipVid    = pipVideoRef.current!;

      // Canvas compositor loop - runs every animation frame
      const drawFrame = () => {
        ctx.drawImage(screenVid, 0, 0, canvas.width, canvas.height);

        if (camOn && cameraStream) {
          const pipW = Math.round(canvas.width * 0.18);
          const pipH = Math.round(pipW * 0.5625); // 16:9
          const pipX = canvas.width  - pipW - 24;
          const pipY = canvas.height - pipH - 24;

          // Rounded clip path for PIP
          ctx.save();
          const radius = 14;
          ctx.beginPath();
          ctx.moveTo(pipX + radius, pipY);
          ctx.lineTo(pipX + pipW - radius, pipY);
          ctx.quadraticCurveTo(pipX + pipW, pipY, pipX + pipW, pipY + radius);
          ctx.lineTo(pipX + pipW, pipY + pipH - radius);
          ctx.quadraticCurveTo(pipX + pipW, pipY + pipH, pipX + pipW - radius, pipY + pipH);
          ctx.lineTo(pipX + radius, pipY + pipH);
          ctx.quadraticCurveTo(pipX, pipY + pipH, pipX, pipY + pipH - radius);
          ctx.lineTo(pipX, pipY + radius);
          ctx.quadraticCurveTo(pipX, pipY, pipX + radius, pipY);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(pipVid, pipX, pipY, pipW, pipH);
          ctx.restore();
        }

        compositorRef.current = window.setTimeout(drawFrame, 1000 / 30);
      };
      compositorRef.current = window.setTimeout(drawFrame, 1000 / 30);

      // Capture the composed canvas as a stream at 30fps
      const canvasStream = canvas.captureStream(30);

      // Attach audio from microphone
      if (micOn) {
        cameraStream?.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      }

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      const mr = new MediaRecorder(canvasStream, { mimeType });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (compositorRef.current !== null) {
          clearTimeout(compositorRef.current);
          compositorRef.current = null;
        }
        onFinish(new Blob(chunksRef.current, { type: 'video/webm' }), editDirectiveScript, videoPurpose);
      };
      mr.start(500);
      mediaRecorderRef.current = mr;

      setIsRecording(true);
      setRecordingTime(0);
    }
  }

  function toggleMic() {
    cameraStream?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(v => !v);
  }
  function toggleCam() {
    cameraStream?.getVideoTracks().forEach(t => { t.enabled = !camOn; });
    setCamOn(v => !v);
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[40] bg-black text-white flex flex-col font-sans overflow-hidden clario-mesh-gradient pt-20">

      {/* Hidden compositor canvas - not displayed, used only for MediaRecorder capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input for uploading video footage */}
      <input ref={uploadInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUploadFile} />

      {/* Top Status Bar (positioned below FloatingNav) */}
      <div className="flex items-center justify-between px-8 py-2.5 w-full z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/70">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">AI Director Studio</span>
          </div>
          <span className="text-[11px] text-white/40 font-mono hidden sm:inline">1080p · Auto-Cut Pre-Editor Ready</span>
        </div>

        {isRecording && (
          <div className="flex items-center gap-3 bg-red-500/15 border border-red-500/30 backdrop-blur-md px-5 py-1.5 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-red-400 font-mono text-xs tracking-widest font-bold">{formatTime(recordingTime)}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white transition-all cursor-pointer shadow-sm"
            title="Upload pre-recorded footage to auto-cut cinematic scenes"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Footage</span>
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Studio</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative flex flex-col lg:flex-row items-center justify-center p-6 lg:p-8 pt-0 lg:pt-0 gap-6 lg:gap-8 z-10 pb-28 overflow-y-auto lg:overflow-hidden">

        {/* Screen Canvas */}
        <div ref={(el) => { if (el) (window as any).clarioStudioContainer = el; }} className="relative w-full max-w-5xl aspect-video rounded-[24px] shadow-2xl clario-frame-card overflow-hidden ring-1 ring-white/10 bg-black shrink-0">

          {/* Pre-flight overlay */}
          <AnimatePresence>
            {!isReady && (
              <motion.div
                key="preflight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm z-30 p-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <MonitorUp className="w-8 h-8 text-white/60" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Record Screen or Ingest Footage</h3>
                  <p className="text-white/50 text-sm max-w-sm leading-relaxed">
                    Choose a screen or window to record with AI Director framing, or upload existing footage to auto-cut cinematic scenes and strip captions.
                  </p>
                  {screenError && <p className="text-red-400 text-xs mt-3">{screenError}</p>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleShareScreen}
                    className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <MonitorUp className="w-4 h-4" />
                    Share Screen to Record
                  </button>
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs active:scale-95 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-400" />
                    Upload Video File
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live screen stream */}
          <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black" />

          {/* Floating Camera-Line Teleprompter HUD (Aligned with Webcam for Eye Contact) */}
          <AnimatePresence>
            {scriptMode === 'teleprompter' && prompterLayout === 'hud' && (
              <motion.div
                drag
                dragConstraints={{ left: -220, right: 220, top: 0, bottom: 260 }}
                dragElastic={0.06}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ backgroundColor: `rgba(10, 11, 14, ${prompterOpacity})` }}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[620px] z-30 rounded-2xl border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden select-none"
              >
                {/* HUD Header & Drag Handle */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5 cursor-move">
                  <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-amber-400/80" />
                    <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                      Eye-Line Prompter
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Camera Aligned
                    </span>
                  </div>

                  {/* Prompter Controls in HUD */}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setPrompterIsScrolling(!prompterIsScrolling)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        prompterIsScrolling
                          ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                          : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                      title="Toggle Auto-Scroll (Spacebar)"
                    >
                      {prompterIsScrolling ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{prompterIsScrolling ? 'Pause' : 'Auto-Scroll'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrompterSpeed(s => s >= 10 ? 1 : s + 1)}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors cursor-pointer"
                      title="Scroll Speed (1-10)"
                    >
                      {prompterSpeed}x
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrompterFontSize(f => f >= 30 ? 18 : f + 4)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors cursor-pointer"
                      title={`Font Size: ${prompterFontSize}px`}
                    >
                      <Type className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetPrompter}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors cursor-pointer"
                      title="Restart from Beginning"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrompterOpacity(o => o <= 0.6 ? 0.95 : Number((o - 0.15).toFixed(2)))}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono bg-white/10 hover:bg-white/20 text-white/70 border border-white/10 cursor-pointer"
                      title="Adjust glass opacity to see screen underneath"
                    >
                      {Math.round(prompterOpacity * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrompterLayout('sidebar')}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 cursor-pointer"
                      title="Dock to Sidebar"
                    >
                      <Layout className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* HUD Focal Reading Window */}
                <div className="relative h-44 overflow-hidden">
                  {/* Glowing Focus Eye-Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-amber-500/10 border-y border-amber-500/25 pointer-events-none z-10 flex items-center justify-between px-4">
                    <span className="text-[9px] font-mono text-amber-400/80 font-bold uppercase tracking-widest">Natural Eye-Contact Zone</span>
                    <span className="text-[9px] font-mono text-white/40">Look here</span>
                  </div>

                  {/* Scrolling Viewport */}
                  <div
                    ref={prompterHudScrollRef}
                    className="w-full h-full overflow-y-auto px-8 py-14 scroll-smooth text-center"
                    style={{
                      fontSize: `${prompterFontSize}px`,
                      lineHeight: 1.7,
                      fontWeight: 600,
                      color: '#FFFFFF',
                      textShadow: '0 2px 12px rgba(0,0,0,0.9)'
                    }}
                  >
                    {teleprompterText.split('\n\n').map((para, i) => (
                      <p key={i} className="mb-8 opacity-90 hover:opacity-100 transition-opacity">
                        {para}
                      </p>
                    ))}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
                </div>

                {/* HUD Footer Info */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-black/50 border-t border-white/10 text-[10px] font-mono text-white/60">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>·</span>
                    <span className="text-amber-300 font-semibold">~{readTimeDisplay} speaking time</span>
                  </div>
                  <span className="text-white/40">Press Spacebar to Play/Pause</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Draggable PIP webcam */}
          <motion.div
            className="absolute bottom-8 left-8 w-52 aspect-video rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-20 cursor-move"
            whileHover={{ scale: 1.02 }}
            drag
            dragConstraints={{ left: 0, right: 760, top: 0, bottom: 380 }}
            dragElastic={0.08}
          >
            {cameraStream && camOn ? (
              <video ref={pipVideoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
          </motion.div>
        </div>

        {/* AI Production Directive & Script Sidebar (Cap.so / Recordly Style) */}
        <div className="w-full lg:w-[380px] h-[360px] lg:h-full lg:max-h-[600px] bg-white/5 backdrop-blur-md rounded-[24px] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden group shrink-0">
          <div className="p-4 pb-3 border-b border-white/10 text-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isRecording ? 'text-red-400' : 'text-accent'}`} />
                <span className="text-xs font-mono uppercase tracking-widest font-semibold">Video Director</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 font-semibold">
                Cap.so AI
              </span>
            </div>

            {/* Target Purpose Switcher: Sales vs Content */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/10 border border-white/10 text-xs mb-3">
              <button
                type="button"
                onClick={() => handleSelectPurpose('sales')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  videoPurpose === 'sales'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-amber-300" />
                <span>Sales Pitch</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPurpose('content')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  videoPurpose === 'content'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                <span>Social Content</span>
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setScriptMode('edit_script')}
                className={`py-1.5 rounded-lg font-medium transition-all ${scriptMode === 'edit_script' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
              >
                Production Directive
              </button>
              <button
                onClick={() => setScriptMode('teleprompter')}
                className={`py-1.5 rounded-lg font-medium transition-all ${scriptMode === 'teleprompter' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
              >
                Teleprompter
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 relative flex flex-col p-4 overflow-hidden">
            {scriptMode === 'edit_script' ? (
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Tell the LLM backend how you want the screen recording auto-edited, zoomed, and framed (like Cap.so):
                </p>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setEditDirectiveScript("Auto-zoom smoothly on clicks & active fields, 24px padded studio canvas with rounded 16px corners, dark mesh backdrop, cut silences >1.2s, 1.25x punch-in on value demo.")}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors"
                  >
                    ⚡ Studio Polish
                  </button>
                  <button
                    onClick={() => setEditDirectiveScript("Punch-in 1.35x on core site problem, rapid pacing under 45s for high conversion cold outreach email, smooth camera pan.")}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors"
                  >
                    🎯 Cold Outreach
                  </button>
                  <button
                    onClick={() => setEditDirectiveScript("Dynamic cursor tracking, spotlight zoom on UI metrics, pop-up annotation callouts, branded outro card.")}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors"
                  >
                    🚀 Launch Demo
                  </button>
                </div>

                <textarea
                  className="flex-1 min-h-[140px] bg-black/30 border border-white/10 rounded-xl text-white/90 text-sm leading-relaxed resize-none p-3 outline-none placeholder:text-white/30 focus:border-accent/50 transition-colors font-mono"
                  value={editDirectiveScript}
                  onChange={e => setEditDirectiveScript(e.target.value)}
                  placeholder="e.g. Auto-zoom on clicks, 24px padded canvas with rounded 16px corners..."
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="flex-1 relative flex flex-col overflow-hidden">
                {/* Prompter Sub-header & Layout Selector */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrompterEditMode(false)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        !prompterEditMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      <span>Prompter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompterEditMode(true)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        prompterEditMode ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* HUD vs Sidebar Dock Button */}
                  <button
                    type="button"
                    onClick={() => setPrompterLayout(l => l === 'hud' ? 'sidebar' : 'hud')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-medium flex items-center gap-1 border transition-all cursor-pointer ${
                      prompterLayout === 'hud'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                    title={prompterLayout === 'hud' ? 'Switch to in-sidebar teleprompter' : 'Pop out camera-line floating HUD'}
                  >
                    <Layout className="w-3 h-3" />
                    <span>{prompterLayout === 'hud' ? 'HUD View' : 'Docked'}</span>
                  </button>
                </div>

                {/* Script Presets Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 shrink-0 scrollbar-none">
                  {PROMPTER_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setTeleprompterText(preset.text);
                        setVideoPurpose(preset.category);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                {prompterEditMode ? (
                  <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <textarea
                      className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl text-white/90 text-sm leading-relaxed resize-none p-3 outline-none placeholder:text-white/30 focus:border-amber-400/50 transition-colors font-sans"
                      value={teleprompterText}
                      onChange={e => setTeleprompterText(e.target.value)}
                      placeholder="Write your talking points or script here..."
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-white/50 px-1">
                      <span>{wordCount} words</span>
                      <span className="text-amber-300">~{readTimeDisplay} read time</span>
                    </div>
                  </div>
                ) : prompterLayout === 'hud' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                      <Move className="w-5 h-5 text-amber-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">Eye-Line HUD Active</h4>
                    <p className="text-xs text-white/50 mb-4 max-w-[240px] leading-relaxed">
                      Teleprompter is floating directly beneath your camera lens for natural eye contact while recording.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrompterIsScrolling(!prompterIsScrolling)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prompterIsScrolling
                            ? 'bg-amber-400 text-black shadow-lg'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        {prompterIsScrolling ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{prompterIsScrolling ? 'Pause Scroll' : 'Start Auto-Scroll'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrompterLayout('sidebar')}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-colors cursor-pointer"
                      >
                        Dock Here
                      </button>
                    </div>
                  </div>
                ) : (
                  /* In-Sidebar Prompter View */
                  <div className="flex-1 relative flex flex-col overflow-hidden bg-black/40 rounded-xl border border-white/10">
                    {/* Control ribbon */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPrompterIsScrolling(!prompterIsScrolling)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          prompterIsScrolling ? 'bg-amber-400 text-black' : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        {prompterIsScrolling ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{prompterIsScrolling ? 'Pause' : 'Scroll'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrompterSpeed(s => s >= 10 ? 1 : s + 1)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/80"
                          title="Speed"
                        >
                          {prompterSpeed}x
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrompterFontSize(f => f >= 28 ? 16 : f + 3)}
                          className="p-1 rounded bg-white/10 text-white/80"
                          title="Font Size"
                        >
                          <Type className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleResetPrompter}
                          className="p-1 rounded bg-white/10 text-white/80"
                          title="Restart"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Scrolling area */}
                    <div className="relative flex-1 overflow-hidden">
                      <div className="absolute top-1/2 left-0 right-0 h-8 -translate-y-1/2 bg-amber-500/10 border-y border-amber-500/20 pointer-events-none z-10" />
                      <div
                        ref={prompterSidebarScrollRef}
                        className="w-full h-full overflow-y-auto px-4 py-10 scroll-smooth"
                        style={{
                          fontSize: `${prompterFontSize - 2}px`,
                          lineHeight: 1.6,
                          color: '#FFFFFF'
                        }}
                      >
                        {teleprompterText.split('\n\n').map((para, i) => (
                          <p key={i} className="mb-5 opacity-90 hover:opacity-100 transition-opacity">
                            {para}
                          </p>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                    </div>

                    <div className="flex items-center justify-between px-3 py-1 border-t border-white/10 text-[10px] font-mono text-white/50 shrink-0">
                      <span>{wordCount} words</span>
                      <span className="text-amber-300">~{readTimeDisplay}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-full px-8 py-4 flex items-center gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-50">
        <button onClick={toggleMic} title={micOn ? 'Mute mic' : 'Unmute mic'} className={`p-3 rounded-full hover:bg-white/10 transition-colors ${micOn ? 'text-white/70' : 'text-red-400'}`}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button onClick={toggleCam} title={camOn ? 'Hide camera' : 'Show camera'} className={`p-3 rounded-full hover:bg-white/10 transition-colors ${camOn ? 'text-white/70' : 'text-red-400'}`}>
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <div className="w-px h-8 bg-white/10" />

        <button
          onClick={handleToggleRecord}
          disabled={!isReady}
          title={isRecording ? 'Stop recording' : 'Start recording'}
          className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-all group bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRecording
            ? <div className="w-5 h-5 rounded-sm bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            : <div className="w-10 h-10 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] group-hover:scale-95 transition-transform" />
          }
        </button>

        <div className="w-px h-8 bg-white/10" />

        <button
          onClick={handleShareScreen}
          title={isReady ? 'Change screen' : 'Share screen'}
          className={`p-3 rounded-full hover:bg-white/10 transition-colors ${isReady ? 'text-green-400' : 'text-white/70'}`}
        >
          <MonitorUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => uploadInputRef.current?.click()}
          title="Upload video footage to auto-cut scenes"
          className="p-3 rounded-full hover:bg-white/10 text-indigo-300 transition-colors"
        >
          <UploadCloud className="w-5 h-5" />
        </button>
        <button
          className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
          onClick={() => {
            const el = (window as any).clarioStudioContainer;
            if (el && el.requestFullscreen) el.requestFullscreen();
            else if (screenVideoRef.current?.requestFullscreen) screenVideoRef.current.requestFullscreen();
          }}
          title="Fullscreen"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
