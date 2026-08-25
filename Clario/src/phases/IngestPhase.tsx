import { useState, useRef, useEffect } from 'react';
import type { HarvesterMode, HarvestProject } from '../types/assets';
import {
  fetchReferenceMedia,
  validateSupportedUrl,
  normalizeUrlFetchError,
  isRetryable,
  getSafeUserMessage,
  URL_FETCH_TIMEOUT_MS,
  type UrlFetchState,
} from '../lib/cobalt';
import { getApolloReferenceReelFixture } from '../lib/fixtures';

interface IngestPhaseProps {
  mode: HarvesterMode;
  onBack: () => void;
  onHarvestFiles: (files: File[], referenceUrl?: string) => void;
  onLoadDirectProject?: (project: HarvestProject) => void;
  onSwitchMode?: (newMode: HarvesterMode) => void;
}

// ── Clean Vector SVG Icons ──────────────────────────────────────────────────

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13 8l4.5-2.5v9L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const CarouselIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="3" width="9" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="6" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
  </svg>
);

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
    <path d="M10 14V4m0 0L6 8m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 15v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <path d="M8 12h4m-6 0a4 4 0 010-8h3a4 4 0 014 4m-1 4a4 4 0 010 8h-3a4 4 0 01-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <polygon points="6 4 16 10 6 16 6 4" fill="currentColor" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="#EF4444" strokeWidth="1.5" />
    <path d="M10 6v5m0 3h.01" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function IngestPhase({
  mode,
  onBack,
  onHarvestFiles,
  onLoadDirectProject,
  onSwitchMode,
}: IngestPhaseProps) {
  const isVideo = mode === 'video_harvester';
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlState, setUrlState] = useState<UrlFetchState>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [highlightDropzone, setHighlightDropzone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (controllerRef.current) controllerRef.current.abort('unmount');
    };
  }, []);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const valid = isVideo
      ? arr.filter(
          f =>
            f.type.startsWith('video/') ||
            f.type.startsWith('audio/') ||
            f.name.endsWith('.mp4') ||
            f.name.endsWith('.mov') ||
            f.name.endsWith('.webm')
        )
      : arr.filter(
          f =>
            f.type.startsWith('image/') ||
            f.name.endsWith('.png') ||
            f.name.endsWith('.jpg') ||
            f.name.endsWith('.jpeg') ||
            f.name.endsWith('.webp') ||
            f.name.endsWith('.pdf')
        );

    if (valid.length > 0) {
      setSelectedFiles(prev => [...prev, ...valid]);
      setHighlightDropzone(false);
      if (urlState.status !== 'success') {
        setUrlState({ status: 'idle' });
      }
    }
  };

  const handleUrlFetch = async () => {
    const trimmed = urlInput.trim();
    const validation = validateSupportedUrl(trimmed);
    if (!validation.valid) {
      setUrlState({
        status: 'failed',
        code: 'INVALID_URL',
        message: validation.error || 'Please enter a valid video URL',
        retryable: false,
      });
      return;
    }

    clearTimers();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = crypto.randomUUID();
    const deadline = Date.now() + URL_FETCH_TIMEOUT_MS;

    setUrlState({
      status: 'fetching',
      requestId,
      secondsRemaining: Math.ceil(URL_FETCH_TIMEOUT_MS / 1000),
    });

    // Countdown interval running every 250ms
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining <= 0) {
        clearTimers();
        controller.abort('TIMEOUT');
        setUrlState({
          status: 'needs_upload',
          code: 'TIMEOUT',
          message:
            'We could not retrieve this social video within 12 seconds. The platform may block public fetching or require a logged-in session. Upload the reel video or a screen recording to continue.',
        });
        setHighlightDropzone(true);
        return;
      }
      setUrlState(prev =>
        prev.status === 'fetching' ? { ...prev, secondsRemaining: remaining } : prev
      );
    }, 250);

    // Hard client-side timeout
    timerRef.current = window.setTimeout(() => {
      clearTimers();
      if (!controller.signal.aborted) {
        controller.abort('TIMEOUT');
        setUrlState({
          status: 'needs_upload',
          code: 'TIMEOUT',
          message:
            'We could not retrieve this social video within 12 seconds. The platform may block public fetching or require a logged-in session. Upload the reel video or a screen recording to continue.',
        });
        setHighlightDropzone(true);
      }
    }, URL_FETCH_TIMEOUT_MS);

    try {
      const file = await fetchReferenceMedia(trimmed, controller.signal);
      clearTimers();
      setSelectedFiles([file]);
      setUrlState({ status: 'success', mediaId: requestId, file });
      setHighlightDropzone(false);
    } catch (err: any) {
      clearTimers();
      const code = normalizeUrlFetchError(err, controller.signal);

      if (code === 'ABORTED_BY_USER') {
        setUrlState({ status: 'idle' });
        return;
      }

      if (code === 'TIMEOUT' || code === 'CORS_BLOCKED' || code === 'AUTH_REQUIRED') {
        setUrlState({
          status: 'needs_upload',
          code,
          message:
            'We could not retrieve this social video within 12 seconds. The platform may block public fetching or require a logged-in session. Upload the reel video or a screen recording to continue.',
        });
        setHighlightDropzone(true);
      } else {
        setUrlState({
          status: 'failed',
          code,
          message: getSafeUserMessage(code),
          retryable: isRetryable(code),
        });
      }
    }
  };

  const handleCancelFetch = () => {
    clearTimers();
    if (controllerRef.current) {
      controllerRef.current.abort('ABORTED_BY_USER');
    }
    setUrlState({ status: 'idle' });
  };

  const handleLoadSampleFixture = () => {
    const fixture = getApolloReferenceReelFixture();
    if (onLoadDirectProject) {
      onLoadDirectProject(fixture);
    } else {
      const dummyBlob = new Blob(['sample'], { type: 'video/mp4' });
      const dummyFile = new File([dummyBlob], 'apollo_jobs_execution_reel.mp4', {
        type: 'video/mp4',
      });
      onHarvestFiles([dummyFile], 'https://www.instagram.com/reel/DY33MzlO_qS/');
    }
  };

  const handleStartHarvest = () => {
    if (selectedFiles.length === 0) return;
    onHarvestFiles(selectedFiles, urlInput.trim());
  };

  const isFetching = urlState.status === 'fetching';

  return (
    <div
      className="phase-enter"
      style={{
        minHeight: '100%',
        background: 'var(--base)',
        color: 'var(--text-primary)',
        padding: '36px 32px 80px',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 820,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <button
          onClick={onBack}
          className="btn-ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          ← Back to Studio Home
        </button>

        {/* Mode Switcher */}
        {onSwitchMode && (
          <div
            style={{
              display: 'flex',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 3,
            }}
          >
            <button
              onClick={() => onSwitchMode('video_harvester')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                background: isVideo ? 'var(--text-primary)' : 'transparent',
                color: isVideo ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <VideoIcon />
              Video
            </button>
            <button
              onClick={() => onSwitchMode('slide_harvester')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                background: !isVideo ? 'var(--text-primary)' : 'transparent',
                color: !isVideo ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CarouselIcon />
              Carousel & Slides
            </button>
          </div>
        )}
      </div>

      {/* ── Main Intake Header ─────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 820, textAlign: 'left', marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 8,
          }}
        >
          {isVideo ? 'Mode A · Video Reference Intake' : 'Mode B · Carousel & Deck Intake'}
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
            color: 'var(--text-primary)',
          }}
        >
          {isVideo ? 'Harvest Assets from Short-Form Video' : 'Deconstruct Slide Decks & Carousels'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {isVideo
            ? 'Upload a video file or test with a sample reference reel. Clario segments shots, separates burnt-in text, identifies likely sources, and crafts clean replacement prompts.'
            : 'Upload screenshots or carousel slides to isolate transparent PNG icons, extract design tokens, and generate Claude 3.7 React code prompts.'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── 1-Click Test Fixture Banner ────────────────────────────────────── */}
        <div
          style={{
            background: 'rgba(78, 108, 242, 0.05)',
            border: '1px solid rgba(78, 108, 242, 0.2)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              🚀 Test Sample Reference Reel (Steve Jobs / Apollo 11 / Kobe)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Instantly loads the audited 5-shot reference reel dataset with high-res keyframes and source records.
            </div>
          </div>
          <button
            onClick={handleLoadSampleFixture}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: 'var(--accent)',
              color: '#FFFFFF',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(78, 108, 242, 0.25)',
            }}
          >
            <PlayIcon />
            Load Sample Reel
          </button>
        </div>

        {/* ── Section 1: Social URL Connector ───────────────────────────────── */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            <LinkIcon />
            <span>Reference URL Connector</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Enter a public TikTok, Instagram Reel, YouTube Shorts, or X link as the research reference.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url"
              placeholder="https://www.instagram.com/reel/DY33MzlO_qS/ or youtube.com/shorts/…"
              value={urlInput}
              onChange={e => {
                setUrlInput(e.target.value);
                if (urlState.status === 'failed' && urlState.code === 'INVALID_URL') {
                  setUrlState({ status: 'idle' });
                }
              }}
              disabled={isFetching}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border:
                  urlState.status === 'failed' && urlState.code === 'INVALID_URL'
                    ? '1px solid #EF4444'
                    : '1px solid var(--border)',
                background: 'var(--base)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {isFetching ? (
              <button
                onClick={handleCancelFetch}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #EF4444',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#EF4444',
                  cursor: 'pointer',
                }}
              >
                Cancel ({urlState.secondsRemaining}s)
              </button>
            ) : (
              <button
                onClick={handleUrlFetch}
                disabled={!urlInput.trim()}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  background: urlInput.trim() ? 'var(--text-primary)' : 'var(--surface-2)',
                  color: urlInput.trim() ? '#FFFFFF' : 'var(--text-muted)',
                  cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                Fetch Media
              </button>
            )}
          </div>

          {/* Inline Fetching Status */}
          {isFetching && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(78, 108, 242, 0.06)',
                border: '1px solid rgba(78, 108, 242, 0.2)',
                fontSize: 12,
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>
                Fetching remote video stream… timing out in {urlState.secondsRemaining}s if blocked.
              </span>
            </div>
          )}

          {/* Required Timeout & Auth Fallback UI */}
          {urlState.status === 'needs_upload' && (
            <div
              style={{
                marginTop: 14,
                padding: '14px 16px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  color: '#EF4444',
                  marginBottom: 6,
                }}
              >
                <AlertIcon />
                <span>Stream Ingestion Restricted ({urlState.code})</span>
              </div>
              <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {urlState.message}
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setHighlightDropzone(true);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    border: 'none',
                    background: 'var(--text-primary)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Upload Video Instead
                </button>
                <button
                  onClick={handleUrlFetch}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Retry URL
                </button>
                <button
                  onClick={handleLoadSampleFixture}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Use Sample Dataset
                </button>
                <button
                  onClick={() => setUrlState({ status: 'idle' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Failed State UI */}
          {urlState.status === 'failed' && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: 12,
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertIcon />
                <span>{urlState.message}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {urlState.retryable && (
                  <button
                    onClick={handleUrlFetch}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: 11,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => setUrlState({ status: 'idle' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Success State Badge */}
          {urlState.status === 'success' && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: 12,
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>✓ Media stream successfully captured and attached to harvest.</span>
            </div>
          )}
        </div>

        {/* ── Section 2: Primary File Upload (MVP Core Path) ────────────────── */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: dragging
              ? 'rgba(78, 108, 242, 0.06)'
              : highlightDropzone
              ? 'rgba(78, 108, 242, 0.03)'
              : 'var(--panel)',
            border: dragging
              ? '2px dashed var(--accent)'
              : highlightDropzone
              ? '2px dashed var(--accent)'
              : '2px dashed var(--border)',
            borderRadius: 14,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: highlightDropzone ? '0 0 0 3px rgba(78, 108, 242, 0.15)' : 'none',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={!isVideo}
            accept={isVideo ? 'video/*,audio/*' : 'image/*,.pdf'}
            onChange={e => e.target.files && handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />

          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <UploadIcon />
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {isVideo
              ? 'Drop reference video here, or click to browse'
              : 'Drop carousel slides / screenshot deck here'}
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {isVideo ? 'Supports MP4, MOV, WebM (up to 1 GB, 10 min)' : 'Supports PNG, JPG, WebP, PDF'}
          </div>

          <div
            style={{
              display: 'inline-flex',
              padding: '6px 14px',
              borderRadius: 16,
              background: 'var(--surface-2)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Local hardware acceleration · Privacy-first
          </div>
        </div>

        {/* Selected Files Badge */}
        {selectedFiles.length > 0 && (
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--emerald)',
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFiles[0].name} {selectedFiles.length > 1 ? `(+${selectedFiles.length - 1} more)` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {(selectedFiles[0].size / (1024 * 1024)).toFixed(1)} MB · Ready for asset extraction
                </div>
              </div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedFiles([]);
                setUrlState({ status: 'idle' });
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        )}

        {/* ── Section 3: Solid CTA Button ───────────────────────────────────── */}
        <button
          onClick={handleStartHarvest}
          disabled={selectedFiles.length === 0}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            background: selectedFiles.length > 0 ? 'var(--text-primary)' : 'var(--surface-2)',
            color: selectedFiles.length > 0 ? '#FFFFFF' : 'var(--text-muted)',
            cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            boxShadow: selectedFiles.length > 0 ? '0 4px 12px rgba(17, 19, 24, 0.12)' : 'none',
          }}
        >
          {selectedFiles.length > 0
            ? `Begin Creative Harvest (${selectedFiles.length} ${selectedFiles.length === 1 ? 'File' : 'Files'} Ready) →`
            : 'Add a video or URL to begin'}
        </button>
      </div>
    </div>
  );
}
