"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { COLOR, APPS, AppId } from "./tokens";

/**
 * CommandPalette — ⌘K / Ctrl+K across all web apps.
 *
 * Design spec:
 *   - Full-screen scrim (obsidian 60% blur backdrop)
 *   - Centered modal: max-w 560px
 *   - Grouped results with left-border colored by app accent
 *   - Arrow keys + Enter navigation
 *   - Recent commands on empty input (not "No results")
 *   - Esc to close
 *
 * Usage: mount once at app root, listens for ⌘K globally.
 */

type CommandGroup = {
  id: string;
  label: string;
  accent: string;
  commands: Command[];
};

type Command = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  accent: string;
  action: () => void;
};

interface CommandPaletteProps {
  /** Override with app-specific commands */
  extraCommands?: CommandGroup[];
  currentApp?: AppId;
}

const RECENT_STORAGE_KEY = "psy_cmd_recent";
const MAX_RECENT = 5;

function useRecent() {
  const getRecent = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const addRecent = (id: string) => {
    const prev = getRecent().filter((r) => r !== id);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
  };
  return { getRecent, addRecent };
}

export function CommandPalette({ extraCommands = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addRecent } = useRecent();

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Build command list
  const NAV_COMMANDS: CommandGroup = {
    id: "navigation",
    label: "Navigate",
    accent: "rgba(255,255,255,0.3)",
    commands: Object.entries(APPS).map(([appId, app]) => ({
      id: `nav-${appId}`,
      label: `Open ${app.label}`,
      description: app.description,
      accent: app.accent,
      action: () => { window.location.href = app.url; },
    })),
  };

  const SYSTEM_COMMANDS: CommandGroup = {
    id: "system",
    label: "System",
    accent: "rgba(255,255,255,0.2)",
    commands: [
      { id: "settings", label: "Settings", accent: "rgba(255,255,255,0.3)", action: () => { window.location.href = "/settings"; } },
      { id: "signout", label: "Sign out", accent: COLOR.clario, action: () => { window.location.href = "/auth/signout"; } },
    ],
  };

  const allGroups = [NAV_COMMANDS, ...extraCommands, SYSTEM_COMMANDS];
  const allCommands = allGroups.flatMap((g) => g.commands);

  const filtered = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(query.toLowerCase()))
      )
    : allCommands;

  // Group filtered results
  const groupedFiltered: CommandGroup[] = allGroups
    .map((g) => ({
      ...g,
      commands: query.trim()
        ? g.commands.filter((c) => filtered.find((f) => f.id === c.id))
        : g.commands,
    }))
    .filter((g) => g.commands.length > 0);

  // Flat list for keyboard nav
  const flatFiltered = groupedFiltered.flatMap((g) => g.commands);

  const handleSelect = useCallback(
    (cmd: Command) => {
      addRecent(cmd.id);
      setOpen(false);
      cmd.action();
    },
    [addRecent]
  );

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatFiltered[activeIdx];
        if (cmd) handleSelect(cmd);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatFiltered, activeIdx, handleSelect]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
        backgroundColor: "rgba(7,8,12,0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          margin: "0 16px",
          background: "#10131b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
          animation: "cmdSlideIn 180ms cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "12px",
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, color: "rgba(255,255,255,0.25)" }}>
            <path d="M10 6.5C10 8.433 8.433 10 6.5 10S3 8.433 3 6.5 4.567 3 6.5 3 10 4.567 10 6.5zm-.776 3.724A5.5 5.5 0 1 1 10.72 9.22l3.03 3.03-.723.723-3.03-3.03z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="search commands, leads, drafts..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "15px",
              fontWeight: 300,
              color: "rgba(240,240,240,0.9)",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "-0.01em",
            }}
          />
          <kbd style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px",
            padding: "3px 6px",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "380px", overflowY: "auto", padding: "8px 0" }}>
          {groupedFiltered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
              no commands match "{query}"
            </div>
          ) : (
            groupedFiltered.map((group) => (
              <div key={group.id}>
                <div style={{
                  padding: "8px 20px 4px",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.1em",
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: "uppercase",
                }}>
                  {group.label}
                </div>
                {group.commands.map((cmd) => {
                  const isActive = globalIdx === activeIdx;
                  const thisIdx = globalIdx;
                  globalIdx++;
                  return (
                    <div
                      key={cmd.id}
                      onMouseEnter={() => setActiveIdx(thisIdx)}
                      onClick={() => handleSelect(cmd)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "9px 20px",
                        cursor: "pointer",
                        background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                        borderLeft: `2px solid ${isActive ? cmd.accent : "transparent"}`,
                        transition: "background 80ms ease",
                      }}
                    >
                      <div style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: cmd.accent,
                        flexShrink: 0,
                        opacity: isActive ? 1 : 0.4,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{
                          fontSize: "13px",
                          fontWeight: 400,
                          color: isActive ? "rgba(240,240,240,0.95)" : "rgba(240,240,240,0.65)",
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: "-0.01em",
                        }}>
                          {cmd.label}
                        </span>
                        {cmd.description && (
                          <span style={{
                            marginLeft: "8px",
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.2)",
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {cmd.description}
                          </span>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd style={{
                          marginLeft: "auto",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.2)",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontFamily: "'IBM Plex Mono', monospace",
                          whiteSpace: "nowrap",
                        }}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          gap: "16px",
        }}>
          {[
            ["↑↓", "navigate"],
            ["↵", "select"],
            ["esc", "close"],
          ].map(([key, label]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <kbd style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "4px",
                padding: "2px 5px",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {key}
              </kbd>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", fontFamily: "'Inter', sans-serif" }}>
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cmdSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
      `}</style>
    </div>
  );
}
