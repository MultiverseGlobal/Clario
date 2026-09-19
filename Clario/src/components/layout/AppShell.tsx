import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { CommandPalette, useCrossAppBus } from '@pseudonyms/ui';
import { supabase } from '../../lib/supabase';
import { FloatingNav } from './FloatingNav';

export type ClarioPhase =
  | 'home'
  | 'reference_library'
  | 'deliverable'
  | 'studio'
  | 'preview'
  | 'video_canvas'
  | 'slide_canvas'
  | 'resolve_shot'
  | 'deconstruction'
  | 'extract_assets';

interface AppShellProps {
  children: ReactNode;
  currentPhase: ClarioPhase;
  onNavigatePhase: (phase: ClarioPhase) => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
  hasActiveProject?: boolean;
  projectName?: string;
  onRenameProject?: (name: string) => void;
}

export function AppShell({
  children,
  currentPhase,
  onNavigatePhase,
  onOpenApiKeyModal,
  hasApiKey,
  hasActiveProject,
  projectName,
  onRenameProject,
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
      <div className="fixed inset-0 clario-ambient-glow clario-animate-breathe pointer-events-none z-0" />

      {/* ── Top Unified Studio Header ── */}
      <FloatingNav
        currentPhase={currentPhase}
        hasApiKey={hasApiKey}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigatePhase={onNavigatePhase}
        onOpenApiKeyModal={onOpenApiKeyModal}
        hasActiveProject={hasActiveProject}
        projectName={projectName}
        onRenameProject={onRenameProject}
      />

      {/* ── Main Workspace Body ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.05] }}
            className="flex-1 flex flex-col w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── CommandPalette (⌘K) ─────────────────────────────────────────────── */}
      <CommandPalette
        currentApp="clario"
        extraCommands={[{
          id: 'clario-actions',
          label: 'Clario',
          accent: 'var(--pds-accent)',
          commands: [
            { id: 'projects',          label: 'All Projects',         accent: 'var(--pds-accent)', action: () => onNavigatePhase('home') },
            { id: 'reference-library', label: 'Reference Library',    accent: 'var(--pds-accent)', action: () => onNavigatePhase('reference_library') },
            { id: 'video-canvas',      label: 'Video Canvas',         accent: 'var(--pds-accent)', action: () => onNavigatePhase('video_canvas') },
            { id: 'slide-canvas',      label: 'Slide Canvas',         accent: 'var(--pds-accent)', action: () => onNavigatePhase('slide_canvas') },
            { id: 'extract-assets',    label: 'Extract Source Assets', accent: 'var(--pds-accent)', action: () => onNavigatePhase('extract_assets') },
            { id: 'resolve-shot',      label: 'Resolve Shot',         accent: 'var(--pds-accent)', action: () => onNavigatePhase('resolve_shot') },
            { id: 'deconstruction',    label: 'Deconstruction',       accent: 'var(--pds-accent)', action: () => onNavigatePhase('deconstruction') },
          ],
        }]}
      />
    </div>
  );
}
