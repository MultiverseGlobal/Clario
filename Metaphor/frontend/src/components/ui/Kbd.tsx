import React from "react";

export function Kbd({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <kbd 
      className={`inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] rounded border border-border-subtle bg-surface-1 text-[10px] font-mono font-medium text-muted/80 shadow-sm transition-colors ${className}`}
    >
      {children}
    </kbd>
  );
}
