import { ReactNode } from 'react';
import type { HarvestProject } from '../../types/assets';
import { EcosystemSwitcher } from '../ui/EcosystemSwitcher';
import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';

export type ClarioPhase =
  | 'home'
  | 'ingest'
  | 'harvest_studio'
  | 'export'
  | 'vault'
  | 'workspace'
  | 'reference_library';

interface AppShellProps {
  children: ReactNode;
  currentProject: HarvestProject | null;
  currentPhase: ClarioPhase;
  activeResultTab?: 'evidence' | 'clean' | 'replacements' | 'provenance';
  onNavigatePhase: (phase: ClarioPhase) => void;
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
  // Determine current active workflow step (1-4) — Reference Library is separate
  const getActiveStep = (): number => {
    if (currentPhase === 'home' || currentPhase === 'ingest') return 1;
    if (currentPhase === 'export') return 4;
    if (activeResultTab === 'clean' || activeResultTab === 'replacements') return 3;
    return 2;
  };

  const currentStep = getActiveStep();

  const { publish } = useCrossAppBus(supabase, null);
  if (typeof window !== 'undefined') {
    (window as any).__crossAppBusPublish = publish;
  }

  const isRefLibActive = currentPhase === 'reference_library';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--pds-canvas)',
        color: 'var(--pds-text-primary)',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
    >
      {/* ── Persistent Navigation Bar ────────────────────────────────────── */}
      <header
        style={{
          height: 52,
          borderBottom: '1px solid var(--pds-border-subtle)',
          background: 'rgba(248, 247, 244, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
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
              width: 5, height: 5, borderRadius: '50%',
              backgroundColor: 'var(--pds-text-primary)',
            }} />
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.06em',
              color: 'var(--pds-text-primary)',
              fontFamily: "'Vanguard', Impact, Oswald, sans-serif",
              textTransform: 'uppercase',
            }}>
              clario
            </span>
          </div>

          {currentProject && (
            <>
              <span style={{ color: 'var(--pds-border-mid)', fontSize: 14 }}>/</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--pds-text-primary)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentProject.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 99,
                    background: 'var(--pds-surface-2)',
                    color: 'var(--pds-text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    border: '1px solid var(--pds-border-subtle)',
                  }}
                >
                  {currentProject.mode === 'video_harvester' ? 'Video' : 'Carousel'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Center: Workflow Stepper + Reference Library Tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 4-Step harvest workflow */}
          {[
            { step: 1, label: 'Reference',  phase: 'ingest' as const },
            { step: 2, label: 'Analyze',    phase: 'harvest_studio' as const },
            { step: 3, label: 'Resolve',    phase: 'harvest_studio' as const },
            { step: 4, label: 'Export',     phase: 'export' as const },
          ].map((s, idx) => {
            const isActive = currentStep === s.step && !isRefLibActive;
            const isCompleted = currentStep > s.step && !isRefLibActive;
            return (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center' }}>
                {idx > 0 && (
                  <span style={{ color: 'var(--pds-border-mid)', fontSize: 10, margin: '0 2px' }}>›</span>
                )}
                <span
                  onClick={() => { if (currentProject || s.phase === 'ingest') onNavigatePhase(s.phase); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '-0.01em',
                    background: isActive
                      ? 'var(--pds-accent-dim)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid var(--pds-border-mid)'
                      : '1px solid transparent',
                    color: isActive
                      ? 'var(--pds-text-primary)'
                      : isCompleted
                      ? 'var(--pds-text-secondary)'
                      : 'var(--pds-text-muted)',
                    cursor: currentProject ? 'pointer' : 'default',
                    transition: 'all 150ms ease',
                  }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, opacity: 0.5 }}>0{s.step}</span>
                  {s.label}
                </span>
              </div>
            );
          })}

          {/* Divider */}
          <span style={{ width: 1, height: 16, background: 'var(--pds-border-subtle)', margin: '0 8px' }} />

          {/* Reference Library Tab */}
          <span
            onClick={() => onNavigatePhase('reference_library')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              fontSize: 11,
              fontWeight: isRefLibActive ? 500 : 400,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              background: isRefLibActive ? 'var(--pds-accent-dim)' : 'transparent',
              border: isRefLibActive ? '1px solid var(--pds-border-mid)' : '1px solid transparent',
              color: isRefLibActive ? 'var(--pds-text-primary)' : 'var(--pds-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isRefLibActive) {
                e.currentTarget.style.color = 'var(--pds-text-secondary)';
                e.currentTarget.style.background = 'var(--pds-surface-2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRefLibActive) {
                e.currentTarget.style.color = 'var(--pds-text-muted)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {/* Small library icon */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="1" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="0.8"/>
              <rect x="4.5" y="1" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="8.5" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            Ref Library
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigatePhase('vault')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              border: '1px solid var(--pds-border-subtle)',
              background: currentPhase === 'vault' ? 'var(--pds-surface-2)' : 'transparent',
              color: currentPhase === 'vault' ? 'var(--pds-text-primary)' : 'var(--pds-text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <span>Vault</span>
            <span style={{
              padding: '1px 5px', borderRadius: 99,
              background: 'var(--pds-surface-2)',
              border: '1px solid var(--pds-border-subtle)',
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--pds-text-muted)',
            }}>
              {vaultCount}
            </span>
          </button>

          <button
            onClick={() => onNavigatePhase('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              border: '1px solid var(--pds-border-subtle)',
              background: 'transparent',
              color: 'var(--pds-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <span>Projects</span>
            <span style={{
              padding: '1px 5px', borderRadius: 99,
              background: 'var(--pds-surface-2)',
              border: '1px solid var(--pds-border-subtle)',
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--pds-text-muted)',
            }}>
              {projectCount}
            </span>
          </button>

          {/* Primary CTA: obsidian fill on porcelain canvas */}
          <button
            onClick={() => onNavigatePhase('ingest')}
            style={{
              padding: '5px 14px', borderRadius: 7,
              fontSize: 11, fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              border: '1px solid var(--pds-accent)',
              background: 'var(--pds-accent)',
              color: 'var(--pds-accent-inv)',
              cursor: 'pointer',
              transition: 'opacity 150ms ease, transform 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            + new harvest
          </button>

          <button
            onClick={onOpenBrandKit}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              border: '1px solid var(--pds-border-subtle)',
              background: 'transparent',
              color: 'var(--pds-text-secondary)',
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
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              border: '1px solid var(--pds-border-subtle)',
              background: hasApiKey ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
              color: hasApiKey ? 'var(--pds-success)' : 'var(--pds-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: hasApiKey ? 'var(--pds-success)' : 'var(--pds-warning)',
              }}
            />
            <span>{hasApiKey ? 'Gemini 2.0' : 'Local WASM'}</span>
          </button>

          {/* 9-Dot Waffle Ecosystem Switcher */}
          <EcosystemSwitcher />
        </div>
      </header>

      {/* ── Main Workspace Body ─────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* ── CommandPalette (⌘K) ─────────────────────────────────────────── */}
      <CommandPalette
        currentApp="clario"
        extraCommands={[{
          id: 'clario-actions',
          label: 'Clario',
          accent: 'var(--pds-accent)',
          commands: [
            { id: 'new-harvest',      label: 'New Harvest',      accent: 'var(--pds-accent)', action: () => onNavigatePhase('ingest') },
            { id: 'vault',            label: 'Open Vault',       accent: 'var(--pds-accent)', action: () => onNavigatePhase('vault') },
            { id: 'projects',         label: 'All Projects',     accent: 'var(--pds-accent)', action: () => onNavigatePhase('home') },
            { id: 'reference-library',label: 'Reference Library',accent: 'var(--pds-accent)', action: () => onNavigatePhase('reference_library') },
          ],
        }]}
      />
    </div>
  );
}
