import { ReactNode, useEffect, useState } from 'react';
import type { HarvestProject } from '../../types/assets';
import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';
import { FloatingNav } from './FloatingNav';

export type ClarioPhase =
  | 'home'
  | 'ingest'
  | 'harvest_studio'
  | 'export'
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

      <FloatingNav
        currentPhase={currentPhase}
        hasApiKey={hasApiKey}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigatePhase={onNavigatePhase}
        onOpenBrandKit={onOpenBrandKit}
        onOpenApiKeyModal={onOpenApiKeyModal}
        currentStep={currentStep}
        isRefLibActive={isRefLibActive}
        canNavigateWorkflow={!!currentProject}
      />

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
            { id: 'projects',          label: 'All Projects',      accent: 'var(--pds-accent)', action: () => onNavigatePhase('home') },
            { id: 'reference-library', label: 'Reference Library', accent: 'var(--pds-accent)', action: () => onNavigatePhase('reference_library') },
          ],
        }]}
      />
    </div>
  );
}
