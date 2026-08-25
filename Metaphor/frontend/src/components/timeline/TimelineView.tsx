// Layer 6: UI - Progression Log & Timeline - TimelineView.tsx
'use client';

import React from 'react';
import { useMetaphor } from '../../context/MetaphorContext';
import { Clock, Filter, GitCommit, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

export const TimelineView: React.FC = () => {
  const { events, inspectEntity } = useMetaphor();

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-fade">
      
      {/* Header Title */}
      <div className="space-y-1 text-left">
        <div className="eyebrow text-primary">Progression Log</div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Timeline Ledger</h2>
        <p className="text-xs text-muted-foreground">Chronological sequence of structural context mappings, decisions, and system events.</p>
      </div>

      {/* Dotted Trail Line Container */}
      <div className="relative border-l border-border ml-4 pl-6 py-2 space-y-8">
        {events.map((evt, idx) => (
          <div key={evt.id} className="relative space-y-2 group">
            
            {/* Waypoint Dot */}
            <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background group-hover:scale-125 transition-transform" />

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">{new Date(evt.timestamp).toLocaleString()}</span>
              <span className="metaphor-badge">{evt.source}</span>
            </div>

            <div 
              className="metaphor-glass p-5 border border-border bg-card/60 rounded-xl hover:border-primary/40 transition-all cursor-pointer"
              onClick={() => {
                if (evt.extractedEntities && evt.extractedEntities.length > 0) {
                  inspectEntity(evt.extractedEntities[0]);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {evt.payload?.title || evt.payload?.description || 'Context Event Ingested'}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evt.payload?.details || evt.payload?.text || 'Processed raw digital exhaust.'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </div>

              {evt.extractedEntities && evt.extractedEntities.length > 0 && (
                <div className="pt-3 border-t border-border/50 mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">Extracted Entities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {evt.extractedEntities.map(ent => (
                      <span key={ent} className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {ent}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
