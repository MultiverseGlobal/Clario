"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFromMetaphor } from "@/app/api";
import {
  Activity, ArrowRight, FileText, Bot, Clock, ChevronDown, ChevronUp,
  Copy, Check, Layers, Sparkles, Shield, Cpu, RefreshCw
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";

type HandoffStatus = "pending" | "running" | "complete" | "failed" | "cancelled";

type HandoffArtifact = {
  name: string;
  type: string;
  size?: string;
};

type Handoff = {
  id: string;
  source_agent: string;
  target_agent: string;
  task_goal: string;
  status: HandoffStatus;
  artifacts: HandoffArtifact[];
  created_at: string;
  completed_at?: string;
  payload?: string;
  execution_ms?: number;
};

const MOCK_HANDOFFS: Handoff[] = [
  {
    id: "h-1043",
    source_agent: "Antigravity IDE",
    target_agent: "Metaphor UI",
    task_goal: "Orchestrate spatial Context OS tokens & cinematic springs",
    status: "running",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    artifacts: [
      { name: "AmbientField.tsx", type: "typescript", size: "4.2 KB" },
      { name: "globals.css", type: "stylesheet", size: "11.8 KB" },
      { name: "FirstEntrySequence.tsx", type: "typescript", size: "6.1 KB" },
    ],
    payload: "Rebuilt the global depth model using PDS-v5 standards. Framer Motion Level 3 springs injected across observatory and provenance inspector.",
    execution_ms: 720,
  },
  {
    id: "h-1042",
    source_agent: "Claude (Cursor)",
    target_agent: "Orion Companion",
    task_goal: "Summarise architectural decisions into ADR 42",
    status: "complete",
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 88).toISOString(),
    artifacts: [
      { name: "ADR-042-context-mesh.md", type: "markdown", size: "14.2 KB" },
      { name: "nats_topology.json", type: "schema", size: "2.8 KB" },
    ],
    payload: "Formalized NATS JetStream migration and universal entity sync schema for sovereign nodes across the ecosystem.",
    execution_ms: 420000,
  },
  {
    id: "h-1041",
    source_agent: "Metaphor Engine",
    target_agent: "Atlas IO",
    task_goal: "Propagate live customer constraints into relationship graph",
    status: "complete",
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 235).toISOString(),
    artifacts: [
      { name: "enterprise_constraints.bin", type: "binary", size: "128 KB" },
    ],
    payload: "Extracted 14 boundary conditions from latest design review transcript and verified against sovereign privacy model.",
    execution_ms: 312000,
  },
  {
    id: "h-1040",
    source_agent: "Clario Studio",
    target_agent: "Antigravity IDE",
    task_goal: "Deliver video canvas asset cache for /world node shaders",
    status: "failed",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 17.9).toISOString(),
    artifacts: [],
    payload: "Asset extraction timeout: Port 49843 failed to respond with WebGL pipeline handshake within 15000ms.",
    execution_ms: 15000,
  }
];

// ── Living Flow Diagram ───────────────────────────────────────────────────

function HandoffFlow({ handoff }: { handoff: Handoff }) {
  const isRunning = handoff.status === "running";

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto py-6">
      {/* Source Agent */}
      <div className="flex flex-col items-center gap-2.5 relative z-10 w-32">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300 ${
          isRunning
            ? "bg-surface-2 border-foreground text-foreground shadow-md ring-2 ring-foreground/10"
            : "bg-surface-1 border-border-subtle text-muted"
        }`}>
          <Bot className="w-5 h-5" />
        </div>
        <div className="text-center">
          <span className="text-xs font-medium text-foreground block truncate max-w-[120px]">{handoff.source_agent}</span>
          <span className="text-[9px] font-mono text-muted uppercase tracking-wider">Source Runtime</span>
        </div>
      </div>

      {/* Pulsing Signal Path */}
      <div className="flex-1 relative flex items-center justify-center mx-4">
        <svg className="absolute w-full h-8 top-1/2 -translate-y-1/2 overflow-visible" aria-hidden="true">
          <line
            x1="0" y1="50%" x2="100%" y2="50%"
            stroke="var(--color-border-strong)"
            strokeWidth="1.5"
            strokeDasharray={isRunning ? "5 5" : "none"}
            opacity={isRunning ? 0.8 : 0.4}
          />
          {isRunning && (
            <motion.circle
              cx="0" cy="50%" r="3.5"
              fill="var(--color-foreground)"
              animate={{ cx: ["0%", "100%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          )}
        </svg>

        <div className="bg-surface-1/90 backdrop-blur-md border border-border-subtle px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-muted z-10 shadow-sm whitespace-nowrap flex items-center gap-1.5">
          <Sparkles className={`w-3 h-3 ${isRunning ? "text-accent animate-spin" : "text-muted"}`} />
          <span>{handoff.artifacts.length} Artifact{handoff.artifacts.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Target Agent */}
      <div className="flex flex-col items-center gap-2.5 relative z-10 w-32">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-300 ${
          isRunning
            ? "bg-foreground border-foreground text-background shadow-lg ring-4 ring-foreground/10"
            : "bg-surface-1 border-border-subtle text-muted"
        }`}>
          <Cpu className="w-5 h-5" />
        </div>
        <div className="text-center">
          <span className="text-xs font-medium text-foreground block truncate max-w-[120px]">{handoff.target_agent}</span>
          <span className="text-[9px] font-mono text-muted uppercase tracking-wider">Target Node</span>
        </div>
      </div>
    </div>
  );
}

// ── Expandable Dossier Item ───────────────────────────────────────────────

function HandoffTimelineItem({ handoff, isLatest }: { handoff: Handoff; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(handoff.status === "running");
  const [copied, setCopied] = useState(false);

  const handleCopyPayload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!handoff.payload) return;
    navigator.clipboard.writeText(handoff.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = handoff.status === "running";

  return (
    <div className="relative flex items-start gap-4 md:gap-6 group">
      {/* Timeline Rail Bead */}
      <div className="relative flex flex-col items-center mt-4 shrink-0">
        <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
          isRunning
            ? "bg-foreground border-foreground shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-110"
            : handoff.status === "complete"
            ? "bg-surface-1 border-border-strong"
            : "bg-danger/20 border-danger"
        }`} />
        <div className="w-px h-full bg-border-subtle absolute top-4 bottom-[-1.5rem]" />
      </div>

      {/* Handoff Card */}
      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`flex-1 rounded-xl border transition-all duration-200 overflow-hidden ${
          isRunning
            ? "bg-surface-1/90 border-border-strong shadow-float ring-1 ring-border-strong/50"
            : "bg-surface-1/50 border-border-subtle hover:border-border-strong hover:bg-surface-1/80"
        } backdrop-blur-md`}
      >
        <div
          className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 flex-col sm:flex-row">
            <div className="flex items-center gap-2.5 shrink-0">
              <StatusBadge type={handoff.status} dot />
              <span className="text-[10px] font-mono text-muted">
                {new Date(handoff.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{handoff.source_agent}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{handoff.target_agent}</span>
              <span className="text-sm text-muted truncate border-l border-border-subtle pl-2.5 hidden md:block">
                {handoff.task_goal}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {handoff.artifacts.length > 0 && (
              <span className="text-[10px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded hidden sm:inline-block">
                {handoff.artifacts.length} file{handoff.artifacts.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
              aria-label={expanded ? "Collapse handoff details" : "Expand handoff details"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-border-subtle bg-surface-2/30"
            >
              <div className="p-5 sm:p-6 space-y-6">
                {/* Active Flow Visualization */}
                {isRunning && (
                  <div className="border-b border-border-subtle/80 pb-6">
                    <HandoffFlow handoff={handoff} />
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Objective & Payload Dossier */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1.5">
                        Execution Goal
                      </h4>
                      <p className="text-sm text-foreground font-medium leading-relaxed">
                        {handoff.task_goal}
                      </p>
                    </div>

                    {handoff.payload && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-[9px] font-mono uppercase tracking-widest text-muted">
                            Transferred Payload
                          </h4>
                          <button
                            type="button"
                            onClick={handleCopyPayload}
                            className="text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? "Copied" : "Copy Payload"}</span>
                          </button>
                        </div>
                        <div className="text-xs text-foreground/85 bg-surface-1 border border-border-subtle p-3.5 rounded-lg font-mono leading-relaxed break-words shadow-inner">
                          {handoff.payload}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Artifacts & Audit Signatures */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1.5">
                        Artifact Dossier
                      </h4>
                      {handoff.artifacts.length > 0 ? (
                        <div className="space-y-2">
                          {handoff.artifacts.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2.5 bg-surface-1 border border-border-subtle rounded-lg text-xs"
                            >
                              <FileText className="w-4 h-4 text-muted shrink-0" />
                              <span className="font-mono text-foreground flex-1 truncate">{a.name}</span>
                              {a.size && (
                                <span className="text-[10px] font-mono text-muted">{a.size}</span>
                              )}
                              <span className="text-[9px] uppercase font-mono tracking-wider text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                                {a.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic p-3 bg-surface-1 border border-border-subtle rounded-lg">
                          No binary artifacts associated with this transition.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] font-mono text-muted">
                      <span>ID: {handoff.id}</span>
                      {handoff.execution_ms && (
                        <span>Latency: {handoff.execution_ms > 1000 ? `${(handoff.execution_ms / 1000).toFixed(1)}s` : `${handoff.execution_ms}ms`}</span>
                      )}
                      {handoff.completed_at && (
                        <span>Completed: {new Date(handoff.completed_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Main Work & Operational Continuity Page ───────────────────────────────

export default function WorkEnvironment() {
  const [loading, setLoading] = useState(true);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | HandoffStatus>("all");

  useEffect(() => {
    async function fetchWork() {
      try {
        const res = await fetchFromMetaphor("/graph/handoffs?limit=50");
        if (res?.handoffs?.length > 0) {
          setHandoffs(res.handoffs);
        } else {
          setHandoffs(MOCK_HANDOFFS);
        }
      } catch {
        setHandoffs(MOCK_HANDOFFS);
      } finally {
        setLoading(false);
      }
    }
    fetchWork();
  }, []);

  const runningCount = useMemo(() => handoffs.filter(h => h.status === "running").length, [handoffs]);
  const completedCount = useMemo(() => handoffs.filter(h => h.status === "complete").length, [handoffs]);

  const filteredHandoffs = useMemo(() => {
    if (statusFilter === "all") return handoffs;
    return handoffs.filter(h => h.status === statusFilter);
  }, [handoffs, statusFilter]);

  if (loading) {
    return <LoadingState context="handoffs" className="min-h-screen" />;
  }

  return (
    <div className="relative w-full min-h-screen pt-28 pb-32 px-6 md:px-12 lg:px-20 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Editorial Header */}
        <header className="border-b border-border-subtle pb-8">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted mb-3">
            <Shield className="w-3.5 h-3.5 text-foreground" />
            <span>Operational Continuity · Ecosystem Timeline</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1
                className="text-4xl md:text-5xl font-display text-foreground tracking-tight mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Work & Handoffs
              </h1>
              <p className="text-base text-muted max-w-xl leading-relaxed">
                State transitions and artifact transmission across autonomous agents in the sovereign mesh.
              </p>
            </div>

            {/* Metric Capsules */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-surface-1 border border-border-subtle backdrop-blur-md">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted block">Active Now</span>
                <span className="text-lg font-mono font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  {runningCount}
                </span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-surface-1 border border-border-subtle backdrop-blur-md">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted block">Resolved</span>
                <span className="text-lg font-mono font-semibold text-foreground">
                  {completedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-8 pt-4 border-t border-border-subtle/50 overflow-x-auto pb-1">
            {(["all", "running", "complete", "failed"] as const).map((filter) => {
              const count = filter === "all" ? handoffs.length : handoffs.filter(h => h.status === filter).length;
              const isActive = statusFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? "bg-foreground text-background font-semibold shadow-sm"
                      : "bg-surface-1 text-muted hover:text-foreground hover:bg-surface-2 border border-border-subtle"
                  }`}
                >
                  {filter} ({count})
                </button>
              );
            })}
          </div>
        </header>

        {/* Timeline Stream */}
        <section>
          <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-6">
            <Activity className="w-4 h-4 text-muted" />
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted">
              Live State Progression
            </h2>
          </div>

          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.07 } }
            }}
          >
            {filteredHandoffs.map((h, index) => (
              <motion.div
                key={h.id}
                variants={{
                  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
                  show: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                  }
                }}
              >
                <HandoffTimelineItem handoff={h} isLatest={index === 0} />
              </motion.div>
            ))}

            {filteredHandoffs.length === 0 && (
              <div className="text-muted text-sm italic py-12 text-center border border-dashed border-border-subtle rounded-xl bg-surface-1/40">
                No handoffs match the selected filter.
              </div>
            )}
          </motion.div>
        </section>

      </div>
    </div>
  );
}
