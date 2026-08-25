"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Plug, Database, Sparkles, Server, Folder, FileText, Calendar, Activity, Terminal, Inbox, ArrowRight, Clock, Zap, Bot, Network, GitBranch } from "lucide-react";
import { fetchFromMetaphor } from "@/app/api";
import GraphViewer from "./GraphViewer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";

interface ActiveClient {
  client_name: string;
  project_id: string | null;
  connected_at: string;
}

interface HandoffItem {
  id: string;
  source_ai: string;
  target_ai: string;
  payload: string;
  status: string;
  created_at: string;
}

export default function SynchronizationDashboard() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    node_count: 0,
    edge_count: 0,
    active_sessions: 0,
    total_events: 0
  });
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [activeClients, setActiveClients] = useState<ActiveClient[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
  const [recentNodes, setRecentNodes] = useState<{title: string, type: string, created_at: string}[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const supabase = createClient();

  const fetchLiveData = useCallback(async () => {
    try {
      const [clientsData, statsData] = await Promise.allSettled([
        fetchFromMetaphor("/mcp/active-clients"),
        fetchFromMetaphor("/graph/stats"),
      ]);
      if (clientsData.status === "fulfilled" && clientsData.value?.clients) {
        setActiveClients(clientsData.value.clients);
      }
      if (statsData.status === "fulfilled" && statsData.value) {
        setStats(statsData.value);
      }
      // Try to fetch recent handoffs and nodes
      const [handoffData, nodeData] = await Promise.allSettled([
        fetchFromMetaphor("/graph/handoffs?limit=5"),
        fetchFromMetaphor("/graph/nodes?limit=5&order=created_at.desc"),
      ]);
      if (handoffData.status === "fulfilled" && handoffData.value?.handoffs) {
        setHandoffs(handoffData.value.handoffs);
      }
      if (nodeData.status === "fulfilled" && nodeData.value?.nodes) {
        setRecentNodes(nodeData.value.nodes);
      }
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Live data fetch error:", e);
    }
  }, []);

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login?redirect=/dashboard");
          return;
        }
        setAuthLoading(false);
        try {
          const userData = await fetchFromMetaphor("/auth/me");
          if (userData) setUser(userData);
        } catch (e) { console.error("Failed to fetch user:", e); }
        await fetchLiveData();
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login?redirect=/dashboard");
      }
    }
    checkAuthAndFetch();
    // Refresh live data every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [router, fetchLiveData]);

  const syncIntegration = async (provider: string) => {
    setSyncing(prev => ({ ...prev, [provider]: true }));
    try {
      await fetchFromMetaphor(`/integrations/${provider}/sync`, undefined, "POST");
    } catch (e) {
      console.error(`Failed to sync ${provider}:`, e);
    } finally {
      setSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-150">
        <div className="w-48 h-8 rounded-xl bg-surface-2 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  const greeting = user?.name && user.name !== "Supabase User" && user.name !== "Developer User"
    ? `${user.name}`
    : user?.email?.split("@")[0] || "Workspace";

  return (
    <div className="relative w-full min-h-full animate-in fade-in duration-200">
      <GraphViewer />
      <div className="relative z-10 w-full max-w-4xl mx-auto p-8 pb-16 flex flex-col items-start">

        {/* Header */}
        <div className="mb-10 w-full border-b border-border-subtle/50 pb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted">System Online</span>
            </div>
            <button
              onClick={fetchLiveData}
              className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              Refreshed {lastRefresh.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </button>
          </div>
          <h1 className="text-3xl text-foreground font-medium tracking-tight leading-snug mb-2">
            {greeting}, your knowledge model is active.
          </h1>
          <p className="text-muted text-sm">
            {stats.node_count} nodes · {stats.edge_count} relational links · {activeClients.length} AI client{activeClients.length !== 1 ? "s" : ""} connected
          </p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">

          {/* Stats Row */}
          <div className="col-span-1 md:col-span-2">
            <SectionHeader icon={<Database />} label="Context Architecture" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <ContextCard label="Graph Nodes" value={`${stats.node_count} Concepts`} icon={<Activity />} highlight />
              <ContextCard label="Graph Edges" value={`${stats.edge_count} Links`} icon={<Network />} />
              <ContextCard label="AI Sessions" value={`${stats.active_sessions} Active`} icon={<Server />} alert={stats.active_sessions > 0} />
            </div>
          </div>

          {/* Live AI Clients */}
          <div className="col-span-1 md:col-span-2">
            <SectionHeader icon={<Bot />} label="Connected AI Clients" action={<Link href="/dashboard/api" className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground">Manage Tokens →</Link>} />
            <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
              {activeClients.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted">No AI clients currently connected.</p>
                  <p className="text-xs text-muted/60 mt-1">Connect Claude, Cursor, or ChatGPT via Remote MCP to see them here.</p>
                </div>
              ) : (
                activeClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border-subtle/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-sm font-medium text-foreground capitalize">{client.client_name || "Unknown Client"}</span>
                      {client.project_id && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Scoped Project
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted">
                      {client.connected_at ? new Date(client.connected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Active"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Handoff Queue */}
          <div>
            <SectionHeader icon={<Inbox />} label="Handoff Queue" action={<Link href="/dashboard/inbox" className="text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground">View All →</Link>} />
            <div className="mt-4 space-y-2">
              {handoffs.length === 0 ? (
                <div className="p-4 bg-surface-1 border border-border-subtle rounded-xl text-center">
                  <p className="text-xs text-muted">No pending AI handoffs.</p>
                </div>
              ) : (
                handoffs.map((h) => (
                  <div key={h.id} className="p-4 bg-surface-1 border border-border-subtle rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-primary capitalize">{h.source_ai}</span>
                      <ArrowRight className="w-3 h-3 text-muted" />
                      <span className="font-mono text-foreground capitalize">{h.target_ai}</span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                        h.status === "pending" ? "bg-warning/10 text-warning border-warning/20" :
                        h.status === "resolved" ? "bg-success/10 text-success border-success/20" :
                        "bg-surface-2 text-muted border-border-subtle"
                      }`}>{h.status}</span>
                    </div>
                    <p className="text-xs text-muted line-clamp-2">{h.payload}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Graph Activity */}
          <div>
            <SectionHeader icon={<Sparkles />} label="Recent Activity" />
            <div className="mt-4 space-y-4 ml-2">
              {recentNodes.length > 0 ? (
                recentNodes.map((node, i) => (
                  <TimelineItem key={i} text={`${node.type || "Node"}: ${node.title}`} time={node.created_at ? new Date(node.created_at).toLocaleDateString() : "Recent"} />
                ))
              ) : stats.node_count > 0 ? (
                <>
                  <TimelineItem text={`${stats.total_events} webhook events ingested and processed.`} time="Recently" />
                  <TimelineItem text={`${stats.node_count} concept nodes extracted into graph.`} time="Recently" />
                </>
              ) : (
                <TimelineItem text="System initialized. Waiting for first ingestion event." time="Just now" />
              )}
            </div>
          </div>

          {/* Connected Sources */}
          <div>
            <SectionHeader icon={<Plug />} label="Connected Sources" />
            <div className="mt-4 bg-surface-1 border border-border-subtle rounded-xl p-2 space-y-1">
              <IntegrationItem name="Notion" status={`${stats.total_events} docs`} loading={syncing['notion']} onSync={() => syncIntegration('notion')} />
              <IntegrationItem name="GitHub" status="Active" loading={syncing['github']} onSync={() => syncIntegration('github')} />
              <IntegrationItem name="Gmail" status="Not connected" loading={syncing['gmail']} onSync={() => syncIntegration('gmail')} />
            </div>
          </div>

          {/* Open Playground CTA */}
          <div>
            <SectionHeader icon={<Terminal />} label="Query Your Graph" />
            <Link
              href="/dashboard/playground"
              className="mt-4 group flex items-center justify-between w-full p-5 rounded-xl border bg-surface-1 border-border-subtle hover:border-border-strong transition-all duration-200 hover:-translate-y-[2px]"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-2 text-muted group-hover:text-foreground transition-colors">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground tracking-tight">Open Context Playground</p>
                  <p className="text-xs text-muted mt-0.5">Ask questions answered from your live graph.</p>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground transition-colors text-lg">→</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── UI Primitives ──────────────────────────────────────────────────

function SectionHeader({ icon, label, action }: { icon: React.ReactNode; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-2">
        {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
        {label}
      </h2>
      {action}
    </div>
  );
}

function ContextCard({ label, value, icon, highlight = false, alert = false }: { label: string, value: string, icon: React.ReactNode, highlight?: boolean, alert?: boolean }) {
  return (
    <div className={`group p-5 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] ${
      highlight ? 'bg-primary/5 border-primary/20' :
      alert ? 'bg-orange-500/5 border-orange-500/20' :
      'bg-surface-1 border-border-subtle/50 hover:border-border-strong'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${
        highlight ? 'bg-primary/10 text-primary' :
        alert ? 'bg-orange-500/10 text-orange-500' :
        'bg-surface-2 text-muted group-hover:text-foreground'
      } transition-colors`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
      </div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">{label}</p>
      <p className="text-sm font-medium text-foreground tracking-tight leading-snug">{value}</p>
    </div>
  );
}

function IntegrationItem({ name, status, loading = false, onSync }: { name: string, status: string, loading?: boolean, onSync?: () => void }) {
  const isConnected = status !== "Not connected";
  return (
    <div className="flex items-center justify-between p-3 rounded-lg transition-colors group hover:bg-surface-2">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-warning animate-pulse' : isConnected ? 'bg-success' : 'bg-muted'}`} />
        <span className="text-sm font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-muted">{status}</span>
        {onSync && isConnected && (
          <button onClick={onSync} disabled={loading} className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-surface-2 border border-border-subtle hover:border-border-strong transition-all text-foreground cursor-pointer disabled:opacity-50">
            {loading ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ text, time }: { text: string, time: string }) {
  return (
    <div className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:rounded-full before:border-2 before:border-primary/50 before:bg-background">
      <p className="text-sm font-medium text-foreground tracking-tight leading-relaxed">{text}</p>
      <p className="text-[11px] text-muted mt-1">{time}</p>
    </div>
  );
}
