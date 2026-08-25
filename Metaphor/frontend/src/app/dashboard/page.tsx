"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Plug, Database, Sparkles, Server, Folder, FileText, Calendar, Activity, Command, Terminal } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";
import { fetchFromMetaphor } from "@/app/api";
import GraphViewer from "./GraphViewer";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

import { CardSkeleton } from "@/components/ui/SkeletonLoader";

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

  const supabase = createClient();

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login?redirect=/dashboard");
          return;
        }
        setAuthLoading(false);

        // Fetch stats and user
        try {
          const statsData = await fetchFromMetaphor("/graph/stats");
          if (statsData) setStats(statsData);
        } catch (e) {
          console.error("Failed to fetch stats:", e);
        }
        
        try {
          const userData = await fetchFromMetaphor("/auth/me");
          if (userData) setUser(userData);
        } catch (e) {
          console.error("Failed to fetch user:", e);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login?redirect=/dashboard");
      }
    }
    
    checkAuthAndFetch();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    }
    document.cookie = "metaphor_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (typeof window !== "undefined") {
      localStorage.removeItem("metaphor_api_key");
      localStorage.removeItem("metaphor_onboarded");
    }
    router.push("/login");
  };

  const syncIntegration = async (provider: string) => {
    setSyncing(prev => ({ ...prev, [provider]: true }));
    try {
      await fetchFromMetaphor(`/integrations/${provider}/sync`, undefined, "POST");
      setSyncing(prev => ({ ...prev, [provider]: false }));
    } catch (e) {
      console.error(`Failed to sync ${provider}:`, e);
      setSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-150">
        <div className="w-48 h-8 rounded-xl bg-surface-2 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full animate-in fade-in duration-200">

      {/* Interactive Physics Graph */}
      <GraphViewer />

      <div className="relative z-10 w-full max-w-4xl mx-auto p-8 pb-16 flex flex-col items-start">
        
        {/* Core Positioning & Greeting */}
        <div className="mb-16 animate-fade-in-up w-full border-b border-border-subtle/50 pb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <h1 className="text-sm font-semibold text-muted uppercase tracking-widest">System Online</h1>
            </div>
          </div>
          <p className="text-3xl text-foreground font-medium tracking-tight leading-snug mb-4">
            {user?.name && user.name !== "Supabase User" && user.name !== "Developer User"
              ? `${user.name}, your knowledge model is synchronized.`
              : user?.email
              ? `${user.email.split("@")[0]}, your knowledge model is synchronized.`
              : "Your knowledge model is synchronized."}
          </p>

          <p className="text-muted text-sm font-medium tracking-tight">
            Metaphor is currently maintaining {stats.node_count} nodes across {stats.edge_count} relational dimensions.
          </p>
        </div>

        {/* The Dashboard Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          
          {/* Active Context Buffer */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                Context Architecture
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ContextCard 
                label="Graph Nodes" 
                value={`${stats.node_count} Extracted Concepts`} 
                icon={<Activity />} 
                highlight 
              />
              <ContextCard 
                label="Graph Edges" 
                value={`${stats.edge_count} Relational Links`} 
                icon={<Folder />} 
              />
              <ContextCard 
                label="Context Sessions" 
                value={`${stats.active_sessions} Active AI Conversations`} 
                icon={<Server />} 
                alert={stats.active_sessions > 0} 
              />
            </div>
          </div>

          {/* Start a Session CTA — always visible, prominent when graph is empty */}
          <div className="col-span-1 md:col-span-2">
            <Link
              href="/dashboard/playground"
              id="start-session-cta"
              className={`group flex items-center justify-between w-full p-5 rounded-xl border transition-all duration-200 hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                stats.node_count === 0
                  ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                  : "bg-surface-1 border-border-subtle hover:border-border-strong"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  stats.node_count === 0 ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted group-hover:text-foreground"
                }`}>
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground tracking-tight">
                    {stats.node_count === 0 ? "Start your first session" : "Open The Context Layer"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {stats.node_count === 0
                      ? "Ask a question — Metaphor will route it through your context graph."
                      : "Query your knowledge graph or test MCP tool calls."}
                  </p>
                </div>
              </div>
              <span className="text-muted group-hover:text-foreground transition-colors text-lg leading-none">→</span>
            </Link>
          </div>

          {/* Connected Intelligence (Integrations) */}
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
              <Plug className="w-3.5 h-3.5" />
              Connected Sources
            </h2>
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-2 space-y-1">
              <IntegrationItem name="Notion" status={`${stats.total_events} Documents Processed`} loading={syncing['notion']} onSync={() => syncIntegration('notion')} />
              <IntegrationItem name="Gmail" status="Awaiting sync" loading={syncing['gmail']} onSync={() => syncIntegration('gmail')} />
              <IntegrationItem name="Google Calendar" status="Awaiting sync" loading={syncing['gcal']} onSync={() => syncIntegration('gcal')} />
            </div>
          </div>

          {/* Recent Syntheses */}
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Recent System Activity
            </h2>
            <div className="space-y-6 ml-2">
              {stats.node_count > 0 ? (
                <>
                  <TimelineItem text={`Ingested and parsed ${stats.total_events} new Webhook events.`} time="Recently" />
                  <TimelineItem text={`Reflected and generated ${stats.node_count} new concept nodes.`} time="Recently" />
                </>
              ) : (
                <TimelineItem text="System initialized. Waiting for first ingestion event." time="Just now" />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// UI Primitives for the Dashboard

function ContextCard({ label, value, icon, highlight = false, alert = false }: { label: string, value: string, icon: React.ReactNode, highlight?: boolean, alert?: boolean }) {
  return (
    <div 
      className={`group p-5 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        highlight ? 'bg-primary/5 border-primary/20' : 
        alert ? 'bg-orange-500/5 border-orange-500/20' : 
        'bg-surface-1 border-border-subtle/50 hover:border-border-strong'
      }`}
      tabIndex={0}
    >
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

function IntegrationItem({ name, status, loading = false, inactive = false, onSync }: { name: string, status: string, loading?: boolean, inactive?: boolean, onSync?: () => void }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${inactive ? 'opacity-50' : 'hover:bg-surface-2'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-warning animate-pulse' : inactive ? 'bg-muted' : 'bg-success'}`}></div>
        <span className={`text-sm font-medium tracking-tight transition-colors ${inactive ? 'text-muted' : 'text-foreground group-hover:text-primary'}`}>{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-muted">{status}</span>
        {onSync && !inactive && (
          <button 
            onClick={onSync} 
            disabled={loading}
            className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-surface-2 border border-border-subtle hover:border-border-strong transition-all text-foreground cursor-pointer disabled:opacity-50"
          >
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
