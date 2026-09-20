"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Terminal,
  Network,
  Layers,
  Settings,
  Sun,
  Moon,
  Command,
  User,
  LogOut,
  ChevronDown,
  Check,
  Zap,
} from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { useTheme } from "next-themes";

interface FloatingNavProps {
  isWeaveOpen?: boolean;
  onToggleWeave?: () => void;
  onOpenPalette?: () => void;
  user?: { name: string; email: string } | null;
}

const ROUTES = [
  { path: "/canvas",   label: "Studio",   icon: Network,   exact: false },
  { path: "/projects", label: "Projects", icon: Layers,    exact: false },
  { path: "/world",    label: "World",    icon: Terminal,  exact: false },
  { path: "/settings", label: "Settings", icon: Settings,  exact: false },
];

const SCOPE_LABELS: Record<string, string> = {
  "/canvas":   "Flora Canvas Studio",
  "/projects": "Project Directory",
  "/world":    "Relationship World",
  "/settings": "MCP Configuration",
};

export function FloatingNav({
  isWeaveOpen = false,
  onToggleWeave,
  onOpenPalette,
  user: initialUser,
}: FloatingNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activePartition, setActivePartition] = useState("Global Identity");
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(initialUser || null);

  const brandRef = useRef<HTMLDivElement>(null);
  const partitions = ["Global Identity", "Engineering", "Research Lab"];

  // Current scope label for breadcrumb
  const scopeKey = Object.keys(SCOPE_LABELS).find((k) => pathname?.startsWith(k)) ?? "/home";
  const scopeLabel = SCOPE_LABELS[scopeKey];

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (initialUser) { setUser(initialUser); return; }
    const stored = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;
    setUser({ name: stored || "Local User", email: "user@local" });
  }, [initialUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) { console.error(e); }
    if (typeof window !== "undefined") {
      localStorage.clear();
      document.cookie = "metaphor_unlocked=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "metaphor_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "metaphor_signed_out=true; path=/; max-age=86400;";
    }
    router.push("/?landing=true");
  };

  const isRouteActive = (routePath: string, exact: boolean) => {
    if (exact) return pathname === routePath;
    return pathname === routePath || pathname.startsWith(routePath + "/");
  };

  return (
    <>
      {/* ── Top Left: Brand + Ecosystem ── */}
      <div className="fixed top-5 left-5 z-50 flex items-center gap-2 select-none">

        {/* Brand capsule */}
        <div className="relative" ref={brandRef}>
          <button
            onClick={() => setIsBrandDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1/85 border border-border-subtle/80 shadow-sm backdrop-blur-xl hover:bg-surface-2/90 transition-all cursor-pointer text-foreground"
            title="Metaphor account"
          >
            <MetaphorLogo size={15} />
            <span className="text-[11px] font-semibold tracking-tight hidden sm:block">Metaphor</span>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>

          {isBrandDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-surface-1/95 backdrop-blur-xl border border-border-subtle rounded-xl shadow-float py-1.5 z-50 animate-in fade-in duration-100">
              {/* User */}
              <div className="px-3 py-2 border-b border-border-subtle/60">
                <div className="text-xs font-semibold text-foreground truncate">{user?.name || "Local User"}</div>
                <div className="text-[10px] text-muted truncate">{user?.email || "user@local"}</div>
              </div>

              {/* Partitions */}
              <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-muted/60 mt-1">
                Active Partition
              </div>
              {partitions.map((p) => (
                <button
                  key={p}
                  onClick={() => { setActivePartition(p); setIsBrandDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    activePartition === p
                      ? "text-foreground font-semibold bg-surface-2"
                      : "text-muted hover:text-foreground hover:bg-surface-2/60"
                  }`}
                >
                  <span>{p}</span>
                  {activePartition === p && <Check className="w-3 h-3" />}
                </button>
              ))}

              <div className="border-t border-border-subtle/60 my-1" />

              <Link
                href="/settings"
                onClick={() => setIsBrandDropdownOpen(false)}
                className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-2/60 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & Keys</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Bottom Center: Scope breadcrumb ── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-1/70 backdrop-blur-md border border-border-subtle/60 shadow-sm">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Global</span>
          <span className="text-[9px] text-muted/40">·</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted/70">{activePartition}</span>
          <span className="text-[9px] text-muted/40">·</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/60">{scopeLabel}</span>
        </div>
      </div>

      {/* ── Top Right: Navigation pill ── */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2 select-none">
        <div className="flex items-center p-1 rounded-2xl bg-surface-1/85 border border-border-subtle/80 shadow-sm backdrop-blur-xl">

          {ROUTES.map((route) => {
            const isActive = isRouteActive(route.path, route.exact);
            const Icon = route.icon;
            return (
              <Link
                key={route.path}
                href={route.path}
                title={route.label}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 ease-out cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-surface-2/80 hover:text-foreground"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${!isActive ? "opacity-70 group-hover:opacity-100 transition-opacity" : ""}`} />
                <span className={`text-[11px] font-semibold font-mono tracking-wide whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  isActive ? "max-w-24 opacity-100" : "max-w-0 opacity-0 group-hover:max-w-24 group-hover:opacity-100 group-hover:ml-0.5"
                }`}>
                  {route.label}
                </span>
              </Link>
            );
          })}

          <div className="w-px h-4 bg-border-subtle/80 mx-1 shrink-0" />

          {/* ⌘K palette trigger */}
          {onOpenPalette && (
            <button
              onClick={onOpenPalette}
              title="Command palette (⌘K)"
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-2/80 transition-colors cursor-pointer"
            >
              <Command className="w-3.5 h-3.5" />
              <kbd className="text-[9px] font-mono hidden md:block opacity-60">⌘K</kbd>
            </button>
          )}

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-2/80 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Weave toggle */}
          {onToggleWeave && (
            <button
              onClick={onToggleWeave}
              title="Weave Intelligence"
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isWeaveOpen ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-surface-2/80"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
