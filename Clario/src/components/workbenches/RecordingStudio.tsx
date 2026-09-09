import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Mic, ArrowLeft, Maximize, Target, Activity, Settings2, MonitorUp } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeCue, setActiveCue] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  // Fake recording timer & teleprompter advance
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => {
          const nextT = t + 1;
          
          if (nextT % 4 === 0 && currentLineIndex < TELEPROMPTER_SCRIPT.length - 1) {
            const nextLine = currentLineIndex + 1;
            setCurrentLineIndex(nextLine);
            if (TELEPROMPTER_SCRIPT[nextLine].cue) {
              setActiveCue(TELEPROMPTER_SCRIPT[nextLine].cue!);
              setTimeout(() => setActiveCue(null), 3000);
            }
          }
          
          return nextT;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, currentLineIndex]);

  // Request camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.warn("Camera access denied or not available", err);
      }
    }
    setupCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      onFinish(); // Prototype: finish immediately on stop
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setCurrentLineIndex(0);
      setActiveCue(TELEPROMPTER_SCRIPT[0].cue || null);
      if (TELEPROMPTER_SCRIPT[0].cue) {
         setTimeout(() => setActiveCue(null), 3000);
      }
    }
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
        
        <div className="flex items-center gap-4">
          <button className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md">
            <Settings2 className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>

      {/* Main Studio Area (Cap.so layout) */}
      <div className="flex-1 relative flex items-center justify-center p-12 gap-12 z-10">
        
        {/* Screen Canvas wrapper */}
        <div className="relative w-full max-w-5xl aspect-video rounded-[24px] shadow-2xl clario-frame-card overflow-hidden ring-1 ring-white/10 bg-black/40 backdrop-blur-xl">
          
          {/* Simulated Screen Content */}
          <div className="absolute inset-0 bg-surface-2 dark:bg-[#0E1018] flex flex-col">
            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <div className="mx-auto h-5 w-48 bg-white/5 rounded-md" />
            </div>
            <div className="flex-1 flex items-center justify-center text-white/20">
              <div className="flex flex-col items-center gap-4">
                <MonitorUp className="w-16 h-16 opacity-50" />
                <p className="font-mono text-sm uppercase tracking-widest">Screen Sharing Active</p>
              </div>
            </div>
          </div>

          {/* AI Cue Overlays floating on screen */}
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

          {/* Picture-in-Picture Camera */}
          <motion.div 
            className="absolute bottom-8 left-8 w-64 aspect-video rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-20 group cursor-move"
            whileHover={{ scale: 1.02 }}
            drag
            dragConstraints={{ left: 0, right: 800, top: 0, bottom: 400 }}
            dragElastic={0.1}
          >
            {stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              <div className="w-full h-full bg-black/80 flex items-center justify-center backdrop-blur-md">
                <Camera className="w-8 h-8 text-white/30" />
              </div>
            )}
            {/* Inner highlight rim for PIP */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
          </motion.div>
        </div>

        {/* Teleprompter Sidebar */}
        <div className="w-[340px] h-full max-h-[600px] clario-glass-panel rounded-[24px] flex flex-col p-6 shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono uppercase tracking-widest font-semibold">Teleprompter</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="w-full bg-accent"
                animate={{ height: `${((currentLineIndex + 1) / TELEPROMPTER_SCRIPT.length) * 100}%` }}
              />
            </div>
            
            <div className="pl-6 flex flex-col gap-6">
              {TELEPROMPTER_SCRIPT.map((line, i) => {
                const isActive = i === currentLineIndex;
                const isPast = i < currentLineIndex;
                
                return (
                  <motion.div 
                    key={i}
                    animate={{ 
                      opacity: isActive ? 1 : isPast ? 0.3 : 0.5,
                      scale: isActive ? 1.05 : 1,
                      x: isActive ? 0 : -5
                    }}
                    className={`transition-colors duration-300 ${
                      isActive ? (line.type === 'pain' ? 'text-red-400' : line.type === 'feature' ? 'text-blue-400' : 'text-white') 
                      : 'text-white/60'
                    }`}
                  >
                    <p className={`text-xl leading-relaxed ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {line.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 clario-glass-capsule rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl z-20">
        <div className="flex items-center gap-4 text-white/70">
          <button className="p-3 rounded-full hover:bg-white/10 hover:text-white transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/10 hover:text-white transition-colors">
            <Video className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-px h-8 bg-white/10" />
        
        <button 
          onClick={handleToggleRecord}
          className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-all group bg-white/5"
        >
          {isRecording ? (
            <div className="w-5 h-5 rounded-sm bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] group-hover:scale-95 transition-transform" />
          )}
        </button>

        <div className="w-px h-8 bg-white/10" />

        <div className="flex items-center gap-4 text-white/70">
          <button className="p-3 rounded-full hover:bg-white/10 hover:text-white transition-colors">
            <MonitorUp className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/10 hover:text-white transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
