// Layer 5 & Layer 6: State Provider - MetaphorContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ContextEvent, SourceSystem } from '../lib/events/EventTypes';
import { EventNormalizer } from '../lib/events/EventNormalizer';
import { EventTransformer } from '../lib/events/EventTransformer';
import { METAPHOR_ONTOLOGY, EntityType } from '../lib/ontology/OntologySchema';
import { InferenceEngine, InferredInsight } from '../lib/ontology/InferenceEngine';

export type MetaphorView = 'context' | 'timeline' | 'knowledge' | 'explore' | 'connectors';

export interface MetaphorEntity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  sourceSystem?: SourceSystem;
  lastUpdated: string;
  ownerName?: string;
  impactScore?: number;
  properties: Record<string, unknown>;
  connectedEntityIds: string[];
  reasoning?: string;
  decidedAt?: string;
}

export interface MetaphorConnector {
  id: string;
  name: string;
  source: SourceSystem;
  status: 'active' | 'syncing' | 'error' | 'paused';
  healthScore: number;
  lastSync: string;
  webhookStatus: 'operational' | 'degraded';
  pollingFrequency: string;
  eventsProcessedToday: number;
  knowledgeProduced: {
    label: string;
    count: number;
  }[];
}

interface MetaphorContextType {
  activeWorkspace: string;
  setActiveWorkspace: (ws: string) => void;
  activeView: MetaphorView;
  setActiveView: (view: MetaphorView) => void;
  
  // Universal Inspector State
  selectedEntity: MetaphorEntity | ContextEvent | null;
  inspectEntity: (entity: MetaphorEntity | ContextEvent | string | null) => void;
  closeInspector: () => void;
  
  // Command Palette State
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  
  // Data Collections
  events: ContextEvent[];
  entities: MetaphorEntity[];
  connectors: MetaphorConnector[];
  insights: InferredInsight[];
  
  // Quick Actions
  addSimulatedEvent: (source: SourceSystem) => void;
}

const MetaphorContext = createContext<MetaphorContextType | undefined>(undefined);



const INITIAL_ENTITIES: MetaphorEntity[] = [
  {
    id: 'ent_prj_core',
    name: 'Project Metaphor Core Engine',
    type: 'Project',
    description: 'The foundational Context Operating System infrastructure',
    sourceSystem: 'github',
    lastUpdated: '10 mins ago',
    ownerName: 'Kenshi (Lead Architect)',
    impactScore: 98,
    properties: {
      status: 'Active High Velocity',
      components: ['EventNormalizer', 'OntologyEngine', 'KnowledgeGraph']
    },
    connectedEntityIds: ['ent_person_david', 'ent_doc_arch', 'ent_commit_01', 'ent_dec_auth']
  },
  {
    id: 'ent_person_david',
    name: 'David R. (Partner)',
    type: 'Person',
    description: 'Primary external sponsor & strategic advisor',
    sourceSystem: 'gmail',
    lastUpdated: '25 mins ago',
    ownerName: 'External',
    impactScore: 90,
    properties: {
      email: 'david@enterprise.io',
      role: 'VP Product Strategy'
    },
    connectedEntityIds: ['ent_prj_core', 'ent_meet_01']
  },
  {
    id: 'ent_dec_auth',
    name: 'Decision: Unified JWT Authentication',
    type: 'Decision',
    description: 'Migrate single sign-on to OAuth2 + JWT tokens across modules',
    sourceSystem: 'notion',
    lastUpdated: '1 hour ago',
    ownerName: 'Kenshi',
    impactScore: 85,
    properties: {
      status: 'Approved & Merging',
      rationale: 'Reduces latency by 40% across submodules'
    },
    connectedEntityIds: ['ent_prj_core', 'ent_commit_01', 'ent_task_auth']
  },
  {
    id: 'ent_commit_01',
    name: 'Commit #8f92a4: Event Normalizer Pipeline',
    type: 'Commit',
    description: 'Merged Layer 0 Event Bus transformation engine',
    sourceSystem: 'github',
    lastUpdated: '15 mins ago',
    ownerName: 'Kenshi',
    impactScore: 92,
    properties: {
      hash: '8f92a4b102',
      branch: 'main'
    },
    connectedEntityIds: ['ent_prj_core', 'ent_dec_auth']
  },
  {
    id: 'ent_doc_arch',
    name: 'Spec: Context Operating System Layer 0-7',
    type: 'Document',
    description: 'Comprehensive architectural specification & ontology rules',
    sourceSystem: 'notion',
    lastUpdated: '2 hours ago',
    ownerName: 'Kenshi',
    impactScore: 96,
    properties: {
      url: 'https://notion.so/metaphor/spec-layer-0-7'
    },
    connectedEntityIds: ['ent_prj_core', 'ent_person_david']
  },
  {
    id: 'ent_meet_01',
    name: 'Meeting: Architecture Sync with David',
    type: 'Meeting',
    description: 'Alignment call regarding knowledge graph indexing speed',
    sourceSystem: 'calendar',
    lastUpdated: '3 hours ago',
    ownerName: 'David R.',
    impactScore: 80,
    properties: {
      duration: '45 mins',
      attendees: ['David R.', 'Kenshi']
    },
    connectedEntityIds: ['ent_person_david', 'ent_dec_auth']
  },
  {
    id: 'ent_task_auth',
    name: 'Task: Implement Event Transformer',
    type: 'Task',
    description: 'Bridge raw stream events into graph node & edge mutations',
    sourceSystem: 'github',
    lastUpdated: '30 mins ago',
    ownerName: 'Kenshi',
    impactScore: 78,
    properties: {
      status: 'In Progress'
    },
    connectedEntityIds: ['ent_dec_auth', 'ent_prj_core']
  },
  {
    id: 'ent_cust_01',
    name: 'Enterprise Client Account',
    type: 'Person',
    description: 'Tier-1 enterprise subscriber ($12,000 / mo)',
    sourceSystem: 'stripe',
    lastUpdated: '40 mins ago',
    ownerName: 'Finance',
    impactScore: 94,
    properties: {
      mrr: '$12,000',
      status: 'Active'
    },
    connectedEntityIds: ['ent_prj_core']
  }
];

export const MetaphorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeWorkspace, setActiveWorkspace] = useState<string>('Core Enterprise');
  const [activeView, setActiveView] = useState<MetaphorView>('context');
  const [selectedEntity, setSelectedEntity] = useState<MetaphorEntity | ContextEvent | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  
  const [entities, setEntities] = useState<MetaphorEntity[]>(INITIAL_ENTITIES);
  const [connectors, setConnectors] = useState<MetaphorConnector[]>([]);

  useEffect(() => {
    // Fetch real connected integrations from backend
    const loadConnectors = async () => {
      try {
        const { fetchFromMetaphor } = await import('@/app/api');
        const res = await fetchFromMetaphor('/integrations', undefined, 'GET');
        if (res && res.integrations && Array.isArray(res.integrations)) {
          const realConnectors: MetaphorConnector[] = res.integrations.map((integ: any) => ({
            id: integ.id || `conn_${integ.provider}`,
            name: integ.provider === 'github' ? 'GitHub' : integ.provider === 'notion' ? 'Notion Workspace' : integ.provider === 'linear' ? 'Linear' : integ.provider,
            source: integ.provider,
            status: integ.status || 'active',
            healthScore: 100,
            lastSync: 'Just now',
            webhookStatus: 'operational',
            pollingFrequency: 'Real-time Webhook',
            eventsProcessedToday: 0,
            knowledgeProduced: []
          }));
          setConnectors(realConnectors);
        }
      } catch (err) {
        console.warn("Failed to load live connectors:", err);
        setConnectors([]);
      }
    };
    loadConnectors();
  }, []);
  
  const [events, setEvents] = useState<ContextEvent[]>([
    EventNormalizer.normalize({
      id: '101',
      source: 'github',
      rawType: 'pull_request_merged',
      timestamp: '09:46 AM',
      payload: {
        title: 'Layer 0 Event Bus Transformation',
        repo: 'metaphor/core',
        merged: true,
        relatedIds: ['ent_prj_core', 'ent_dec_auth']
      },
      author: { name: 'Kenshi', email: 'kenshi@deepmind.com' }
    }),
    EventNormalizer.normalize({
      id: '102',
      source: 'stripe',
      rawType: 'charge_succeeded',
      timestamp: '09:28 AM',
      payload: {
        amount: 1200000,
        customerName: 'Enterprise Client Account',
        customerId: 'ent_cust_01'
      }
    }),
    EventNormalizer.normalize({
      id: '103',
      source: 'notion',
      rawType: 'page_updated',
      timestamp: '09:12 AM',
      payload: {
        docTitle: 'Spec: Context Operating System Layer 0-7',
        docId: 'ent_doc_arch'
      },
      author: { name: 'Kenshi' }
    }),
    EventNormalizer.normalize({
      id: '104',
      source: 'calendar',
      rawType: 'event_scheduled',
      timestamp: '08:45 AM',
      payload: {
        eventTitle: 'Architecture Sync with David',
        attendees: ['David R.', 'Kenshi']
      },
      author: { name: 'David R.' }
    }),
    EventNormalizer.normalize({
      id: '105',
      source: 'gmail',
      rawType: 'email_received',
      timestamp: '08:15 AM',
      payload: {
        subject: 'Re: Knowledge Graph Indexing Speed',
        from: 'david@enterprise.io',
        fromName: 'David R. (Partner)'
      }
    })
  ]);

  const [insights, setInsights] = useState<InferredInsight[]>([]);

  useEffect(() => {
    // Derive initial AI insights using Layer 3 Inference Engine
    const derived = InferenceEngine.inferContextObservations(events);
    setInsights(derived);
  }, [events]);

  // Global Keyboard Listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const inspectEntity = (target: MetaphorEntity | ContextEvent | string | null) => {
    if (typeof target === 'string') {
      const found = entities.find(e => e.id === target);
      if (found) {
        setSelectedEntity(found);
      } else {
        const foundEvt = events.find(ev => ev.id === target);
        if (foundEvt) setSelectedEntity(foundEvt);
      }
    } else {
      setSelectedEntity(target);
    }
  };

  const closeInspector = () => {
    setSelectedEntity(null);
  };

  const toggleCommandPalette = () => {
    setIsCommandPaletteOpen(prev => !prev);
  };

  const addSimulatedEvent = (source: SourceSystem) => {
    const newRaw = {
      id: `${Date.now()}`,
      source,
      rawType: 'realtime_pulse',
      timestamp: 'Just now',
      payload: {
        title: `Real-time ${source.toUpperCase()} Activity`,
        message: 'Context Operating System auto-ingested living signal',
        relatedIds: ['ent_prj_core']
      },
      author: { name: 'Living System' }
    };

    const normalized = EventNormalizer.normalize(newRaw);
    setEvents(prev => [normalized, ...prev]);

    // Apply Graph Mutation via EventTransformer
    const mutations = EventTransformer.transformToGraphMutations(normalized);
    mutations.forEach(mut => {
      if (mut.type === 'node_upsert' && mut.nodeData) {
        const existingIndex = entities.findIndex(e => e.id === mut.nodeData!.id);
        if (existingIndex === -1) {
          const newEntity: MetaphorEntity = {
            id: mut.nodeData.id,
            name: mut.nodeData.label,
            type: (mut.nodeData.type as EntityType) || 'Event',
            description: 'Auto-ingested living context node',
            sourceSystem: source,
            lastUpdated: 'Just now',
            impactScore: 88,
            properties: mut.nodeData.properties,
            connectedEntityIds: ['ent_prj_core']
          };
          setEntities(prev => [newEntity, ...prev]);
        }
      }
    });
  };

  return (
    <MetaphorContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        activeView,
        setActiveView,
        selectedEntity,
        inspectEntity,
        closeInspector,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleCommandPalette,
        events,
        entities,
        connectors,
        insights,
        addSimulatedEvent
      }}
    >
      {children}
    </MetaphorContext.Provider>
  );
};

export const useMetaphor = () => {
  const context = useContext(MetaphorContext);
  if (!context) {
    throw new Error('useMetaphor must be used within a MetaphorProvider');
  }
  return context;
};
