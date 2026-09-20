"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Terminal,
  Cpu,
  Wrench,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Zap,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

export default function LandingPage() {
  const [copied, setCopied] = useState(false);
  const [simulatedState, setSimulatedState] = useState<"idle" | "running" | "done">("idle");

  const handleCopyCli = () => {
    navigator.clipboard.writeText("npx @metaphor/mcp-server start");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSimulation = () => {
    if (simulatedState !== "idle") return;
    setSimulatedState("running");
    setTimeout(() => {
      setSimulatedState("done");
      setTimeout(() => setSimulatedState("idle"), 4000);
    }, 1800);
  };

  return (
    <div className="relative min-h-screen bg-[#06070a] text-foreground font-sans selection:bg-indigo-500/20 overflow-x-hidden">
      {/* Dot Matrix Spatial Background */}
      <div className="absolute inset-0 pointer-events-none flora-canvas-bg opacity-70" />

      {/* ── Top Header Chrome ── */}
      <header className="relative z-50 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <MetaphorLogo size={20} />
          <span className="text-sm font-bold tracking-tight text-white uppercase font-mono">
            METAPHOR
          </span>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MCP PROTOCOL v2.0</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-zinc-400">
          <a href="#canvas" className="hover:text-white transition-colors">
            Node Studio
          </a>
          <a href="#architecture" className="hover:text-white transition-colors">
            Architecture
          </a>
          <a href="#mcp-proxy" className="hover:text-white transition-colors">
            MCP Proxy
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-mono text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-lg cursor-pointer"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono text-indigo-300 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>The Substrate for AI Agent & Tool Collaboration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Where AI agents and tools share{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              one continuous mind.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-sans max-w-2xl mb-8">
            Connect ChatGPT, Claude, and Orion to external tools, databases, and codebases.
            Deterministic capability routing, verifiable handoffs, and a visual Flora studio.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Enter Node Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleCopyCli}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 transition-all cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>npx @metaphor/mcp-server</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-500 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* ── Interactive Flora Mini-Canvas Hero ── */}
        <div id="canvas" className="relative max-w-5xl mx-auto rounded-2xl flora-glass p-6 md:p-8 shadow-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                Interactive Demonstration • Live Handoff Flow
              </span>
            </div>

            <button
              onClick={runSimulation}
              disabled={simulatedState === "running"}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-mono text-white transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {simulatedState === "running"
                  ? "Simulating Flow..."
                  : simulatedState === "done"
                  ? "Flow Complete ✓"
                  : "Simulate Baton Pass"}
              </span>
            </button>
          </div>

          {/* Node Diagram Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* 1. Host Agent */}
            <div
              className={`p-4 rounded-xl flora-node transition-all ${
                simulatedState === "running" ? "flora-node-running" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">ChatGPT</div>
                  <div className="text-[10px] font-mono text-zinc-400">Host Agent • gpt-4o</div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mb-2">
                &ldquo;Add authentication to Pseudonyms&rdquo;
              </p>
              <div className="inline-block px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-[9px] font-mono text-indigo-300">
                Action: Delegate via Metaphor
              </div>
            </div>

            {/* 2. Metaphor Core Substrate */}
            <div className="p-4 rounded-xl flora-node border-indigo-500/30 bg-[#0d101a] relative">
              <div className="flex items-center gap-2 mb-2">
                <MetaphorLogo size={16} />
                <div>
                  <div className="text-xs font-semibold text-white">Metaphor Hub</div>
                  <div className="text-[10px] font-mono text-indigo-300">Capability Matcher</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-300 space-y-1 mb-2">
                <div>Req: generate_auth_scaffold</div>
                <div className="text-emerald-400 font-semibold">Match ➔ Auth Generator MCP</div>
              </div>
              <div className="text-[9px] font-mono text-zinc-500">
                Latency: 12ms • Zero hallucination
              </div>
            </div>

            {/* 3. External Tool */}
            <div
              className={`p-4 rounded-xl flora-node transition-all ${
                simulatedState === "done" ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Auth Generator MCP</div>
                  <div className="text-[10px] font-mono text-zinc-400">stdio Process Tool</div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mb-2">
                Scaffolded route.ts with Google OAuth
              </p>
              <div className="inline-block px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[9px] font-mono text-emerald-300">
                {simulatedState === "done" ? "Execution Logged (1.4s)" : "Ready for RPC"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Technical Architecture Blocks ── */}
        <div id="architecture" className="pt-24 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              Engineered for absolute context continuity.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl flora-glass">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Deterministic Baton Passing
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Tasks don&apos;t get lost in infinite chat loops. Metaphor enforces a strict{" "}
                <code className="text-indigo-300 font-mono">Task ➔ Handoff ➔ Execution</code> lifecycle
                backed by PostgreSQL.
              </p>
            </div>

            <div className="p-6 rounded-2xl flora-glass">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Universal MCP Proxy
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Metaphor acts as a proxy for external MCP tools. Your host agent calls{" "}
                <code className="text-emerald-300 font-mono">request_tool_action</code> and Metaphor
                handles stdio/SSE communication.
              </p>
            </div>

            <div className="p-6 rounded-2xl flora-glass">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Sandboxed Capability Scopes
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Each participant declares exact capabilities. Level-1 and Level-2 matching ensures the
                right agent or tool gets the baton every time.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs font-mono text-zinc-500">
        <p>METAPHOR • Cognitive Context Substrate • Pseudonyms Ecosystem</p>
      </footer>
    </div>
  );
}
