"use client";

import React from "react";
import { motion } from "framer-motion";
import { ContextField } from "./ContextField";

type LoadingContext =
  | "context"   // "Resolving context..."
  | "graph"     // "Mapping relationships..."
  | "evidence"  // "Finding supporting evidence..."
  | "handoffs"  // "Loading work queue..."
  | "generic";  // "Loading..."

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
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-muted ${className}`}>
        <div className="w-3.5 h-3.5 border border-muted border-t-foreground rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted">{messages[msgIndex]}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 ${className}`}>
      {/* Mini context field during loading */}
      <div className="w-32 h-20 relative opacity-40">
        <ContextField nodeCount={10} intensity="ambient" />
      </div>

      <motion.div
        key={msgIndex}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3 }}
        className="text-xs font-mono uppercase tracking-widest text-muted"
      >
        {messages[msgIndex]}
      </motion.div>
    </div>
  );
}
