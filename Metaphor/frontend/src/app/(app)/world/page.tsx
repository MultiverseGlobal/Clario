"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { Network, Search, Maximize2, Share2, Activity, ArrowRight, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  Node as FlowNode,
  Edge as FlowEdge,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ContextNode } from "@/components/graph/ContextNode";
import { DraftNode } from "@/components/graph/DraftNode";
import { LeadNode } from "@/components/graph/LeadNode";
import { GlowEdge } from "@/components/graph/GlowEdge";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchFromMetaphor } from "@/app/api";

// ── Custom Node ────────────────────────────────────────────────────────────
const CustomNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div className={`px-3 py-1.5 bg-surface-1 border ${selected ? "border-foreground shadow-glow" : "border-border-strong"} hover:border-foreground rounded-none shadow-sm flex items-center gap-2 transition-all min-w-[120px]`}>
      <Handle type="target" position={Position.Top} className="!w-1 !h-1 !bg-foreground !border-none !rounded-none opacity-0" />
      <div className="text-[10px] uppercase font-mono tracking-widest text-muted">{data.type || "NODE"}</div>
      <span className="text-xs font-sans font-medium text-foreground whitespace-nowrap ml-2">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-1 !h-1 !bg-foreground !border-none !rounded-none opacity-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode, context: ContextNode, draft: DraftNode, lead: LeadNode };
const edgeTypes = { glow: GlowEdge };

const MOCK_GRAPH_NODES = [
  { id: "node-orion", name: "Orion Engine", type: "project", summary: "Autonomous candidate sourcing and ranking system." },
  { id: "node-clario", name: "Clario Studio", type: "project", summary: "AI video generation and editing pipeline." },
  { id: "node-nats", name: "NATS JetStream", type: "decision", summary: "Adopted as primary message broker replacing RabbitMQ." },
  { id: "node-adr42", name: "ADR-42", type: "decision", summary: "Architectural decision record confirming event-driven transition." },
  { id: "node-freeze", name: "Q4 Code Freeze", type: "constraint", summary: "Hard freeze deadline across all production services." },
  { id: "node-auth", name: "Supabase SSR Auth", type: "fact", summary: "Single-tenant cookie-based token propagation." },
];

const MOCK_GRAPH_EDGES = [
  { id: "e1", source: "node-orion", target: "node-nats", relation_type: "DEPENDS_ON" },
  { id: "e2", source: "node-nats", target: "node-adr42", relation_type: "DOCUMENTED_IN" },
  { id: "e3", source: "node-orion", target: "node-freeze", relation_type: "CONSTRAINED_BY" },
  { id: "e4", source: "node-clario", target: "node-auth", relation_type: "AUTHENTICATES_VIA" },
];

function buildFlowGraph(nodesList: any[], edgesList: any[]) {
  const radiusStep = 160;
  const flowNodes: FlowNode[] = nodesList.map((n: any, i: number) => {
    if (i === 0) {
      return {
        id: n.id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: n.name, type: (n.type || "project").toLowerCase(), summary: n.summary }
      };
    }
    
    const ring = Math.floor(Math.sqrt(i));
    const nodesInRing = Math.max(4, ring * 4);
    const angle = ((i % nodesInRing) / nodesInRing) * 2 * Math.PI;
    const radius = ring * radiusStep + 80;

    const rawType = (n.type || "project").toLowerCase();
    let nodeType = "context";
    if (rawType === "draft") nodeType = "draft";
    if (rawType === "lead") nodeType = "lead";

    return {
      id: n.id,
      type: nodeType,
      position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
      data: { label: n.name, type: rawType, summary: n.summary }
    };
  });

  const flowEdges: FlowEdge[] = edgesList.map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'glow',
    animated: true,
    label: e.relation_type || "",
    labelStyle: { fill: 'var(--color-muted)', fontSize: 9, fontFamily: 'monospace' },
    labelBgStyle: { fill: 'var(--color-surface-1)', fillOpacity: 0.8 },
    style: { stroke: 'var(--color-border-strong)', strokeWidth: 1.5 },
  }));

  return { flowNodes, flowEdges };
}

// ── Graph Component ────────────────────────────────────────────────────────
function KnowledgeGraphInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams?.get("focus");
  const { fitView, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [loading, setLoading] = useState(true);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const detailNode = useMemo(() => rawNodes.find((n) => n.id === selectedNodeId) || null, [selectedNodeId, rawNodes]);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const data = await fetchFromMetaphor("/graph/");
        const nodesList = (data?.nodes && data.nodes.length > 0) ? data.nodes : MOCK_GRAPH_NODES;
        const edgesList = (data?.edges && data.edges.length > 0) ? data.edges : MOCK_GRAPH_EDGES;

        const { flowNodes, flowEdges } = buildFlowGraph(nodesList, edgesList);

        setNodes(flowNodes);
        setEdges(flowEdges);
        setRawNodes(nodesList.map((n: any) => ({
          ...n,
          connections: edgesList.filter((e: any) => e.source === n.id || e.target === n.id).length
        })));
      } catch (e) {
        console.warn("Failed to fetch graph from backend, using fallback dataset:", e);
        const { flowNodes, flowEdges } = buildFlowGraph(MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES);
        setNodes(flowNodes);
        setEdges(flowEdges);
        setRawNodes(MOCK_GRAPH_NODES.map((n: any) => ({
          ...n,
          connections: MOCK_GRAPH_EDGES.filter((e: any) => e.source === n.id || e.target === n.id).length
        })));
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [setNodes, setEdges]);

  // Initial fit and URL focus
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      const timer = setTimeout(() => {
        if (focusId) {
          const target = nodes.find(n => n.id === focusId);
          if (target) {
            setSelectedNodeId(focusId);
            setCenter(target.position.x, target.position.y, { zoom: 1.2, duration: 800 });
          }
        } else {
          fitView({ duration: 800, padding: 0.2 });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, nodes.length, focusId, fitView, setCenter]);

  // Focus Mode visual styles derived cleanly via useMemo (NO state mutation loops)
  const displayNodes = useMemo(() => {
    if (!selectedNodeId) return nodes;

    const connectedEdges = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
    const connectedNodeIds = new Set([selectedNodeId, ...connectedEdges.map(e => e.source === selectedNodeId ? e.target : e.source)]);

    return nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: connectedNodeIds.has(n.id) ? 1 : 0.15,
        filter: connectedNodeIds.has(n.id) ? "none" : "blur(4px)",
        transition: "opacity 0.3s ease, filter 0.3s ease",
      }
    }));
  }, [nodes, edges, selectedNodeId]);

  const displayEdges = useMemo(() => {
    if (!selectedNodeId) return edges;

    return edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: (e.source === selectedNodeId || e.target === selectedNodeId) ? 1 : 0.05,
        transition: "opacity 0.3s ease",
      }
    }));
  }, [edges, selectedNodeId]);

  const onSelectionChange = useCallback(({ nodes }: { nodes: FlowNode[] }) => {
    setSelectedNodeId(nodes.length === 1 ? nodes[0].id : null);
  }, []);

  if (loading) {
    return <LoadingState context="graph" className="h-screen w-screen absolute inset-0" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-screen h-screen bg-transparent"
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background color="var(--color-border-subtle)" gap={24} size={1.5} />
        <MiniMap 
          className="!bg-surface-1 !border !border-border-subtle !rounded-xl overflow-hidden shadow-float !right-8 !bottom-8"
          nodeColor="var(--color-foreground)"
          maskColor="var(--color-surface-2)"
        />
      </ReactFlow>

      {/* ── Custom Controls ── */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10">
        <button onClick={() => fitView({ duration: 800 })} className="p-2.5 rounded-xl bg-surface-1/80 border border-border-subtle hover:bg-surface-2 hover:border-border-strong backdrop-blur-md shadow-sm transition-all text-foreground cursor-pointer">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── Detail Panel ── */}
      <AnimatePresence>
        {detailNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-24 right-8 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar bg-surface-1/90 border border-border-strong backdrop-blur-xl rounded-2xl shadow-float z-20 flex flex-col"
          >
            <div className="p-5 border-b border-border-subtle flex items-start justify-between">
              <div>
                <StatusBadge type={(detailNode.type || "fact").toLowerCase() as any} />
                <h3 className="font-display text-xl text-foreground mt-3 leading-tight">{detailNode.name}</h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="p-1 rounded-md hover:bg-surface-2 text-muted cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-5 flex-1">
              {detailNode.summary && (
                <div className="text-sm text-foreground/90 leading-relaxed">
                  {detailNode.summary}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-2/50 rounded-xl border border-border-subtle">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1">Connections</p>
                  <p className="text-lg font-mono text-foreground">{detailNode.connections || 0}</p>
                </div>
                <div className="p-3 bg-surface-2/50 rounded-xl border border-border-subtle">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted mb-1">Status</p>
                  <p className="text-xs font-medium text-foreground uppercase mt-1.5">{detailNode.status || "Active"}</p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border-subtle bg-surface-2/30">
              <button 
                onClick={() => router.push(`/focus/${detailNode.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Go deeper <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<LoadingState context="graph" className="h-screen w-screen absolute inset-0" />}>
      <ReactFlowProvider>
        <KnowledgeGraphInternal />
      </ReactFlowProvider>
    </Suspense>
  );
}
