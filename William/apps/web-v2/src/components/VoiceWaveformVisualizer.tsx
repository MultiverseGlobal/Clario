'use client';

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
          background: '#111111',
          border: '1px solid #222222',
          borderRadius: '32px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
          boxShadow: 'none',
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
            <motion.div
              animate={{
                scale: isRecording ? 1 + volume * 1.5 : 1,
                opacity: isRecording ? 0.3 + volume * 0.7 : 0.1
              }}
              transition={{ ease: 'easeOut', duration: 0.1 }}
              style={{
                position: 'absolute',
                inset: '-20px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
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
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000'
              }}
            >
              {isRecording ? <Mic size={32} /> : <MicOff size={32} />}
            </motion.div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255, 255, 255, 0.4)' }}>
              Natural Voice
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 400, color: '#ffffff', marginTop: '4px' }}>
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
              const height = isRecording ? Math.max(4, (val / 255) * 50) : 4;
              return (
                <motion.div
                  key={idx}
                  animate={{ height }}
                  transition={{ duration: 0.05 }}
                  style={{
                    flex: 1,
                    maxWidth: '8px',
                    background: '#ffffff',
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
            background: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid #333333',
            padding: '16px 20px',
            textAlign: 'left'
          }}>
            {currentDisplay ? (
              <p style={{
                fontSize: '1rem',
                color: '#ffffff',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
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
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '16px',
                fontSize: '0.875rem',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                cursor: 'pointer'
              }}
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
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                color: '#ffffff',
                background: currentDisplay.trim() ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
                opacity: currentDisplay.trim() ? 1 : 0.4,
                cursor: currentDisplay.trim() ? 'pointer' : 'not-allowed'
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
