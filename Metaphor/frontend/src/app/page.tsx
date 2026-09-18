"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Sparkles, Server } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col font-sans text-foreground overflow-x-hidden">
      {/* ── Spatial Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-20 dark:opacity-15 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, var(--color-accent) 0%, rgba(99, 102, 241, 0.1) 45%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/95 to-background" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <motion.nav 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full z-50 border-b border-border-subtle"
      >
        <div className="flex items-center gap-3">
          <MetaphorLogo size={18} />
          <span className="text-sm font-semibold tracking-tight text-foreground">Metaphor</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/login" className="pds-btn-text text-sm">
            Sign In
          </Link>
          <Link href="/home" className="pds-btn-ghost group">
            <span>Enter Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.nav>

      <main className="flex-1 flex flex-col items-center justify-start pt-24 px-6 max-w-5xl mx-auto w-full z-10">
        
        {/* ── Main Hero (Editorial Typography) ── */}
        <div className="w-full flex flex-col items-start md:items-center md:text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-surface-2 border border-border-subtle text-xs font-medium text-muted mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono tracking-ui">The Context Engine</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-8 max-w-4xl"
          >
            AI memory that explains <br className="hidden md:block" /> 
            <span className="text-muted italic font-normal">exactly what it knows.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-muted max-w-2xl leading-relaxed mb-10 font-sans"
          >
            Metaphor converts your Notion and GitHub sources into a structured Knowledge Graph, serving grounded context directly to your AI models with full provenance.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-4"
          >
            <Link 
              href="/home"
              className="pds-btn-primary"
            >
              <span>Initialize Workspace</span>
            </Link>
            <Link 
              href="/docs"
              className="pds-btn-text"
            >
              <span>Read Documentation</span>
            </Link>
          </motion.div>
        </div>

        {/* ── Static Dossier: Evidence Object (Atlas Style) ── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-3xl mb-24"
        >
          <div className="pds-glass-elevated p-8 md:p-10 rounded-2xl flex flex-col gap-8 relative overflow-hidden">
            {/* Subtle atmospheric glow behind the card content */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-[80px]" />
            
            <div className="flex flex-col gap-2 relative z-10">
              <span className="pds-label">Intelligence Process</span>
              <h2 className="font-display text-3xl font-semibold text-foreground">
                Retrieving Architectural Standards
              </h2>
              <p className="text-sm text-muted max-w-lg font-sans">
                The system intercepts standard queries and injects organizational guidelines retrieved directly from the codebase.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              {/* Context Payload (Data Card) */}
              <div className="pds-data-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <span className="pds-status-badge active">
                    <span className="pds-status-dot active"></span> Injecting
                  </span>
                  <span className="label-mono">Payload</span>
                </div>
                <pre className="text-xs font-mono text-muted leading-relaxed overflow-x-auto">
{`{
  "constraints": [
    "REST strictness enforced",
    "OAuth 2.1 PKCE standard"
  ],
  "confidence": 0.94,
  "tokens": 1240
}`}
                </pre>
              </div>

              {/* Provenance (Editorial Stack) */}
              <div className="pds-card p-5 flex flex-col gap-4 bg-surface-2 border-none">
                <span className="pds-label border-b border-border-subtle pb-3">Provenance</span>
                <div className="flex flex-col gap-4">
                  
                  {/* Evidence 1 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      <span className="font-mono text-[11px] text-foreground font-medium">API_Standards.md</span>
                    </div>
                    <blockquote className="text-sm text-muted font-sans border-l-2 border-border-strong pl-3 ml-1">
                      "All public endpoints must adhere strictly to REST patterns without exception."
                    </blockquote>
                  </div>

                  {/* Evidence 2 */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-accent" />
                      <span className="font-mono text-[11px] text-foreground font-medium">AuthService.ts</span>
                    </div>
                    <blockquote className="text-sm text-muted font-sans border-l-2 border-border-strong pl-3 ml-1">
                      "Upgraded flow to OAuth 2.1 PKCE. Implicit grant is removed."
                    </blockquote>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
