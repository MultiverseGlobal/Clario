// Layer 6: UI - Global Universal Context Inspector - GlobalContextInspector.tsx
'use client';

import React, { useState } from 'react';
import { useMetaphor, MetaphorEntity } from '../../context/MetaphorContext';
import { ContextEvent } from '../../lib/events/EventTypes';
import { METAPHOR_ONTOLOGY } from '../../lib/ontology/OntologySchema';
import { 
  X, 
  Sparkles, 
  Network, 
  Clock, 
  ExternalLink, 
  User, 
  FolderGit2, 
  FileText, 
  Compass, 
  CheckSquare, 
  Video, 
  Zap, 
  ShieldCheck,
  ChevronRight,
  Code
} from 'lucide-react';

export const GlobalContextInspector: React.FC = () => {
  const { selectedEntity, closeInspector, inspectEntity, entities, events } = useMetaphor();
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'timeline' | 'raw'>('overview');

  if (!selectedEntity) return null;

  const isEvent = 'rawEventId' in selectedEntity;
  const entity = isEvent ? null : (selectedEntity as MetaphorEntity);
  const event = isEvent ? (selectedEntity as ContextEvent) : null;

  const title = entity ? entity.name : event ? event.title : 'Object Inspector';
  const type = entity ? entity.type : event ? event.category.toUpperCase() : 'EVENT';
  const source = entity ? entity.sourceSystem || 'system' : event ? event.source : 'system';
  const description = entity ? entity.description : event ? event.summary : '';

  // Resolve connected entities
  const connectedIds = entity ? entity.connectedEntityIds : event ? event.relatedEntityIds : [];
  const connectedEntities = entities.filter(e => connectedIds.includes(e.id));
  const relatedEvents = events.filter(ev => 
    (entity && ev.primaryEntityId === entity.id) || 
    (entity && ev.relatedEntityIds.includes(entity.id))
  );

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md metaphor-glass bg-[var(--bg-surface-solid)] border-l border-[var(--border-strong)] shadow-2xl flex flex-col animate-slide-in">
      
      {/* Header Bar */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-start justify-between bg-white/2">
        <div className="flex items-start space-x-3 pr-2">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-blue-glow)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent-blue)] shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`metaphor-badge text-[9px] ${type.toLowerCase() === 'decision' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 'text-[var(--accent-cyan)]'}`}>{type}</span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{source}</span>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mt-1 line-clamp-2 leading-tight">
              {title}
            </h3>
          </div>
        </div>
        <button 
          onClick={closeInspector}
          className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 border-b border-[var(--border-subtle)] bg-black/20 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-3 border-b-2 transition-colors ${
            activeTab === 'overview' 
              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] font-semibold' 
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`py-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'graph' 
              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] font-semibold' 
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph ({connectedEntities.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'timeline' 
              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] font-semibold' 
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History ({relatedEvents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'raw' 
              ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] font-semibold' 
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Raw</span>
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Quiet Embedded AI Observation */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[rgba(0,102,255,0.12)] to-[rgba(139,92,246,0.12)] border border-[var(--border-accent)]">
          <div className="flex items-center space-x-2 text-xs font-medium text-[var(--accent-cyan)] mb-1">
            <Sparkles className="w-4 h-4 text-[var(--accent-cyan)] shrink-0 animate-pulse" />
            <span>AI Context Observation</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {event?.aiContextObservation || 
             (entity ? `Entity '${entity.name}' has 98% centrality in core engineering graph.` : 'Living system is indexing relationship pathways.')}
          </p>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {description && (
              <div>
                <h4 className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-white/2 p-2.5 rounded-lg border border-[var(--border-subtle)]">
                  {description}
                </p>
              </div>
            )}

            {/* Decision Rationale */}
            {entity && entity.type.toLowerCase() === 'decision' && (
              <div>
                <h4 className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">Rationale</h4>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed bg-[rgba(245,158,11,0.1)] p-2.5 rounded-lg border border-[rgba(245,158,11,0.2)]">
                  {entity.reasoning || <span className="text-[var(--text-muted)] italic">No rationale found in sources.</span>}
                </p>
              </div>
            )}

            {/* Properties Matrix */}
            <div>
              <h4 className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">Properties Matrix</h4>
              <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)] bg-white/2 text-xs">
                {entity && (
                  <>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Owner / Lead</span>
                      <span className="text-[var(--text-primary)] font-medium">{entity.ownerName || 'System'}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Impact Score</span>
                      <span className="text-[var(--accent-emerald)] font-mono font-semibold">{entity.impactScore || 90}/100</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Last Synchronized</span>
                      <span className="text-[var(--text-secondary)]">{entity.lastUpdated}</span>
                    </div>
                  </>
                )}
                {event && (
                  <>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Author</span>
                      <span className="text-[var(--text-primary)] font-medium">{event.authorName || 'System'}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Timestamp</span>
                      <span className="text-[var(--text-secondary)]">{event.timestamp}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-[var(--text-muted)] font-mono">Severity</span>
                      <span className="text-[var(--accent-blue)] font-mono uppercase">{event.severity}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Direct Connected Entities Preview */}
            <div>
              <h4 className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">Connected Knowledge ({connectedEntities.length})</h4>
              <div className="space-y-1.5">
                {connectedEntities.map(conn => (
                  <button
                    key={conn.id}
                    onClick={() => inspectEntity(conn)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-white/2 hover:bg-[var(--bg-surface-hover)] transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="metaphor-badge text-[9px]">{conn.type}</span>
                      <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-1">{conn.name}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBGRAPH */}
        {activeTab === 'graph' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">Directly connected ontology nodes in knowledge graph:</p>
            {connectedEntities.map(conn => (
              <div key={conn.id} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-white/2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{conn.name}</span>
                  <span className="metaphor-badge text-[9px]">{conn.type}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{conn.description}</p>
                <button
                  onClick={() => inspectEntity(conn)}
                  className="text-[11px] text-[var(--accent-blue)] hover:underline flex items-center pt-1"
                >
                  Inspect Object <ChevronRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-2">
            {relatedEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No historical context events recorded yet.</p>
            ) : (
              relatedEvents.map(ev => (
                <div key={ev.id} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-white/2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{ev.title}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{ev.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">{ev.summary}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: RAW JSON */}
        {activeTab === 'raw' && (
          <div className="p-3 rounded-lg bg-black/40 border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--accent-cyan)] overflow-x-auto">
            <pre>{JSON.stringify(selectedEntity, null, 2)}</pre>
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-white/2 flex items-center justify-between text-xs">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">ID: {entity ? entity.id : event?.id}</span>
        <button 
          onClick={closeInspector}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-white/10 transition-colors"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
};
