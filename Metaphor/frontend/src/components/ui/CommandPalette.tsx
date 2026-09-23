"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap";
import {
  Globe, Wrench, GitCommit, Search, ArrowRight,
  Terminal, Shield, Target, Settings, Sliders
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

  const backdropRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navItems: PaletteItem[] = useMemo(() => [
    { id: "world",       label: "Your Connected World", icon: Globe,     group: "Navigate", run: () => { router.push("/world"); onClose(); } },
    { id: "tools",       label: "Tools Registry",       icon: Wrench,    group: "Navigate", run: () => { router.push("/tools"); onClose(); } },
    { id: "handoffs",    label: "Handoffs Timeline",    icon: GitCommit, group: "Navigate", run: () => { router.push("/handoffs"); onClose(); } },
    { id: "context",     label: "Context Engine",       icon: Terminal,  group: "Navigate", run: () => { router.push("/context"); onClose(); } },
    { id: "connections", label: "Connections",          icon: Sliders,   group: "Navigate", run: () => { router.push("/connections"); onClose(); } },
    { id: "settings",    label: "Settings",             icon: Settings,  group: "Navigate", run: () => { router.push("/settings"); onClose(); } },
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

  // GSAP animation when open changes
  useEffect(() => {
    if (!open) return;

    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
    }
    if (paletteRef.current) {
      gsap.fromTo(
        paletteRef.current,
        { opacity: 0, scale: 0.96, y: -12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power3.out" }
      );
    }
    inputRef.current?.focus();
  }, [open]);

  const handleClose = () => {
    if (backdropRef.current && paletteRef.current) {
      gsap.to(backdropRef.current, { opacity: 0, duration: 0.15, ease: "power2.in" });
      gsap.to(paletteRef.current, {
        opacity: 0,
        scale: 0.96,
        y: -8,
        duration: 0.15,
        ease: "power2.in",
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  // Keyboard navigation & accessibility focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
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
  }, [open, filteredItems, selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        ref={paletteRef}
        className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl border border-[rgba(10,10,10,0.08)] shadow-[0_24px_60px_rgba(0,0,0,0.12)] rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(10,10,10,0.06)]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Navigate, explore context, find tools..."
            className="flex-1 bg-transparent text-[14px] text-[var(--color-ink)] placeholder:text-[#6B7280] focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="text-[10px] font-mono text-[#6B7280] bg-[rgba(10,10,10,0.04)] border border-[rgba(10,10,10,0.08)] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6B7280]">
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
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] px-3 pt-2.5 pb-1">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => item.run()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                      isSelected
                        ? "bg-[rgba(17,19,21,0.05)] text-[var(--color-ink)] font-medium"
                        : "text-[#3B4043] hover:bg-[rgba(17,19,21,0.02)]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[var(--color-ink)]" : "text-[#6B7280]"}`} />
                    <span className="truncate">{item.label}</span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] ml-auto shrink-0" />
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="border-t border-[rgba(10,10,10,0.06)] px-4 py-2.5 flex items-center gap-4 text-[11px] text-[#6B7280] font-mono bg-white/50">
          <span><kbd className="bg-[rgba(10,10,10,0.04)] border border-[rgba(10,10,10,0.08)] rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="bg-[rgba(10,10,10,0.04)] border border-[rgba(10,10,10,0.08)] rounded px-1">↵</kbd> select</span>
          <span><kbd className="bg-[rgba(10,10,10,0.04)] border border-[rgba(10,10,10,0.08)] rounded px-1">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
