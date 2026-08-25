import { useEffect, useState } from 'react';
import type { ExtractionResult, Asset } from '../types/assets';
import { AssetGrid } from '../components/blocks/AssetGrid';
import { AssetPreviewModal } from '../components/blocks/AssetPreviewModal';

interface ExtractPhaseProps {
  result: ExtractionResult | null;
  sourceFile?: File;
  isLoading?: boolean;
  progress?: { msg: string; pct: number };
  onBack: () => void;
  onContinue: (selected: Asset[]) => void;
}

const STEPS: string[] = [
  'Reading source…',
  'Detecting cuts…',
  'Extracting assets…',
  'Processing audio…',
  'Finalising blocks…',
];

export function ExtractPhase({ result, sourceFile, isLoading, progress, onBack, onContinue }: ExtractPhaseProps) {
  const [assets, setAssets] = useState<Asset[]>(result?.assets ?? []);
  const [revealing, setRevealing] = useState(true);
  const [scanPct, setScanPct] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  // When result arrives (loading done), run the reveal animation
  useEffect(() => {
    if (!result) return; // still loading — don't start reveal yet
    setAssets(result.assets);
    setRevealing(true);
    setScanPct(0);
    let frame = 0;
    const total = 60;
    const interval = setInterval(() => {
      frame++;
      setScanPct((frame / total) * 100);
      setStepIndex(Math.floor((frame / total) * STEPS.length));
      if (frame >= total) {
        clearInterval(interval);
        setRevealing(false);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [result]);

  const toggleAsset = (id: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const toggleAll = () => {
    const anySelected = assets.some(a => a.selected);
    setAssets(prev => prev.map(a => ({ ...a, selected: !anySelected })));
  };

  const selectedCount = assets.filter(a => a.selected).length;

  return (
    <div
      className="phase-enter"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--base)',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'Inter, sans-serif',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M8 2L3 6.5l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, maxWidth: 260 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result?.sourceName ?? 'Processing…'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace' }}>
            {result ? `${result.assets.length} blocks extracted` : 'Analysing…'}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealing && !isLoading && (
            <>
              <button onClick={toggleAll} className="btn-ghost" style={{ fontSize: 11 }}>
                {assets.some(a => a.selected) ? 'Deselect all' : 'Select all'}
              </button>
              <button
                onClick={() => onContinue(assets.filter(a => a.selected))}
                disabled={selectedCount === 0}
                className="btn-primary"
                style={{ fontSize: 12 }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open in Editor
                {selectedCount > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                    {selectedCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading state — real progress from extractor */}
      {isLoading && (
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--base)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Animated scan bar tied to real progress */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${progress?.pct ?? 0}%`,
            width: 2,
            background: 'linear-gradient(180deg, transparent, var(--accent) 30%, #A78BFA, var(--accent) 70%, transparent)',
            boxShadow: '0 0 20px rgba(99,102,241,0.6)',
            transition: 'left 0.3s ease',
            zIndex: 2,
          }} />
          <div style={{ textAlign: 'center', zIndex: 3 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1.5s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(99,102,241,0.2)" strokeWidth="2"/>
                <path d="M12 2A10 10 0 0 1 22 12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
              Cutting it up…
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {progress?.msg || 'Reading source…'}
            </p>
            <div style={{ width: 280, height: 3, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden', margin: '0 auto' }}>
              <div style={{
                height: '100%',
                width: `${progress?.pct ?? 0}%`,
                background: 'linear-gradient(90deg, var(--accent), #A78BFA)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Scan reveal animation (after load completes) */}
      {!isLoading && revealing && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--base)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Scan bar */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: `${scanPct}%`,
            width: 2,
            background: 'linear-gradient(180deg, transparent, var(--accent) 30%, #A78BFA, var(--accent) 70%, transparent)',
            boxShadow: '0 0 20px rgba(99,102,241,0.6), 0 0 60px rgba(99,102,241,0.2)',
            transition: 'left 0.02s linear',
            zIndex: 2,
          }} />

          {/* Scanned area fade */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: `${scanPct}%`,
            background: 'rgba(99,102,241,0.02)',
            transition: 'width 0.02s linear',
            zIndex: 1,
          }} />

          {/* Center content */}
          <div style={{ textAlign: 'center', zIndex: 3 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 2s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(99,102,241,0.2)" strokeWidth="2"/>
                <path d="M12 2A10 10 0 0 1 22 12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700, fontSize: 22,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}>
              Cutting it up…
            </h3>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {STEPS[Math.min(stepIndex, STEPS.length - 1)]}
            </p>

            {/* Progress bar */}
            <div style={{
              width: 280, height: 3,
              background: 'var(--surface)',
              borderRadius: 2,
              overflow: 'hidden',
              margin: '0 auto',
            }}>
              <div style={{
                height: '100%',
                width: `${scanPct}%`,
                background: 'linear-gradient(90deg, var(--accent), #A78BFA)',
                borderRadius: 2,
                transition: 'width 0.02s linear',
                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Asset grid */}
      {!revealing && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
        }}>
          <AssetGrid
            assets={assets}
            onToggle={toggleAsset}
            onPreview={setPreviewAsset}
            label={`${result.assets.length} extracted blocks`}
          />

          {/* Spacer */}
          <div style={{ height: 80 }} />
        </div>
      )}

      {/* Floating bottom bar */}
      {!revealing && selectedCount > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
          animation: 'phaseIn 0.3s ease forwards',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedCount}</span>
            {' '}block{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <button
            onClick={() => onContinue(assets.filter(a => a.selected))}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            Open in Editor →
          </button>
        </div>
      )}

      {/* Clip & Media Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          sourceFile={sourceFile}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
}
