"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Network, Shield, Target, Database, Activity, GitCommit, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { fetchFromMetaphor } from "@/app/api";

type EntityData = {
  id: string;
  name: string;
  type: "project" | "task" | "decision" | "insight" | "constraint" | "fact";
  status?: string;
  content?: string;
  updated_at?: string;
  relations: {
    id: string;
    name: string;
    type: string;
    relation_type: string;
  }[];
};

const MOCK_ENTITY: EntityData = {
  id: "orion-core",
  name: "Orion",
  type: "project",
  status: "active",
  content: "Primary product focus for Q4. Includes notification system rebuild and cross-workspace context integration.",
  updated_at: new Date().toISOString(),
  relations: [
    { id: "adr-42", name: "Adopt NATS JetStream", type: "decision", relation_type: "constrains" },
    { id: "q4-freeze", name: "Q4 Roadmap Freeze", type: "constraint", relation_type: "blocked-by" },
    { id: "task-104", name: "Build notification router", type: "task", relation_type: "contains" },
  ]
};

export default function FocusEnvironment() {
  const params = useParams();
  const router = useRouter();
  const entityId = params?.entity as string;

  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<EntityData | null>(null);

  useEffect(() => {
    async function load() {
      if (!entityId) return;
      try {
        const res = await fetchFromMetaphor(`/graph/nodes/${entityId}`);
        setEntity(res.node || MOCK_ENTITY); // Use mock if format differs
      } catch {
        // Fallback to mock on fail
        setEntity({ ...MOCK_ENTITY, id: entityId, name: entityId.replace("-", " ") });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entityId]);

  if (loading) {
    return <LoadingState context="graph" className="min-h-screen" />;
  }

  if (!entity) return null;

  return (
    <div className="relative w-full min-h-screen pt-28 pb-32 px-6 md:px-12 lg:px-20 animate-in fade-in duration-500">
      
      {/* ── Breadcrumb & Back ── */}
      <div className="max-w-4xl mx-auto mb-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">

        {/* ── Header ── */}
        <header className="border-b border-border-subtle pb-8">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge type={entity.type as any} />
            {entity.status && <StatusBadge type={entity.status === "active" ? "running" : "pending"} dot />}
          </div>
          <h1 className="text-4xl md:text-5xl font-display text-foreground tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {entity.name}
          </h1>
          {entity.content && (
            <p className="text-lg text-muted max-w-2xl leading-relaxed">
              {entity.content}
            </p>
          )}
        </header>

        {/* ── Two-Column Details ── */}
        <div className="grid md:grid-cols-3 gap-12">
          
          <div className="md:col-span-2 space-y-12">
            
            {/* Relations Context */}
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 border-b border-border-subtle pb-2">Connected Entities</h2>
              <div className="space-y-3">
                {entity.relations.map((rel) => (
                  <div 
                    key={rel.id} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-surface-1/50 border border-border-subtle hover:border-border-strong hover:bg-surface-2 transition-all cursor-pointer group"
                    onClick={() => router.push(`/focus/${rel.id}`)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle">
                      <Network className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-muted mb-0.5">{rel.relation_type}</p>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{rel.name}</p>
                      </div>
                      <StatusBadge type={rel.type as any} size="sm" />
                    </div>
                  </div>
                ))}
                {entity.relations.length === 0 && (
                  <p className="text-sm text-muted italic">No registered relationships.</p>
                )}
              </div>
            </section>
            
            {/* Meta Data */}
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 border-b border-border-subtle pb-2">Provenance & Audit</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-1 border border-border-subtle">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1">Entity ID</p>
                  <p className="text-xs font-mono text-foreground truncate">{entity.id}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-1 border border-border-subtle">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1">Last Updated</p>
                  <p className="text-xs font-mono text-foreground">
                    {entity.updated_at ? new Date(entity.updated_at).toLocaleString() : "Unknown"}
                  </p>
                </div>
              </div>
            </section>

          </div>

          {/* ── Sidebar Actions ── */}
          <aside className="space-y-6">
            <div className="p-6 rounded-2xl bg-surface-1 border border-border-subtle shadow-sm space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Actions</h3>
              
              <button 
                onClick={() => router.push(`/world?focus=${entity.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                <Network className="w-4 h-4" />
                View in World
              </button>
              
              <button 
                onClick={() => router.push(`/context?q=What is the context around ${encodeURIComponent(entity.name)}?`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-2 border border-border-strong text-foreground font-semibold text-sm hover:bg-surface-2/80 transition-colors cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                Ask Context
              </button>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
