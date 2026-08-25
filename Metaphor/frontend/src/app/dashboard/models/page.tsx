"use client";

import React, { useEffect, useState } from "react";
import { Brain, Code, PenTool, Hash, Plus, RefreshCw, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchFromMetaphor } from "@/app/api";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";

type ModelItem = {
  id: string;
  name: string;
  description: string;
  nodes: number;
  isDefault: boolean;
  lastSync: string;
};

export default function ContextModelsPage() {


  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTypes, setNewTypes] = useState("project,constraint");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await fetchFromMetaphor("/context/models");
      setModels(data);
    } catch (e) {
      console.error("Failed to load context models", e);
    } finally {
      setLoading(false);
    }
  };

  const getModelIcon = (id: string) => {
    switch (id) {
      case "global": return <Brain className="w-5 h-5 text-foreground" />;
      case "engineering": return <Code className="w-5 h-5 text-primary" />;
      default: return <PenTool className="w-5 h-5 text-muted" />;
    }
  };

  const handleCreateModel = async () => {
    if (!newName.trim() || !newDesc.trim() || !newTypes.trim()) return;
    setIsSubmitting(true);
    try {
      await fetchFromMetaphor("/context/models", {
        name: newName,
        description: newDesc,
        node_types: newTypes
      }, "POST");

      setIsModalOpen(false);
      setNewName("");
      setNewDesc("");
      setNewTypes("project,constraint");
      loadModels();
    } catch (e) {
      console.error("Failed to create context model", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-150">
      <header className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-2xl text-foreground font-medium mb-2">Context Models</h1>
          <p className="text-muted text-sm leading-relaxed max-w-xl">
            Context Models allow you to partition your Knowledge Graph. Downstream AIs can request specific models to filter out irrelevant noise.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadModels} className="p-2 text-muted hover:text-foreground bg-surface-1 border border-border-subtle rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            New Model
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {models.map((model) => (
          <Card key={model.id} className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-surface-2 rounded-md">
                {getModelIcon(model.id)}
              </div>
              {model.isDefault && (
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
                  Default
                </span>
              )}
            </div>
            
            <h3 className="text-base font-medium text-foreground mb-2">{model.name}</h3>
            <p className="text-sm text-muted leading-relaxed mb-8 flex-grow">
              {model.description}
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle text-xs text-muted">
              <span className="flex items-center gap-1.5 font-mono">
                <Hash className="w-3.5 h-3.5 text-primary" />
                {model.nodes} Nodes Partitioned
              </span>
              <span>Synced {model.lastSync}</span>
            </div>
          </Card>
        ))}
        </div>
      )}




      {/* New Model Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-1 border border-border-strong rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-border-subtle">
              <h3 className="text-lg font-semibold text-foreground">Create Context Model</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Model Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Frontend Architecture" className="w-full bg-background border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this model optimized for?" className="w-full bg-background border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary h-24 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Included Node Types</label>
                <input type="text" value={newTypes} onChange={e => setNewTypes(e.target.value)} placeholder="e.g. project,constraint,goal" className="w-full bg-background border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary" />
                <p className="text-[10px] text-muted mt-1.5">Comma-separated list of types to include.</p>
              </div>
            </div>
            <div className="p-5 border-t border-border-subtle bg-surface-2 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Cancel</button>
              <button 
                onClick={handleCreateModel} 
                disabled={isSubmitting || !newName.trim()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Model"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
