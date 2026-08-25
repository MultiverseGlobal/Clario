import React from "react";
import { Link2 } from "lucide-react";

export function SourceCard({ title, sourceName, time }: { title: string, sourceName: string, time: string }) {
  return (
    <div 
      className="group flex flex-col justify-between p-3 min-w-[180px] max-w-[220px] bg-surface-1 border border-border-subtle rounded-xl cursor-pointer hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ transition: 'all var(--transition-fast)' }}
      tabIndex={0}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-surface-2 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
          <Link2 className="w-3 h-3" />
        </div>
        <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{sourceName}</span>
      </div>
      <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed tracking-tight">{title}</p>
      <div className="mt-2 text-[10px] text-muted/60">{time}</div>
    </div>
  );
}
