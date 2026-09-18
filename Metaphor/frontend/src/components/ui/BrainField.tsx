"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const ROUTE_CONFIG: Record<string, { intensity: number; orb1Opacity: string; orb2Opacity: string; orb1Size: string }> = {
  "/home":    { intensity: 1,   orb1Opacity: "0.028", orb2Opacity: "0.015", orb1Size: "55vw" },
  "/context": { intensity: 1.4, orb1Opacity: "0.040", orb2Opacity: "0.022", orb1Size: "45vw" },
  "/world":   { intensity: 1.8, orb1Opacity: "0.055", orb2Opacity: "0.030", orb1Size: "70vw" },
  "/work":    { intensity: 0.8, orb1Opacity: "0.022", orb2Opacity: "0.010", orb1Size: "50vw" },
  "/settings":{ intensity: 0.5, orb1Opacity: "0.012", orb2Opacity: "0.006", orb1Size: "40vw" },
};

const DARK_MULTIPLIER = 2.2;

export function BrainField() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  // Find the matching route config
  const routeKey = Object.keys(ROUTE_CONFIG).find((k) => pathname?.startsWith(k)) ?? "/home";
  const cfg = ROUTE_CONFIG[routeKey];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const multiply = isDark ? DARK_MULTIPLIER : 1;
  const orb1Opacity = (parseFloat(cfg.orb1Opacity) * multiply).toFixed(3);
  const orb2Opacity = (parseFloat(cfg.orb2Opacity) * multiply).toFixed(3);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: "var(--z-ambient)" }}>
      {/* Primary ambient orb — follows mouse slowly */}
      <motion.div
        className="absolute top-1/2 left-1/2 rounded-full blur-[130px]"
        style={{
          width: cfg.orb1Size,
          height: cfg.orb1Size,
          background: "radial-gradient(circle, var(--color-accent) 0%, transparent 65%)",
          opacity: orb1Opacity,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          x: `${(mousePosition.x - 50) * 0.12}vw`,
          y: `${(mousePosition.y - 50) * 0.12}vh`,
          scale: [1, 1.06, 1],
        }}
        transition={{
          x: { type: "spring", stiffness: 8, damping: 28, mass: 3 },
          y: { type: "spring", stiffness: 8, damping: 28, mass: 3 },
          scale: { duration: 9, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Secondary depth orb — slow rotation */}
      <motion.div
        className="absolute top-[35%] left-[60%] w-[32vw] h-[32vh] rounded-full blur-[90px]"
        style={{
          background: "radial-gradient(circle, var(--color-foreground) 0%, transparent 60%)",
          opacity: orb2Opacity,
        }}
        animate={{
          scale: [1, 1.12, 0.92, 1],
          rotate: [0, 120, 0],
          x: [0, 20, -10, 0],
          y: [0, -15, 8, 0],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Tertiary warm accent — bottom corner, subtle */}
      <motion.div
        className="absolute bottom-[10%] right-[10%] w-[28vw] h-[28vh] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          opacity: (parseFloat(orb2Opacity) * 0.6).toFixed(3),
        }}
        animate={{
          scale: [0.9, 1.08, 0.9],
          x: [0, -15, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  );
}
