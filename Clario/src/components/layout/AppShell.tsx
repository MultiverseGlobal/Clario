import { ReactNode } from 'react';
import type { HarvestProject } from '../../types/assets';
import { EcosystemSwitcher } from '../ui/EcosystemSwitcher';

interface AppShellProps {
  children: ReactNode;
  currentProject: HarvestProject | null;
  currentPhase: 'home' | 'ingest' | 'harvest_studio' | 'export' | 'vault';
  activeResultTab?: 'evidence' | 'clean' | 'replacements' | 'provenance';
  onNavigatePhase: (phase: 'home' | 'ingest' | 'harvest_studio' | 'export' | 'vault') => void;
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
          <div
            onClick={() => onNavigatePhase('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'var(--text-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 14,
                fontFamily: 'var(--font-display)',
              }}
            >
              C
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
              }}
            >
              CLARIO
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface-2)',
            padding: '3px 6px',
            borderRadius: 20,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {[
            { step: 1, label: '1. Reference', phase: 'ingest' as const },
            { step: 2, label: '2. Analyze Shots', phase: 'harvest_studio' as const },
            { step: 3, label: '3. Resolve Assets', phase: 'harvest_studio' as const },
            { step: 4, label: '4. Export Pack', phase: 'export' as const },
          ].map(s => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <span
                key={s.step}
                onClick={() => {
                  if (currentProject || s.phase === 'ingest') {
                    onNavigatePhase(s.phase);
                  }
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: 14,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--panel)' : 'transparent',
                  color: isActive
                    ? 'var(--text-primary)'
                    : isCompleted
                    ? 'var(--emerald)'
                    : 'var(--text-muted)',
                  cursor: currentProject ? 'pointer' : 'default',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {s.label}
              </span>
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
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: 'var(--text-primary)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            + New Harvest
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
    </div>
  );
}
