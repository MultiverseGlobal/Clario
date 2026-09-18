"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRightLeft, Maximize2, FileText, ChevronRight } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { fetchFromMetaphor } from "@/app/api";

type Insight = {
  id: string;
  text: string;
  type: "fact" | "decision" | "constraint" | "insight";
  sourceType: string;
  sourceName: string;
  reason: string;
};

type ContextResponse = {
  query: string;
  synthesis: string;
  insights: Insight[];
  evidence: string[];
};

const MOCK_RESPONSE: ContextResponse = {
  query: "",
  synthesis: "Based on recent activity across the workspace, the Notification architecture for Orion is the primary focus. A major architectural shift from RabbitMQ to NATS JetStream was approved to resolve persistent delivery issues. This must be completed prior to the upcoming Q4 freeze.",
  insights: [
    {
      id: "i1",
      text: "Orion is currently the primary product focus.",
      type: "fact",
      sourceType: "Project",
      sourceName: "Orion",
      reason: "High priority status across 4 active workspaces",
    },
    {
      id: "i2",
      text: "Notification architecture is shifting from RabbitMQ to NATS JetStream.",
      type: "decision",
      sourceType: "Decision Record",
      sourceName: "ADR-42",
      reason: "Approved by Engineering Lead to resolve INC-104",
    },
    {
      id: "i3",
      text: "Deployment must occur before Q4 freeze.",
      type: "constraint",
      sourceType: "Task",
      sourceName: "Q4 Roadmap",
      reason: "Hard deadline set in company timeline",
    }
  ],
  evidence: ["GitHub: PR #1042", "Notion: Arch Decision Record 42", "Slack: #eng-core", "Jira: INC-104"]
};

// ── Components ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pds-card p-4 transition-all hover:border-border-strong bg-surface-1/50 backdrop-blur-sm group">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="mb-2">
            <StatusBadge type={insight.type} />
          </div>
          <p className="text-sm font-medium text-foreground mb-3 leading-snug">{insight.text}</p>
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-mono text-muted group-hover:text-foreground flex items-center gap-1 bg-surface-2/60 px-2 py-1 rounded-md transition-colors"
          >
            [Why?]
          </button>

          {/* Provenance Panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0, filter: "blur(4px)", scale: 0.98 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16, filter: "blur(0px)", scale: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, filter: "blur(4px)", scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }} // Level 3 Cinematic
                className="overflow-hidden transform-gpu"
              >
                <div className="p-4 rounded-xl bg-surface-2/80 border border-border-subtle shadow-inner">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3">Supported By</h4>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-muted block mb-1">{insight.sourceType}</span>
                      <span className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {insight.sourceName}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">Reasoning</span>
                      <span className="text-sm italic border-l-2 border-border-strong pl-3 py-0.5 block text-foreground/80">
                        "{insight.reason}"
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ContextEnvironment() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"empty" | "retrieving" | "complete">("empty");
  const [result, setResult] = useState<ContextResponse | null>(null);

  const handleAsk = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    
    setPrompt(q);
    setPhase("retrieving");
    
    try {
      const res = await fetchFromMetaphor("/context/query", { prompt: q }, "POST", false, true);
      setResult({
        query: q,
        synthesis: res.synthesis || MOCK_RESPONSE.synthesis,
        insights: res.insights || MOCK_RESPONSE.insights,
        evidence: res.evidence || MOCK_RESPONSE.evidence,
      });
    } catch {
      // Fallback to mock if endpoint missing/errors
      setTimeout(() => {
        setResult({ ...MOCK_RESPONSE, query: q });
        setPhase("complete");
      }, 1800);
      return;
    }

    setPhase("complete");
  };

  return (
    <div className="flex w-full min-h-screen bg-transparent relative">
      
      <div className="flex-1 flex flex-col relative z-10 pt-24 pb-32">
        <AnimatePresence mode="wait">
          
          {phase === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto w-full mb-20"
            >
              <h1 className="text-4xl md:text-5xl font-display text-foreground mb-8 tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
                Explore your context...
              </h1>
              
              <div className="w-full bg-surface-1/80 backdrop-blur-xl border border-border-strong rounded-2xl shadow-float p-2 flex items-center gap-2 transition-all focus-within:border-primary focus-within:ring-4 ring-primary/10">
                <Search className="w-5 h-5 text-muted ml-3 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk(prompt)}
                  placeholder="e.g., What should I know about Orion right now?"
                  className="flex-1 bg-transparent border-none text-base md:text-lg text-foreground px-2 py-3 focus:outline-none placeholder:text-muted/60"
                />
                <button
                  onClick={() => handleAsk(prompt)}
                  disabled={!prompt.trim()}
                  className="p-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                {["What changed in Orion?", "Decisions about authentication", "Why did we choose NATS?"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleAsk(suggestion)}
                    className="px-4 py-2 rounded-full border border-border-subtle bg-surface-1/50 backdrop-blur-sm text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer shadow-sm"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "retrieving" && (
            <motion.div
              key="retrieving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <LoadingState context="context" />
            </motion.div>
          )}

          {phase === "complete" && result && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-12"
            >
              {/* Query Header */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted mb-3 flex items-center gap-2 cursor-pointer hover:text-foreground w-max transition-colors" onClick={() => setPhase("empty")}>
                  <ArrowRightLeft className="w-3 h-3" /> New Query
                </span>
                <h1 className="text-3xl font-display text-foreground border-l-2 border-primary pl-5 py-1" style={{ fontFamily: "var(--font-display)" }}>
                  {result.query}
                </h1>
              </div>

              {/* Context Package */}
              <div className="bg-surface-1/70 backdrop-blur-xl border border-border-subtle rounded-3xl shadow-float overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-2/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MetaphorLogo size={18} />
                    <span className="font-semibold text-foreground text-sm tracking-tight">Context Package</span>
                  </div>
                  <button className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer transition-opacity">
                    <Maximize2 className="w-3 h-3" />
                    Send to Client
                  </button>
                </div>

                <div className="p-6 md:p-10 space-y-12">
                  
                  {/* Synthesis */}
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 border-b border-border-subtle pb-2">Synthesis</h2>
                    <div className="prose prose-invert max-w-none text-foreground leading-relaxed">
                      {result.synthesis}
                    </div>
                  </section>

                  {/* Derived Insights */}
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 border-b border-border-subtle pb-2">Derived Context</h2>
                    <div className="space-y-4">
                      {result.insights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </section>

                  {/* Evidence Links */}
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted mb-4 border-b border-border-subtle pb-2">Related Evidence</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.evidence.map((doc) => (
                        <div key={doc} className="flex items-center justify-between p-3 rounded-xl bg-surface-2/40 border border-border-subtle hover:border-border-strong hover:bg-surface-2 transition-all cursor-pointer group">
                          <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{doc}</span>
                          <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-1 group-hover:text-foreground transition-all" />
                        </div>
                      ))}
                    </div>
                  </section>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
