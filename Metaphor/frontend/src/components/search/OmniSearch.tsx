"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";

const PLACEHOLDERS = [
  "What would you like to think about?",
  "Search your knowledge graph...",
  "Ask Metaphor about recent connections...",
  "Find relationships in Atlas...",
  "Query your timeline..."
];

export function OmniSearch() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isFocused]);

  return (
    <div className="w-full max-w-3xl mx-auto group">
      <div className="relative flex flex-col items-center">
        {/* Massive Search Input with Focus Ring */}
        <input 
          type="text"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused ? "What would you like to think about?" : PLACEHOLDERS[placeholderIndex]}
          className="w-full py-6 px-4 bg-transparent border-b-2 border-border-subtle outline-none text-foreground text-2xl md:text-3xl font-medium placeholder:text-muted/40 focus:border-primary transition-colors focus-visible:ring-4 focus-visible:ring-primary/10 rounded-t-lg"
        />
        
        {/* Absolute positioned shortcut hint */}
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100"
          style={{ transition: 'opacity var(--transition-fast)' }}
        >
          <Kbd>⌘ K</Kbd>
        </div>
      </div>
    </div>
  );
}
