import { ReactNode, useEffect, useState } from 'react';

import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';
import { FloatingNav } from './FloatingNav';

export type ClarioPhase =
  | 'home'
  | 'reference_library';

interface AppShellProps {
  children: ReactNode;
  currentPhase: ClarioPhase;
  onNavigatePhase: (phase: ClarioPhase) => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}



export function AppShell({
  children,
  currentPhase,
  onNavigatePhase,
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
        onOpenApiKeyModal={onOpenApiKeyModal}
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
            { id: 'projects',          label: 'All Projects',      accent: 'var(--pds-accent)', action: () => onNavigatePhase('home') },
            { id: 'reference-library', label: 'Reference Library', accent: 'var(--pds-accent)', action: () => onNavigatePhase('reference_library') },
          ],
        }]}
      />
    </div>
  );
}
