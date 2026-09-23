"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { Menu, X, Grid, LogOut, ChevronRight } from "lucide-react";
import { gsap } from "@/lib/gsap";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FloatingNavProps {
  isWeaveOpen?: boolean;
  onToggleWeave?: () => void;
  onOpenPalette?: () => void;
  user?: { name: string; email: string } | null;
}

// ── Routes ───────────────────────────────────────────────────────────────────

const ROUTES = [
  { path: "/world",       label: "Your Connected World", shortLabel: "World" },
  { path: "/tools",       label: "Tools",                shortLabel: "Tools" },
  { path: "/handoffs",    label: "Handoffs",             shortLabel: "Handoffs" },
  { path: "/context",     label: "Context",              shortLabel: "Context" },
  { path: "/connections", label: "Connections",          shortLabel: "Connections" },
  { path: "/settings",    label: "Settings",             shortLabel: "Settings" },
];

// ── Authenticated Floating Nav ───────────────────────────────────────────────

export function FloatingNav({
  user: initialUser,
}: FloatingNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ name: string; email: string } | null>(initialUser || null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWaffleOpen, setIsWaffleOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const waffleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUser) { setUser(initialUser); return; }
    const stored = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;
    setUser({ name: stored || "Local User", email: "user@local" });
  }, [initialUser]);

  const isRouteActive = (routePath: string) => {
    return pathname === routePath || pathname.startsWith(routePath + "/");
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsWaffleOpen(false);
  }, [pathname]);

  // Drawer GSAP animation & focus trap
  useEffect(() => {
    if (isMobileMenuOpen) {
      if (backdropRef.current) {
        gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      }
      if (drawerRef.current) {
        gsap.fromTo(
          drawerRef.current,
          { x: 320, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.28, ease: "power3.out" }
        );
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsMobileMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("metaphor_user_name");
      document.cookie = "metaphor_onboarded=; path=/; max-age=0";
      document.cookie = "metaphor_unlocked=; path=/; max-age=0";
    }
    router.push("/login");
  };

  return (
    <>
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-[100] px-4 py-2 bg-[var(--color-ink)] text-white text-xs rounded-full shadow-lg outline-none ring-2 ring-white"
      >
        Skip to main content
      </a>

      <header
        className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        role="banner"
      >
        <div className="pointer-events-auto flex items-center h-[52px] px-6 md:px-8 rounded-full bg-white/85 backdrop-blur-xl border border-[rgba(10,10,10,0.06)] shadow-[0_14px_40px_rgba(0,0,0,0.04)] gap-4 md:gap-6">
          {/* Logo Mark */}
          <Link href="/world" className="flex items-center gap-2 group shrink-0" aria-label="Metaphor - Return to Connected World">
            <MetaphorLogo size={20} className="text-[var(--color-ink)] group-hover:scale-105 transition-transform" />
            <span className="md:hidden font-display text-[15px] font-medium text-[var(--color-ink)]">
              Metaphor
            </span>
          </Link>

          {/* Desktop Nav routes */}
          <nav className="hidden md:flex items-center gap-5" aria-label="Main application navigation">
            {ROUTES.map((route, index) => {
              const isActive = isRouteActive(route.path);
              return (
                <React.Fragment key={route.path}>
                  <Link
                    href={route.path}
                    aria-current={isActive ? "page" : undefined}
                    className="relative py-1 group transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                      fontStyle: "normal",
                      fontSize: "17px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--color-ink)" : "#4B5563",
                      letterSpacing: "0.01em",
                    }}
                  >
                    <span className="group-hover:text-[var(--color-ink)] transition-colors">
                      {route.label}
                    </span>
                    {/* Active underline with pure CSS transition */}
                    <span
                      className={`absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-[var(--color-ink)] transition-all duration-200 ${
                        isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-75 group-hover:opacity-40 group-hover:scale-x-90"
                      }`}
                    />
                  </Link>

                  {/* Separator */}
                  {index < ROUTES.length - 1 && (
                    <span className="text-[12px] text-[#D1D5DB] select-none font-sans opacity-60" aria-hidden="true">|</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Right Actions: Waffle Switcher & Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Waffle Switcher (9-dot icon per BRAND.md §8) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsWaffleOpen(!isWaffleOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#4B5563] hover:text-[var(--color-ink)] hover:bg-[rgba(10,10,10,0.04)] transition-colors"
                aria-label="Application Switcher"
                aria-expanded={isWaffleOpen}
              >
                <Grid size={16} />
              </button>

              {/* Waffle Dropdown */}
              {isWaffleOpen && (
                <div
                  ref={waffleRef}
                  className="absolute right-0 top-10 w-56 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-[rgba(10,10,10,0.08)] shadow-[0_16px_40px_rgba(0,0,0,0.08)] z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">
                    Pseudonyms Ecosystem
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1">
                    <div className="p-2 rounded-xl bg-[rgba(17,19,21,0.04)] border border-[rgba(17,19,21,0.08)] text-left">
                      <div className="text-[12px] font-medium text-[var(--color-ink)]">Metaphor</div>
                      <div className="text-[10px] text-[#6B7280]">Active Engine</div>
                    </div>
                    <a
                      href="https://orion.pseudonyms.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-[rgba(10,10,10,0.03)] text-left transition-colors"
                    >
                      <div className="text-[12px] font-medium text-[var(--color-ink)]">Orion</div>
                      <div className="text-[10px] text-[#6B7280]">Agent Runtime</div>
                    </a>
                    <a
                      href="https://atlas.pseudonyms.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-[rgba(10,10,10,0.03)] text-left transition-colors"
                    >
                      <div className="text-[12px] font-medium text-[var(--color-ink)]">Atlas</div>
                      <div className="text-[10px] text-[#6B7280]">Topology</div>
                    </a>
                    <a
                      href="https://id.pseudonyms.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-[rgba(10,10,10,0.03)] text-left transition-colors"
                    >
                      <div className="text-[12px] font-medium text-[var(--color-ink)]">ID</div>
                      <div className="text-[10px] text-[#6B7280]">Auth Mesh</div>
                    </a>
                  </div>
                  <div className="border-t border-[rgba(10,10,10,0.06)] mt-2 pt-2 px-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-between p-1.5 rounded-lg text-[12px] text-[#DC2626] hover:bg-[#FEE2E2]/30 transition-colors"
                    >
                      <span>Sign out</span>
                      <LogOut size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-ink)] bg-[rgba(10,10,10,0.04)] hover:bg-[rgba(10,10,10,0.08)] transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={15} />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer / Sheet */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          className="fixed inset-0 z-[60] md:hidden"
        >
          {/* Backdrop */}
          <div
            ref={backdropRef}
            className="fixed inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-2xl border-l border-[rgba(10,10,10,0.08)] shadow-[0_24px_60px_rgba(0,0,0,0.12)] flex flex-col p-6 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[rgba(10,10,10,0.06)]">
              <div className="flex items-center gap-2">
                <MetaphorLogo size={18} />
                <span className="font-display text-[17px] font-medium text-[var(--color-ink)]">
                  Metaphor
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[var(--color-ink)] hover:bg-[rgba(10,10,10,0.04)]"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Profile Mini Badge */}
            {user && (
              <div className="py-4 border-b border-[rgba(10,10,10,0.06)]">
                <div className="text-[13px] font-medium text-[var(--color-ink)] truncate">{user.name}</div>
                <div className="text-[11px] text-[#6B7280] font-mono truncate">{user.email}</div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto" aria-label="Mobile navigation routes">
              {ROUTES.map((route) => {
                const isActive = isRouteActive(route.path);
                return (
                  <Link
                    key={route.path}
                    href={route.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-base transition-colors ${
                      isActive
                        ? "bg-[rgba(17,19,21,0.05)] text-[var(--color-ink)] font-semibold"
                        : "text-[#4B5563] hover:text-[var(--color-ink)] hover:bg-[rgba(10,10,10,0.02)]"
                    }`}
                    style={{ fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif" }}
                  >
                    <span>{route.label}</span>
                    {isActive && <ChevronRight size={16} className="text-[var(--color-ink)]" />}
                  </Link>
                );
              })}
            </nav>

            {/* Footer / Sign out */}
            <div className="pt-4 border-t border-[rgba(10,10,10,0.06)]">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-[#DC2626] hover:bg-[#FEE2E2]/30 transition-colors"
              >
                <span>Sign out</span>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
