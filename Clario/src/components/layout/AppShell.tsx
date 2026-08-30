import { ReactNode } from 'react';
import type { HarvestProject } from '../../types/assets';
import { EcosystemSwitcher } from '../ui/EcosystemSwitcher';
import { CommandPalette } from '@pseudonyms/ui';

interface AppShellProps {
  children: ReactNode;
  currentProject: HarvestProject | null;
  currentPhase: 'home' | 'ingest' | 'harvest_studio' | 'export' | 'vault' | 'workspace';
  activeResultTab?: 'evidence' | 'clean' | 'replacements' | 'provenance';
  onNavigatePhase: (phase: 'home' | 'ingest' | 'harvest_studio' | 'export' | 'vault' | 'workspace') => void;
  onOpenBrandKit: () => void;
  onOpenApiKeyModal: () => void;
  vaultCount: number;
  projectCount: number;
  hasApiKey: boolean;
}

export function AppShell({
  children,
  currentProject,
  currentPhase,
  activeResultTab = 'evidence',
  onNavigatePhase,
  onOpenBrandKit,
  onOpenApiKeyModal,
  vaultCount,
  projectCount,
  hasApiKey,
}: AppShellProps) {
  // Determine current active step (1-4)
  const getActiveStep = (): number => {
    if (currentPhase === 'home' || currentPhase === 'ingest') return 1;
    if (currentPhase === 'export') return 4;
    if (activeResultTab === 'clean' || activeResultTab === 'replacements') return 3;
    return 2;
  };

  const currentStep = getActiveStep();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Persistent Navigation Bar ──────────────────────────────────────── */}
      <header
        style={{
          height: 56,
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Logo & Project Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Wordmark */}
          <div
            onClick={() => onNavigatePhase('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: '#ec4899',
              boxShadow: '0 0 8px rgba(236,72,153,0.7)',
            }} />
            <span style={{
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.1em',
              color: 'rgba(240,240,240,0.85)',
              fontFamily: 'var(--font-sans)',
              textTransform: 'lowercase',
            }}>
              clario
            </span>
          </div>

          {currentProject && (
            <>
              <span style={{ color: 'var(--border)' }}>/</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentProject.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 12,
                    background: 'var(--surface-2)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentProject.mode === 'video_harvester' ? 'Video' : 'Carousel'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Center: 4-Step Workflow Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { step: 1, label: 'Reference',  phase: 'ingest' as const },
            { step: 2, label: 'Analyze',    phase: 'harvest_studio' as const },
            { step: 3, label: 'Resolve',    phase: 'harvest_studio' as const },
            { step: 4, label: 'Export',     phase: 'export' as const },
          ].map((s, idx) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center' }}>
                {idx > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: '0 2px' }}>›</span>
                )}
                <span
                  onClick={() => { if (currentProject || s.phase === 'ingest') onNavigatePhase(s.phase); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 8,
                    fontSize: 11,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: 'var(--font-sans)',
                    background: isActive ? 'rgba(236,72,153,0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(236,72,153,0.3)' : '1px solid transparent',
                    color: isActive ? '#ec4899' : isCompleted ? 'rgba(240,240,240,0.5)' : 'rgba(255,255,255,0.3)',
                    cursor: currentProject ? 'pointer' : 'default',
                    transition: 'all 150ms ease',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.6 }}>0{s.step}</span>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Tools & System Health Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onNavigatePhase('vault')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: currentPhase === 'vault' ? 'var(--surface-2)' : 'var(--panel)',
              color: currentPhase === 'vault' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <span>Vault</span>
            <span style={{ padding: '1px 5px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              {vaultCount}
            </span>
          </button>

          <button
            onClick={() => onNavigatePhase('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <span>Projects</span>
            <span style={{ padding: '1px 5px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              {projectCount}
            </span>
          </button>

          <button
            onClick={() => onNavigatePhase('ingest')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 500,
              border: '1px solid rgba(236,72,153,0.4)',
              background: 'rgba(236,72,153,0.1)',
              color: '#ec4899',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.1)'; }}
          >
            + new harvest
          </button>

          <button
            onClick={onOpenBrandKit}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Brand Kit
          </button>

          <button
            onClick={onOpenApiKeyModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: hasApiKey ? 'rgba(16, 185, 129, 0.08)' : 'var(--panel)',
              color: hasApiKey ? 'var(--emerald)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: hasApiKey ? 'var(--emerald)' : 'var(--amber)',
              }}
            />
            <span>{hasApiKey ? 'Gemini 2.0' : 'Local WASM'}</span>
          </button>

          {/* Google-Style 9-Dot Ecosystem Waffle Switcher */}
          <EcosystemSwitcher />
        </div>
      </header>

      {/* ── Main Workspace Body ────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* ── CommandPalette (⌘K) ─────────────────────────────────────────────── */}
      <CommandPalette
        currentApp="clario"
        extraCommands={[{
          id: 'clario-actions',
          label: 'Clario',
          accent: '#ec4899',
          commands: [
            { id: 'new-harvest', label: 'New Harvest',   accent: '#ec4899', action: () => onNavigatePhase('ingest') },
            { id: 'vault',      label: 'Open Vault',    accent: '#ec4899', action: () => onNavigatePhase('vault') },
            { id: 'projects',   label: 'All Projects',  accent: '#ec4899', action: () => onNavigatePhase('home') },
          ],
        }]}
      />
    </div>
  );
}
