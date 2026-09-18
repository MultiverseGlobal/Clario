"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { WeavePanel } from "@/components/WeavePanel";
import { AmbientField, FieldState } from "@/components/ui/AmbientField";
import { FirstEntrySequence } from "@/components/ui/FirstEntrySequence";
import { CommandPalette } from "@/components/ui/CommandPalette";

const PAGE_VARIANTS = {
  initial:  { opacity: 0, y: 6, filter: "blur(4px)" },
  animate:  { opacity: 1, y: 0, filter: "blur(0px)" },
  exit:     { opacity: 0, y: -4, filter: "blur(2px)" },
};
const PAGE_TRANSITION = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isWeavePanelOpen, setIsWeavePanelOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [entryDone, setEntryDone] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const { fetchFromMetaphor } = await import("@/app/api");
        const data = await fetchFromMetaphor("/auth/me");

        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const sbUser = session?.user;
        const storedCustomName = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;

        const googleFullName = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name;
        const emailPrefix = sbUser?.email ? sbUser.email.split("@")[0] : null;
        const emailFirstWord = emailPrefix ? emailPrefix.replace(/[^a-zA-Z]/g, " ").trim().split(" ")[0] : null;
        const cleanEmailName = emailFirstWord && emailFirstWord.length >= 3 && emailFirstWord.length <= 10
          ? emailFirstWord.charAt(0).toUpperCase() + emailFirstWord.slice(1)
          : null;
        const fallbackName = googleFullName || cleanEmailName || "Your Workspace";

        const isGenericName = !data?.name || data.name === "Developer User" || data.name === "Supabase User";
        const resolvedName = storedCustomName || (!isGenericName ? data.name : fallbackName);
        setUser({ name: resolvedName, email: data?.email || sbUser?.email || "workspace@metaphor.os" });
      } catch {
        const stored = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;
        setUser({ name: stored || "Local User", email: "user@local" });
      }
    }
    fetchUser();
    import("@/lib/settings").then((m) => m.pullSettingsFromCloud());

    const handleProfileUpdate = () => {
      fetchUser();
      import("@/lib/settings").then((m) => m.pushSettingsToCloud());
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

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

  const handleEntryComplete = useCallback(() => setEntryDone(true), []);

  let fieldState: FieldState = "idle";
  if (pathname.startsWith("/context")) fieldState = "focused";
  if (pathname.startsWith("/world")) fieldState = "exploring";
  if (pathname.startsWith("/work")) fieldState = "resolving";

  return (
    <div className="relative min-h-screen w-screen bg-background text-foreground overflow-x-hidden selection:bg-accent/20">
      {/* First-entry cinematic — shown only once */}
      <FirstEntrySequence onComplete={handleEntryComplete} />

      {/* Ambient field */}
      <AmbientField fieldState={fieldState} />

      {/* Command palette */}
      <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Navigation */}
      <FloatingNav
        isWeaveOpen={isWeavePanelOpen}
        onToggleWeave={() => setIsWeavePanelOpen((o) => !o)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        user={user}
      />

      {/* Page area */}
      <div className="flex w-full min-h-screen relative">
        <main className="flex-1 w-full relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={PAGE_TRANSITION}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Weave Intelligence side drawer */}
        <aside
          style={{
            width: isWeavePanelOpen ? 340 : 0,
            minWidth: isWeavePanelOpen ? 340 : 0,
            overflow: "hidden",
            transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            borderLeft: isWeavePanelOpen ? "1px solid var(--color-border-subtle)" : "none",
            background: "var(--color-surface-1)",
          }}
          className="fixed right-0 top-0 bottom-0 z-40 shadow-2xl"
        >
          {isWeavePanelOpen && (
            <div style={{ width: 340, height: "100%", overflowY: "auto" }}>
              <WeavePanel />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
