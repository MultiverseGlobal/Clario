"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface ContextFieldProps {
  nodeCount?: number;
  className?: string;
  intensity?: "ambient" | "focused" | "exploring";
}

// Deterministic seeded pseudo-random to avoid hydration mismatch
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

  // Connect nearby nodes with edges
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
    <div className={`w-full h-full pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Edges */}
        {edges.map((e) => (
          <motion.line
            key={e.key}
            x1={e.x1} y1={e.y1}
            x2={e.x2} y2={e.y2}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: opacityBase * 0.5 }}
            transition={{ duration: 1.5, delay: seededRandom(parseInt(e.key)) * 2 }}
          />
        ))}

        {/* Nodes */}
        {nodes.map((n) => (
          <motion.circle
            key={n.id}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="currentColor"
            className="text-foreground"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [opacityBase * 0.6, opacityBase, opacityBase * 0.6],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              opacity: { duration: n.duration, repeat: Infinity, ease: "easeInOut", delay: n.delay },
              scale:   { duration: n.duration * 1.3, repeat: Infinity, ease: "easeInOut", delay: n.delay },
              default: { duration: 0.8, delay: n.delay * 0.3 },
            }}
          />
        ))}
      </svg>
    </div>
  );
}
