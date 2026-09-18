"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "metaphor_first_entry_shown";

interface FirstEntrySequenceProps {
  onComplete?: () => void;
}

// Deterministic seeded nodes for the assembly animation
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const FIELD_NODES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 15 + seededRandom(i * 3) * 70,
  y: 10 + seededRandom(i * 3 + 1) * 80,
  delay: seededRandom(i * 7) * 0.8,
  size: 2 + seededRandom(i * 11) * 3,
}));

const FIELD_EDGES = (() => {
  const result: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let i = 0; i < FIELD_NODES.length; i++) {
    for (let j = i + 1; j < FIELD_NODES.length; j++) {
      const dx = FIELD_NODES[i].x - FIELD_NODES[j].x;
      const dy = FIELD_NODES[i].y - FIELD_NODES[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        result.push({ x1: FIELD_NODES[i].x, y1: FIELD_NODES[i].y, x2: FIELD_NODES[j].x, y2: FIELD_NODES[j].y, key: `${i}-${j}` });
      }
    }
  }
  return result;
})();

export function FirstEntrySequence({ onComplete }: FirstEntrySequenceProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"field" | "text" | "done">("field");
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "true";

    if (alreadySeen || prefersReduced) {
      onComplete?.();
      return;
    }

    setVisible(true);

    // Phase timeline
    const t1 = setTimeout(() => setPhase("text"), 900);
    const t2 = setTimeout(() => {
      setPhase("done");
      localStorage.setItem(STORAGE_KEY, "true");
    }, 2200);
    const t3 = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: "var(--color-background)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Ambient light bloom */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vh] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, var(--color-accent-dim) 0%, transparent 70%)", opacity: 0.6 }}
            />
          </motion.div>

          {/* SVG field assembly */}
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
              {FIELD_EDGES.map((e) => (
                <motion.line
                  key={e.key}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  stroke="currentColor"
                  strokeWidth="0.15"
                  className="text-foreground"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 0.08, pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 + seededRandom(parseInt(e.key)) * 0.5 }}
                />
              ))}
              {FIELD_NODES.map((n) => (
                <motion.circle
                  key={n.id}
                  cx={n.x} cy={n.y} r={n.size * 0.4}
                  fill="currentColor"
                  className="text-foreground"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.15, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + n.delay,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                />
              ))}
            </svg>
          </div>

          {/* METAPHOR wordmark */}
          <AnimatePresence>
            {phase === "text" || phase === "done" ? (
              <motion.div
                className="relative z-10 text-center select-none"
                initial={{ opacity: 0, y: 12, filter: "blur(12px)", scale: 0.95 }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-muted mb-3">
                  Ecosystem Synchronized
                </div>
                <div
                  className="text-5xl md:text-7xl text-foreground tracking-tighter"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em" }}
                >
                  Metaphor
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
