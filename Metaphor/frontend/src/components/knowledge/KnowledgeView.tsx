// Layer 6: UI - Living Context Graph & Knowledge View - KnowledgeView.tsx
'use client';

import React from 'react';
import { useMetaphor } from '../../context/MetaphorContext';
import { Network, Search, Filter, Sparkles, Layers, Compass, CircleDot } from 'lucide-react';

export const KnowledgeView: React.FC = () => {
  const { entities, inspectEntity } = useMetaphor();

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-fade">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1 text-left">
          <div className="flex items-center space-x-2 text-primary eyebrow">
            <CircleDot className="w-3.5 h-3.5" />
            <span>Ontology Engine</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Living Context Graph</h2>
          <p className="text-xs text-muted-foreground">Object-relational knowledge model linking digital exhaust into explicit entities & decisions.</p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="metaphor-badge text-emerald-400">{entities.length} Entities Graph-Indexed</span>
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity) => (
          <div
            key={entity.id}
            onClick={() => inspectEntity(entity.id)}
            className="metaphor-glass p-5 border border-border bg-card/60 rounded-xl space-y-3 hover:border-primary/40 transition-all cursor-pointer group hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {entity.type}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{entity.confidence ? `${(entity.confidence * 100).toFixed(0)}%` : 'Indexed'}</span>
            </div>

            <div className="space-y-1">
              <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{entity.name}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {entity.metadata?.description || entity.metadata?.reason || entity.metadata?.repo || 'Indexed node in Metaphor Context OS.'}
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>ID: {entity.id}</span>
              <span className="group-hover:text-primary transition-colors font-bold">Inspect →</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
