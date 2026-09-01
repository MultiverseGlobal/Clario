"use client";

import React, { useState, useEffect, useRef } from "react";
import { COLOR, APPS, AppId } from "./tokens";

/**
 * EcosystemSwitcher — The 9-dot waffle present in every web app header.
 *
 * Design spec:
 *   - Trigger: 3×3 dot grid icon (no tooltip needed — every power tool has one)
 *   - Panel: floating popover, slides down 280ms spring, closes on Esc/outside click
 *   - Each app tile shows: accent dot + name + description
 *   - Active app: hairline border in its accent color (non-tappable)
 *   - Keyboard: Tab through tiles, Enter to navigate, Esc to close
 */

interface EcosystemSwitcherProps {
  currentApp?: AppId;
}

const GRID_ORDER: AppId[] = ["orion", "atlas", "clario", "metaphor", "weave", "id"];

export function EcosystemSwitcher({ currentApp }: EcosystemSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* ── Trigger: 3×3 dot grid ─────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch app"
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: `1px solid ${open ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "border-color 150ms ease, background 150ms ease",
          padding: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "transparent"; } }}
      >
        {/* 3×3 grid of dots */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", width: "14px" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      </button>

      {/* ── Panel ────────────────────────────────────────────── */}
      {mounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pseudonyms ecosystem"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "280px",
            background: "#10131b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            zIndex: 9999,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
            transition: "opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{
              fontSize: "11px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.12em",
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "lowercase",
            }}>
              pseudonyms
            </span>
          </div>

          {/* App grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {GRID_ORDER.map((appId) => {
              const app = APPS[appId];
              const isActive = appId === currentApp;

              return (
                <a
                  key={appId}
                  href={isActive ? undefined : app.url}
                  tabIndex={isActive ? -1 : 0}
                  aria-disabled={isActive}
                  onClick={() => !isActive && setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: isActive ? `1px solid ${app.accent}40` : "1px solid transparent",
                    background: isActive ? `${app.accent}08` : "transparent",
                    cursor: isActive ? "default" : "pointer",
                    textDecoration: "none",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Accent dot */}
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: app.accent,
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 8px ${app.accent}80` : "none",
                  }} />

                  {/* Text */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: isActive ? "rgba(240,240,240,0.95)" : "rgba(240,240,240,0.65)",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                      marginBottom: "3px",
                    }}>
                      {app.label}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1,
                    }}>
                      {app.description}
                    </div>
                  </div>

                  {/* Active badge */}
                  {isActive && (
                    <div style={{
                      marginLeft: "auto",
                      fontSize: "9px",
                      color: app.accent,
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: "0.08em",
                    }}>
                      here
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
