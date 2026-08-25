// Layer 6: UI - App Layout Shell - AppLayout.tsx
'use client';

import React from 'react';
import { useMetaphor, MetaphorView } from '../../context/MetaphorContext';
import { CommandPalette } from '../command/CommandPalette';
import { GlobalContextInspector } from '../inspector/GlobalContextInspector';
import { 
  Activity, 
  Clock, 
  Network, 
  Layers, 
  Plug, 
  Search, 
  ChevronDown, 
  ShieldCheck,
  Zap,
  RefreshCw,
  Globe,
  Compass
} from 'lucide-react';

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
    toggleCommandPalette,
    addSimulatedEvent
  } = useMetaphor();

  const workspaces = ['Core Enterprise', 'Personal Workspace', 'Research Lab', 'Client Alpha'];

  const navItems: { id: MetaphorView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'context', label: 'Context Stream', icon: Activity },
    { id: 'timeline', label: 'Progression Log', icon: Clock },
    { id: 'knowledge', label: 'Ontology Graph', icon: Network },
    { id: 'explore', label: 'Layer Explorer', icon: Layers },
    { id: 'connectors', label: 'Connectors', icon: Plug }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-foreground">
      
      {/* TOP MISSION CONTROL HEADER */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-5 flex items-center justify-between">
        
        {/* Left Atlas Waypoint Branding & Workspace Switcher */}
        <div className="flex items-center space-x-6">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveView('context')}
          >
            <AtlasWaypointLogo size={24} />
            <div className="text-left">
              <span className="font-serif font-bold text-sm tracking-tight text-foreground block leading-none group-hover:text-primary transition-colors">
                METAPHOR
              </span>
              <span className="eyebrow block text-[9px]">Context OS</span>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-border bg-surface-2/60 hover:bg-surface-2 text-xs font-medium text-foreground transition-all cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{activeWorkspace}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="absolute top-full left-0 mt-1 w-48 metaphor-glass bg-card border border-border rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              {workspaces.map(ws => (
                <button
                  key={ws}
                  onClick={() => setActiveWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                    activeWorkspace === ws ? 'text-primary font-semibold bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
                  }`}
                >
                  {ws}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Universal Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={toggleCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-border bg-surface/50 hover:bg-surface-2/80 text-xs text-muted-foreground hover:text-foreground transition-all shadow-inner group cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span>Map entities or search live context...</span>
            </div>
            <kbd className="metaphor-badge text-[9px]">⌘K</kbd>
          </button>
        </div>

        {/* Right System Health & Pulse Controls */}
        <div className="flex items-center space-x-4">
          
          {/* Real-time Sync Trigger */}
          <button
            onClick={async () => {
              try {
                const { fetchFromMetaphor } = await import('@/app/api');
                await fetchFromMetaphor('/sync/run-pull', { provider: 'github' }, 'POST');
                alert("Triggered manual sync pull from GitHub.");
              } catch (e) {
                alert("Sync failed: " + e);
              }
            }}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-subtle bg-surface-2 hover:bg-surface-1 text-xs font-mono text-muted hover:text-foreground transition-all cursor-pointer"
            title="Trigger real-time sync pull"
          >
            <RefreshCw className="w-3 h-3 text-foreground" />
            <span>Sync Now</span>
          </button>

          {/* Living Ingestion Status */}
          <div className="flex items-center space-x-2 text-[11px] font-mono text-muted-foreground px-3 py-1 rounded-lg bg-surface-2/60 border border-border">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden md:inline font-semibold">SYSTEM ACTIVE</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
            K
          </div>
        </div>

      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT VIEW */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COMPACT SIDEBAR */}
        <aside className="w-16 md:w-56 border-r border-border bg-sidebar-background flex flex-col justify-between p-3 shrink-0">
          
          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="hidden md:block px-3 py-2 eyebrow">
              Navigation Hub
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-surface-2 text-foreground border-l-2 border-primary font-semibold shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* System Footer Note */}
          <div className="hidden md:block p-3.5 metaphor-glass bg-card/60 border border-border rounded-xl text-[10px] text-muted-foreground space-y-1.5">
            <div className="flex items-center space-x-1.5 text-primary font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Living Context OS</span>
            </div>
            <p className="leading-relaxed">Continuously indexing connected services and mapping strategic timelines.</p>
          </div>

        </aside>

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
