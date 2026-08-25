"use client";

import React, { useEffect, useState } from "react";
import { Search, Monitor, Smartphone, Key, ShieldCheck, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getEcosystemIcon } from "./EcosystemIcons";

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { id: "atlas", icon: getEcosystemIcon("Atlas", 16, "#C4841F"), label: "Open Atlas io", category: "Ecosystem", action: () => window.open("https://atlas-scale.vercel.app", "_blank") },
    { id: "metaphor", icon: getEcosystemIcon("Metaphor", 16, "#4E6CF2"), label: "Open Metaphor", category: "Ecosystem", action: () => window.open("https://metaphor-three.vercel.app", "_blank") },
    { id: "orion", icon: getEcosystemIcon("Orion", 16, "#863bff"), label: "Push session to Orion", category: "Handoff", action: () => { router.push("/devices"); onClose(); } },
    { id: "keys", icon: <Key size={16} />, label: "Manage API Keys", category: "Settings", action: () => { router.push("/settings"); onClose(); } },
    { id: "lock", icon: <ShieldCheck size={16} />, label: "Lock global session", category: "Security", action: () => { /* Add signout */ onClose(); } },
  ].filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % commands.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + commands.length) % commands.length);
    }
    if (e.key === "Enter" && commands[selectedIndex]) {
      e.preventDefault();
      commands[selectedIndex].action();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="animate-blur-in"
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(248, 247, 244, 0.4)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh"
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-enter"
        style={{
          width: "100%", maxWidth: "560px",
          background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
          borderRadius: "16px", boxShadow: "var(--shadow-float)", overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              fontSize: "16px", color: "var(--text-primary)", padding: "0 16px", fontFamily: "var(--font-sans)"
            }}
          />
          <div style={{ display: "flex", gap: "4px" }}>
            <span style={{ fontSize: "10px", padding: "4px 6px", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "4px", color: "var(--text-muted)" }}>ESC</span>
          </div>
        </div>

        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "8px" }}>
          {commands.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
              No commands found.
            </div>
          ) : (
            commands.map((cmd, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 16px", background: isSelected ? "var(--bg-hover)" : "transparent",
                    border: "none", borderRadius: "10px", cursor: "pointer",
                    textAlign: "left", transition: "background 0.1s"
                  }}
                >
                  <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    {cmd.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: "14px", fontWeight: 500, color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                      {cmd.label}
                    </span>
                    <span className="label-mono" style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                      {cmd.category}
                    </span>
                  </div>
                  {isSelected && <ArrowRight size={14} color="var(--accent)" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
