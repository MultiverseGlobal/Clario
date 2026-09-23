"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from '@/lib/gsap';

interface MetaphorLogoProps {
  className?: string;
  size?: number;
}

export function MetaphorLogo({ className = "", size = 24 }: MetaphorLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      if (circleRef.current) circleRef.current.style.strokeDasharray = "100 100";
      if (coreRef.current) {
        coreRef.current.style.opacity = "1";
        coreRef.current.style.transform = "scale(1)";
      }
      return;
    }

    const ctx = gsap.context(() => {
      if (circleRef.current && coreRef.current) {
        gsap.fromTo(
          circleRef.current,
          { strokeDasharray: "0 100", opacity: 0 },
          { strokeDasharray: "100 100", opacity: 1, duration: 1.2, ease: "power2.out" }
        );
        gsap.fromTo(
          coreRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, delay: 0.35, ease: "back.out(1.7)" }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 text-current"
      >
        <circle 
          ref={circleRef}
          cx="12" 
          cy="12" 
          r="9" 
          stroke="currentColor" 
          strokeWidth="2"
        />
      </svg>

      <div
        ref={coreRef}
        className="bg-current rounded-full"
        style={{ width: size * 0.33, height: size * 0.33 }}
      />
    </div>
  );
}
