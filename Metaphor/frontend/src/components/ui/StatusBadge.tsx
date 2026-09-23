"use client";

import React from "react";
import { Database, Shield, Target, Lightbulb, FileText, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeType =
  | "fact" | "decision" | "constraint" | "insight" | "evidence"
  | "pending" | "running" | "complete" | "failed" | "cancelled"
  | "history" | "under-review";

interface StatusBadgeProps {
  type: BadgeType;
  label?: string;
  dot?: boolean;
  size?: "sm" | "md";
}

// ── Flora-style badge config ──────────────────────────────────────────────────
// Sentence-case labels, rounded-full capsule, animated dot for running state only
// No UPPERCASE letter-spacing overuse — subtle, editorial

interface BadgeConfig {
  icon: React.ElementType;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
  defaultLabel: string;
}

const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  fact:          { icon: Database,     bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)", text: "rgba(148,163,184,0.80)", dotColor: "#94a3b8",   defaultLabel: "Fact"        },
  decision:      { icon: Shield,       bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.20)", text: "rgba(129,140,248,0.90)", dotColor: "#818cf8",   defaultLabel: "Decision"    },
  constraint:    { icon: Target,       bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)",  text: "rgba(245,158,11,0.85)", dotColor: "#f59e0b",   defaultLabel: "Constraint"  },
  insight:       { icon: Lightbulb,    bg: "rgba(76,175,125,0.07)",  border: "rgba(76,175,125,0.18)",  text: "rgba(76,175,125,0.90)", dotColor: "#4CAF7D",   defaultLabel: "Insight"     },
  evidence:      { icon: FileText,     bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.12)", text: "rgba(240,240,238,0.45)", dotColor: "#94a3b8",   defaultLabel: "Evidence"    },
  pending:       { icon: Clock,        bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)",  text: "rgba(245,158,11,0.85)", dotColor: "#f59e0b",   defaultLabel: "Pending"     },
  running:       { icon: Loader2,      bg: "rgba(76,175,125,0.09)",  border: "rgba(76,175,125,0.22)",  text: "rgba(76,175,125,0.95)", dotColor: "#4CAF7D",   defaultLabel: "Running"     },
  complete:      { icon: CheckCircle2, bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.20)",   text: "rgba(34,197,94,0.85)",  dotColor: "#22c55e",   defaultLabel: "Complete"    },
  failed:        { icon: XCircle,      bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.20)",   text: "rgba(244,63,94,0.85)",  dotColor: "#f43f5e",   defaultLabel: "Failed"      },
  cancelled:     { icon: XCircle,      bg: "rgba(148,163,184,0.05)", border: "rgba(148,163,184,0.10)", text: "rgba(148,163,184,0.55)", dotColor: "#94a3b8",   defaultLabel: "Cancelled"   },
  history:       { icon: Clock,        bg: "rgba(148,163,184,0.05)", border: "rgba(148,163,184,0.10)", text: "rgba(148,163,184,0.55)", dotColor: "#94a3b8",   defaultLabel: "History"     },
  "under-review":{ icon: Shield,       bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.18)",  text: "rgba(245,158,11,0.85)", dotColor: "#f59e0b",   defaultLabel: "Under review"},
};

// ── Component ─────────────────────────────────────────────────────────────────

export function StatusBadge({ type, label, dot = false, size = "sm" }: StatusBadgeProps) {
  const cfg = BADGE_CONFIG[type] ?? BADGE_CONFIG.fact;
  const Icon = cfg.icon;
  const displayLabel = label ?? cfg.defaultLabel;
  const isRunning = type === "running";

  const padX = size === "sm" ? "8px"  : "10px";
  const padY = size === "sm" ? "3px"  : "4px";
  const fontSize = size === "sm" ? "9px" : "10px";
  const iconSize = size === "sm" ? "10px" : "11px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize,
        fontWeight: 500,
        letterSpacing: "0.04em",
        /* Sentence-case — no text-transform uppercase */
        color: cfg.text,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "9999px", /* Flora capsule */
        padding: `${padY} ${padX}`,
        lineHeight: "1.4",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {dot ? (
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            width: "6px",
            height: "6px",
            flexShrink: 0,
          }}
        >
          {isRunning && (
            <span
              className="animate-ping"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: cfg.dotColor,
                opacity: 0.6,
              }}
            />
          )}
          <span
            style={{
              position: "relative",
              display: "inline-flex",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: cfg.dotColor,
              flexShrink: 0,
            }}
          />
        </span>
      ) : (
        <Icon
          style={{ width: iconSize, height: iconSize, flexShrink: 0 }}
          className={isRunning ? "animate-spin" : ""}
        />
      )}
      {displayLabel}
    </span>
  );
}
