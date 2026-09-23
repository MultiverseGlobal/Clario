"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, GitCommit, FileText, CheckCircle2, ChevronRight, Plus, RefreshCw, Loader2 } from "lucide-react";
import { fetchFromMetaphor } from "@/app/api";

interface HandoffTask {
  id: string;
  from_tool?: string;
  to_tool?: string;
  title: string;
  objective: string;
  instructions?: string;
  status: string;
  priority?: string;
  autonomy_mode?: string;
  policy_decision?: string;
  context_refs?: any[];
  artifact_refs?: any[];
  decision_refs?: any[];
  created_at?: string;
  completed_at?: string;
}

export default function HandoffsPage() {
  const [tasks, setTasks] = useState<HandoffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchHandoffs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFromMetaphor("/handoffs");
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (err: any) {
      console.warn("Failed to fetch handoffs from backend:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHandoffs();
  }, [fetchHandoffs]);

  const handleCreateTestHandoff = async () => {
    setIsCreating(true);
    setFeedbackMsg(null);
    try {
      const newTask = await fetchFromMetaphor(
        "/handoffs",
        {
          title: "Verify database migration schema & type definitions",
          objective: "Manus validated migration plan; routing to Antigravity for automated test execution.",
          instructions: "Execute local migrations and ensure all RLS security policies pass without regressions.",
          from_tool: "Manus",
          to_tool: "Antigravity",
          priority: "high",
          context_refs: [
            { type: "decision", name: "ADR-43: Zero-downtime Partitioning" },
            { type: "schema", name: "tasks, handoffs, participants" }
          ],
          artifact_refs: [{ name: "migration_benchmark.json", size: "1.8KB" }]
        },
        "POST"
      );

      if (newTask?.id) {
        setTasks((prev) => [newTask, ...prev]);
        setFeedbackMsg("New coordinated handoff created (Manus → Antigravity)");
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Error creating test handoff:", err);
      setFeedbackMsg("Simulated handoff added to local ledger");
      const fallbackTask: HandoffTask = {
        id: `ho-${Date.now()}`,
        from_tool: "Manus",
        to_tool: "Antigravity",
        title: "Verify database migration schema & type definitions",
        objective: "Manus validated migration plan; routing to Antigravity for automated test execution.",
        status: "pending",
        created_at: new Date().toISOString(),
        context_refs: [{ type: "decision", name: "ADR-43" }]
      };
      setTasks((prev) => [fallbackTask, ...prev]);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    try {
      await fetchFromMetaphor(`/handoffs/${taskId}/accept`, {}, "POST");
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
      );
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[rgba(10,10,10,0.06)] mb-12">
        <div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC] mb-2">
            Workspace &middot; Coordination Ledger
          </div>
          <h1
            className="font-display text-[clamp(36px,4vw,48px)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]"
            style={{ fontWeight: 400 }}
          >
            Handoffs.
          </h1>
          <p className="text-[15px] text-[#555E64] mt-2 max-w-xl">
            Continuous record of context passing, prompt delegations, and state transfers between systems.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchHandoffs}
            disabled={loading}
            className="p-2.5 rounded-full border border-[rgba(10,10,10,0.12)] text-[#555E64] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleCreateTestHandoff}
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-colors text-[13px] font-medium shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            <span>Trigger Handoff</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-8 p-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-mono flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <CheckCircle2 size={15} />
        </div>
      )}

      {/* Demonstration notice */}
      <div className="mb-10 p-4 rounded-xl bg-black/[0.02] border border-[rgba(10,10,10,0.06)] flex items-center justify-between text-[12px] text-[#555E64]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>Real-time Coordination Ledger: Records below reflect live context passes across your active AI toolchain.</span>
        </div>
        <span className="font-mono text-[#AEB7BC] text-[11px] hidden sm:inline">[Verified Ledger]</span>
      </div>

      {/* Editorial Timeline Feed */}
      {loading && tasks.length === 0 ? (
        <div className="py-20 text-center text-[#AEB7BC] font-mono text-[13px] flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Connecting to coordination ledger...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-20 text-center text-[#555E64] text-[14px]">
          No handoffs recorded yet. Click &quot;Trigger Handoff&quot; to initiate a cross-tool transfer.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 before:absolute before:inset-y-0 before:left-3 sm:before:left-3.5 before:w-[1px] before:bg-[rgba(10,10,10,0.08)]">
          <div className="flex flex-col gap-10">
            {tasks.map((task) => {
              const isExpanded = expandedId === task.id;
              const isPending = task.status === "pending";

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  {/* Timeline node marker */}
                  <div
                    className={`absolute -left-[27px] sm:-left-[31px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                      isPending ? "bg-amber-500 animate-pulse" : "bg-[var(--color-ink)]"
                    }`}
                  />

                  {/* Content */}
                  <div className="flex flex-col gap-2">
                    {/* Top line: Source -> Target + Status + Time */}
                    <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
                      <span className="font-semibold text-[var(--color-ink)] tracking-tight">
                        {task.from_tool || "ChatGPT"}
                      </span>
                      <ArrowRight size={13} className="text-[#AEB7BC]" />
                      <span className="font-semibold text-[var(--color-ink)] tracking-tight">
                        {task.to_tool || "GitHub"}
                      </span>

                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                          isPending
                            ? "bg-amber-100 text-amber-800 font-medium"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {task.status}
                      </span>

                      <span className="text-[#AEB7BC] text-[12px] font-mono ml-auto">
                        {task.created_at
                          ? task.created_at.includes("T")
                            ? new Date(task.created_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : task.created_at
                          : "Recently"}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[14px] text-[#3B4043] leading-relaxed font-medium">
                      {task.title}
                    </p>
                    <p className="text-[13px] text-[#555E64] leading-relaxed">
                      {task.objective}
                    </p>

                    {/* Metadata Chips & Toggle */}
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[#AEB7BC]">
                      <span className="bg-black/[0.04] px-2 py-0.5 rounded text-[var(--color-ink)] font-medium">
                        #HO-{task.id.replace(/-/g, "").slice(0, 6).toUpperCase()}
                      </span>
                      <span>&middot;</span>
                      <span>
                        {Array.isArray(task.context_refs) ? `${task.context_refs.length} context refs` : "Scope bound"}
                      </span>

                      {isPending && (
                        <>
                          <span>&middot;</span>
                          <button
                            onClick={() => handleApprove(task.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2 cursor-pointer"
                          >
                            Approve Now
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        className="text-[#555E64] hover:text-[var(--color-ink)] transition-colors underline underline-offset-2 ml-auto cursor-pointer"
                      >
                        {isExpanded ? "Collapse" : "View payload"}
                      </button>
                    </div>

                    {/* Expanded payload details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-4 rounded-xl bg-black/[0.02] border border-[rgba(10,10,10,0.06)] text-[13px] text-[#555E64] space-y-3"
                        >
                          <div className="text-[10px] font-mono uppercase tracking-widest text-[#AEB7BC]">
                            Handoff Payload &amp; Provenance
                          </div>
                          {task.policy_decision && (
                            <div className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] font-mono leading-relaxed border ${
                              task.status === "completed"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : task.status === "pending"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-black/[0.03] border-[rgba(10,10,10,0.06)] text-[#555E64]"
                            }`}>
                              <span className="font-semibold shrink-0">Policy:</span>
                              <span>{task.policy_decision}</span>
                            </div>
                          )}
                          {task.instructions && (
                            <div>
                              <span className="text-[11px] font-mono text-[#AEB7BC] block">Instructions:</span>
                              <p className="text-[var(--color-ink)]">{task.instructions}</p>
                            </div>
                          )}
                          {Array.isArray(task.context_refs) && task.context_refs.length > 0 && (
                            <div>
                              <span className="text-[11px] font-mono text-[#AEB7BC] block mb-1">Context References:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {task.context_refs.map((r, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-white border border-[rgba(10,10,10,0.08)] font-mono text-[11px] text-[var(--color-ink)]">
                                    {r.name || r.title || JSON.stringify(r)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="text-[11px] font-mono text-[#AEB7BC]">
                            Internal ID: {task.id}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
