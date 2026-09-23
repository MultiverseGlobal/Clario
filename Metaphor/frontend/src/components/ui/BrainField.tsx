"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";

const ROUTE_CONFIG: Record<string, { intensity: number; orb1Opacity: number; orb2Opacity: number; orb1Size: string }> = {
  "/world":       { intensity: 1.8, orb1Opacity: 0.045, orb2Opacity: 0.025, orb1Size: "65vw" },
  "/tools":       { intensity: 1.2, orb1Opacity: 0.030, orb2Opacity: 0.018, orb1Size: "50vw" },
  "/handoffs":    { intensity: 1.4, orb1Opacity: 0.035, orb2Opacity: 0.020, orb1Size: "55vw" },
  "/context":     { intensity: 1.6, orb1Opacity: 0.040, orb2Opacity: 0.022, orb1Size: "60vw" },
  "/connections": { intensity: 1.2, orb1Opacity: 0.030, orb2Opacity: 0.016, orb1Size: "50vw" },
  "/settings":    { intensity: 0.6, orb1Opacity: 0.015, orb2Opacity: 0.008, orb1Size: "40vw" },
};

export function BrainField() {
  const pathname = usePathname();
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);

  const routeKey = Object.keys(ROUTE_CONFIG).find((k) => pathname?.startsWith(k)) ?? "/world";
  const cfg = ROUTE_CONFIG[routeKey] || ROUTE_CONFIG["/world"];

  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;

    // Mouse tracking on primary orb with GSAP quickTo
    if (orb1Ref.current) {
      const xTo = gsap.quickTo(orb1Ref.current, "x", { duration: 1.8, ease: "power2.out" });
      const yTo = gsap.quickTo(orb1Ref.current, "y", { duration: 1.8, ease: "power2.out" });

      const handleMouseMove = (e: MouseEvent) => {
        const xDist = (e.clientX - window.innerWidth / 2) * 0.08;
        const yDist = (e.clientY - window.innerHeight / 2) * 0.08;
        xTo(xDist);
        yTo(yDist);
      };

      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  // Ambient breathing animations
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          scale: 1.05,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }
      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          rotation: 360,
          scale: 1.1,
          duration: 30,
          repeat: -1,
          yoyo: true,
          ease: "none"
        });
      }
      if (orb3Ref.current) {
        gsap.to(orb3Ref.current, {
          scale: 1.08,
          duration: 14,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Primary ambient orb */}
      <div
        ref={orb1Ref}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        style={{
          width: cfg.orb1Size,
          height: cfg.orb1Size,
          background: "radial-gradient(circle, var(--color-ink) 0%, transparent 65%)",
          opacity: cfg.orb1Opacity,
        }}
      />

      {/* Secondary depth orb */}
      <div
        ref={orb2Ref}
        className="absolute top-[35%] left-[60%] w-[32vw] h-[32vh] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, var(--color-foreground) 0%, transparent 60%)",
          opacity: cfg.orb2Opacity,
        }}
      />

      {/* Tertiary warm accent */}
      <div
        ref={orb3Ref}
        className="absolute bottom-[10%] right-[10%] w-[28vw] h-[28vh] rounded-full blur-[110px]"
        style={{
          background: "radial-gradient(circle, var(--color-ink) 0%, transparent 70%)",
          opacity: cfg.orb2Opacity * 0.7,
        }}
      />
    </div>
  );
}
