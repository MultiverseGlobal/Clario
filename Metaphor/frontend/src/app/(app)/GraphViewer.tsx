"use client";

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchFromMetaphor } from "@/app/api";

// Dynamically import to prevent SSR canvas errors
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function GraphViewer() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const data = await fetchFromMetaphor("/graph");
        setGraphData({
          nodes: data.nodes || [],
          links: data.edges || []
        });
      } catch (e) {
        console.error("Failed to fetch graph data", e);
      }
    };
    fetchGraph();

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 opacity-[0.15] overflow-hidden pointer-events-none">
      {dimensions.width > 0 && graphData.nodes.length > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          warmupTicks={50}
          cooldownTicks={30}
          enablePointerEvents={false}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            let color = '#9ca3af';
            const typeStr = node.type ? node.type.toLowerCase() : '';
            switch(typeStr) {
              case 'project': color = '#3b82f6'; break;
              case 'concept': color = '#8b5cf6'; break;
              case 'goal': color = '#10b981'; break;
              case 'constraint': color = '#ef4444'; break;
              case 'preference': color = '#f59e0b'; break;
              case 'decision': color = '#f97316'; break; // Orange for Decision
            }

            ctx.fillStyle = color;
            if (typeStr === 'decision') {
              // Draw a diamond
              const size = 6;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y - size);
              ctx.lineTo(node.x + size, node.y);
              ctx.lineTo(node.x, node.y + size);
              ctx.lineTo(node.x - size, node.y);
              ctx.fill();
            } else {
              // Draw a circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
              ctx.fill();
            }
          }}
          linkColor={() => 'rgba(255,255,255,0.2)'}
          backgroundColor="transparent"
          nodeRelSize={4}
          linkDirectionalArrowLength={2}
          linkDirectionalArrowRelPos={1}
          d3VelocityDecay={0.4}
        />
      )}
    </div>
  );
}
