import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MemoryNode, MemoryEdge, WorldModel } from '@william/types';

interface CognitiveMapProps {
  worldModel: WorldModel;
  onRefresh: () => void;
  onSaveNode?: (node: MemoryNode) => Promise<void>;
  onSaveEdge?: (edge: MemoryEdge) => Promise<void>;
}

export const CognitiveMap: React.FC<CognitiveMapProps> = ({
  worldModel,
  onRefresh,
  onSaveNode,
  onSaveEdge
}) => {
  const [nodes, setNodes] = useState<MemoryNode[]>(worldModel.nodes);
  const [edges, setEdges] = useState<MemoryEdge[]>(worldModel.edges);

  // Layout positions state (rearranged by dragging)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Interactive Tools
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [relationText, setRelationText] = useState('relates_to');

  // Load and generate initial coordinates for nodes in a neat radial layout
  useEffect(() => {
    setNodes(worldModel.nodes);
    setEdges(worldModel.edges);

    const initialPositions: Record<string, { x: number; y: number }> = {};
    const center = { x: 400, y: 300 };
    const radius = 180;

    worldModel.nodes.forEach((node, idx) => {
      // Keep existing positions if they are already stored
      if (positions[node.id]) {
        initialPositions[node.id] = positions[node.id];
      } else {
        // Radial arrangement
        const angle = (idx / worldModel.nodes.length) * 2 * Math.PI;
        initialPositions[node.id] = {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
      }
    });

    setPositions(initialPositions);
  }, [worldModel]);

  // Handle zooming via wheel
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.05 : 0.95;
    setZoom(prev => Math.max(0.4, Math.min(3.0, prev * scale)));
  };

  // Panning SVG canvas
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only pan if we aren't dragging a node or clicking UI
    if ((e.target as SVGElement).tagName === 'svg') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    } else if (draggedNodeId && positions[draggedNodeId]) {
      // Node Dragging: calculate cursor position relative to SVG coords
      const x = (e.clientX - svgRect.left - pan.x) / zoom;
      const y = (e.clientY - svgRect.top - pan.y) / zoom;
      
      setPositions(prev => ({
        ...prev,
        [draggedNodeId]: { x, y }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggedNodeId) {
      // Optionally save rearranged position back to metadata/db
      const node = nodes.find(n => n.id === draggedNodeId);
      if (node && onSaveNode && positions[draggedNodeId]) {
        const updated = {
          ...node,
          metadata: {
            ...node.metadata,
            position: positions[draggedNodeId]
          }
        };
        onSaveNode(updated).catch(() => {});
      }
      setDraggedNodeId(null);
    }
  };

  // Drag node trigger
  const startDragNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
  };

  // Create edge link
  const createManualLink = async (toId: string) => {
    if (!linkingFromId || linkingFromId === toId) return;

    const edgeId = `${linkingFromId}_${relationText}_${toId}`;
    const newEdge: MemoryEdge = {
      id: edgeId,
      fromId: linkingFromId,
      toId,
      relation: relationText as any,
      strength: 1.0,
      createdAt: new Date().toISOString()
    };

    if (onSaveEdge) {
      await onSaveEdge(newEdge);
    } else {
      setEdges(prev => [...prev, newEdge]);
    }
    
    setLinkingFromId(null);
    onRefresh();
  };

  // Quick preset positions logic (radial reset)
  const resetLayout = useCallback(() => {
    const initialPositions: Record<string, { x: number; y: number }> = {};
    const center = { x: 400, y: 300 };
    const radius = 200;

    nodes.forEach((node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI;
      initialPositions[node.id] = {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });

    setPositions(initialPositions);
  }, [nodes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0a0c', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Map Action Bar */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 10,
        display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(17,17,21,0.85)',
        padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)'
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
          Cognitive Network
        </span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
        
        <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px' }} onClick={resetLayout}>
          Reset Layout
        </button>
        
        <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px' }} onClick={onRefresh}>
          Sync World
        </button>

        {linkingFromId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-teal)' }}>
              Linking from "{nodes.find(n => n.id === linkingFromId)?.label}"
            </span>
            <select
              style={{
                background: '#111115', border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-primary)', fontSize: '0.75rem', borderRadius: '6px', padding: '2px'
              }}
              value={relationText}
              onChange={(e) => setRelationText(e.target.value)}
            >
              <option value="works_on">works on</option>
              <option value="fears">fears</option>
              <option value="motivated_by">motivated by</option>
              <option value="relates_to">relates to</option>
              <option value="knows">knows</option>
              <option value="blocked_by">blocked by</option>
              <option value="contradicts">contradicts</option>
            </select>
            <button 
              className="zen-btn-outline" 
              style={{ padding: '2px 6px', fontSize: '0.70rem', borderRadius: '6px', borderColor: '#ef4444', color: '#ef4444' }} 
              onClick={() => setLinkingFromId(null)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Floating reflection observations inside the map canvas */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '20px', zIndex: 10,
        maxWidth: '280px', pointerEvents: 'none', background: 'rgba(17,17,21,0.6)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px',
        backdropFilter: 'blur(8px)'
      }}>
        <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          William's Observation
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic', fontFamily: 'var(--font-serif)', lineHeight: 1.4 }}>
          "The strongest connections form where execution meets consistency. Watch how the Atlas objectives dominate the surrounding landscape."
        </p>
      </div>

      {/* Interactive SVG Workspace */}
      <svg
        style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <defs>
          <radialGradient id="nebula-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background nebula glow */}
        <rect width="100%" height="100%" fill="url(#nebula-glow)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* 1. Relationship Lines (Edges) */}
          {edges.map((edge) => {
            const fromPos = positions[edge.fromId];
            const toPos = positions[edge.toId];
            if (!fromPos || !toPos) return null;

            return (
              <g key={edge.id}>
                {/* Visual Connection line */}
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke="var(--color-teal)"
                  strokeWidth={edge.strength * 1.5}
                  opacity="0.35"
                />
                
                {/* Floating Relation Label */}
                <text
                  x={(fromPos.x + toPos.x) / 2}
                  y={(fromPos.y + toPos.y) / 2 - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--text-muted)"
                  opacity="0.6"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {edge.relation.replace(/_/g, ' ')}
                </text>
              </g>
            );
          })}

          {/* 2. Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id] || { x: 400, y: 300 };
            const isSelected = selectedNode?.id === node.id;
            
            // Size mapping based on confidence
            const baseSize = 22;
            const size = baseSize + (node.confidence * 8);

            // Color scheme based on type
            let stroke = 'rgba(255, 255, 255, 0.4)';
            if (node.type === 'project') {
              stroke = 'var(--color-teal)';
            } else if (node.type === 'belief') {
              stroke = 'var(--color-gold)';
            } else if (node.type === 'goal') {
              stroke = '#a78bfa';
            }

            return (
              <g 
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseDown={(e) => startDragNode(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkingFromId && linkingFromId !== node.id) {
                    createManualLink(node.id);
                  } else {
                    setSelectedNode(node);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Ring highlight */}
                {isSelected && (
                  <circle
                    r={size + 8}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.5"
                    opacity="0.5"
                    strokeDasharray="4,2"
                  />
                )}

                {/* Node core sphere */}
                <circle
                  r={size}
                  fill="#111115"
                  stroke={stroke}
                  strokeWidth="1.8"
                  style={{ filter: 'url(#shadow)' }}
                />

                {/* Shading layer */}
                <circle
                  r={size - 2}
                  fill="url(#nebula-glow)"
                  opacity="0.4"
                />

                {/* Text Label */}
                <text
                  y={4}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="500"
                  fill="var(--text-primary)"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Side preview & interactive card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute', top: '16px', right: '16px', bottom: '16px',
              width: '320px', background: 'rgba(17,17,21,0.92)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', zIndex: 15, backdropFilter: 'blur(16px)', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {selectedNode.type}
                </span>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
                  onClick={() => setSelectedNode(null)}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
                {selectedNode.label}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selectedNode.confidence * 100}%`, background: 'var(--color-teal)' }} />
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Confidence: {Math.round(selectedNode.confidence * 100)}%
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                {selectedNode.description || 'No description recorded.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="zen-btn" 
                style={{ width: '100%' }} 
                onClick={() => {
                  setLinkingFromId(selectedNode.id);
                  setSelectedNode(null);
                }}
              >
                🔗 Link to Another Node
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
