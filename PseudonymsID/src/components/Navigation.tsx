"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getEcosystemIcon } from "./EcosystemIcons";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";
import { CommandPalette } from "./CommandPalette";

// Custom Hook to check if an app's local dev server is running
function useLivePing(url: string, interval = 5000) {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkLive = async () => {
      try {
        const res = await fetch(url + "/favicon.svg", { mode: "no-cors", cache: "no-store" });
        if (mounted) setIsLive(true); // If it doesn't throw, it's reachable
      } catch (e) {
        if (mounted) setIsLive(false);
      }
    };
    checkLive();
    const id = setInterval(checkLive, interval);
    return () => { mounted = false; clearInterval(id); };
  }, [url, interval]);

  return isLive;
}

// Waffle Item Component to handle its own ping
function WaffleItem({ app, onClose }: { app: typeof ECOSYSTEM_APPS[0], onClose: () => void }) {
  const isLive = useLivePing(app.defaultUrl);

  return (
    <a
      href={app.defaultUrl}
      target="_blank"
      rel="noreferrer"
      onClick={onClose}
      className="flex flex-col items-center gap-2 p-3 rounded-xl text-no-underline bg-transparent border border-transparent hover:bg-[var(--pds-surface-2)] transition-all relative"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center pds-card"
        style={{ color: app.accentColor }}
      >
        {getEcosystemIcon(app.iconName, 20, app.accentColor)}
      </div>
      <span className="text-[11px] text-[var(--pds-text-primary)] font-medium text-center leading-tight">
        {app.name}
      </span>
      
      {/* Live Status Indicator */}
      <div className="absolute top-2.5 right-2.5">
        <div className={`pds-status-dot ${isLive ? "active" : ""}`} />
      </div>
    </a>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isWaffleOpen, setIsWaffleOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const waffleRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (waffleRef.current && !waffleRef.current.contains(e.target as Node)) setIsWaffleOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
  };

  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Devices", href: "/devices" },
    { label: "Settings", href: "/settings" },
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "–";

  return (
    <>
      <header className="sticky top-0 z-40 w-full nav-glass pds-animate-fade">
        <div className="w-full px-8 h-14 flex items-center justify-between gap-4">

          {/* Left: Logo + nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
              <div className="w-5 h-5 rounded-md pds-card flex items-center justify-center text-[var(--pds-text-primary)]">
                {getEcosystemIcon("Pseudonyms", 12, "currentColor")}
              </div>
              <span className="id-wordmark text-[var(--pds-text-primary)]">
                Pseudonyms
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-[13px] transition-all no-underline ${
                      isActive
                        ? "font-semibold text-[var(--pds-text-primary)] bg-[var(--pds-surface-2)] border border-[var(--pds-border-subtle)] shadow-sm"
                        : "font-medium text-[var(--pds-text-secondary)] hover:text-[var(--pds-text-primary)] hover:bg-[var(--pds-surface-2)] border border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Waffle + Profile */}
          <div className="flex items-center gap-3">

            {/* 9-dot Waffle */}
            <div ref={waffleRef} className="relative">
              <button
                onClick={() => { setIsWaffleOpen(!isWaffleOpen); setIsProfileOpen(false); }}
                className={`w-9 h-9 bg-transparent border rounded-lg cursor-pointer flex items-center justify-center transition-all ${
                  isWaffleOpen
                    ? "bg-[var(--pds-surface-2)] border-[var(--pds-border-subtle)] text-[var(--pds-text-primary)]"
                    : "border-transparent text-[var(--pds-text-secondary)] hover:bg-[var(--pds-surface-2)] hover:text-[var(--pds-text-primary)]"
                }`}
              >
                <div className="grid grid-cols-3 gap-[2.5px] w-[13px] h-[13px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
                  ))}
                </div>
              </button>

              {isWaffleOpen && (
                <div className="pds-animate-slide-up auth-card absolute right-0 top-[calc(100%+8px)] w-72 p-4 z-50">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--pds-text-secondary)] pb-3 border-b border-[var(--pds-border-subtle)] mb-3">
                    Ecosystem Connect
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {ECOSYSTEM_APPS.map((app) => (
                      <WaffleItem key={app.id} app={app} onClose={() => setIsWaffleOpen(false)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsWaffleOpen(false); }}
                className={`flex items-center gap-2.5 py-1 pl-3 pr-1.5 rounded-full cursor-pointer transition-all border ${
                  isProfileOpen
                    ? "bg-[var(--pds-surface-2)] border-[var(--pds-border-subtle)] shadow-sm"
                    : "bg-transparent border-transparent hover:bg-[var(--pds-surface-2)]"
                }`}
              >
                <span className="text-[13px] font-medium text-[var(--pds-text-primary)]">
                  {user?.email?.split("@")[0] ?? ""}
                </span>
                <div className="w-7 h-7 rounded-full bg-[var(--pds-accent)] flex items-center justify-center text-[10px] font-semibold text-[var(--pds-accent-inv)] font-mono tracking-wide">
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="pds-animate-slide-up auth-card absolute right-0 top-[calc(100%+12px)] w-64 p-5 z-50">
                  <div className="mb-4 pb-4 border-b border-[var(--pds-border-subtle)]">
                    <p className="text-[15px] font-semibold text-[var(--pds-text-primary)] mb-1">
                      {user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-[var(--pds-text-secondary)]">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 px-3 bg-transparent border border-transparent rounded-lg text-[13px] font-medium text-[var(--pds-text-secondary)] flex items-center gap-2 cursor-pointer transition-all hover:text-[var(--pds-danger)] hover:bg-[rgba(220,38,38,0.05)] hover:border-[rgba(220,38,38,0.3)]"
                  >
                    <LogOut size={14} />
                    Sign out globally
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
