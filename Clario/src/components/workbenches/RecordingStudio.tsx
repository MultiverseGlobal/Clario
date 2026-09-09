import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Video, Mic, MicOff, VideoOff,
  ArrowLeft, Maximize, Target, Activity,
  Settings2, MonitorUp,
} from 'lucide-react';

interface RecordingStudioProps {
  onBack: () => void;
  onFinish: (videoBlob?: Blob) => void;
}

const TELEPROMPTER_SCRIPT = [
  { text: "Hey! Thanks for taking the time to review this.", type: "normal" },
  { text: "I know you've been struggling with pipeline stagnation recently.", type: "pain", cue: "Zoom in PIP slightly" },
  { text: "What we've built here is specifically designed to eliminate that friction.", type: "normal", cue: "Highlight screen feature" },
  { text: "It's fully automated and integrates directly with your existing stack.", type: "feature" },
  { text: "Let's walk through how this completely changes your outreach.", type: "normal", cue: "Expand PIP to full screen" },
];

export function RecordingStudio({ onBack, onFinish }: RecordingStudioProps) {
  const screenVideoRef   = useRef<HTMLVideoElement>(null);
  const pipVideoRef      = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeCue, setActiveCue]         = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  const isReady = !!screenStream;

  // Recording timer & teleprompter advance
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => {
          const next = t + 1;
          if (next % 4 === 0 && currentLineIndex < TELEPROMPTER_SCRIPT.length - 1) {
            const nextLine = currentLineIndex + 1;
            setCurrentLineIndex(nextLine);
            const cue = TELEPROMPTER_SCRIPT[nextLine].cue;
            if (cue) { setActiveCue(cue); setTimeout(() => setActiveCue(null), 3000); }
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, currentLineIndex]);

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
      setCurrentLineIndex(0);
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
        setScreenError('Screen sharing failed â€” please try again.');
      }
    }
  }

  function handleToggleRecord() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!screenStream) return;
      const combined = new MediaStream();
      screenStream.getVideoTracks().forEach(t => combined.addTrack(t));
      if (micOn) cameraStream?.getAudioTracks().forEach(t => combined.addTrack(t));

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      const mr = new MediaRecorder(combined, { mimeType });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => onFinish(new Blob(chunksRef.current, { type: 'video/webm' }));
      mr.start(500);
      mediaRecorderRef.current = mr;

      setIsRecording(true);
      setRecordingTime(0);
      setCurrentLineIndex(0);
      const cue = TELEPROMPTER_SCRIPT[0].cue;
      if (cue) { setActiveCue(cue); setTimeout(() => setActiveCue(null), 3000); }
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
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans overflow-hidden clario-mesh-gradient">

      {/* Top Bar */}
      <div className="flex items-center justify-between p-6 w-full z-20">
        <button onClick={onBack} className="pds-btn-ghost bg-white/5 border-white/10 text-white hover:bg-white/10 flex items-center gap-2 rounded-full px-5 py-2.5 backdrop-blur-md">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Exit Studio</span>
        </button>

        {isRecording && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-500/10 border border-red-500/20 backdrop-blur-md px-4 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
            <span className="text-red-400 font-mono text-sm tracking-widest">{formatTime(recordingTime)}</span>
          </div>
        )}

        <button className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md">
          <Settings2 className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative flex items-center justify-center p-12 gap-12 z-10">

        {/* Screen Canvas */}
        <div className="relative w-full max-w-5xl aspect-video rounded-[24px] shadow-2xl clario-frame-card overflow-hidden ring-1 ring-white/10 bg-black">

          {/* Pre-flight overlay */}
          <AnimatePresence>
            {!isReady && (
              <motion.div
                key="preflight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm z-30"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <MonitorUp className="w-10 h-10 text-white/50" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Share your screen to begin</h3>
                  <p className="text-white/50 text-sm max-w-xs leading-relaxed">
                    Choose the window or tab you want to record.<br />Your webcam appears as a draggable PIP overlay.
                  </p>
                  {screenError && <p className="text-red-400 text-xs mt-3">{screenError}</p>}
                </div>
                <button
                  onClick={handleShareScreen}
                  className="px-7 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2"
                >
                  <MonitorUp className="w-4 h-4" />
                  Share Screen
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live screen stream */}
          <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black" />

          {/* AI cue overlay */}
          <AnimatePresence>
            {activeCue && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 clario-glass-capsule px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 z-30"
              >
                <Target className="w-5 h-5 text-accent animate-pulse" />
                <span className="text-white">{activeCue}</span>
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

        {/* Teleprompter Sidebar */}
        <div className="w-[340px] h-full max-h-[600px] clario-glass-panel rounded-[24px] flex flex-col p-6 shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10 text-white">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono uppercase tracking-widest font-semibold">Teleprompter</span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="w-full bg-accent"
                animate={{ height: `${((currentLineIndex + 1) / TELEPROMPTER_SCRIPT.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 80 }}
              />
            </div>
            <div className="pl-6 flex flex-col gap-6">
              {TELEPROMPTER_SCRIPT.map((line, i) => {
                const isActive = i === currentLineIndex;
                const isPast   = i < currentLineIndex;
                return (
                  <motion.div
                    key={i}
                    animate={{ opacity: isActive ? 1 : isPast ? 0.3 : 0.5, scale: isActive ? 1.04 : 1, x: isActive ? 0 : -4 }}
                    className={`transition-colors duration-300 ${
                      isActive
                        ? line.type === 'pain'    ? 'text-red-400'
                        : line.type === 'feature' ? 'text-blue-400'
                        :                           'text-white'
                        : 'text-white/60'
                    }`}
                  >
                    <p className={`text-xl leading-relaxed ${isActive ? 'font-bold' : 'font-medium'}`}>{line.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 clario-glass-capsule rounded-full px-8 py-4 flex items-center gap-6 shadow-2xl z-20">
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
          className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
          onClick={() => screenVideoRef.current?.requestFullscreen?.()}
          title="Fullscreen"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
