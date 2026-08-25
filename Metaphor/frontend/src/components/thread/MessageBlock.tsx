import React from "react";
import { SourceCard } from "./SourceCard";
import { Network, Sparkles, ChevronRight } from "lucide-react";

interface MessageBlockProps {
  role: "user" | "ai";
  content: string;
  sources?: { title: string, sourceName: string, time: string }[];
}

export function MessageBlock({ role, content, sources }: MessageBlockProps) {
  if (role === "user") {
    return (
      <div className="w-full py-8 border-b border-border-subtle/30">
        <div className="max-w-3xl mx-auto flex gap-6">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-foreground font-medium text-sm flex-shrink-0">
            W
          </div>
          <div className="flex-1 pt-1">
            <h2 className="text-xl font-medium text-foreground tracking-tight leading-snug">
              {content}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // AI Synthesis Block
  return (
    <div className="w-full py-8 bg-surface-1/30">
      <div className="max-w-3xl mx-auto flex gap-6">
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          
          {/* Sources Section */}
          {sources && sources.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-4 h-4 text-muted" />
                <span className="text-xs font-semibold text-muted uppercase tracking-widest">Synthesized from 3 sources</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {sources.map((s, i) => (
                  <SourceCard key={i} title={s.title} sourceName={s.sourceName} time={s.time} />
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="prose prose-sm md:prose-base prose-neutral max-w-none text-foreground leading-relaxed tracking-tight">
            {content.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">{paragraph}</p>
            ))}
          </div>

          {/* Action Layer */}
          <div className="mt-6 flex items-center gap-3">
            <button 
              className="px-4 py-2 bg-surface-2 hover:bg-primary hover:text-white text-muted text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 flex items-center gap-2"
            >
              <Network className="w-3.5 h-3.5" />
              Save Insight to Graph
            </button>
            <button 
              className="px-4 py-2 bg-transparent hover:bg-surface-2 text-muted text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Branch Conversation
            </button>
          </div>

          {/* Suggested Questions */}
          <div className="mt-8 border-t border-border-subtle/50 pt-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Related Queries</p>
            <div className="space-y-2">
              <SuggestedQuestion text="How does Atlas chunk the context before vectorization?" />
              <SuggestedQuestion text="Show me the exact lines of code where pricing is calculated." />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SuggestedQuestion({ text }: { text: string }) {
  return (
    <div 
      className="group flex items-center justify-between p-3 bg-surface-1 border border-border-subtle rounded-lg cursor-pointer hover:bg-surface-2 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ transition: 'all var(--transition-fast)' }}
      tabIndex={0}
    >
      <span className="text-sm font-medium text-muted group-hover:text-foreground transition-colors tracking-tight">{text}</span>
      <ChevronRight className="w-4 h-4 text-muted/50 group-hover:text-primary transition-colors" />
    </div>
  );
}
