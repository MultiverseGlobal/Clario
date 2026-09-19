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
        {/* Prominent Query Interface */}
        <div className={`w-full flex items-center bg-[#07080C] border ${isFocused ? 'border-primary/50 shadow-[0_0_24px_-4px_rgba(var(--primary-rgb),0.3)]' : 'border-[#1B1F2C]'} rounded-xl transition-all duration-300 relative overflow-hidden group/input`}>
          
          <div className="pl-6 pr-2 flex items-center justify-center">
            <Search className={`w-6 h-6 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-muted-foreground/50'}`} />
          </div>

          <input 
            type="text"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? "What would you like to think about?" : PLACEHOLDERS[placeholderIndex]}
            className="w-full py-6 px-4 bg-transparent outline-none text-[#EEF0F8] text-xl font-medium placeholder:text-[#EEF0F8]/20 focus:ring-0"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
          
          {/* Absolute positioned shortcut hint */}
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/input:opacity-100 transition-opacity"
          >
            <Kbd>⌘ K</Kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
