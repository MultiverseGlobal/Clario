"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Terminal, Network, Layers, Settings,
  Search, ArrowRight, Shield, Target,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
  run: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navItems: PaletteItem[] = useMemo(() => [
    { id: "home",     label: "Home",     icon: Home,     group: "Navigate", run: () => { router.push("/home"); onClose(); } },
    { id: "context",  label: "Context",  icon: Terminal, group: "Navigate", run: () => { router.push("/context"); onClose(); } },
    { id: "world",    label: "World",    icon: Network,  group: "Navigate", run: () => { router.push("/world"); onClose(); } },
    { id: "work",     label: "Work",     icon: Layers,   group: "Navigate", run: () => { router.push("/work"); onClose(); } },
    { id: "settings", label: "Settings", icon: Settings, group: "Navigate", run: () => { router.push("/settings"); onClose(); } },
  ], [router, onClose]);

  const contextItems: PaletteItem[] = useMemo(() => [
    { id: "q1", label: "What should I know about Orion right now?", icon: Terminal, group: "Context Queries", run: () => { router.push("/context?q=" + encodeURIComponent("What should I know about Orion right now?")); onClose(); } },
    { id: "q2", label: "What changed since last week?",             icon: Terminal, group: "Context Queries", run: () => { router.push("/context?q=" + encodeURIComponent("What changed since last week?")); onClose(); } },
    { id: "q3", label: "What decisions are active?",                icon: Shield,   group: "Context Queries", run: () => { router.push("/context?q=" + encodeURIComponent("What decisions are active?")); onClose(); } },
    { id: "q4", label: "What are the current constraints?",         icon: Target,   group: "Context Queries", run: () => { router.push("/context?q=" + encodeURIComponent("What are the current constraints?")); onClose(); } },
  ], [router, onClose]);

  const allItems = useMemo(() => [...navItems, ...contextItems], [navItems, contextItems]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item => 
      item.label.toLowerCase().includes(q) || 
      item.group.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].run();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, filteredItems, selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-surface-1 border border-border-strong shadow-2xl rounded-xl overflow-hidden backdrop-blur-xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Navigate, explore context, find entities..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
                  autoFocus
                />
                <kbd className="text-[10px] font-mono text-muted bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    const isNewGroup = idx === 0 || filteredItems[idx - 1].group !== item.group;

                    return (
                      <React.Fragment key={item.id}>
                        {isNewGroup && (
                          <div className="text-[9px] font-mono uppercase tracking-widest text-muted px-2 pt-2 pb-1">
                            {item.group}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => item.run()}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                            isSelected
                              ? "bg-surface-2 text-foreground font-medium"
                              : "text-foreground/80 hover:bg-surface-2/60"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted"}`} />
                          <span className="truncate">{item.label}</span>
                          {isSelected && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted ml-auto shrink-0" />
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border-subtle px-4 py-2 flex items-center gap-4 text-[10px] text-muted font-mono bg-surface-0/50">
                <span><kbd className="bg-surface-2 border border-border-subtle rounded px-1">↑↓</kbd> navigate</span>
                <span><kbd className="bg-surface-2 border border-border-subtle rounded px-1">↵</kbd> select</span>
                <span><kbd className="bg-surface-2 border border-border-subtle rounded px-1">ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

