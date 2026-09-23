"use client";

import React, { useEffect, useState, useRef } from "react";
import { gsap } from "@/lib/gsap";

const STORAGE_KEY = "metaphor_first_entry_shown";

interface FirstEntrySequenceProps {
  onComplete?: () => void;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "true";

    if (alreadySeen || prefersReduced) {
      onComplete?.();
      return;
    }

    setVisible(true);
  }, [onComplete]);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          localStorage.setItem(STORAGE_KEY, "true");
          setVisible(false);
          onComplete?.();
        }
      });

      // Animate nodes & edges
      tl.fromTo(
        ".entry-edge",
        { opacity: 0, strokeDasharray: 100, strokeDashoffset: 100 },
        { opacity: 0.08, strokeDashoffset: 0, duration: 0.8, stagger: 0.03, ease: "power2.out" },
        0.1
      );

      tl.fromTo(
        ".entry-node",
        { opacity: 0, scale: 0 },
        { opacity: 0.15, scale: 1, duration: 0.5, stagger: 0.02, ease: "back.out(1.5)" },
        0.15
      );

      // Animate wordmark in
      if (textRef.current) {
        tl.fromTo(
          textRef.current,
          { opacity: 0, y: 12, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" },
          0.8
        );
      }

      // Hold and fade out
      tl.to(containerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: "power2.inOut"
      }, "+=0.9");
    }, containerRef);

    return () => ctx.revert();
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white"
      aria-hidden="true"
    >
      {/* Ambient bloom */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vh] rounded-full blur-[120px] bg-[radial-gradient(circle,rgba(17,19,21,0.04)_0%,transparent_70%)]"
        />
      </div>

      {/* SVG field assembly */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          {FIELD_EDGES.map((e) => (
            <line
              key={e.key}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="currentColor"
              strokeWidth="0.15"
              className="text-[#111315] entry-edge"
            />
          ))}
          {FIELD_NODES.map((n) => (
            <circle
              key={n.id}
              cx={n.x} cy={n.y} r={n.size * 0.4}
              fill="currentColor"
              className="text-[#111315] entry-node"
            />
          ))}
        </svg>
      </div>

      {/* METAPHOR wordmark */}
      <div
        ref={textRef}
        className="relative z-10 text-center select-none"
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#6B7280] mb-3">
          Ecosystem Synchronized
        </div>
        <div
          className="text-5xl md:text-7xl text-[var(--color-ink)] tracking-tighter"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em" }}
        >
          Metaphor
        </div>
      </div>
    </div>
  );
}
