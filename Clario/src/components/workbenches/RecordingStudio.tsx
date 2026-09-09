import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Mic, ArrowLeft, Maximize, Target, Activity, Settings2, PlaySquare } from 'lucide-react';

interface RecordingStudioProps {
  onBack: () => void;
  onFinish: (videoBlob?: Blob) => void;
}

const TELEPROMPTER_SCRIPT = [
  { text: "Hey! Thanks for taking the time to review this.", type: "normal" },
  { text: "I know you've been struggling with pipeline stagnation recently.", type: "pain", cue: "Zoom in slightly to build empathy" },
  { text: "What we've built here is specifically designed to eliminate that friction.", type: "normal", cue: "Pan to product demo on screen" },
  { text: "It's fully automated and integrates directly with your existing stack.", type: "feature" },
  { text: "Let's walk through how this completely changes your outreach.", type: "normal", cue: "Smile and transition to screen share" },
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
          
          // Advance teleprompter every 4 seconds for prototype
          if (nextT % 4 === 0 && currentLineIndex < TELEPROMPTER_SCRIPT.length - 1) {
            const nextLine = currentLineIndex + 1;
            setCurrentLineIndex(nextLine);
            if (TELEPROMPTER_SCRIPT[nextLine].cue) {
              setActiveCue(TELEPROMPTER_SCRIPT[nextLine].cue!);
              // Hide cue after 3 seconds
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
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <button onClick={onBack} className="pds-btn-ghost text-white hover:bg-white/10 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500 font-mono text-sm animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {formatTime(recordingTime)}
            </div>
          )}
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Video Feed */}
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover transform -scale-x-100" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white/50 gap-4">
            <Camera className="w-12 h-12" />
            <p className="font-mono text-sm uppercase tracking-widest">Camera Unavailable</p>
          </div>
        )}

        {/* AI Director Overlays */}
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/10 m-8 rounded-3xl overflow-hidden flex flex-col">
          {/* Rule of thirds grid lines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>

          {/* AI Cue Popup */}
          <AnimatePresence>
            {activeCue && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md"
              >
                <Target className="w-5 h-5 animate-pulse" />
                {activeCue}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Teleprompter Widget */}
        <div className="absolute right-12 top-24 bottom-32 w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white/80">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono uppercase tracking-widest">AI Teleprompter</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1 bg-white/10 rounded-full overflow-hidden">
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
                    <p className={`text-lg leading-relaxed ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {line.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="h-28 bg-black flex items-center justify-center gap-8 px-12 z-10 border-t border-white/10">
        <div className="flex-1 flex justify-start gap-4 text-white/50">
          <button className="p-3 rounded-xl hover:bg-white/10 transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-xl hover:bg-white/10 transition-colors">
            <Video className="w-5 h-5" />
          </button>
        </div>
        
        <button 
          onClick={handleToggleRecord}
          className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white/20 hover:border-white/40 transition-all group"
        >
          {isRecording ? (
            <div className="w-6 h-6 rounded-sm bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] group-hover:scale-95 transition-transform" />
          )}
        </button>

        <div className="flex-1 flex justify-end">
          <button className="p-3 rounded-xl hover:bg-white/10 transition-colors text-white/50">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
