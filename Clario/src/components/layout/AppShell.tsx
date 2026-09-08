import { ReactNode, useEffect, useState } from 'react';
import type { HarvestProject } from '../../types/assets';
import { EcosystemSwitcher } from '../ui/EcosystemSwitcher';
import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';
import { ChevronRight, Moon, Sun } from 'lucide-react';

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

const WORKFLOW_STEPS: { step: string; label: string; phase: ClarioPhase }[] = [
  { step: '01', label: 'Reference',  phase: 'ingest' },
  { step: '02', label: 'Analyze',    phase: 'harvest_studio' },
  { step: '03', label: 'Resolve',    phase: 'harvest_studio' },
  { step: '04', label: 'Export',     phase: 'export' },
];

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  // Determine active workflow step (1-4)
  const getActiveStep = (): number => {
    if (currentPhase === 'home' || currentPhase === 'ingest') return 1;
    if (currentPhase === 'export') return 4;
    if (activeResultTab === 'clean' || activeResultTab === 'replacements') return 3;
    return 2;
  };
  const currentStep = getActiveStep();
  const isRefLibActive = currentPhase === 'reference_library';

  const { publish } = useCrossAppBus(supabase, null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__crossAppBusPublish = publish;
    }
  }, [publish]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">

      {/* ── Persistent Navigation Bar ───────────────────────────────────────── */}
      <header className="clario-glass-nav sticky top-0 z-40 h-14 flex items-center justify-between gap-4 px-5">

        {/* ── Left: Logo + Active Project Breadcrumb ───────────────────────── */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          {/* Wordmark */}
          <button
            onClick={() => onNavigatePhase('home')}
            className="flex items-center gap-2 group outline-none"
          >
            {/* Clario dot mark */}
            <div className="w-[5px] h-[5px] rounded-full bg-foreground group-hover:opacity-60 transition-opacity" />
            <span className="font-display text-[13px] font-bold uppercase tracking-[0.06em] text-foreground group-hover:opacity-70 transition-opacity">
              Clario
            </span>
          </button>

          {/* Active project breadcrumb */}
          {currentProject && (
            <>
              <span className="text-border-mid text-sm select-none">/</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-medium text-foreground tracking-ui truncate max-w-[180px]">
                  {currentProject.name}
                </span>
                <span className="clario-glass-capsule inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-mono text-muted-foreground shrink-0">
                  {currentProject.mode === 'video_harvester' ? 'Video' : 'Carousel'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Center: Workflow Stepper Pill + Ref Library Tab ─────────────── */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border-subtle backdrop-blur-sm shadow-inner">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isActive  = currentStep === idx + 1 && !isRefLibActive;
            const isCompleted = currentStep > idx + 1 && !isRefLibActive;
            const canNavigate = !!currentProject || s.phase === 'ingest';
            return (
              <div key={s.step} className="flex items-center">
                {idx > 0 && (
                  <ChevronRight className="h-3 w-3 mx-0.5 text-border-mid shrink-0" />
                )}
                <button
                  onClick={() => { if (canNavigate) onNavigatePhase(s.phase); }}
                  disabled={!canNavigate}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-medium transition-all duration-150',
                    isActive
                      ? 'bg-foreground text-background shadow-sm'
                      : isCompleted
                      ? 'text-muted-foreground hover:text-foreground hover:bg-surface-1'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40 disabled:cursor-default',
                  ].join(' ')}
                >
                  <span className={`font-mono text-[9px] ${isActive ? 'opacity-80 font-bold' : 'opacity-40'}`}>
                    {s.step}
                  </span>
                  {s.label}
                </button>
              </div>
            );
          })}

          {/* Divider */}
          <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

          {/* Reference Library tab */}
          <button
            onClick={() => onNavigatePhase('reference_library')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-medium transition-all duration-150',
              isRefLibActive
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-1',
            ].join(' ')}
          >
            {/* Inline shelf icon */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
              <rect x="0.5" y="1" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="0.8"/>
              <rect x="4.5" y="1" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="8.5" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            Ref Library
          </button>
        </div>

        {/* ── Right: Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Vault */}
          <button
            onClick={() => onNavigatePhase('vault')}
            className={[
              'pds-btn-ghost gap-1.5 px-3 py-1.5 rounded-lg text-[11px]',
              currentPhase === 'vault' ? 'bg-surface-2 text-foreground' : '',
            ].join(' ')}
          >
            Vault
            <span className="clario-glass-capsule inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-mono text-muted-foreground">
              {vaultCount}
            </span>
          </button>

          {/* Projects */}
          <button
            onClick={() => onNavigatePhase('home')}
            className="pds-btn-ghost gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
          >
            Projects
            <span className="clario-glass-capsule inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-mono text-muted-foreground">
              {projectCount}
            </span>
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => onNavigatePhase('ingest')}
            className="pds-btn-primary px-3.5 py-1.5 text-[11px] min-h-0 w-auto rounded-lg"
          >
            + New Harvest
          </button>

          {/* Brand Kit */}
          <button
            onClick={onOpenBrandKit}
            className="pds-btn-ghost px-3 py-1.5 rounded-lg text-[11px]"
          >
            Brand Kit
          </button>

          {/* API Key / Gemini status */}
          <button
            onClick={onOpenApiKeyModal}
            className={[
              'pds-btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]',
              hasApiKey ? 'text-[var(--pds-success)] border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.06)]' : '',
            ].join(' ')}
          >
            <div className={[
              'w-1.5 h-1.5 rounded-full shrink-0',
              hasApiKey ? 'bg-[var(--pds-success)]' : 'bg-[var(--pds-warning)]',
            ].join(' ')} />
            {hasApiKey ? 'Gemini 2.0' : 'Local WASM'}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg border border-border-subtle bg-surface-1/50 hover:bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="h-3.5 w-3.5" />
              : <Moon className="h-3.5 w-3.5" />
            }
          </button>

          {/* 9-Dot Waffle Ecosystem Switcher */}
          <EcosystemSwitcher />
        </div>
      </header>

      {/* ── Main Workspace Body ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>

      {/* ── CommandPalette (⌘K) ─────────────────────────────────────────────── */}
      <CommandPalette
        currentApp="clario"
        extraCommands={[{
          id: 'clario-actions',
          label: 'Clario',
          accent: 'var(--pds-accent)',
          commands: [
            { id: 'new-harvest',       label: 'New Harvest',       accent: 'var(--pds-accent)', action: () => onNavigatePhase('ingest') },
            { id: 'vault',             label: 'Open Vault',        accent: 'var(--pds-accent)', action: () => onNavigatePhase('vault') },
            { id: 'projects',          label: 'All Projects',      accent: 'var(--pds-accent)', action: () => onNavigatePhase('home') },
            { id: 'reference-library', label: 'Reference Library', accent: 'var(--pds-accent)', action: () => onNavigatePhase('reference_library') },
          ],
        }]}
      />
    </div>
  );
}
