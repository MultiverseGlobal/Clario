import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkbenchTab = 'timeline' | 'storyboard' | 'ranked';

interface MatchedClip {
  id: string;
  shot_id: string;
  title?: string;
  source_url?: string;
  source_type?: string;
  frame_url?: string;
  description?: string;
  start_sec?: number;
  end_sec?: number;
  duration?: number;
  similarity?: number;
}

interface ChunkResult {
  chunk_index: number;
  chunk_text: string;
  matches: MatchedClip[];
  error?: string;
}

interface ScriptMatchResponse {
  chunks: ChunkResult[];
  ranked_clips: MatchedClip[];
  total_chunks: number;
  total_unique_clips: number;
}

interface ScriptAnalysisWorkbenchProps {
  userId: string;
  serverBase?: string;
  geminiApiKey?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXAMPLE_SCRIPT = `We're standing at the edge of something massive.

The data doesn't lie — consumer sentiment has shifted. People want authenticity over perfection.

That's why we built this. Not for the algorithm. For the audience.

Here's what three months of filming across four countries looked like.`;

function fmtSec(s?: number) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function SimilarityBadge({ value }: { value?: number }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'var(--pds-success)' : pct >= 60 ? 'var(--pds-warning)' : 'var(--pds-text-muted)';
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 99,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}
    >
      {pct}%
    </span>
  );
}

function ClipThumb({ clip, size = 'md' }: { clip: MatchedClip; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? { w: 72, h: 44 } : size === 'lg' ? { w: 280, h: 158 } : { w: 140, h: 80 };
  return (
    <div
      style={{
        width: dims.w, height: dims.h, flexShrink: 0,
        borderRadius: 6,
        background: 'var(--pds-surface-3)',
        overflow: 'hidden',
        border: '1px solid var(--pds-border-subtle)',
        position: 'relative',
      }}
    >
      {clip.frame_url ? (
        <img src={clip.frame_url} alt={clip.shot_id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--pds-border-mid)" strokeWidth="1.2">
            <rect x="1" y="2.5" width="14" height="11" rx="1.5"/>
            <polygon points="6,5.5 11,8 6,10.5" fill="var(--pds-border-mid)" stroke="none"/>
          </svg>
        </div>
      )}
      {clip.duration != null && (
        <span style={{ position: 'absolute', bottom: 3, right: 3, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: '1px 3px', borderRadius: 3, background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
          {fmtSec(clip.duration)}
        </span>
      )}
    </div>
  );
}

// ── Timeline View ─────────────────────────────────────────────────────────────

function TimelineView({ chunks }: { chunks: ChunkResult[] }) {
  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {chunks.map((chunk, ci) => (
        <div key={ci} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', position: 'relative' }}>
          {/* Timeline spine */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pds-accent)', marginTop: 6, flexShrink: 0, border: '2px solid var(--pds-surface-1)', boxShadow: '0 0 0 1px var(--pds-border-mid)' }} />
            {ci < chunks.length - 1 && (
              <div style={{ width: 1, flex: 1, minHeight: 40, background: 'var(--pds-border-subtle)', margin: '4px 0' }} />
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontFamily: "'Athelas', Georgia, serif", color: 'var(--pds-text-primary)', lineHeight: 1.6 }}>
              {chunk.chunk_text}
            </p>
            {/* Horizontal filmstrip of matched clips */}
            {chunk.matches.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {chunk.matches.slice(0, 6).map((clip, mi) => (
                  <div key={mi} style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <ClipThumb clip={clip} size="sm" />
                    <SimilarityBadge value={clip.similarity} />
                  </div>
                ))}
              </div>
            )}
            {chunk.error && (
              <p style={{ margin: 0, fontSize: 10, color: 'var(--pds-danger)', fontFamily: "'Inter', system-ui, sans-serif" }}>{chunk.error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Storyboard View ───────────────────────────────────────────────────────────

function StoryboardView({ chunks }: { chunks: ChunkResult[] }) {
  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {chunks.map((chunk, ci) => {
        const topClip = chunk.matches[0];
        return (
          <div
            key={ci}
            style={{
              display: 'grid',
              gridTemplateColumns: topClip ? '1fr 1fr' : '1fr',
              gap: 20,
              padding: '16px 20px',
              borderRadius: 10,
              border: '1px solid var(--pds-border-subtle)',
              background: 'var(--pds-surface-1)',
              boxShadow: 'var(--pds-shadow-sm)',
              alignItems: 'center',
            }}
          >
            {/* Script beat */}
            <div>
              <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Beat {String(ci + 1).padStart(2, '0')}
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 14, fontFamily: "'Athelas', Georgia, serif", color: 'var(--pds-text-primary)', lineHeight: 1.65, letterSpacing: '0.005em' }}>
                {chunk.chunk_text}
              </p>
              {/* Remaining matches small row */}
              {chunk.matches.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--pds-text-muted)', fontFamily: "'Inter', system-ui, sans-serif" }}>Also matched:</span>
                  {chunk.matches.slice(1, 4).map((m, i) => (
                    <ClipThumb key={i} clip={m} size="sm" />
                  ))}
                </div>
              )}
            </div>

            {/* Top matched clip */}
            {topClip && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ClipThumb clip={topClip} size="lg" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topClip.title || topClip.shot_id}
                  </span>
                  <SimilarityBadge value={topClip.similarity} />
                </div>
                {topClip.description && (
                  <p style={{ margin: 0, fontSize: 10, fontFamily: "'Athelas', Georgia, serif", color: 'var(--pds-text-muted)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {topClip.description}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Ranked Clips View ─────────────────────────────────────────────────────────

function RankedView({ clips }: { clips: MatchedClip[] }) {
  if (clips.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--pds-text-muted)', fontFamily: "'Athelas', Georgia, serif" }}>No ranked clips</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {clips.map((clip, i) => (
        <div
          key={clip.id}
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid var(--pds-border-subtle)',
            background: 'var(--pds-surface-1)',
            transition: 'box-shadow 150ms, border-color 150ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--pds-shadow-md)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pds-border-mid)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--pds-border-subtle)';
          }}
        >
          {/* Rank number */}
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>
            {String(i + 1).padStart(2, '0')}
          </span>

          <ClipThumb clip={clip} size="sm" />

          {/* Clip meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--pds-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clip.title || clip.shot_id}
            </p>
            {clip.description && (
              <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: "'Athelas', Georgia, serif", color: 'var(--pds-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clip.description}
              </p>
            )}
          </div>

          {/* Timecode */}
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)', flexShrink: 0 }}>
            {fmtSec(clip.start_sec)} – {fmtSec(clip.end_sec)}
          </span>

          <SimilarityBadge value={clip.similarity} />
        </div>
      ))}
    </div>
  );
}

// ── Main Workbench ─────────────────────────────────────────────────────────────

export function ScriptAnalysisWorkbench({
  userId,
  serverBase = '/api/v1',
  geminiApiKey,
}: ScriptAnalysisWorkbenchProps) {
  const [script, setScript] = useState('');
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('timeline');
  const [result, setResult] = useState<ScriptMatchResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    if (!script.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${serverBase}/script/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_text: script,
          user_id: userId,
          top_k: 8,
          gemini_api_key: geminiApiKey,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ScriptMatchResponse = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabs: { id: WorkbenchTab; label: string }[] = [
    { id: 'timeline',   label: 'Timeline' },
    { id: 'storyboard', label: 'Storyboard' },
    { id: 'ranked',     label: 'Ranked Clips' },
  ];

  return (
    <div
      className="pds-animate-enter"
      style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        height: 'calc(100vh - 52px)',
        background: 'var(--pds-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left Column: Script Input ────────────────────────────────────── */}
      <div
        style={{
          borderRight: '1px solid var(--pds-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--pds-border-subtle)' }}>
          <p style={{ margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pds-text-muted)' }}>Script Analysis</p>
          <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, fontFamily: "'Vanguard', Impact, Oswald, sans-serif", letterSpacing: '-0.02em', color: 'var(--pds-text-primary)', lineHeight: 1.1 }}>
            Match Script to Library
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, fontFamily: "'Athelas', Georgia, serif", color: 'var(--pds-text-secondary)', lineHeight: 1.5 }}>
            Type or paste your script. Clario will match each line to your reference library using semantic similarity.
          </p>
        </div>

        {/* Script textarea */}
        <div style={{ flex: 1, padding: '16px 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={EXAMPLE_SCRIPT}
            style={{
              flex: 1,
              width: '100%',
              padding: '14px 16px',
              borderRadius: 8,
              border: '1px solid var(--pds-border-mid)',
              background: 'var(--pds-surface-1)',
              color: 'var(--pds-text-primary)',
              fontFamily: "'Athelas', Georgia, serif",
              fontSize: 14,
              lineHeight: 1.7,
              letterSpacing: '0.005em',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--pds-border-strong)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--pds-border-mid)')}
          />
        </div>

        {/* Footer: word count + analyse button */}
        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--pds-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)' }}>
            {script.trim() ? `${script.trim().split(/\s+/).length} words` : 'Empty'}
          </span>
          <button
            onClick={handleAnalyse}
            disabled={!script.trim() || isAnalyzing}
            style={{
              padding: '8px 20px',
              borderRadius: 7,
              border: '1px solid var(--pds-accent)',
              background: 'var(--pds-accent)',
              color: 'var(--pds-accent-inv)',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: (!script.trim() || isAnalyzing) ? 'not-allowed' : 'pointer',
              opacity: (!script.trim() || isAnalyzing) ? 0.4 : 1,
              letterSpacing: '-0.01em',
              transition: 'opacity 150ms',
            }}
          >
            {isAnalyzing ? 'Analysing…' : 'Analyse →'}
          </button>
        </div>
      </div>

      {/* ── Right Column: Tab Output ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '14px 28px 0',
            borderBottom: '1px solid var(--pds-border-subtle)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px 10px',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--pds-text-primary)' : 'transparent'}`,
                  background: 'transparent',
                  color: isActive ? 'var(--pds-text-primary)' : 'var(--pds-text-muted)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'color 150ms, border-color 150ms',
                }}
              >
                {tab.label}
                {result && tab.id === 'ranked' && (
                  <span style={{ marginLeft: 5, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>
                    {result.ranked_clips.length}
                  </span>
                )}
              </button>
            );
          })}

          {result && (
            <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--pds-text-muted)', paddingBottom: 8, letterSpacing: '0.04em' }}>
              {result.total_chunks} beats · {result.total_unique_clips} unique clips
            </span>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Empty state */}
          {!result && !isAnalyzing && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="6" y="10" width="36" height="28" rx="3" stroke="var(--pds-border-mid)" strokeWidth="1.5"/>
                <line x1="12" y1="18" x2="36" y2="18" stroke="var(--pds-border-mid)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="12" y1="24" x2="30" y2="24" stroke="var(--pds-border-mid)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="12" y1="30" x2="24" y2="30" stroke="var(--pds-border-mid)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--pds-text-muted)', fontFamily: "'Athelas', Georgia, serif" }}>
                Paste a script and click Analyse
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--pds-text-disabled)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Results appear here across all three views
              </p>
            </div>
          )}

          {/* Loading state */}
          {isAnalyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid var(--pds-border-mid)',
                borderTopColor: 'var(--pds-text-primary)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--pds-text-secondary)', fontFamily: "'Athelas', Georgia, serif" }}>
                Matching script to library…
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ margin: 28, padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--pds-danger)', fontFamily: "'Inter', system-ui, sans-serif" }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {result && activeTab === 'timeline'   && <TimelineView  chunks={result.chunks} />}
          {result && activeTab === 'storyboard' && <StoryboardView chunks={result.chunks} />}
          {result && activeTab === 'ranked'     && <RankedView    clips={result.ranked_clips} />}
        </div>
      </div>
    </div>
  );
}
