'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { WorldModel, MemoryNode, MemoryEdge } from '@/lib/types';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  confidence: number;
  r: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  strength: number;
  relation: string;
}

const TYPE_COLORS: Record<string, string> = {
  concept:      '#6366f1',
  journey:      '#8b5cf6',
  person:       '#ec4899',
  project:      '#06b6d4',
  belief:       '#f59e0b',
  memory:       '#10b981',
  pattern:      '#f97316',
  default:      '#71717a',
};

interface Props {
  worldModel: WorldModel | null;
  onNodeClick?: (node: MemoryNode) => void;
  isCompact?: boolean; // smaller idle version for companion view
}

export function CognitiveOrb({ worldModel, onNodeClick, isCompact = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  const buildGraph = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = svgRef.current.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;

    // If no world model, draw ambient idle graph with phantom nodes
    const nodes: D3Node[] = worldModel
      ? worldModel.nodes.slice(0, 40).map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          confidence: n.confidence,
          r: isCompact ? 4 + n.confidence * 6 : 5 + n.confidence * 10,
        }))
      : Array.from({ length: isCompact ? 16 : 24 }, (_, i) => ({
          id: `phantom_${i}`,
          label: '',
          type: 'concept',
          confidence: 0.4 + Math.random() * 0.6,
          r: isCompact ? 3 + Math.random() * 5 : 4 + Math.random() * 9,
        }));

    const links: D3Link[] = worldModel
      ? worldModel.edges.slice(0, 60).map(e => ({
          source: e.from_id,
          target: e.to_id,
          strength: e.strength,
          relation: e.relation,
        }))
      : [];

    // Defs: radial gradient glow per node type
    const defs = svg.append('defs');
    Object.entries(TYPE_COLORS).forEach(([type, color]) => {
      const grad = defs.append('radialGradient')
        .attr('id', `glow-${type}`)
        .attr('cx', '40%').attr('cy', '35%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', 0.5);
      grad.append('stop').attr('offset', '60%').attr('stop-color', color).attr('stop-opacity', 0.9);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.4);
    });

    // Container groups
    const linkG = svg.append('g').attr('class', 'links');
    const nodeG = svg.append('g').attr('class', 'nodes');

    // Links
    const linkSel = linkG.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(99,102,241,0.2)')
      .attr('stroke-width', (d: D3Link) => 0.5 + d.strength * 1.5);

    // Nodes
    const nodeSel = nodeG.selectAll<SVGCircleElement, D3Node>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.r)
      .attr('fill', d => `url(#glow-${TYPE_COLORS[d.type] ? d.type : 'default'})`)
      .attr('stroke', d => TYPE_COLORS[d.type] ?? TYPE_COLORS.default)
      .attr('stroke-width', 0.8)
      .attr('stroke-opacity', 0.6)
      .style('cursor', worldModel ? 'pointer' : 'default')
      .on('click', (_event, d) => {
        if (worldModel && onNodeClick) {
          const original = worldModel.nodes.find(n => n.id === d.id);
          if (original) onNodeClick(original);
        }
      });

    // Labels (only in non-compact mode and only for real nodes)
    if (!isCompact && worldModel) {
      nodeG.selectAll<SVGTextElement, D3Node>('text')
        .data(nodes.filter(n => !n.id.startsWith('phantom')))
        .join('text')
        .text(d => d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label)
        .attr('font-size', 9)
        .attr('fill', 'rgba(244,244,245,0.7)')
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.r + 11)
        .style('pointer-events', 'none')
        .style('font-family', 'var(--font-sans)');
    }

    // Force simulation
    const sim = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(isCompact ? 50 : 80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(isCompact ? -60 : -120))
      .force('center', d3.forceCenter(cx, cy).strength(0.05))
      .force('collision', d3.forceCollide<D3Node>(d => d.r + (isCompact ? 4 : 8)))
      .force('radial', d3.forceRadial<D3Node>(isCompact ? Math.min(cx, cy) * 0.5 : Math.min(cx, cy) * 0.6, cx, cy).strength(0.04))
      .alphaDecay(0.015)
      .velocityDecay(0.4);

    simRef.current = sim;

    sim.on('tick', () => {
      linkSel
        .attr('x1', (d: D3Link) => (d.source as D3Node).x ?? 0)
        .attr('y1', (d: D3Link) => (d.source as D3Node).y ?? 0)
        .attr('x2', (d: D3Link) => (d.target as D3Node).x ?? 0)
        .attr('y2', (d: D3Link) => (d.target as D3Node).y ?? 0);

      nodeSel
        .attr('cx', d => d.x ?? cx)
        .attr('cy', d => d.y ?? cy);

      if (!isCompact && worldModel) {
        nodeG.selectAll<SVGTextElement, D3Node>('text')
          .attr('x', d => d.x ?? cx)
          .attr('y', d => d.y ?? cy);
      }
    });

    // Drag
    const drag = d3.drag<SVGCircleElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    nodeSel.call(drag);

    // Keep gently alive (never fully settle)
    const keepAlive = setInterval(() => {
      sim.alpha(0.05).restart();
    }, 4000);

    return () => clearInterval(keepAlive);
  }, [worldModel, isCompact, onNodeClick]);

  useEffect(() => {
    const cleanup = buildGraph();
    return () => {
      simRef.current?.stop();
      cleanup?.();
    };
  }, [buildGraph]);

  // Resize observer
  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(() => buildGraph());
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, [buildGraph]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="Cognitive map visualization"
    />
  );
}
