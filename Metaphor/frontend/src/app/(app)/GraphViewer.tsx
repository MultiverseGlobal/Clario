"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { fetchFromMetaphor } from "@/app/api";

// Dynamically import to prevent SSR canvas errors
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface GraphViewerProps {
  interactive?: boolean;
  className?: string;
  onNodeClick?: (node: any) => void;
}

const DEFAULT_TOPOLOGY_NODES = [
  { id: "chatgpt", name: "ChatGPT", type: "tool", val: 8 },
  { id: "claude", name: "Claude 3.7", type: "tool", val: 8 },
  { id: "github", name: "GitHub Repository", type: "tool", val: 7 },
  { id: "notion", name: "Notion Knowledgebase", type: "tool", val: 6 },
  { id: "antigravity", name: "Antigravity IDE", type: "tool", val: 7 },
  { id: "adr-42", name: "ADR-42: JetStream Migration", type: "decision", val: 5 },
  { id: "auth-mesh", name: "OAuth 2.1 Scope Binding", type: "constraint", val: 5 },
  { id: "design-tokens", name: "PDS-Metaphor Tokens", type: "concept", val: 4 },
  { id: "handoff-engine", name: "Cross-Tool Handoff Service", type: "project", val: 6 },
];

const DEFAULT_TOPOLOGY_LINKS = [
  { source: "chatgpt", target: "adr-42" },
  { source: "claude", target: "adr-42" },
  { source: "claude", target: "auth-mesh" },
  { source: "github", target: "handoff-engine" },
  { source: "antigravity", target: "handoff-engine" },
  { source: "notion", target: "design-tokens" },
  { source: "handoff-engine", target: "chatgpt" },
  { source: "handoff-engine", target: "auth-mesh" },
];

export default function GraphViewer({
  interactive = false,
  className = "",
  onNodeClick,
}: GraphViewerProps) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchGraph = async () => {
      try {
        const data = await fetchFromMetaphor("/graph");
        if (isMounted) {
          if (data && data.nodes && data.nodes.length > 0) {
            setGraphData({
              nodes: data.nodes,
              links: data.edges || data.links || [],
            });
          } else {
            // Provide active mesh baseline if server graph is pristine
            setGraphData({
              nodes: DEFAULT_TOPOLOGY_NODES,
              links: DEFAULT_TOPOLOGY_LINKS,
            });
          }
        }
      } catch (e) {
        if (isMounted) {
          setGraphData({
            nodes: DEFAULT_TOPOLOGY_NODES,
            links: DEFAULT_TOPOLOGY_LINKS,
          });
        }
      }
    };

    fetchGraph();

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      isMounted = false;
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${
        interactive ? "pointer-events-auto" : "pointer-events-none select-none opacity-25"
      } ${className}`}
    >
      {dimensions.width > 0 && graphData.nodes.length > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          warmupTicks={60}
          cooldownTicks={40}
          enablePointerEvents={interactive}
          enableZoomInteraction={interactive}
          enablePanInteraction={interactive}
          onNodeClick={interactive ? onNodeClick : undefined}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name || node.id;
            const typeStr = (node.type || "").toLowerCase();

            // White Sea Harmonious Accent Palette
            let fillColor = "#111315"; // Obsidian default
            let ringColor = "rgba(17, 19, 21, 0.15)";
            let radius = node.val ? Math.max(4, node.val) : 5;

            switch (typeStr) {
              case "tool":
                fillColor = "#111315";
                ringColor = "rgba(17, 19, 21, 0.2)";
                radius = 6;
                break;
              case "decision":
                fillColor = "#6366F1"; // Indigo signal
                ringColor = "rgba(99, 102, 241, 0.25)";
                radius = 5.5;
                break;
              case "constraint":
              case "rule":
                fillColor = "#D97706"; // Amber constraint
                ringColor = "rgba(217, 119, 6, 0.2)";
                radius = 5;
                break;
              case "concept":
                fillColor = "#8B5CF6"; // Violet concept
                ringColor = "rgba(139, 92, 246, 0.2)";
                radius = 4.5;
                break;
              case "project":
                fillColor = "#16A34A"; // Emerald node
                ringColor = "rgba(22, 163, 74, 0.2)";
                radius = 6;
                break;
            }

            // Draw outer aura ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI, false);
            ctx.fillStyle = ringColor;
            ctx.fill();

            // Draw core node
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = fillColor;
            ctx.fill();

            // Draw label if interactive or zoomed in
            if (interactive || globalScale > 1.2) {
              const fontSize = Math.max(10 / globalScale, 3.5);
              ctx.font = `${fontSize}px var(--font-sans, -apple-system, sans-serif)`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#111315";
              ctx.fillText(label, node.x, node.y + radius + 3);
            }
          }}
          linkColor={() => "rgba(17, 19, 21, 0.10)"}
          linkWidth={1.2}
          backgroundColor="transparent"
          nodeRelSize={4}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={0.9}
          d3VelocityDecay={0.35}
        />
      )}
    </div>
  );
}
