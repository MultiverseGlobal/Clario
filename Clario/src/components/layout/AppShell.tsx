import { ReactNode, useEffect, useState } from 'react';
import type { HarvestProject } from '../../types/assets';
import { EcosystemSwitcher } from '../ui/EcosystemSwitcher';
import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';
import { ChevronRight, Moon, Sun, FolderOpen, Database, Palette, Settings } from 'lucide-react';

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
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans clario-grid-bg relative">
      {/* ── Ambient Glow (Atlas Light Mesh) ── */}
      <div className="fixed inset-0 clario-ambient-glow pointer-events-none z-0" />

      {/* ── Left Floating Pill: Brand + Breadcrumb ───────────────────── */}
      <div className="fixed top-5 left-5 z-50 flex items-center gap-2 pds-animate-enter pds-delay-1">
        <button
          onClick={() => {
            const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            document.dispatchEvent(e);
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl clario-glass-nav border border-border-subtle shadow-sm hover:bg-surface-1/50 transition-colors outline-none cursor-pointer"
          title="Open Command Palette (⌘K)"
        >
          <div className="w-[6px] h-[6px] rounded-full bg-foreground" />
          <span className="font-display text-[13px] font-semibold lowercase text-foreground hidden sm:block">
            clario
          </span>
        </button>

        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl clario-glass-nav border border-border-subtle shadow-sm pointer-events-none">
            <span className="text-[11px] font-medium text-foreground tracking-ui truncate max-w-[140px]">
              {currentProject.name}
            </span>
            <span className="clario-glass-capsule inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-mono text-muted-foreground shrink-0">
              {currentProject.mode === 'video_harvester' ? 'Video' : 'Carousel'}
            </span>
          </div>
        )}
      </div>

      {/* ── Center Floating Pill: Workflow Stepper ─────────────────────── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pds-animate-enter pds-delay-2">
        <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl clario-glass-nav border border-border-subtle shadow-sm">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isActive  = currentStep === idx + 1 && !isRefLibActive;
            const isCompleted = currentStep > idx + 1 && !isRefLibActive;
            const canNavigate = !!currentProject || s.phase === 'ingest';
            return (
              <div key={s.step} className="flex items-center">
                {idx > 0 && <ChevronRight className="h-3 w-3 mx-0.5 text-border-mid shrink-0" />}
                <button
                  onClick={() => { if (canNavigate) onNavigatePhase(s.phase); }}
                  disabled={!canNavigate}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-sans font-medium transition-all duration-300 ease-out',
                    isActive
                      ? 'bg-muted text-foreground shadow-sm ring-1 ring-border-subtle'
                      : isCompleted
                      ? 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-default',
                  ].join(' ')}
                >
                  <span className={`font-mono text-[9px] tracking-widest ${isActive ? 'opacity-80 font-bold' : 'opacity-40'}`}>
                    {s.step}
                  </span>
                  {s.label}
                </button>
              </div>
            );
          })}

          <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

          <button
            onClick={() => onNavigatePhase('reference_library')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-sans font-medium transition-all duration-300 ease-out',
              isRefLibActive
                ? 'bg-muted text-foreground shadow-sm ring-1 ring-border-subtle'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
            ].join(' ')}
          >
            Ref Library
          </button>
        </div>
      </div>

      {/* ── Right Floating Dock: Global Tools ──────────────────────────── */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2 pds-animate-enter pds-delay-3">
        {/* Global Tools Dock */}
        <div className="flex items-center gap-1 p-1 rounded-2xl clario-glass-nav border border-border-subtle shadow-sm">
          {/* Projects */}
          <button
            onClick={() => onNavigatePhase('home')}
            title={`Projects (${projectCount})`}
            className={['h-8 w-8 rounded-xl flex items-center justify-center transition-colors', currentPhase === 'home' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'].join(' ')}
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          
          {/* Vault */}
          <button
            onClick={() => onNavigatePhase('vault')}
            title={`Vault (${vaultCount})`}
            className={['h-8 w-8 rounded-xl flex items-center justify-center transition-colors relative', currentPhase === 'vault' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'].join(' ')}
          >
            <Database className="h-4 w-4" />
          </button>

          {/* Brand Kit */}
          <button
            onClick={onOpenBrandKit}
            title="Brand Kit"
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <Palette className="h-4 w-4" />
          </button>

          {/* Settings / Gemini */}
          <button
            onClick={onOpenApiKeyModal}
            title="Gemini Settings"
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors relative"
          >
            <Settings className="h-4 w-4" />
            <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-2 ring-background ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>
          
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

          {/* New Harvest CTA */}
          <button
            onClick={() => onNavigatePhase('ingest')}
            className="px-3 py-1.5 ml-0.5 text-[11px] font-medium bg-foreground text-background rounded-xl shadow-sm hover:opacity-90 transition-opacity"
          >
            + New
          </button>

          {/* Waffle */}
          <div className="px-1.5 flex items-center justify-center">
            <EcosystemSwitcher />
          </div>
        </div>
      </div>

      {/* ── Main Workspace Body ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative pt-20">
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
