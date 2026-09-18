"use client";

import React, { useEffect, useState } from "react";
import {
  Brain,
  Code,
  PenTool,
  Hash,
  Plus,
  RefreshCw,
  X,
  Database,
  CheckCircle2,
  Layers,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";

type Partition = {
  id: string;
  name: string;
  description: string;
  nodes: number;
  isDefault: boolean;
  isActive: boolean;
  lastSync: string;
  nodeTypes: string[];
};

// Mock fallback when backend is empty
const MOCK_PARTITIONS: Partition[] = [
  {
    id: "global",
    name: "Global Context",
    description: "The full sovereign knowledge graph. Contains all nodes from every connected source.",
    nodes: 0,
    isDefault: true,
    isActive: true,
    lastSync: "Just now",
    nodeTypes: ["project", "constraint", "goal", "decision", "identity", "document"],
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "Scoped to code commits, architecture decisions, and technical constraints only.",
    nodes: 0,
    isDefault: false,
    isActive: false,
    lastSync: "Never",
    nodeTypes: ["project", "constraint", "document"],
  },
];

export default function PartitionsPage() {
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTypes, setNewTypes] = useState("project,constraint");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    loadPartitions();
  }, []);

  const loadPartitions = async () => {
    setLoading(true);
    try {
      const data = await fetchFromMetaphor("/context/models");
      if (Array.isArray(data) && data.length > 0) {
        setPartitions(data);
      } else {
        setPartitions(MOCK_PARTITIONS);
      }
    } catch {
      setPartitions(MOCK_PARTITIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    setActivating(id);
    try {
      await fetchFromMetaphor(`/context/models/${id}/activate`, undefined, "POST");
      setPartitions(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
    } catch {
      // optimistic anyway
      setPartitions(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
    } finally {
      setActivating(null);
    }
  };

  const handleCreatePartition = async () => {
    if (!newName.trim() || !newDesc.trim()) return;
    setIsSubmitting(true);
    try {
      await fetchFromMetaphor("/context/models", {
        name: newName,
        description: newDesc,
        node_types: newTypes,
      }, "POST");
      setIsModalOpen(false);
      setNewName("");
      setNewDesc("");
      setNewTypes("project,constraint");
      loadPartitions();
    } catch (e) {
      console.error("Failed to create partition", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case "global":      return <Brain className="w-5 h-5 text-primary" />;
      case "engineering": return <Code className="w-5 h-5 text-cyan-500" />;
      default:            return <PenTool className="w-5 h-5 text-muted" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 animate-in fade-in duration-150">

      {/* Header */}
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Context Partitions
          </h1>
          <p className="text-sm text-muted leading-relaxed max-w-xl">
            Partitions scope what knowledge is visible to each AI client request. Only one partition is active at a time. No LLM model is tied to a partition — context is model-agnostic.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadPartitions}
            className="p-2 text-muted hover:text-foreground bg-surface-1 border border-border-subtle rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Partition
          </button>
        </div>
      </header>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partitions.map((p) => (
            <Card key={p.id} className={`flex flex-col h-full transition-all ${p.isActive ? "border-primary/40 bg-primary/5" : ""}`}>

              {/* Card Header */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${p.isActive ? "bg-primary/15" : "bg-surface-2"}`}>
                    {getIcon(p.id)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                    {p.isDefault && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">Default</span>
                    )}
                  </div>
                </div>

                {/* Active badge */}
                {p.isActive && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Active
                  </span>
                )}
              </div>

              <p className="text-sm text-muted leading-relaxed mb-5 flex-grow">{p.description}</p>

              {/* Node Types */}
              {p.nodeTypes && p.nodeTypes.length > 0 && (
                <div className="mb-5">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted mb-2">Included Node Types</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.nodeTypes.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-surface-2 border border-border-subtle text-[10px] font-mono text-muted capitalize">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    {p.nodes} nodes
                  </span>
                  <span className="flex items-center gap-1 opacity-70">
                    <Clock className="w-3 h-3" />{p.lastSync}
                  </span>
                </div>

                {!p.isActive && (
                  <button
                    onClick={() => handleSetActive(p.id)}
                    disabled={activating === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-border-subtle hover:border-border-strong text-foreground font-medium transition-all cursor-pointer disabled:opacity-50 text-[11px]"
                  >
                    {activating === p.id ? (
                      <div className="w-3 h-3 border border-muted/40 border-t-foreground rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Set Active
                  </button>
                )}
                {p.isActive && (
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" /> Serving context
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Partition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-1 border border-border-strong rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            <div className="flex justify-between items-center p-5 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-foreground">New Context Partition</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Mobile Engineering"
                  className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What knowledge does this partition surface?"
                  className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Included Node Types</label>
                <input
                  type="text"
                  value={newTypes}
                  onChange={e => setNewTypes(e.target.value)}
                  placeholder="project, constraint, goal"
                  className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-muted mt-1.5">Comma-separated. Only these node types will be visible to MCP clients using this partition.</p>
              </div>
            </div>
            <div className="p-5 border-t border-border-subtle bg-surface-2 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePartition}
                disabled={isSubmitting || !newName.trim()}
                className="px-4 py-2 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              >
                {isSubmitting ? "Creating..." : "Create Partition"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
