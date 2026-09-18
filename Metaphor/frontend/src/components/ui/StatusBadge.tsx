"use client";

import React from "react";
import { Database, Shield, Target, Lightbulb, FileText, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

const BADGE_CONFIG: Record<BadgeType, { icon: React.ElementType; color: string; dotColor: string; defaultLabel: string }> = {
  fact:         { icon: Database,      color: "text-info border-border-subtle bg-surface-2",          dotColor: "bg-info",      defaultLabel: "Fact" },
  decision:     { icon: Shield,        color: "text-accent border-accent/20 bg-accent/5",             dotColor: "bg-accent",    defaultLabel: "Decision" },
  constraint:   { icon: Target,        color: "text-warning border-warning/20 bg-warning/5",          dotColor: "bg-warning",   defaultLabel: "Constraint" },
  insight:      { icon: Lightbulb,     color: "text-foreground border-border-subtle bg-surface-2",    dotColor: "bg-foreground",defaultLabel: "Insight" },
  evidence:     { icon: FileText,      color: "text-muted border-border-subtle bg-surface-2",         dotColor: "bg-muted",     defaultLabel: "Evidence" },
  pending:      { icon: Clock,         color: "text-warning border-warning/20 bg-warning/5",          dotColor: "bg-warning",   defaultLabel: "Pending" },
  running:      { icon: Loader2,       color: "text-foreground border-border-strong bg-surface-2",    dotColor: "bg-foreground",defaultLabel: "Running" },
  complete:     { icon: CheckCircle2,  color: "text-success border-success/20 bg-success/5",          dotColor: "bg-success",   defaultLabel: "Complete" },
  failed:       { icon: XCircle,       color: "text-danger border-danger/20 bg-danger/5",             dotColor: "bg-danger",    defaultLabel: "Failed" },
  cancelled:    { icon: XCircle,       color: "text-muted border-border-subtle bg-surface-2",         dotColor: "bg-muted",     defaultLabel: "Cancelled" },
  history:      { icon: Clock,         color: "text-muted border-border-subtle bg-surface-2",         dotColor: "bg-muted",     defaultLabel: "History" },
  "under-review":{ icon: Shield,       color: "text-warning border-warning/20 bg-warning/5",          dotColor: "bg-warning",   defaultLabel: "Under Review" },
};

export function StatusBadge({ type, label, dot = false, size = "sm" }: StatusBadgeProps) {
  const cfg = BADGE_CONFIG[type] ?? BADGE_CONFIG.fact;
  const Icon = cfg.icon;
  const displayLabel = label ?? cfg.defaultLabel;
  const isRunning = type === "running";

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-widest border rounded-sm ${cfg.color} ${
      size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"
    }`}>
      {dot ? (
        <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
          {isRunning && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dotColor}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dotColor}`} />
        </span>
      ) : (
        <Icon className={`shrink-0 ${size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} ${isRunning ? "animate-spin" : ""}`} />
      )}
      {displayLabel}
    </span>
  );
}
