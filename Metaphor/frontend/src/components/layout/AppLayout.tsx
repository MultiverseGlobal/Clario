// Layer 6: UI - App Layout Shell - AppLayout.tsx
'use client';

import React from 'react';
import { useMetaphor, MetaphorView } from '../../context/MetaphorContext';
import { CommandPalette } from '../command/CommandPalette';
import { GlobalContextInspector } from '../inspector/GlobalContextInspector';
import { FloatingNav } from './FloatingNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Atlas Waypoint Logo Mark Component
export function AtlasWaypointLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 24 30" fill="none" className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="10" r="7" stroke="currentColor" strokeWidth="2.5" className="text-foreground" />
      <circle cx="12" cy="10" r="3" className="fill-primary" />
      <line x1="12" y1="18" x2="12" y2="28" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" className="text-primary" />
    </svg>
  );
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { 
    activeWorkspace, 
    setActiveWorkspace, 
    activeView, 
    setActiveView, 
    toggleCommandPalette
  } = useMetaphor();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-foreground">
      
      {/* FLOATING TOP NAVIGATION */}
      <FloatingNav
        onOpenPalette={toggleCommandPalette}
      />

      {/* MAIN CONTAINER: CONTENT VIEW */}
      <div className="flex-1 flex overflow-hidden pt-12">
        {/* CENTER VIEWPORT AREA */}
        <main className="flex-1 overflow-y-auto relative p-4 md:p-6 bg-background">
          {children}
        </main>
      </div>

      {/* GLOBAL MODALS & INSPECTOR PANELS */}
      <CommandPalette />
      <GlobalContextInspector />

    </div>
  );
};
