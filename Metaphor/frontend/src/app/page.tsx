"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Database, Box, Check, Network, Key, Terminal, Shield, Zap, Sparkles, Layers } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [demoQuery, setDemoQuery] = useState("What architectural constraints govern our API?");
  const [demoCopied, setDemoCopied] = useState(false);

  const words = ["your codebase.", "your team.", "your workflow.", "your persona."];

  const steps = [
    { id: "init", title: "1. Workspace Seeding", icon: <Key className="w-4 h-4 text-primary" />, desc: "Connect Notion & GitHub in 1-click via OAuth webhooks." },
    { id: "ingest", title: "2. Passive Reflection", icon: <Database className="w-4 h-4 text-cyan-400" />, desc: "Metaphor extracts semantic nodes & decision edges in real time." },
    { id: "graph", title: "3. Long-Term Graph RAG", icon: <Network className="w-4 h-4 text-emerald-400" />, desc: "Vector + relational graph resolution maintains continuous context." },
    { id: "llm", title: "4. Remote MCP Injection", icon: <Box className="w-4 h-4 text-purple-400" />, desc: "ChatGPT, Claude & Cursor query your memory over OAuth 2.1." }
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(stepInterval);
  }, [steps.length]);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(wordInterval);
  }, [words.length]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20 text-foreground overflow-x-hidden">
      
      {/* ── Top Navigation Bar ── */}
      <motion.nav 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full z-50 border-b border-border-subtle/40"
      >
        <div className="flex items-center gap-3">
          <MetaphorLogo size={18} />
          <span className="text-sm font-semibold tracking-tight text-foreground">Metaphor OS</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-2 text-[10px] font-mono font-medium text-muted border border-border-subtle">
            v2.1 Remote MCP
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-muted">
          <Link href="#architecture" className="hover:text-foreground transition-colors">Architecture</Link>
          <Link href="#flow" className="hover:text-foreground transition-colors">Continuous Flow</Link>
          <Link href="#mcp" className="hover:text-foreground transition-colors">Remote MCP</Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg">
            Sign In
          </Link>
          <Link href="/login?signup=true" className="group flex items-center gap-1.5 px-4 py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm">
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.nav>

      <main className="flex-1 flex flex-col items-center justify-start text-center pt-20 px-6 max-w-6xl mx-auto">
        
        {/* ── Refined Typography Hero ── */}
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-1 border border-border-subtle text-xs font-medium text-muted mb-6 shadow-inner"
          >
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>The Universal Context Engine for your AI stack</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight mb-6"
          >
            Every AI should remember <br className="hidden sm:inline" />
            <span className="text-muted">everything about </span>
            <span className="text-foreground border-b-2 border-primary/40 pb-0.5 inline-block transition-all">
              {words[wordIndex]}
            </span>
          </motion.h1>


          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base text-muted max-w-xl leading-relaxed mb-8 font-normal"
          >
            Metaphor OS continuously ingests your Notion notes and GitHub commits into a structured Knowledge Graph — streaming grounded context packs to ChatGPT, Claude, and Cursor.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center mb-16"
          >
            <Link 
              href="/login?signup=true"
              className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>Start Building for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link 
              href="#architecture"
              className="w-full sm:w-auto px-6 py-3 bg-surface-1 border border-border-subtle hover:border-strong text-foreground font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Network className="w-4 h-4 text-muted" />
              <span>Read Architecture</span>
            </Link>
          </motion.div>
        </div>

        {/* ── Live Interactive Remote MCP Demo Card ── */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-4xl rounded-2xl bg-surface-1 border border-border-subtle shadow-2xl p-6 text-left mb-24 overflow-hidden relative"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-muted ml-2">metaphor-remote-mcp-v2.1</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Shield className="w-3 h-3" /> OAuth 2.1 Protected Resource
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Input Simulation */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">AI Client Query (ChatGPT / Claude / Cursor)</span>
              <div className="p-4 bg-background border border-border-subtle rounded-xl text-xs font-mono text-foreground space-y-2">
                <div className="text-muted text-[10px]">// Connected via Remote MCP Server</div>
                <div>{demoQuery}</div>
              </div>

              <div className="p-4 bg-surface-2/50 rounded-xl border border-border-subtle space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Active Ingestion Sources</span>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-foreground"><Check className="w-3.5 h-3.5 text-emerald-500" /> Notion (2 docs)</span>
                  <span className="flex items-center gap-1.5 text-foreground"><Check className="w-3.5 h-3.5 text-emerald-500" /> GitHub (41 commits)</span>
                </div>
              </div>
            </div>

            {/* Right: Returned Context Pack */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">Metaphor Injected Context Pack</span>
              <pre className="p-4 bg-background border border-border-subtle rounded-xl text-[11px] font-mono text-emerald-400/90 overflow-x-auto h-40">
{`{
  "status": "matched",
  "workspace_summary": {
    "projects": 1,
    "constraints": 2
  },
  "evidence": [
    { "title": "Linear Design Token Enforcer" },
    { "title": "OAuth 2.1 PKCE Architecture" }
  ]
}`}
              </pre>
            </div>
          </div>
        </motion.div>

        {/* ── Architecture Feature Grid ── */}
        <section id="architecture" className="w-full max-w-5xl text-left mb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Engineered for Technical Context</h2>
            <p className="text-sm text-muted max-w-md mx-auto">Built from first principles to eliminate context loss across LLMs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-surface-1 border border-border-subtle space-y-4 hover:border-strong transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">Graph RAG Memory</h3>
              <p className="text-xs text-muted leading-relaxed">Combines vector search with relational concept links to prevent hallucinated long-term context.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-1 border border-border-subtle space-y-4 hover:border-strong transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">Remote MCP Protocol</h3>
              <p className="text-xs text-muted leading-relaxed">OAuth 2.1 PKCE compliant server protocol letting external AI clients discover resources automatically.</p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-1 border border-border-subtle space-y-4 hover:border-strong transition-all">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-foreground">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">Human-in-the-Loop Inbox</h3>
              <p className="text-xs text-muted leading-relaxed">Review and approve graph mutations before they are committed into your permanent AI memory model.</p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle py-8 px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-4">
        <div className="flex items-center gap-2">
          <MetaphorLogo size={14} />
          <span>Metaphor OS &copy; 2026. All rights reserved.</span>
        </div>
        <div className="flex gap-6 font-medium">
          <Link href="/onboarding" className="hover:text-foreground transition-colors">Onboarding</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
        </div>
      </footer>

    </div>
  );
}
