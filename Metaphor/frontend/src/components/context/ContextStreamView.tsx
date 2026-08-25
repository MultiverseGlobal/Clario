// Layer 6: UI - Context Awareness Stream - ContextStreamView.tsx
'use client';

import React from 'react';
import { useMetaphor } from '../../context/MetaphorContext';
import { 
  Activity, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  User, 
  FolderGit2, 
  Zap, 
  CheckCircle2, 
  GitCommit, 
  CreditCard, 
  FileText, 
  Video, 
  Mail, 
  ChevronRight,
  TrendingUp,
  CircleDot
} from 'lucide-react';

export const ContextStreamView: React.FC = () => {
  const { events, entities, inspectEntity, setActiveView, insights } = useMetaphor();

  // Living Snapshot Chain Items
  const snapshotSequence = [
    { label: 'You', detail: 'Active in Core Enterprise', color: 'text-foreground', bg: 'bg-primary/10 border-primary/20' },
    { label: 'Primary Context', detail: 'Project Metaphor Core Engine', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
    { label: 'Upcoming', detail: 'Architecture Sync with David in 40m', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Recent Code', detail: 'Layer 0 Event Bus merged', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Communication', detail: 'David R. replied to Spec', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' }
  ];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'github': return GitCommit;
      case 'stripe': return CreditCard;
      case 'notion': return FileText;
      case 'calendar': return Video;
      case 'gmail': return Mail;
      default: return Zap;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-fade">
      
      {/* 1. LIVING AWARENESS SEQUENCE BAR */}
      <div className="metaphor-glass p-5 border border-border bg-card/60 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CircleDot className="w-4 h-4 text-primary animate-pulse" />
            <h2 className="font-serif font-bold text-base text-foreground tracking-tight">Living System Snapshot</h2>
          </div>
          <span className="eyebrow text-emerald-400">Real-time Awareness</span>
        </div>

        {/* Fluid Awareness Sequence Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {snapshotSequence.map((item, idx) => (
            <div 
              key={idx} 
              className={`p-3.5 rounded-xl border ${item.bg} flex flex-col justify-between space-y-1.5 transition-all hover:scale-[1.02] cursor-pointer`}
            >
              <div className="eyebrow text-[9px]">{item.label}</div>
              <div className={`text-xs font-semibold ${item.color} leading-snug line-clamp-2`}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. EMBEDDED AI CONTEXT OBSERVATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className="metaphor-glass p-5 border border-primary/30 bg-primary/5 rounded-xl flex items-start space-x-3.5 hover:border-primary/50 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-xs font-semibold text-foreground">{insight.title}</h4>
                <span className="text-[10px] font-mono font-bold text-emerald-400">{(insight.confidence * 100).toFixed(0)}% Confidence</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. RECENT CONTEXT STREAM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-lg font-semibold text-foreground">Ingested Context Stream</h3>
          </div>
          <span className="eyebrow text-muted-foreground">{events.length} Events Ingested</span>
        </div>

        {/* Live Stream Event List */}
        <div className="space-y-3">
          {events.map((evt) => {
            const IconComponent = getSourceIcon(evt.source);
            return (
              <div 
                key={evt.id}
                className="metaphor-glass p-4 border border-border bg-card/60 rounded-xl flex items-start justify-between space-x-4 hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => {
                  if (evt.extractedEntities && evt.extractedEntities.length > 0) {
                    inspectEntity(evt.extractedEntities[0]);
                  }
                }}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="metaphor-badge">{evt.source}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{evt.payload?.title || evt.payload?.description || 'Context Event'}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{evt.payload?.details || evt.payload?.text || 'No payload details provided.'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {evt.extractedEntities && evt.extractedEntities.length > 0 && (
                    <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                      {evt.extractedEntities.length} entities
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
