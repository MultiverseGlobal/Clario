// Layer 6: UI - Cursor-Style Command Palette (Cmd+K) - CommandPalette.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMetaphor } from '../../context/MetaphorContext';
import { 
  Search, 
  Sparkles, 
  Network, 
  Clock, 
  Layers, 
  Plug, 
  X, 
  ArrowRight,
  User,
  FolderGit2,
  FileText,
  Compass,
  Zap
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    setActiveView, 
    entities, 
    events, 
    inspectEntity 
  } = useMetaphor();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Filter entities and events based on natural language query
  const filteredEntities = query
    ? entities.filter(e => 
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.type.toLowerCase().includes(query.toLowerCase()) ||
        e.description?.toLowerCase().includes(query.toLowerCase())
      )
    : entities.slice(0, 5);

  const filteredEvents = query
    ? events.filter(ev => 
        ev.title.toLowerCase().includes(query.toLowerCase()) ||
        ev.summary.toLowerCase().includes(query.toLowerCase()) ||
        ev.source.toLowerCase().includes(query.toLowerCase())
      )
    : events.slice(0, 3);

  const quickCommands = [
    { label: 'Open Knowledge Network View', icon: Network, action: () => { setActiveView('knowledge'); setIsCommandPaletteOpen(false); } },
    { label: 'Open Living Timeline', icon: Clock, action: () => { setActiveView('timeline'); setIsCommandPaletteOpen(false); } },
    { label: 'Explore Entity Matrix', icon: Layers, action: () => { setActiveView('explore'); setIsCommandPaletteOpen(false); } },
    { label: 'Manage Knowledge Connectors', icon: Plug, action: () => { setActiveView('connectors'); setIsCommandPaletteOpen(false); } }
  ];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Person': return User;
      case 'Project': return FolderGit2;
      case 'Document': return FileText;
      case 'Decision': return Compass;
      default: return Zap;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl metaphor-glass overflow-hidden shadow-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-subtle)] bg-white/5">
          <Search className="w-5 h-5 text-[var(--accent-blue)] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entities, context events, meetings, or type a command..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-sans"
          />
          <kbd className="hidden sm:inline-block metaphor-badge text-[10px] ml-2 text-[var(--text-muted)]">ESC</kbd>
          <button 
            onClick={() => setIsCommandPaletteOpen(false)}
            className="ml-2 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          
          {/* Quick Navigation Commands */}
          {!query && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center">
                <Sparkles className="w-3 h-3 text-[var(--accent-cyan)] mr-1.5" />
                Quick Commands
              </div>
              <div className="space-y-0.5 mt-1">
                {quickCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={idx}
                      onClick={cmd.action}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface-hover)] transition-colors group text-left"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors" />
                        <span>{cmd.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Entities */}
          {filteredEntities.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center">
                <Layers className="w-3 h-3 text-[var(--accent-blue)] mr-1.5" />
                Knowledge Entities ({filteredEntities.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredEntities.map((ent) => {
                  const Icon = getEntityIcon(ent.type);
                  return (
                    <button
                      key={ent.id}
                      onClick={() => {
                        inspectEntity(ent);
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                        <span className="font-medium truncate">{ent.name}</span>
                        <span className="metaphor-badge text-[9px]">{ent.type}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2 font-mono">{ent.lastUpdated}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Context Events */}
          {filteredEvents.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center">
                <Clock className="w-3 h-3 text-[var(--accent-purple)] mr-1.5" />
                Context Events ({filteredEvents.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      inspectEntity(evt);
                      setIsCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface-hover)] transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Zap className="w-3.5 h-3.5 text-[var(--accent-amber)] shrink-0" />
                      <span className="truncate">{evt.title}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 ml-2">{evt.source}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-white/2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center space-x-3">
            <span><kbd className="metaphor-badge text-[9px] mr-1">↑↓</kbd> Navigate</span>
            <span><kbd className="metaphor-badge text-[9px] mr-1">↵</kbd> Select</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--accent-cyan)]">Metaphor OS v1.0</span>
        </div>
      </div>
    </div>
  );
};
