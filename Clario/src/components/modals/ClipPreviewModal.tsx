import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ShotRecord } from '../../types/assets';
import { RightsBadge } from '../ui/RightsBadge';

interface ClipPreviewModalProps {
  shot: ShotRecord | null;
  referenceVideoUrl?: string;
  onClose: () => void;
  onResolveThisShot: (shot: ShotRecord) => void;
}

export function ClipPreviewModal({
  shot,
  referenceVideoUrl,
  onClose,
  onResolveThisShot,
}: ClipPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!shot) return;
    setCurrentTime(0);
    setIsPlaying(true);
    setVideoError(false);
  }, [shot]);

  // Video timecode clamping for shot segment
  useEffect(() => {
    if (!shot || !videoRef.current || !referenceVideoUrl) return;

    const video = videoRef.current;
    
    const initSeek = () => {
      try {
        video.currentTime = shot.start_seconds;
        if (isPlaying) video.play().catch(() => {});
      } catch (e) {
        console.warn('Seek initialization warning:', e);
      }
    };

    if (video.readyState >= 1) {
      initSeek();
    } else {
      video.addEventListener('loadedmetadata', initSeek, { once: true });
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= shot.end_seconds) {
        if (isLooping) {
          video.currentTime = shot.start_seconds;
          video.play().catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
      const progress = Math.max(0, video.currentTime - shot.start_seconds);
      setCurrentTime(progress);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [shot, referenceVideoUrl, isLooping]);

  // Simulated playback ticker for image/still fixtures or fallback
  useEffect(() => {
    if (!shot || (referenceVideoUrl && !videoError)) return;
    if (!isPlaying) return;

    const duration = shot.duration || 2.0;
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.05 * playbackSpeed;
        if (next >= duration) {
          return isLooping ? 0 : duration;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [shot, referenceVideoUrl, isPlaying, playbackSpeed, isLooping]);

  if (!shot) return null;

  const duration = shot.duration || (shot.end_seconds - shot.start_seconds) || 1.8;

  const togglePlay = () => {
    if (videoRef.current && referenceVideoUrl) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current && referenceVideoUrl) {
      videoRef.current.currentTime = shot.start_seconds + val;
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 13, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          height: '80vh',
          maxHeight: 780,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Left Column: Media Player ──────────────────────────────────────── */}
        <div
          style={{
            background: '#07090D',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRight: '1px solid var(--border)',
            flexShrink: 0,
            width: 300,
            overflowY: 'auto',
          }}
        >
          {/* Player Screen */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 270,
              aspectRatio: '9 / 16',
              borderRadius: 14,
              overflow: 'hidden',
              background: '#000000',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {referenceVideoUrl && !videoError ? (
              <video
                ref={videoRef}
                src={referenceVideoUrl}
                crossOrigin="anonymous"
                autoPlay
                muted={isMuted}
                playsInline
                onError={() => setVideoError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={shot.frame_url}
                alt={shot.shot_id}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Overlays */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(11, 13, 18, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#F87171',
                fontSize: 9,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              REFERENCE ONLY — NOT CLEARED
            </div>

            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(11, 13, 18, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {(shot.start_seconds + currentTime).toFixed(2)}s
            </div>

            {/* Center Big Play Button Overlay on Pause */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    paddingLeft: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  ▶
                </div>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div style={{ width: '100%', maxWidth: 280, marginTop: 16 }}>
            {/* Scrubber Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', minWidth: 32 }}>
                {currentTime.toFixed(1)}s
              </span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  height: 4,
                  accentColor: 'var(--accent)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', minWidth: 32, textAlign: 'right' }}>
                {duration.toFixed(1)}s
              </span>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={togglePlay}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <button
                  onClick={() => setIsLooping(!isLooping)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: isLooping ? 'rgba(78,108,242,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isLooping ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                    color: isLooping ? 'var(--accent)' : '#94A3B8',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  🔁 LOOP
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: !isMuted ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${!isMuted ? 'var(--emerald)' : 'rgba(255,255,255,0.1)'}`,
                    color: !isMuted ? 'var(--emerald)' : '#94A3B8',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>

              {/* Playback speed */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[0.5, 1, 2].map(spd => (
                  <button
                    key={spd}
                    onClick={() => {
                      setPlaybackSpeed(spd);
                      if (videoRef.current) videoRef.current.playbackRate = spd;
                    }}
                    style={{
                      padding: '3px 6px',
                      borderRadius: 4,
                      background: playbackSpeed === spd ? 'rgba(255,255,255,0.2)' : 'transparent',
                      border: 'none',
                      color: playbackSpeed === spd ? '#FFFFFF' : '#64748B',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Shot Intelligence & Actions ──────────────────────── */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {shot.shot_id.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {shot.start_seconds.toFixed(1)}s – {shot.end_seconds.toFixed(1)}s ({duration.toFixed(1)}s)
                </span>
                <RightsBadge status={shot.rights_status || shot.license_status} size="sm" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {shot.likely_source !== 'Unresolved' ? shot.likely_source : shot.visual_description}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Visual Description */}
          <div style={{ padding: 14, background: 'var(--base)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
              Visual Description & Scene Context
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              {shot.visual_description}
            </p>
          </div>

          {/* Optical Text Separation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#EF4444', marginBottom: 2 }}>
                Editor Burnt-in Captions
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                {shot.editor_text ? `“${shot.editor_text}”` : 'None detected'}
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(78, 108, 242, 0.05)', border: '1px solid rgba(78, 108, 242, 0.2)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>
                Physical Scene Text
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
                {shot.source_text ? `“${shot.source_text}”` : 'None visible in scene'}
              </div>
            </div>
          </div>

          {/* Source Candidates */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              Candidate Source Lookups
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(shot.search_queries || []).map((q, idx) => (
                <a
                  key={idx}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    fontSize: 11,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  YouTube: “{q}” ↗
                </a>
              ))}
            </div>
          </div>

          {/* Next Action Box */}
          <div
            style={{
              marginTop: 'auto',
              padding: '16px',
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Recommended Action:</strong>{' '}
              {shot.rights_status === 'user_owned' || shot.rights_status === 'licensed_clean_source'
                ? 'Authorized master attached and ready for production export.'
                : 'Create an original equivalent or attach an authorized clean master.'}
            </div>

            <button
              onClick={() => {
                onClose();
                onResolveThisShot(shot);
              }}
              className="btn-primary"
              style={{
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 700,
                background: 'var(--text-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <span>Resolve This Shot Now</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
