"use client";

import React, { useEffect, useState } from "react";
import { fetchFromMetaphor } from "@/app/api";
import { Activity, Server, Target, Zap, Clock, ShieldAlert } from "lucide-react";

type PipelineStatus = {
  atlas: { connected: boolean; last_intake: string | null };
  william: { connected: boolean; last_intake: string | null };
};

type PipelineBrief = {
  brief_id: string;
  generated_at: string;
  active_goals: string[];
  active_constraints: string[];
  open_decisions: string[];
  recommended_focus: string;
  node_count: number;
};

export default function PipelinePage() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [brief, setBrief] = useState<PipelineBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statusData, briefData] = await Promise.all([
          fetchFromMetaphor("/pipeline/status"),
          fetchFromMetaphor("/pipeline/brief"),
        ]);
        if (statusData) setStatus(statusData);
        if (briefData) setBrief(briefData);
      } catch (err) {
        console.error("Error loading pipeline data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              Cognitive Pipeline
            </h1>
            <p className="text-muted mt-2">
              Monitor downstream pseudonyms connected to your knowledge graph.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ClientCard
              name="Atlas (Operations)"
              connected={status?.atlas?.connected ?? true}
              lastIntake={status?.atlas?.last_intake}
              icon={<Target className="w-5 h-5" />}
            />
            <ClientCard
              name="William (Voice Brain)"
              connected={status?.william?.connected ?? true}
              lastIntake={status?.william?.last_intake}
              icon={<Zap className="w-5 h-5" />}
            />
            <ClientCard
              name="Clario (Media Studio)"
              connected={true}
              lastIntake="Active Client"
              icon={<Activity className="w-5 h-5" />}
            />
          </div>

          {brief && (
            <div className="mt-8 border border-border-subtle rounded-xl bg-surface-1 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-muted" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Current Context Brief
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const scriptBeats = [
                      `[Hook] ${brief.recommended_focus}`,
                      `[Goals] We are executing towards: ${brief.active_goals.slice(0, 2).join(', ')}.`,
                      `[Constraints] Operating under key constraints: ${brief.active_constraints.slice(0, 2).join(', ')}.`,
                      `[CTA] Documenting the real journey. More evidence, less fantasy.`
                    ].join('\n\n');
                    window.open(`http://localhost:5173/?script=${encodeURIComponent(scriptBeats)}&mode=video&name=${encodeURIComponent('Metaphor Executive Brief')}`, '_blank');
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  🎬 Create Reel in Clario →
                </button>
              </div>
              <p className="text-xs text-muted mb-6">
                Broadcasted to downstream clients. Generated at {new Date(brief.generated_at).toLocaleTimeString()}.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" /> Active Goals
                  </h3>
                  <ul className="space-y-2">
                    {brief.active_goals.length > 0 ? brief.active_goals.map((g, i) => (
                      <li key={i} className="text-sm text-muted bg-surface-2 px-3 py-2 rounded-md">{g}</li>
                    )) : <li className="text-sm text-muted/50 italic">No active goals.</li>}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" /> Active Constraints
                  </h3>
                  <ul className="space-y-2">
                    {brief.active_constraints.length > 0 ? brief.active_constraints.map((c, i) => (
                      <li key={i} className="text-sm text-muted bg-surface-2 px-3 py-2 rounded-md">{c}</li>
                    )) : <li className="text-sm text-muted/50 italic">No active constraints.</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Recommended Strategy Focus</h3>
                  <div className="text-sm text-primary font-medium bg-primary/10 px-4 py-2.5 rounded-lg border border-primary/20">
                    {brief.recommended_focus}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientCard({ name, connected, lastIntake, icon }: { name: string, connected: boolean, lastIntake?: string | null, icon: React.ReactNode }) {
  return (
    <div className={`p-5 rounded-xl border ${connected ? 'border-primary/50 bg-primary/5' : 'border-border-subtle bg-surface-1'} transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${connected ? 'bg-primary/20 text-primary' : 'bg-surface-2 text-muted'}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-muted'}`}></span>
              </span>
              <span className="text-xs text-muted">{connected ? "Connected" : "Disconnected"}</span>
            </div>
          </div>
        </div>
      </div>
      
      {connected && (
        <div className="mt-5 pt-4 border-t border-border-subtle/50 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last Intake</span>
          <span className="font-medium text-foreground">{lastIntake ? new Date(lastIntake).toLocaleTimeString() : "No intakes yet"}</span>
        </div>
      )}
    </div>
  );
}
