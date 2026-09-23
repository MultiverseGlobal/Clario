"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

export type FieldState = "idle" | "resolving" | "focused" | "exploring" | "attention";

interface AmbientFieldProps {
  fieldState?: FieldState;
}

export function AmbientField({ fieldState = "idle" }: AmbientFieldProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !orb1Ref.current) return;

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      gsap.set(orb1Ref.current, { opacity: 0.1, scale: 1 });
      return;
    }

    switch (fieldState) {
      case "idle":
        gsap.to(orb1Ref.current, { opacity: 0.15, scale: 1, duration: 1.5, ease: "power2.inOut" });
        break;
      case "resolving":
        gsap.to(orb1Ref.current, { opacity: 0.25, scale: 1.05, duration: 0.8, repeat: -1, yoyo: true, ease: "power2.inOut" });
        break;
      case "focused":
        gsap.to(orb1Ref.current, { opacity: 0.3, scale: 0.95, duration: 1.2, ease: "power2.out" });
        break;
      case "exploring":
        gsap.to(orb1Ref.current, { opacity: 0.25, scale: 1.1, duration: 2.5, ease: "power1.inOut" });
        break;
      case "attention":
        gsap.to(orb1Ref.current, { opacity: 0.35, scale: 1.02, duration: 0.4, ease: "power2.out" });
        break;
    }
  }, [fieldState, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Base clean canvas */}
      <div className="absolute inset-0 bg-background transition-colors duration-1000" />
      
      {/* Moving ambient elements */}
      <div 
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div 
          ref={orb1Ref}
          className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[120px] transition-all duration-1000"
          style={{
            background: "radial-gradient(circle, var(--color-ink) 0%, rgba(17, 19, 21, 0.05) 40%, transparent 70%)",
            opacity: 0.15,
          }}
        />
        <div 
          className="absolute w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] translate-x-1/4 -translate-y-1/4 rounded-full blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(17, 19, 21, 0.04) 0%, transparent 65%)",
            opacity: 0.1,
          }}
        />
      </div>
      
      {/* Atmosphere Mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
    </div>
  );
}
