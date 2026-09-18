"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { fetchFromMetaphor } from "@/app/api";
import { ContextField } from "@/components/ui/ContextField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  ArrowRight, Clock, Network, ChevronRight, Shield, Target, Database, Lightbulb
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type NodeType = "fact" | "decision" | "constraint" | "insight" | "evidence" | "project" | "task" | string;

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  status?: string;
  updated_at?: string;
  content?: string;
  connections?: number;
}

interface Handoff {
  id: string;
  source_agent: string;
  target_agent: string;
  task_goal: string;
  status: "pending" | "running" | "complete" | "failed" | "cancelled";
  created_at: string;
}

// ── Mock fallback data ─────────────────────────────────────────────────────

const MOCK_CHANGES: GraphNode[] = [
  { id: "m1", name: "Push-based notification architecture adopted", type: "decision", updated_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "m2", name: "Q4 deployment deadline confirmed", type: "constraint", updated_at: new Date(Date.now() - 14400000).toISOString() },
  { id: "m3", name: "Orion is the primary active project", type: "insight", updated_at: new Date(Date.now() - 18000000).toISOString() },
  { id: "m4", name: "User story mapping completed", type: "task", updated_at: new Date(Date.now() - 21600000).toISOString() },
];

const MOCK_ACTIVE: GraphNode[] = [
  { id: "a1", name: "Orion", type: "project", status: "active", content: "Notification System Architecture" },
  { id: "a2", name: "Atlas", type: "project", status: "pending", content: "Acquisition Setup" },
];

const MOCK_HANDOFFS: Handoff[] = [
  { id: "h1", source_agent: "Antigravity IDE", target_agent: "Claude (Cursor)", task_goal: "Fix TypeScript errors in frontend", status: "running", created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: "h2", source_agent: "Claude (Cursor)", target_agent: "Orion", task_goal: "Summarise architectural decisions", status: "complete", created_at: new Date(Date.now() - 3600000).toISOString() },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function normaliseType(t: string): NodeType {
  const lower = t?.toLowerCase() ?? "fact";
  if (["decision", "constraint", "insight", "evidence", "fact", "project", "task"].includes(lower)) return lower as NodeType;
  return "fact";
}

function typeIcon(t: NodeType) {
  switch (t) {
    case "decision":   return Shield;
    case "constraint": return Target;
    case "insight":    return Lightbulb;
    default:           return Database;
  }
}

// ── Stagger variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomeEnvironment() {
  const router = useRouter();
  const [authLoading, setAuthLoading]   = useState(true);
  const [dataLoading, setDataLoading]   = useState(true);
  const [userName, setUserName]         = useState("there");
  const [changes, setChanges]           = useState<GraphNode[]>([]);
  const [activeWork, setActiveWork]     = useState<GraphNode[]>([]);
  const [handoffs, setHandoffs]         = useState<Handoff[]>([]);

  // Auth guard
  useEffect(() => {
    async function checkAuth() {
      try {
        const isUnlocked =
          typeof document !== "undefined" &&
          (document.cookie.includes("metaphor_unlocked=true") ||
            localStorage.getItem("metaphor_unlocked") === "true");

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && !isUnlocked) { router.push("/login?redirect=/home"); return; }

        const stored = localStorage.getItem("metaphor_user_name");
        const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
        const emailFirst = session?.user?.email?.split("@")[0]?.split(/[^a-zA-Z]/)[0];
        setUserName(stored || googleName || emailFirst || "there");
      } catch {
        // proceed
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Data fetch
  useEffect(() => {
    if (authLoading) return;

    async function load() {
      try {
        const [nodesRes, handoffsRes] = await Promise.allSettled([
          fetchFromMetaphor("/graph/nodes?sort=updated_at&limit=20"),
          fetchFromMetaphor("/graph/handoffs?limit=10"),
        ]);

        const nodes: GraphNode[] = nodesRes.status === "fulfilled" && nodesRes.value?.nodes?.length
          ? nodesRes.value.nodes : MOCK_CHANGES;

        const meaningful = nodes
          .filter((n) => ["decision", "constraint", "insight", "evidence"].includes(normaliseType(n.type)))
          .slice(0, 5);
        setChanges(meaningful.length ? meaningful : MOCK_CHANGES);

        const active = nodes
          .filter((n) => normaliseType(n.type) === "project" || n.status === "active")
          .slice(0, 3);
        setActiveWork(active.length ? active : MOCK_ACTIVE);

        const hData: Handoff[] = handoffsRes.status === "fulfilled" && handoffsRes.value?.handoffs?.length
          ? handoffsRes.value.handoffs.slice(0, 3) : MOCK_HANDOFFS;
        setHandoffs(hData);
      } catch {
        setChanges(MOCK_CHANGES);
        setActiveWork(MOCK_ACTIVE);
        setHandoffs(MOCK_HANDOFFS);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [authLoading]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState context="generic" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen pb-24">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* ContextField background */}
        <div className="absolute inset-0 opacity-[0.06]">
          <ContextField nodeCount={22} intensity="ambient" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-muted mb-3">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tighter mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {greeting}, {userName}.
            </h1>
            <p className="text-sm text-muted max-w-md leading-relaxed">
              {dataLoading
                ? "Resolving your context across the ecosystem..."
                : `${changes.length} things changed since your last visit.`}
            </p>
          </motion.div>

          {/* Change count pill */}
          {!dataLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-1/80 border border-border-subtle backdrop-blur-sm shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono text-muted">
                Context live · {changes.length} update{changes.length !== 1 ? "s" : ""}
              </span>
            </motion.div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 md:px-12 lg:px-20 space-y-16">

        {/* ── Since You Were Away ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-6">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted">Since You Were Away</h2>
            <Link href="/context" className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition-colors flex items-center gap-1">
              Explore <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {dataLoading ? (
            <LoadingState context="context" />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {changes.map((change) => {
                const t = normaliseType(change.type);
                const Icon = typeIcon(t);
                return (
                  <motion.div
                    key={change.id}
                    variants={itemVariants}
                    className="group flex items-center gap-4 p-4 bg-surface-1/60 border border-border-subtle hover:border-border-strong hover:bg-surface-1 rounded-xl transition-all cursor-pointer backdrop-blur-sm"
                    onClick={() => router.push(`/focus/${change.id}`)}
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate group-hover:text-foreground transition-colors">{change.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge type={t as any} dot size="sm" />
                      <span className="text-[10px] font-mono text-muted hidden sm:block">
                        {change.updated_at ? timeAgo(change.updated_at) : "—"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        {/* ── Two-column: Current State + Active Threads ───────────── */}
        <div className="grid md:grid-cols-2 gap-12">

          {/* Current State */}
          <section>
            <div className="border-b border-border-subtle pb-2 mb-6">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted">Current State</h2>
            </div>
            {dataLoading ? (
              <LoadingState context="generic" compact />
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {activeWork.map((work) => (
                  <motion.div
                    key={work.id}
                    variants={itemVariants}
                    className="group p-4 bg-surface-1/60 border border-border-subtle hover:border-border-strong rounded-xl transition-all cursor-pointer backdrop-blur-sm"
                    onClick={() => router.push(`/focus/${work.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{work.type}</p>
                        <p className="text-sm font-semibold text-foreground">{work.name}</p>
                        {work.content && (
                          <p className="text-xs text-muted mt-1 truncate">{work.content}</p>
                        )}
                      </div>
                      {work.status && (
                        <StatusBadge type={work.status === "active" ? "running" : "pending"} dot size="sm" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          {/* Active Handoffs */}
          <section>
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-6">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted">Active Handoffs</h2>
              <Link href="/work" className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition-colors flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {dataLoading ? (
              <LoadingState context="handoffs" compact />
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {handoffs.map((h) => (
                  <motion.div
                    key={h.id}
                    variants={itemVariants}
                    className="group p-4 bg-surface-1/60 border border-border-subtle hover:border-border-strong rounded-xl transition-all cursor-pointer backdrop-blur-sm"
                    onClick={() => router.push(`/work`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-foreground truncate">{h.source_agent}</span>
                      <ArrowRight className="w-3 h-3 text-muted shrink-0" />
                      <span className="text-xs text-muted truncate">{h.target_agent}</span>
                      <StatusBadge type={h.status} dot size="sm" />
                    </div>
                    <p className="text-xs text-muted truncate">{h.task_goal}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3 text-muted" />
                      <span className="text-[10px] text-muted font-mono">{timeAgo(h.created_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        </div>

        {/* ── Explore World CTA ─────────────────────────────────────── */}
        <section className="pb-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative rounded-2xl border border-border-subtle bg-surface-1/50 backdrop-blur-sm overflow-hidden p-8 group cursor-pointer hover:border-border-strong transition-all"
            onClick={() => router.push("/world")}
          >
            {/* Mini ContextField inside CTA */}
            <div className="absolute inset-0 opacity-10">
              <ContextField nodeCount={30} intensity="exploring" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-muted mb-2">Explore</div>
                <h3 className="font-display text-2xl text-foreground tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Enter your World
                </h3>
                <p className="text-sm text-muted mt-1">Explore how everything is connected.</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-all duration-300">
                <Network className="w-5 h-5 text-muted group-hover:text-background transition-colors" />
              </div>
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
