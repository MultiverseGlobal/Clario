"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Shield, Database, Lock, Search, Network } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

type Phase = "connect" | "indexing" | "answer";

function OnboardingContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("connect");
  
  // Phase 1: Connect
  const [githubToken, setGithubToken] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [trustExpanded, setTrustExpanded] = useState(false);
  const [sovereignMode, setSovereignMode] = useState(true);

  // Phase 2: Indexing Progress
  const [indexingStep, setIndexingStep] = useState(0);

  // Auto-progress indexing
  useEffect(() => {
    if (phase === "indexing") {
      const interval = setInterval(() => {
        setIndexingStep(s => {
          if (s >= 3) {
            clearInterval(interval);
            setTimeout(() => setPhase("answer"), 800);
            return 3;
          }
          return s + 1;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Finish
  const finalize = () => {
    document.cookie = "metaphor_onboarded=true; path=/; max-age=31536000";
    localStorage.setItem("metaphor_onboarded", "true");
    
    // Save tokens locally if provided
    if (githubToken.trim()) localStorage.setItem("metaphor_github_token", githubToken.trim());
    if (notionToken.trim()) localStorage.setItem("metaphor_notion_token", notionToken.trim());
    
    import("@/lib/settings").then(m => m.pushSettingsToCloud());
    router.push("/explorer");
  };

  if (phase === "connect") {
    return (
      <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans animate-in fade-in duration-500">
        <div className="w-full max-w-xl space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <MetaphorLogo size={48} />
            </div>
            <h1 className="text-3xl font-medium tracking-tight">Connect your knowledge</h1>
            <p className="text-sm text-muted">Securely link your data sources to begin seeding the Context Engine.</p>
          </div>

          <div className="space-y-4 bg-surface-1 border border-border-subtle p-6 rounded-2xl shadow-xl">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">GitHub Personal Access Token</label>
              <input 
                type="password" 
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">Notion Internal Integration Token</label>
              <input 
                type="password" 
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
              />
            </div>

            {/* Trust Panel */}
            <div className="mt-4 border border-border-subtle rounded-xl overflow-hidden">
              <button 
                onClick={() => setTrustExpanded(!trustExpanded)}
                className="w-full flex items-center justify-between p-4 bg-surface-2/50 hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Security & Sovereign Mode
                </div>
                <div className="text-xs text-muted">{trustExpanded ? "Hide" : "Show"}</div>
              </button>
              
              {trustExpanded && (
                <div className="p-4 bg-surface-1 border-t border-border-subtle space-y-4">
                  <p className="text-xs text-muted leading-relaxed">
                    By default, Metaphor stores your credentials strictly locally on your machine. Metadata about the graph shape is synchronized, but the raw text and tokens are never transmitted to the cloud.
                  </p>
                  <div className="flex items-center justify-between p-3 border border-emerald-500/30 bg-emerald-500/5 rounded-xl">
                    <div>
                      <div className="text-xs font-medium text-emerald-500">Enable Sovereign Mode</div>
                    </div>
                    <div 
                      onClick={() => setSovereignMode(!sovereignMode)} 
                      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${sovereignMode ? 'bg-emerald-500' : 'bg-surface-2 border border-border-subtle'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sovereignMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setPhase("indexing")}
              className="flex-1 py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              Start Indexing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "indexing") {
    const steps = [
      { title: "Connecting to data sources", icon: <Network className="w-4 h-4" /> },
      { title: "Chunking documents", icon: <Database className="w-4 h-4" /> },
      { title: "Extracting semantic entities", icon: <Search className="w-4 h-4" /> },
      { title: "Building vector index", icon: <CheckCircle2 className="w-4 h-4" /> },
    ];

    return (
      <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans animate-in fade-in zoom-in-95 duration-500">
        <div className="w-full max-w-md space-y-8 text-center relative z-10">
          <MetaphorLogo size={40} className="mx-auto" />
          <h1 className="text-2xl font-medium tracking-tight">Constructing Knowledge Graph</h1>
          
          <div className="space-y-4 text-left bg-surface-1 border border-border-subtle p-6 rounded-2xl shadow-xl">
            {steps.map((step, idx) => {
              const active = idx === indexingStep;
              const done = idx < indexingStep;
              
              return (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${active ? 'bg-surface-2 border border-border-strong' : 'opacity-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-emerald-500/10 text-emerald-500' : active ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted'}`}>
                    {step.icon}
                  </div>
                  <span className={`text-sm font-medium ${done || active ? 'text-foreground' : 'text-muted'}`}>{step.title}</span>
                  {active && <span className="ml-auto flex w-2 h-2 rounded-full bg-primary animate-ping" />}
                  {done && <CheckCircle2 className="ml-auto w-4 h-4 text-emerald-500" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "answer") {
    return (
      <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-full max-w-2xl space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-3xl font-medium tracking-tight">Workspace Ready</h1>
            <p className="text-sm text-muted">Metaphor has successfully indexed your data. Here is your first answer.</p>
          </div>

          <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-surface-2/50 border-b border-border-subtle flex items-center gap-3">
              <Search className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">What is the architecture of Metaphor OS?</span>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Context Pack</span>
                <p className="text-sm leading-relaxed">
                  Metaphor OS uses a dual-engine architecture: a Vector Index for semantic search and a Relational Graph for entity connections. It exposes a Remote MCP (Model Context Protocol) server over OAuth 2.1 to securely inject context into LLMs like Claude and Cursor.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Provenance</span>
                <div className="p-3 bg-background border border-border-subtle rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">system_architecture.md</div>
                    <div className="text-[10px] text-muted">Confidence: 98% • Extracted from GitHub</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={finalize}
            className="w-full py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
          >
            Enter Explorer <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <OnboardingContent />
    </Suspense>
  );
}
