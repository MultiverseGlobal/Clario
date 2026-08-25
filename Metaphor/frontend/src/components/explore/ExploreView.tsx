// Layer 6: UI - Context Operating System 8-Layer Explorer - ExploreView.tsx
'use client';

import React from 'react';
import { Layers, Database, Cpu, ShieldCheck, Activity, Network, Eye, Lock } from 'lucide-react';

export const ExploreView: React.FC = () => {
  const osLayers = [
    { num: 'L0', name: 'Raw Event Ingestion Bus', desc: 'Captures raw digital exhaust from GitHub, Notion, Slack, Stripe, and Calendar via unified webhooks.' },
    { num: 'L1', name: 'Event Normalization & Deduplication', desc: 'Standardizes disparate event schemas into canonical Metaphor Event primitives.' },
    { num: 'L2', name: 'Continuous Entity & Graph Extraction', desc: 'Runs LLM reflection & rule-based extractors to build Living Context Nodes.' },
    { num: 'L3', name: 'Vector & Semantic Embedding Index', desc: 'Generates pgvector embeddings for similarity retrieval across workspace history.' },
    { num: 'L4', name: 'Conflict & Resolution Engine', desc: 'Identifies ambiguous or contradictory context and prompts staged clarification.' },
    { num: 'L5', name: 'Context Assembly & Prompt Synthesis', desc: 'Assembles real-time situational context packages for downstream AI agents.' },
    { num: 'L6', name: 'Mission Control UI & Human Verification', desc: 'Provides Palantir Foundry-style visual graph management and staging approval.' },
    { num: 'L7', name: 'External Agent Dispatch & Sync', desc: 'Broadcasts resolved context to connected agents, William, and external tools.' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-fade text-left">
      
      <div className="space-y-1">
        <div className="eyebrow text-primary">Architecture Map</div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Metaphor Context OS 8-Layer Architecture</h2>
        <p className="text-xs text-muted-foreground">The end-to-end pipeline transforming unstructured tool exhaust into unified situational awareness.</p>
      </div>

      <div className="space-y-3">
        {osLayers.map((layer) => (
          <div 
            key={layer.num}
            className="metaphor-glass p-5 border border-border bg-card/60 rounded-xl flex items-start space-x-4 hover:border-primary/40 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-mono font-bold text-primary shrink-0 group-hover:scale-105 transition-transform">
              {layer.num}
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{layer.name}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{layer.desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
