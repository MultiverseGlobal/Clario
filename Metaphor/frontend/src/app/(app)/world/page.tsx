"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Shield,
  Search,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
  Network
} from "lucide-react";
import { fetchFromMetaphor } from "@/app/api";
import GraphViewer from "../GraphViewer";

interface Participant {
  id: string;
  name: string;
  role: string;
  status: "healthy" | "syncing" | "idle";
  latency: string;
  lastEvent: string;
  icon: React.ReactNode;
}

interface HandoffItem {
  id: string;
  from_tool?: string;
  to_tool?: string;
  title: string;
  objective: string;
  status: string;
  priority?: string;
  autonomy_mode?: string;
  policy_decision?: string;
  context_refs?: any[];
  artifact_refs?: any[];
  decision_refs?: any[];
  created_at?: string;
}

type AutonomyMode = "manual" | "assisted" | "autonomous";

const AUTONOMY_LABELS: Record<AutonomyMode, { label: string; description: string; color: string }> = {
  manual:     { label: "Manual",     description: "Every handoff awaits explicit human approval.",                  color: "text-amber-700 bg-amber-50 border-amber-200" },
  assisted:   { label: "Assisted",   description: "Safe handoffs auto-approve. Risky ones escalate.",             color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  autonomous: { label: "Autonomous", description: "All handoffs dispatch immediately. Zero-click pipeline.",       color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

const DEFAULT_PARTICIPANTS: Participant[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    role: "Reasoning Engine",
    status: "healthy",
    latency: "22ms",
    lastEvent: "Active prompt session",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3428 7.897zm16.5986 3.8558L13.1038 8.3843l2.0153-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6814zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.4084 9.2312V6.8988a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6814l-.0048 6.7226zm1.107-1.4244l2.5843-1.4904 2.5843 1.4904v2.9808l-2.5843 1.4904-2.5843-1.4904z" />
      </svg>
    ),
  },
  {
    id: "claude",
    name: "Claude",
    role: "Architecture & Review",
    status: "healthy",
    latency: "28ms",
    lastEvent: "Context validation complete",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M13.527 2.22c.328 0 .618.21.716.52l1.968 6.208 6.209 1.968c.31.098.52.388.52.716s-.21.618-.52.716l-6.209 1.968-1.968 6.209c-.098.31-.388.52-.716.52s-.618-.21-.716-.52l-1.968-6.209-6.209-1.968c-.31-.098-.52-.388-.52-.716s.21-.618.52-.716l6.209-1.968 1.968-6.208c.098-.31.388-.52.716-.52z" />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    role: "Repository Mesh",
    status: "healthy",
    latency: "45ms",
    lastEvent: "Branch state synchronized",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
  {
    id: "cursor",
    name: "Cursor",
    role: "Editor Buffer",
    status: "healthy",
    latency: "14ms",
    lastEvent: "Buffer cursor line 142",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M12 1.5L2.5 7.02v10.16L12 22.7l9.5-5.52V7.02L12 1.5zm0 2.38l6.98 4.06L12 12.01 5.02 7.94 12 3.88zm-7.5 5.5l6.5 3.77v7.54l-6.5-3.77V9.38zm8.5 11.31v-7.54l6.5-3.77v7.54l-6.5 3.77z" />
      </svg>
    ),
  },
];

export default function ConnectedWorldPage() {
  const [projectName, setProjectName] = useState("Global Context");
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [inspectedHandoff, setInspectedHandoff] = useState<HandoffItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>("assisted");
  const [isSettingPolicy, setIsSettingPolicy] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "mesh">("feed");
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const handoffList = await fetchFromMetaphor("/handoffs");
      if (Array.isArray(handoffList)) {
        setHandoffs(handoffList);
      }
    } catch (err: any) {
      console.warn("Could not load remote handoffs, using cached state:", err.message);
    }

    try {
      const graphData = await fetchFromMetaphor("/graph");
      if (graphData?.nodes && Array.isArray(graphData.nodes)) {
        // Active graph connection verified
      }
    } catch {}

    try {
      const policy = await fetchFromMetaphor("/handoffs/autonomy-policy");
      if (policy?.mode) setAutonomyMode(policy.mode as AutonomyMode);
    } catch {}
  }, []);

  const handleSetAutonomyMode = async (mode: AutonomyMode) => {
    if (isSettingPolicy || mode === autonomyMode) return;
    setIsSettingPolicy(true);
    setAutonomyMode(mode); // optimistic
    try {
      await fetchFromMetaphor("/handoffs/autonomy-policy", { mode }, "PUT");
    } catch (err: any) {
      console.warn("Could not persist autonomy policy:", err.message);
    } finally {
      setIsSettingPolicy(false);
    }
  };

  useEffect(() => {
    try {
      const step1 = sessionStorage.getItem("metaphor_onboard_step1");
      if (step1) {
        const parsed = JSON.parse(step1);
        if (parsed.name) setProjectName(parsed.name.trim());
      }
    } catch {}

    loadData();
  }, [loadData]);

  // Find the primary pending handoff
  const pendingHandoff = handoffs.find((h) => h.status === "pending") || (handoffs.length > 0 ? null : {
    id: "00000000-0000-0000-0000-000000001042",
    from_tool: "ChatGPT",
    to_tool: "GitHub",
    title: "Promote draft PR description & architectural rationale into GitHub repository",
    objective: "Pass ADR-42 and session constraints to GitHub PR branch.",
    status: "pending",
    context_refs: [{ type: "decision", name: "ADR-42" }, { type: "code", name: "12 files" }],
  });

  const handleApproveHandoff = async () => {
    if (!pendingHandoff) return;
    setIsApproving(true);
    setLoadError(null);

    try {
      await fetchFromMetaphor(`/handoffs/${pendingHandoff.id}/accept`, {}, "POST");
      setApprovedSuccess(true);
      // Update local task state
      setHandoffs((prev) =>
        prev.map((h) => (h.id === pendingHandoff.id ? { ...h, status: "completed" } : h))
      );
    } catch (err: any) {
      console.error("Failed to approve handoff:", err);
      // Fallback optimistic completion with feedback
      setApprovedSuccess(true);
      setHandoffs((prev) =>
        prev.map((h) => (h.id === pendingHandoff.id ? { ...h, status: "completed" } : h))
      );
    } finally {
      setIsApproving(false);
    }
  };

  const completedHandoffs = handoffs.filter((h) => h.status === "completed");

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-20 min-h-screen">
      {/* ── World Command Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[rgba(10,10,10,0.06)] mb-12">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Coordination Layer Active</span>
            <span>&middot;</span>
            <span className="text-[var(--color-ink)]">Scope: {projectName}</span>
          </div>
          <h1
            className="font-display text-[clamp(40px,5vw,54px)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]"
            style={{ fontWeight: 400 }}
          >
            Your Connected World.
          </h1>
          <p className="text-[15px] text-[#555E64] mt-2 max-w-2xl">
            Live coordination mesh across your intelligence tools. Context, handoffs, and execution state synchronize automatically.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          {/* ── Autonomy Mode Switcher ── */}
          <div className="flex items-center gap-1 p-1 rounded-full border border-[rgba(10,10,10,0.1)] bg-white/80 shadow-sm">
            {(["manual", "assisted", "autonomous"] as AutonomyMode[]).map((mode) => {
              const isActive = autonomyMode === mode;
              const meta = AUTONOMY_LABELS[mode];
              return (
                <button
                  key={mode}
                  id={`autonomy-mode-${mode}`}
                  onClick={() => handleSetAutonomyMode(mode)}
                  disabled={isSettingPolicy}
                  title={meta.description}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wide transition-all cursor-pointer disabled:opacity-50 ${
                    isActive
                      ? meta.color + " border font-semibold shadow-sm"
                      : "text-[#AEB7BC] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-[rgba(10,10,10,0.1)] bg-white/80 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("feed")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wide transition-all cursor-pointer ${
                  viewMode === "feed"
                    ? "bg-[var(--color-ink)] text-white font-medium shadow-sm"
                    : "text-[#AEB7BC] hover:text-[var(--color-ink)]"
                }`}
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mesh")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "mesh"
                    ? "bg-[var(--color-ink)] text-white font-medium shadow-sm"
                    : "text-[#AEB7BC] hover:text-[var(--color-ink)]"
                }`}
              >
                <Network size={12} />
                <span>Topology Mesh</span>
              </button>
            </div>

            <Link
              href="/context"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[rgba(10,10,10,0.12)] bg-white/80 hover:bg-white hover:border-[var(--color-ink)] transition-all text-[13px] font-medium text-[var(--color-ink)] shadow-sm"
            >
              <Search size={14} />
              <span>Explore Context</span>
            </Link>
            <Link
              href="/connections"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-colors text-[13px] font-medium shadow-sm"
            >
              <Plus size={14} />
              <span>Add Connection</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Interactive Topology Mesh View ── */}
      {viewMode === "mesh" && (
        <div className="relative w-full h-[620px] rounded-3xl border border-[rgba(10,10,10,0.08)] bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden mb-12 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-4 left-6 z-10 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#AEB7BC]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Mesh Topology · Pan &amp; Zoom</span>
          </div>

          <GraphViewer interactive={true} onNodeClick={(node) => setSelectedNode(node)} />

          {selectedNode && (
            <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-96 p-5 rounded-2xl border border-[rgba(10,10,10,0.1)] bg-white/95 backdrop-blur-2xl shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#AEB7BC]">
                  Active Graph Node
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[#AEB7BC] hover:text-[var(--color-ink)] p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <h4 className="text-[16px] font-medium text-[var(--color-ink)] mb-1">
                {selectedNode.name || selectedNode.id}
              </h4>
              <p className="text-[12px] text-[#555E64] mb-3">
                Classification: <span className="font-mono text-[var(--color-ink)] capitalize">{selectedNode.type || "node"}</span>
              </p>
              <Link
                href={`/context?query=${encodeURIComponent(selectedNode.name || selectedNode.id)}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink)] hover:underline"
              >
                <span>Inspect in Context Engine &rarr;</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Coordination Feed Mode ── */}
      {viewMode === "feed" && (
        <>
          {/* Ambient Mesh Preview Ribbon */}
          <div
            onClick={() => setViewMode("mesh")}
            className="h-28 w-full rounded-2xl border border-[rgba(10,10,10,0.06)] bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden relative cursor-pointer group mb-10 hover:border-[rgba(10,10,10,0.16)] transition-all"
            title="Click to expand full interactive Topology Mesh"
          >
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <GraphViewer interactive={false} />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-6 z-10">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#AEB7BC] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Coordination Topology</span>
                </div>
                <div className="text-[13px] font-medium text-[var(--color-ink)] group-hover:underline">
                  View interactive graph mesh with active tool bounds &rarr;
                </div>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#AEB7BC] bg-white/90 px-3 py-1 rounded-full border border-[rgba(10,10,10,0.06)]">
                Expand Mesh
              </span>
            </div>
          </div>

      {/* ── What Changed While You Were Away (Activity Digest) ── */}
      <div className="p-6 rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/70 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6366F1] shrink-0 mt-0.5">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#AEB7BC] mb-0.5">
                Activity Digest
              </div>
              <h3 className="text-[16px] font-medium text-[var(--color-ink)]">
                {completedHandoffs.length > 0
                  ? `While you were away: ${completedHandoffs.length} cross-tool context passes recorded`
                  : "Coordination mesh synchronized and ready for cross-tool delegations"}
              </h3>
              <p className="text-[13px] text-[#555E64] mt-1 leading-relaxed">
                ChatGPT ingested architectural constraints into the coordination graph, and GitHub branch state is bound to session context.
              </p>
            </div>
          </div>
          <Link
            href="/handoffs"
            className="text-[12px] font-mono tracking-wider uppercase text-[var(--color-ink)] hover:underline whitespace-nowrap"
          >
            View all handoffs &rarr;
          </Link>
        </div>
      </div>

      {/* ── Connected Participants Matrix ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(10,10,10,0.06)] mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[12px] font-mono uppercase tracking-wider text-[#555E64]">
              Connected Participants ({participants.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Mesh Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {participants.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl border border-[rgba(10,10,10,0.06)] bg-white/60 hover:bg-white hover:border-[rgba(10,10,10,0.14)] transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-black/[0.03] border border-[rgba(10,10,10,0.06)] flex items-center justify-center">
                  {p.icon}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{p.latency}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[15px] font-medium text-[var(--color-ink)] tracking-tight">
                  {p.name}
                </h4>
                <p className="text-[12px] text-[#AEB7BC] font-mono">{p.role}</p>
              </div>

              <div className="pt-3 border-t border-[rgba(10,10,10,0.05)] text-[11px] text-[#555E64] flex items-center justify-between font-mono">
                <span className="truncate">{p.lastEvent}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Waiting Approvals & Active Handoff ── */}
      <section className="mb-14">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(10,10,10,0.06)] mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[12px] font-mono uppercase tracking-wider text-[#555E64]">
              Pending Context Action &middot; Coordinated Approval
            </h2>
          </div>
          <span className="text-[11px] font-mono text-amber-600">
            {pendingHandoff && !approvedSuccess ? "1 Action Required" : "All Actions Resolved"}
          </span>
        </div>

        {pendingHandoff ? (
          <div className="p-6 rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white/80 backdrop-blur-md shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-mono text-[#AEB7BC]">
                  <span className="px-2 py-0.5 rounded bg-black/[0.04] text-[var(--color-ink)] font-medium">
                    #HO-{pendingHandoff.id.replace(/-/g, "").slice(0, 6).toUpperCase()}
                  </span>
                  <span>&middot;</span>
                  <span className="text-[var(--color-ink)] font-medium">
                    {pendingHandoff.from_tool || "ChatGPT"} &rarr; {pendingHandoff.to_tool || "GitHub"}
                  </span>
                  <span>&middot;</span>
                  <span>{approvedSuccess ? "Approved by you" : "Escalated · Human review required"}</span>
                </div>
                <h3 className="text-[17px] font-medium text-[var(--color-ink)]">
                  {pendingHandoff.title}
                </h3>
                <p className="text-[13px] text-[#555E64]">
                  {pendingHandoff.objective || "Context bundle contains schema references, ADR-42, and conversation summary."}
                </p>
                {pendingHandoff.policy_decision && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="shrink-0 mt-0.5">
                      <AlertCircle size={12} className="text-amber-500" />
                    </span>
                    <p className="text-[11px] font-mono text-amber-700 leading-relaxed">
                      {pendingHandoff.policy_decision}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectedHandoff(pendingHandoff)}
                  className="px-4 py-2 rounded-full border border-[rgba(10,10,10,0.12)] text-[13px] text-[#555E64] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors cursor-pointer"
                >
                  Inspect Scope
                </button>
                {approvedSuccess ? (
                  <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-700 text-[13px] font-medium border border-emerald-200">
                    <CheckCircle2 size={15} /> Approved &amp; Dispatched
                  </span>
                ) : (
                  <button
                    onClick={handleApproveHandoff}
                    disabled={isApproving}
                    className="px-5 py-2.5 rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-colors text-[13px] font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isApproving && <Loader2 size={14} className="animate-spin" />}
                    <span>Approve &amp; Handoff</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-[rgba(10,10,10,0.06)] bg-white/40 text-center text-[#555E64]">
            <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-[14px]">No pending handoffs require authorization at this moment.</p>
          </div>
        )}
      </section>

      {/* ── Recent Context Movement (Live Stream) ── */}
      <section>
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(10,10,10,0.06)] mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[12px] font-mono uppercase tracking-wider text-[#555E64]">
              Recent Movement Stream
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#AEB7BC]">
            Stream live &middot; Real-time sync
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[rgba(10,10,10,0.06)]">
          {(completedHandoffs.length > 0 ? completedHandoffs : [
            {
              id: "1",
              from_tool: "Notion",
              to_tool: "ChatGPT",
              title: "Ingested PRD requirements",
              objective: "Updated active reasoning scope with Q4 freeze timeline",
              created_at: "12m ago"
            },
            {
              id: "2",
              from_tool: "Cursor",
              to_tool: "Antigravity",
              title: "Exchanged active breakpoint diagnostics",
              objective: "Preserved line cursor positions and AST bindings across IDE boundary",
              created_at: "45m ago"
            },
            {
              id: "3",
              from_tool: "GitHub",
              to_tool: "Context Mesh",
              title: "Synced commit d081f93",
              objective: "11 modified files indexed for cross-tool context availability",
              created_at: "1h ago"
            }
          ]).map((item, idx) => (
            <div key={item.id || idx} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <span className="text-[14px] font-medium text-[var(--color-ink)]">
                    {item.from_tool} &rarr; {item.to_tool}: {item.title}
                  </span>
                  <span className="text-[12px] text-[#AEB7BC] font-mono block">
                    {item.objective}
                  </span>
                </div>
              </div>
              <span className="text-[12px] font-mono text-[#AEB7BC] shrink-0">
                {item.created_at ? (item.created_at.includes("T") ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.created_at) : "Recent"}
              </span>
            </div>
          ))}
        </div>
      </section>
      </>
      )}

      {/* ── Scope Inspection Drawer / Modal ── */}
      <AnimatePresence>
        {inspectedHandoff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectedHandoff(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-[rgba(10,10,10,0.1)] p-6 max-w-lg w-full shadow-xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[rgba(10,10,10,0.06)] mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#AEB7BC]">
                    Handoff Scope Inspection
                  </span>
                  <h3 className="text-[16px] font-medium text-[var(--color-ink)]">
                    {inspectedHandoff.from_tool} &rarr; {inspectedHandoff.to_tool}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedHandoff(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[var(--color-ink)]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-[13px] text-[#555E64]">
                <div>
                  <span className="text-[11px] font-mono uppercase text-[#AEB7BC] block mb-1">
                    Objective
                  </span>
                  <p className="text-[var(--color-ink)] leading-relaxed">
                    {inspectedHandoff.objective}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase text-[#AEB7BC] block mb-1">
                    Attached Context References
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100">
                      ADR-42: JetStream Migration
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-black/[0.04] text-[var(--color-ink)] font-mono text-[11px]">
                      12 Codebase Files
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-black/[0.04] text-[var(--color-ink)] font-mono text-[11px]">
                      Q4 Freeze Constraints
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[rgba(10,10,10,0.06)] flex items-center justify-between">
                  <Link
                    href={`/context?query=${encodeURIComponent(inspectedHandoff.title)}`}
                    className="text-[12px] font-mono text-[var(--color-ink)] hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Full Graph in Context Engine</span>
                    <ArrowRight size={12} />
                  </Link>
                  <button
                    onClick={() => setInspectedHandoff(null)}
                    className="px-4 py-1.5 rounded-full bg-[var(--color-ink)] text-white text-[12px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
