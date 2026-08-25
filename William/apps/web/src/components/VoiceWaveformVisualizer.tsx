import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X } from 'lucide-react';

interface VoiceWaveformVisualizerProps {
  isOpen: boolean;
  isRecording: boolean;
  volume: number;
  frequencies: Uint8Array;
  transcript: string;
  interimTranscript: string;
  error?: string | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export const VoiceWaveformVisualizer: React.FC<VoiceWaveformVisualizerProps> = ({
  isOpen,
  isRecording,
  volume,
  frequencies,
  transcript,
  interimTranscript,
  error,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;

  const currentDisplay = (transcript + ' ' + interimTranscript).trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2200,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: '540px',
          background: 'rgba(20, 20, 25, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '32px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>

          {/* Glowing Voice Orb */}
          <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Dynamic outer pulse ring reacting to volume */}
            <motion.div
              animate={{
                scale: isRecording ? 1 + volume * 1.5 : 1,
                opacity: isRecording ? 0.3 + volume * 0.7 : 0.2
              }}
              transition={{ ease: 'easeOut', duration: 0.1 }}
              style={{
                position: 'absolute',
                inset: '-20px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
                filter: 'blur(8px)'
              }}
            />

            <motion.div
              animate={{
                scale: isRecording ? 1 + volume * 0.4 : 1
              }}
              transition={{ ease: 'easeOut', duration: 0.08 }}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.9))',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              {isRecording ? <Mic size={32} /> : <MicOff size={32} />}
            </motion.div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.4)' }}>
              Voice Mode
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 400, color: 'var(--text-primary)', marginTop: '4px' }}>
              {isRecording ? "Listening to your thoughts..." : "Voice session paused"}
            </h3>
          </div>

          {/* Real-time Frequency Spectrum Waveform */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            height: '60px',
            width: '100%',
            padding: '0 20px'
          }}>
            {Array.from(frequencies).map((val, idx) => {
              // Height proportional to frequency magnitude
              const height = isRecording ? Math.max(4, (val / 255) * 50) : 4;
              return (
                <motion.div
                  key={idx}
                  animate={{ height }}
                  transition={{ duration: 0.05 }}
                  style={{
                    flex: 1,
                    maxWidth: '8px',
                    background: idx % 2 === 0 ? '#a855f7' : '#6366f1',
                    borderRadius: '4px',
                    opacity: isRecording ? 0.8 : 0.3
                  }}
                />
              );
            })}
          </div>

          {/* Live Transcript Box */}
          <div style={{
            width: '100%',
            minHeight: '80px',
            maxHeight: '140px',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px 20px',
            textAlign: 'left'
          }}>
            {currentDisplay ? (
              <p style={{
                fontSize: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                margin: 0
              }}>
                "{currentDisplay}"
              </p>
            ) : (
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                Speak clearly into your microphone...
              </span>
            )}
          </div>

          {error && (
            <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
              ⚠️ {error}
            </span>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={onClose}
              className="zen-btn-outline"
              style={{ flex: 1, padding: '12px 0', borderRadius: '16px', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (currentDisplay.trim()) {
                  onSubmit(currentDisplay.trim());
                  onClose();
                }
              }}
              disabled={!currentDisplay.trim()}
              className="zen-btn"
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: currentDisplay.trim() ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
                opacity: currentDisplay.trim() ? 1 : 0.4
              }}
            >
              <Check size={16} />
              <span>Send to William</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
