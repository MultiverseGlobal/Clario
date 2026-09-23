"use client";

import React, { useMemo } from "react";

interface ContextFieldProps {
  nodeCount?: number;
  className?: string;
  intensity?: "ambient" | "focused" | "exploring";
}

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function ContextField({
  nodeCount = 18,
  className = "",
  intensity = "ambient",
}: ContextFieldProps) {
  const nodes = useMemo(() => {
    return Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      cx: 5 + seededRandom(i * 3) * 90,
      cy: 5 + seededRandom(i * 3 + 1) * 90,
      r: 1 + seededRandom(i * 3 + 2) * 2,
      delay: seededRandom(i * 7) * 4,
      duration: 4 + seededRandom(i * 11) * 6,
    }));
  }, [nodeCount]);

  const edges = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].cx - nodes[j].cx;
        const dy = nodes[i].cy - nodes[j].cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
          result.push({ x1: nodes[i].cx, y1: nodes[i].cy, x2: nodes[j].cx, y2: nodes[j].cy, key: `${i}-${j}` });
        }
      }
    }
    return result;
  }, [nodes]);

  const opacityBase = intensity === "exploring" ? 0.35 : intensity === "focused" ? 0.2 : 0.12;

  return (
    <div className={`w-full h-full pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        {/* Edges */}
        {edges.map((e) => (
          <line
            key={e.key}
            x1={e.x1} y1={e.y1}
            x2={e.x2} y2={e.y2}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-foreground"
            style={{ opacity: opacityBase * 0.5 }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((n) => (
          <circle
            key={n.id}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="currentColor"
            className="text-foreground animate-pulse"
            style={{
              opacity: opacityBase * 0.8,
              animationDuration: `${n.duration}s`,
              animationDelay: `${n.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
