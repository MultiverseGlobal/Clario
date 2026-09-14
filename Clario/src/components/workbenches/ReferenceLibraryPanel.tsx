import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../../lib/dexieDb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LibraryClip {
  id: string;
  shot_id: string;
  title?: string;
  source_url?: string;
  source_type: 'youtube' | 'instagram' | 'drive' | 'upload';
  frame_url?: string;
  description?: string;
  start_sec?: number;
  end_sec?: number;
  duration?: number;
  content_type?: string;
  scene_tag?: string;
  created_at?: string;
}

interface IngestJob {
  id: string;
  url: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  source_type?: string;
}

interface ReferenceLibraryPanelProps {
  userId: string;
  serverBase?: string;
  geminiApiKey?: string;
  onOpenInEditor?: (clip: LibraryClip) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  youtube:   { label: 'YT',     color: '#ef4444' },
  instagram: { label: 'IG',     color: '#a855f7' },
  drive:     { label: 'Drive',  color: '#3b82f6' },
  upload:    { label: 'Upload', color: 'var(--pds-text-muted)' },
};

function fmtSec(s?: number) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReferenceLibraryPanel({
  userId,
  serverBase = '/api/v1',
  geminiApiKey,
  onOpenInEditor,
}: ReferenceLibraryPanelProps) {
  const [urlInput, setUrlInput] = useState('');
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const [library, setLibrary] = useState<LibraryClip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClip, setSelectedClip] = useState<LibraryClip | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ── Fetch library (Dexie Local Vault + Remote API) ──────────────────────────
  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch local shots & vault assets from Dexie
      const [localShots, localVault] = await Promise.all([
        db.shots.toArray().catch(() => []),
        db.vaultAssets.toArray().catch(() => []),
      ]);

      const localClips: LibraryClip[] = (localShots || []).map((s) => {
        const tag = (s as any).scene_tag || s.visual_description || (s.content_type === 'a_roll' ? 'A-Roll (Talking Head)' : 'Cinematic B-Roll');
        return {
          id: s.id,
          shot_id: s.shot_id,
          title: s.visual_description || s.likely_source || s.shot_id,
          source_url: s.clean_source_url || s.reference_url,
          source_type: 'upload',
          frame_url: s.frame_url,
          description: s.notes || s.visual_description || '',
          start_sec: s.start_seconds,
          end_sec: s.end_seconds,
          duration: s.duration,
          content_type: s.content_type || 'b_roll',
          scene_tag: tag,
          created_at: new Date().toISOString(),
        };
      });

      // Incorporate standalone vault assets
      (localVault || []).forEach((v) => {
        if (!localClips.some((c) => c.id === v.id || c.shot_id === v.shotId)) {
          localClips.push({
            id: v.id,
            shot_id: v.shotId || v.id,
            title: v.title,
            source_url: v.sourceUrl || v.url,
            source_type: 'upload',
            frame_url: (v as any).frame_url || (v as any).thumbnail || v.url,
            description: v.rightsNote || v.title,
            duration: (v as any).durationSeconds || 4,
            content_type: v.assetKind === 'attached_master' ? 'a_roll' : 'b_roll',
            scene_tag: v.title || 'Saved Asset',
            created_at: new Date().toISOString(),
          });
        }
      });

      // 2. Fetch remote clips if connected
      let remoteClips: LibraryClip[] = [];
      try {
        const res = await fetch(`${serverBase}/reference/library?user_id=${userId}&page=1&page_size=48`);
        if (res.ok) {
          const data = await res.json();
          remoteClips = data.clips || [];
        }
      } catch {
        // remote is optional
      }

      // Merge unique clips
      const merged = [...localClips];
      remoteClips.forEach((rc) => {
        if (!merged.some((m) => m.id === rc.id || m.shot_id === rc.shot_id)) {
          merged.push(rc);
        }
      });

      setLibrary(merged);
    } catch (e) {
      console.warn('Failed to fetch library:', e);
    } finally {
      setIsLoading(false);
    }
  }, [serverBase, userId]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // ── Poll job status ────────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string, localId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${serverBase}/harvest/jobs/${jobId}`);
        const job = await res.json();
        setJobs((prev) =>
          prev.map((j) =>
            j.id === localId
              ? {
                  ...j,
                  status: job.status,
                  progress: job.progress_pct || 0,
                  message: job.status_msg || '',
                }
              : j,
          ),
        );
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(timer);
          delete pollTimers.current[localId];
          if (job.status === 'completed') fetchLibrary();
        }
      } catch {
        clearInterval(timer);
      }
    }, 2000);
    pollTimers.current[localId] = timer;
  }, [serverBase, fetchLibrary]);

  // ── Ingest URL ─────────────────────────────────────────────────────────────
  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    const localId = `local_${Date.now()}`;
    const newJob: IngestJob = {
      id: localId,
      url: urlInput,
      status: 'queued',
      progress: 0,
      message: 'Queued…',
    };
    setJobs((prev) => [newJob, ...prev]);
    setUrlInput('');

    try {
      const res = await fetch(`${serverBase}/reference/ingest-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newJob.url, user_id: userId, gemini_api_key: geminiApiKey }),
      });
      const data = await res.json();
      setJobs((prev) =>
        prev.map((j) => (j.id === localId ? { ...j, status: 'processing', source_type: data.source_type } : j)),
      );
      startPolling(data.job_id, localId);
    } catch (e) {
      setJobs((prev) => prev.map((j) => (j.id === localId ? { ...j, status: 'failed', message: 'Request failed' } : j)));
    }
  };

  // ── Ingest file ────────────────────────────────────────────────────────────
  const handleFileIngest = async (file: File) => {
    const localId = `local_${Date.now()}`;
    const newJob: IngestJob = {
      id: localId,
      url: file.name,
      status: 'queued',
      progress: 0,
      message: 'Uploading…',
    };
    setJobs((prev) => [newJob, ...prev]);

    const form = new FormData();
    form.append('file', file);
    form.append('user_id', userId);
    if (geminiApiKey) form.append('gemini_api_key', geminiApiKey);

    try {
      const res = await fetch(`${serverBase}/reference/ingest-file`, { method: 'POST', body: form });
      const data = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === localId ? { ...j, status: 'processing', source_type: 'upload' } : j)));
      startPolling(data.job_id, localId);
    } catch (e) {
      setJobs((prev) => prev.map((j) => (j.id === localId ? { ...j, status: 'failed', message: 'Upload failed' } : j)));
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) handleFileIngest(file);
  }, []);

  // ── Status color ───────────────────────────────────────────────────────────
  const statusColor = (status: IngestJob['status']) => {
    if (status === 'completed') return 'var(--pds-success)';
    if (status === 'failed')    return 'var(--pds-danger)';
    if (status === 'processing') return 'var(--pds-warning)';
    return 'var(--pds-text-muted)';
  };

  // ── Clip Deletion ─────────────────────────────────────────────────────────
  const handleDeleteClip = async (e: React.MouseEvent, clip: LibraryClip) => {
    e.stopPropagation();
    try {
      await Promise.all([
        db.shots.delete(clip.id).catch(() => {}),
        db.shots.where('shot_id').equals(clip.shot_id).delete().catch(() => {}),
        db.vaultAssets.delete(clip.id).catch(() => {}),
        db.vaultAssets.where('shotId').equals(clip.shot_id).delete().catch(() => {}),
      ]);
      setLibrary((prev) => prev.filter((c) => c.id !== clip.id && c.shot_id !== clip.shot_id));
      if (selectedClip?.id === clip.id) setSelectedClip(null);
    } catch (err) {
      console.error('Failed to delete clip from vault:', err);
    }
  };

  // ── Categories & Filtering ──────────────────────────────────────────────────
  const CATEGORIES = [
    { id: 'all', label: 'All Footage', icon: '🎬' },
    { id: 'cars', label: 'Cars & Transit', icon: '🚗' },
    { id: 'table', label: 'Table & Desk', icon: '🪑' },
    { id: 'a_roll', label: 'A-Roll (Speech)', icon: '🎙️' },
    { id: 'b_roll', label: 'Cinematic B-Roll', icon: '✨' },
    { id: 'screen', label: 'Screen & UI', icon: '💻' },
  ];

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return library.length;
    return library.filter((clip) => {
      const text = `${clip.scene_tag || ''} ${clip.title || ''} ${clip.description || ''}`.toLowerCase();
      if (catId === 'cars') return text.includes('car') || text.includes('transit') || text.includes('vehicle') || text.includes('road');
      if (catId === 'table') return text.includes('table') || text.includes('desk') || text.includes('workspace') || text.includes('counter');
      if (catId === 'a_roll') return clip.content_type === 'a_roll' || text.includes('a-roll') || text.includes('talking') || text.includes('speech');
      if (catId === 'b_roll') return clip.content_type === 'b_roll' || text.includes('b-roll') || text.includes('cinematic') || text.includes('broll');
      if (catId === 'screen') return text.includes('screen') || text.includes('demo') || text.includes('ui') || text.includes('interface');
      return false;
    }).length;
  };

  const filteredLibrary = library.filter((clip) => {
    if (selectedCategory !== 'all') {
      const text = `${clip.scene_tag || ''} ${clip.title || ''} ${clip.description || ''}`.toLowerCase();
      if (selectedCategory === 'cars') {
        if (!text.includes('car') && !text.includes('transit') && !text.includes('vehicle') && !text.includes('road')) return false;
      } else if (selectedCategory === 'table') {
        if (!text.includes('table') && !text.includes('desk') && !text.includes('workspace') && !text.includes('counter')) return false;
      } else if (selectedCategory === 'a_roll') {
        if (clip.content_type !== 'a_roll' && !text.includes('a-roll') && !text.includes('talking') && !text.includes('speech')) return false;
      } else if (selectedCategory === 'b_roll') {
        if (clip.content_type !== 'b_roll' && !text.includes('b-roll') && !text.includes('cinematic') && !text.includes('broll')) return false;
      } else if (selectedCategory === 'screen') {
        if (!text.includes('screen') && !text.includes('demo') && !text.includes('ui') && !text.includes('interface')) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (clip.title || '').toLowerCase().includes(q);
      const matchDesc = (clip.description || '').toLowerCase().includes(q);
      const matchTag = (clip.scene_tag || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }

    return true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="pds-animate-enter"
      style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        height: '100%',
        background: 'var(--pds-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left Column: Ingest Panel ──────────────────────────────────────── */}
      <div
        style={{
          borderRight: '1px solid var(--pds-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: '20px 20px 14px',
            borderBottom: '1px solid var(--pds-border-subtle)',
          }}
        >
          <p style={{ margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pds-text-muted)' }}>
            Reference Library
          </p>
          <h2
            style={{
              margin: '4px 0 0',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.02em',
              color: 'var(--pds-text-primary)',
              lineHeight: 1.1,
            }}
          >
            Ingest Reference
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-secondary)', lineHeight: 1.5 }}>
            Paste a YouTube, Instagram, or Drive URL — or drop a video file — to auto-cut and categorize scenes into your library.
          </p>
        </div>

        {/* URL input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pds-border-subtle)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIngestUrl()}
              placeholder="https://youtube.com/watch?v=…"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                border: '1px solid var(--pds-border-mid)',
                background: 'var(--pds-surface-1)',
                color: 'var(--pds-text-primary)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12,
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--pds-border-strong)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--pds-border-mid)')}
            />
            <button
              onClick={handleIngestUrl}
              disabled={!urlInput.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                border: '1px solid var(--pds-accent)',
                background: 'var(--pds-accent)',
                color: 'var(--pds-accent-inv)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
                opacity: urlInput.trim() ? 1 : 0.4,
                transition: 'opacity 150ms',
                whiteSpace: 'nowrap',
              }}
            >
              Ingest
            </button>
          </div>
        </div>

        {/* File drag-and-drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            margin: '12px 20px',
            padding: '20px',
            borderRadius: 10,
            border: `1.5px dashed ${isDragging ? 'var(--pds-border-strong)' : 'var(--pds-border-mid)'}`,
            background: isDragging ? 'var(--pds-accent-dim)' : 'var(--pds-surface-2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 200ms ease',
            userSelect: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pds-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
            {isDragging ? 'Drop to ingest' : 'Drop a video file, or click to browse'}
          </span>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)', letterSpacing: '0.06em' }}>
            MP4 · MOV · WEBM · AUTOMATIC SCENE SLICING
          </span>
          <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileIngest(f); }} />
        </div>

        {/* Ingest queue */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {jobs.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--pds-text-muted)', fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'center', marginTop: 24 }}>
              No active ingest jobs
            </p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                marginBottom: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--pds-border-subtle)',
                background: 'var(--pds-surface-1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  {job.url.length > 40 ? `…${job.url.slice(-38)}` : job.url}
                </span>
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: statusColor(job.status), textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, fontWeight: 600 }}>
                  {job.status}
                </span>
              </div>
              {job.status === 'processing' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 2, borderRadius: 99, background: 'var(--pds-border-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${job.progress}%`, background: 'var(--pds-text-primary)', borderRadius: 99, transition: 'width 500ms ease' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--pds-text-muted)', fontFamily: "'Inter', system-ui, sans-serif", marginTop: 4, display: 'block' }}>{job.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer action */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--pds-border-subtle)' }}>
          <button
            onClick={fetchLibrary}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 7,
              border: '1px solid var(--pds-border-mid)',
              background: 'var(--pds-surface-2)',
              color: 'var(--pds-text-secondary)',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            ↻ Refresh Local Vault & Library
          </button>
        </div>
      </div>

      {/* ── Right Column: Categorized Library Grid ──────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Library header & Search */}
        <div
          style={{
            padding: '20px 24px 14px',
            borderBottom: '1px solid var(--pds-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pds-text-muted)' }}>
              {filteredLibrary.length} of {library.length} clips indexed
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.02em', color: 'var(--pds-text-primary)', lineHeight: 1.1 }}>
              Reference & Shot Library
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Table, Cars, A-Roll..."
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--pds-border-mid)',
                background: 'var(--pds-surface-1)',
                color: 'var(--pds-text-primary)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11,
                width: 220,
                outline: 'none',
              }}
            />
            <button
              onClick={fetchLibrary}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--pds-border-mid)',
                background: 'transparent',
                color: 'var(--pds-text-secondary)',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Sync
            </button>
          </div>
        </div>

        {/* Scene Category Pills */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--pds-border-subtle)',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            background: 'var(--pds-surface-1)',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            const count = getCategoryCount(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: isCatActive ? 600 : 500,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  border: `1px solid ${isCatActive ? 'var(--pds-accent)' : 'var(--pds-border-subtle)'}`,
                  background: isCatActive ? 'var(--pds-accent)' : 'var(--pds-surface-2)',
                  color: isCatActive ? 'var(--pds-accent-inv)' : 'var(--pds-text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '1px 5px',
                    borderRadius: 10,
                    background: isCatActive ? 'rgba(255,255,255,0.2)' : 'var(--pds-surface-3)',
                    color: isCatActive ? 'inherit' : 'var(--pds-text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clips Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <span style={{ fontSize: 12, color: 'var(--pds-text-muted)', fontFamily: "'Inter', system-ui, sans-serif" }}>Loading library…</span>
            </div>
          )}
          {!isLoading && filteredLibrary.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
              <span style={{ fontSize: 32 }}>🎬</span>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--pds-text-muted)', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>
                {library.length === 0 ? 'Your library is empty' : `No clips matching category "${selectedCategory}"`}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--pds-text-disabled)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {library.length === 0 ? 'Upload a video to automatically slice and categorize scenes (Cars, Table, A-Roll, etc.)' : 'Try selecting another category tab or clearing your search.'}
              </p>
            </div>
          )}
          {!isLoading && filteredLibrary.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {filteredLibrary.map((clip) => {
                const badge = SOURCE_BADGE[clip.source_type] || SOURCE_BADGE.upload;
                const isSelected = selectedClip?.id === clip.id;
                const sceneTag = clip.scene_tag || (clip.content_type === 'a_roll' ? 'A-Roll' : 'Cinematic B-Roll');

                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(isSelected ? null : clip)}
                    className="interactive-card"
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? 'var(--pds-border-strong)' : 'var(--pds-border-subtle)'}`,
                      background: isSelected ? 'var(--pds-accent-dim)' : 'var(--pds-surface-1)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isSelected ? 'var(--pds-shadow-md)' : 'var(--pds-shadow-sm)',
                      transition: 'transform 150ms ease, box-shadow 150ms ease',
                    }}
                  >
                    {/* Keyframe Thumbnail Container */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--pds-surface-3)' }}>
                      {clip.frame_url ? (
                        <img
                          src={clip.frame_url}
                          alt={clip.description || clip.shot_id}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="var(--pds-border-mid)" strokeWidth="1.2">
                            <rect x="2" y="4" width="16" height="12" rx="1.5"/>
                            <polygon points="8,7 14,10 8,13" fill="var(--pds-border-mid)" stroke="none"/>
                          </svg>
                        </div>
                      )}

                      {/* Source badge */}
                      <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 5px', borderRadius: 4, background: badge.color, color: '#fff' }}>
                        {badge.label}
                      </span>

                      {/* Scene Category Tag Pill */}
                      <span
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          fontSize: 8,
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.04em',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(10, 11, 14, 0.78)',
                          color: '#38bdf8',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                        }}
                      >
                        {sceneTag}
                      </span>

                      {/* Duration badge */}
                      {clip.duration != null && (
                        <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: '2px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                          {fmtSec(clip.duration)}
                        </span>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {clip.title || clip.shot_id}
                      </p>
                      {clip.description && (
                        <p style={{ margin: '4px 0 0', fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-secondary)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {clip.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)' }}>
                          {fmtSec(clip.start_sec)} → {fmtSec(clip.end_sec)}
                        </span>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInEditor?.(clip);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: 'var(--pds-accent)',
                              color: 'var(--pds-accent-inv)',
                              border: 'none',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Create new video timeline with this scene"
                          >
                            🪄 New Video
                          </button>
                          <button
                            onClick={(e) => handleDeleteClip(e, clip)}
                            style={{
                              padding: '4px 6px',
                              borderRadius: 6,
                              background: 'transparent',
                              border: '1px solid var(--pds-border-subtle)',
                              color: 'var(--pds-text-muted)',
                              fontSize: 10,
                              cursor: 'pointer',
                            }}
                            title="Delete clip from library"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
