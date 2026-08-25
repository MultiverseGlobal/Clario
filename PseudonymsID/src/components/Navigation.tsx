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
      className="interactive-card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px 6px",
        borderRadius: "12px",
        textDecoration: "none",
        background: "transparent",
        border: "1px solid transparent",
        position: "relative"
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
          color: app.accentColor,
          overflow: "hidden",
        }}
      >
        {getEcosystemIcon(app.iconName, 20, app.accentColor)}
      </div>
      <span style={{ fontSize: "11px", color: "var(--text-primary)", fontWeight: 500, textAlign: "center", lineHeight: 1.1 }}>
        {app.name}
      </span>
      
      {/* Live Status Indicator */}
      <div style={{
        position: "absolute", top: "10px", right: "10px"
      }}>
        <div className={`status-dot ${isLive ? "active" : "inactive"}`} />
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

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 40,
    width: "100%",
    background: "rgba(248, 247, 244, 0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderBottom: "1px solid var(--border-subtle)",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "100%",
    padding: "0 32px",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  };

  return (
    <>
      <header style={headerStyle} className="animate-blur-in">
        <div style={innerStyle}>

          {/* Left: Logo + nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "6px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "var(--shadow-sm)",
                  color: "var(--text-primary)"
                }}
              >
                {getEcosystemIcon("Pseudonyms", 12, "var(--text-primary)")}
              </div>
              <span className="label-mono" style={{ color: "var(--text-primary)", fontSize: "11px", letterSpacing: "0.15em" }}>
                Pseudonyms
              </span>
            </Link>

            {/* Nav links */}
            <nav style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      textDecoration: "none",
                      background: isActive ? "var(--bg-surface)" : "transparent",
                      boxShadow: isActive ? "var(--shadow-sm)" : "none",
                      border: isActive ? "1px solid var(--border-subtle)" : "1px solid transparent",
                      transition: "all 0.2s var(--ease-out)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Waffle + Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

            {/* 9-dot Waffle */}
            <div ref={waffleRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setIsWaffleOpen(!isWaffleOpen); setIsProfileOpen(false); }}
                style={{
                  width: "36px",
                  height: "36px",
                  background: "transparent",
                  border: "1px solid transparent",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isWaffleOpen ? "var(--text-primary)" : "var(--text-secondary)",
                  transition: "all 0.2s var(--ease-out)",
                }}
                onMouseEnter={(e) => { (e.currentTarget).style.background = "var(--bg-surface-2)"; }}
                onMouseLeave={(e) => { if (!isWaffleOpen) (e.currentTarget).style.background = "transparent"; }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2.5px", width: "13px", height: "13px" }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: "2.5px",
                        height: "2.5px",
                        borderRadius: "50%",
                        background: "currentColor",
                      }}
                    />
                  ))}
                </div>
              </button>

              {isWaffleOpen && (
                <div
                  className="animate-enter"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: "280px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "16px",
                    boxShadow: "var(--shadow-float)",
                    zIndex: 50,
                  }}
                >
                  <p className="label-mono" style={{ padding: "0 4px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "12px" }}>
                    Ecosystem Connect
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {ECOSYSTEM_APPS.map((app) => (
                      <WaffleItem key={app.id} app={app} onClose={() => setIsWaffleOpen(false)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} style={{ position: "relative" }}>
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsWaffleOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "4px 6px 4px 12px",
                  background: isProfileOpen ? "var(--bg-surface)" : "transparent",
                  border: isProfileOpen ? "1px solid var(--border-subtle)" : "1px solid transparent",
                  boxShadow: isProfileOpen ? "var(--shadow-sm)" : "none",
                  borderRadius: "24px",
                  cursor: "pointer",
                  transition: "all 0.2s var(--ease-out)",
                }}
                onMouseEnter={(e) => { if (!isProfileOpen) (e.currentTarget).style.background = "var(--bg-surface-2)"; }}
                onMouseLeave={(e) => { if (!isProfileOpen) (e.currentTarget).style.background = "transparent"; }}
              >
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                  {user?.email?.split("@")[0] ?? ""}
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--bg-canvas)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div
                  className="animate-enter"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 12px)",
                    width: "260px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "var(--shadow-float)",
                    zIndex: 50,
                  }}
                >
                  <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                      {user?.email?.split("@")[0]}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={handleSignOut}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s var(--ease-out)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget).style.color = "var(--red)";
                      (e.currentTarget).style.borderColor = "var(--red)";
                      (e.currentTarget).style.background = "rgba(239, 68, 68, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget).style.color = "var(--text-secondary)";
                      (e.currentTarget).style.borderColor = "var(--border-subtle)";
                      (e.currentTarget).style.background = "transparent";
                    }}
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
