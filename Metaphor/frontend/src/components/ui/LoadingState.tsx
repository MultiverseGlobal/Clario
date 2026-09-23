"use client";

import React, { useEffect, useState, useRef } from "react";
import { ContextField } from "./ContextField";
import { gsap } from "@/lib/gsap";

type LoadingContext =
  | "context"
  | "graph"
  | "evidence"
  | "handoffs"
  | "generic";

const MESSAGES: Record<LoadingContext, string[]> = {
  context:  ["Resolving context...", "Traversing relationships...", "Assembling insights..."],
  graph:    ["Mapping relationships...", "Loading the world...", "Calculating neighbourhoods..."],
  evidence: ["Finding supporting evidence...", "Tracing sources...", "Verifying provenance..."],
  handoffs: ["Loading work queue...", "Checking handoff state...", "Resolving agents..."],
  generic:  ["Loading...", "One moment...", "Preparing..."],
};

interface LoadingStateProps {
  context?: LoadingContext;
  className?: string;
  compact?: boolean;
}

export function LoadingState({ context = "generic", className = "", compact = false }: LoadingStateProps) {
  const messages = MESSAGES[context];
  const [msgIndex, setMsgIndex] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [messages.length]);

  useEffect(() => {
    if (textRef.current) {
      gsap.fromTo(
        textRef.current,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [msgIndex]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-muted ${className}`}>
        <div className="w-3.5 h-3.5 border border-muted border-t-foreground rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted">{messages[msgIndex]}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 ${className}`} role="status">
      {/* Mini context field during loading */}
      <div className="w-32 h-20 relative opacity-40">
        <ContextField nodeCount={10} intensity="ambient" />
      </div>

      <div
        ref={textRef}
        className="flex flex-col items-center gap-1.5"
      >
        <span className="text-sm text-foreground/80 font-mono tracking-tight">
          {messages[msgIndex]}
        </span>
      </div>
    </div>
  );
}
