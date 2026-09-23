"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const pathname = usePathname();

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setIsPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-transparent text-[var(--color-ink)] overflow-x-hidden">
      {/* Command palette */}
      <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Navigation Capsule */}
      <FloatingNav onOpenPalette={() => setIsPaletteOpen(true)} />

      {/* Main Page Area */}
      <div className="flex w-full min-h-screen relative pt-24">
        <main id="main-content" className="flex-1 w-full relative">
          <div
            key={pathname}
            className="w-full min-h-[calc(100vh-6rem)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-forwards"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
