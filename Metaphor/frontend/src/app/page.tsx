"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Lock, Key, Server, Menu, X, Terminal, Cpu } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);

  // GSAP ScrollTrigger animations
  useEffect(() => {
    if (reduce) return;

    const ctx = gsap.context(() => {
      // Hero entrance
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }
        );
      }

      // How it works scroll reveal
      if (howItWorksRef.current) {
        gsap.fromTo(
          howItWorksRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: howItWorksRef.current,
              start: "top 80%",
            },
          }
        );
      }

      // Platform section scroll reveal
      if (platformRef.current) {
        gsap.fromTo(
          platformRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: platformRef.current,
              start: "top 80%",
            },
          }
        );
      }

      // Security section scroll reveal
      if (securityRef.current) {
        gsap.fromTo(
          securityRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: securityRef.current,
              start: "top 80%",
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [reduce]);

  return (
    <div className="w-full bg-transparent text-[var(--color-ink)] overflow-x-hidden min-h-screen flex flex-col items-center">
      {/* Skip to Content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-[var(--color-ink)] text-white text-xs rounded-full shadow-lg outline-none ring-2 ring-white"
      >
        Skip to main content
      </a>

      {/* ── HEADER & CENTRAL GLASS NAV ────────────────────────────────────────── */}
      <header
        className="fixed top-6 z-50 px-4 w-full flex justify-center pointer-events-none"
        role="banner"
      >
        <div className="pointer-events-auto mx-auto flex items-center justify-between h-14 px-6 md:px-8 rounded-full bg-white/85 backdrop-blur-xl border border-[rgba(10,10,10,0.06)] shadow-[0_14px_40px_rgba(0,0,0,0.04)] gap-6 md:gap-8 max-w-full">
          {/* Logo Mark */}
          <Link href="/" className="flex items-center gap-3 group shrink-0" aria-label="Metaphor home">
            <MetaphorLogo size={22} className="opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-[15px] font-medium tracking-wide text-[var(--color-ink)]">
              Metaphor
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            <a
              href="#platform"
              className="text-[13px] text-[#4B5563] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] rounded"
            >
              Platform
            </a>
            <a
              href="#how-it-works"
              className="text-[13px] text-[#4B5563] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] rounded"
            >
              How it works
            </a>
            <a
              href="#security"
              className="text-[13px] text-[#4B5563] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] rounded"
            >
              Security
            </a>
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link
              href="/login"
              className="text-[13px] text-[#4B5563] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-ink)] rounded px-1"
            >
              Sign in
            </Link>
            <Link
              href="/onboard"
              className="text-[13px] font-medium text-white bg-[#111315] hover:bg-[#2A2E33] transition-all h-[34px] px-5 rounded-full flex items-center justify-center shadow-sm"
            >
              Open Metaphor
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-ink)] bg-[rgba(10,10,10,0.04)]"
            aria-label="Open mobile navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="fixed inset-0 z-[60] md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed right-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-2xl border-l border-[rgba(10,10,10,0.08)] shadow-2xl flex flex-col p-6 z-10">
            <div className="flex items-center justify-between pb-6 border-b border-[rgba(10,10,10,0.06)]">
              <div className="flex items-center gap-2">
                <MetaphorLogo size={18} />
                <span className="font-display text-[17px] font-medium text-[var(--color-ink)]">
                  Metaphor
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[var(--color-ink)]"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 py-6 flex flex-col gap-4">
              <a
                href="#platform"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-display text-[var(--color-ink)] py-1"
              >
                Platform
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-display text-[var(--color-ink)] py-1"
              >
                How it works
              </a>
              <a
                href="#security"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-display text-[var(--color-ink)] py-1"
              >
                Security
              </a>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-display text-[#4B5563] py-1 border-t border-[rgba(10,10,10,0.06)] pt-4"
              >
                Sign in
              </Link>
            </nav>

            <div className="pt-4 border-t border-[rgba(10,10,10,0.06)]">
              <Link
                href="/onboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center text-sm font-medium text-white bg-[#111315] hover:bg-[#2A2E33] py-3 rounded-full flex items-center justify-center gap-2"
              >
                Open Metaphor
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <main id="main-content" className="w-full flex flex-col items-center">
        {/* ── §1 HERO ───────────────────────────────────────────────────────── */}
        <section
          id="hero"
          className="min-h-[85dvh] flex flex-col justify-center items-center px-6 w-full max-w-4xl mx-auto text-center pt-32 pb-16"
          aria-labelledby="hero-heading"
        >
          <div ref={heroRef} className="flex flex-col items-center gap-8">
            <h1
              id="hero-heading"
              className="font-display text-[clamp(52px,7.5vw,104px)] leading-[1.02] tracking-[-0.02em] text-[var(--color-ink)]"
              style={{ fontWeight: 400 }}
            >
              Make your AI tools work as one.
            </h1>

            <p className="text-[18px] md:text-[20px] text-[#4B5563] leading-relaxed max-w-[540px]">
              Shared context. Intelligent handoffs. Coordinated execution — without you carrying the context between tools.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <Link
                href="/onboard"
                className="text-[14px] font-medium text-white bg-[#111315] hover:bg-[#2A2E33] transition-all h-[46px] px-8 rounded-full flex items-center justify-center gap-2.5 shadow-md hover:translate-y-[-1px]"
              >
                Start connecting
                <ArrowRight size={15} />
              </Link>
              <a
                href="#platform"
                className="text-[14px] font-medium text-[#4B5563] hover:text-[var(--color-ink)] transition-colors h-[46px] px-6 rounded-full flex items-center justify-center border border-[rgba(10,10,10,0.10)] hover:border-[rgba(10,10,10,0.20)]"
              >
                Explore the platform
              </a>
            </div>
          </div>
        </section>

        {/* ── §2 THE CONTEXT GAP / HOW IT WORKS ─────────────────────────────── */}
        <section
          id="how-it-works"
          ref={howItWorksRef}
          className="min-h-[70dvh] flex items-center w-full max-w-5xl mx-auto px-6 py-28 relative border-t border-[rgba(10,10,10,0.06)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center w-full">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#9CA3AF] mb-5 font-mono">
                The context gap
              </div>
              <h2 className="font-display text-[clamp(40px,4.5vw,58px)] leading-[1.06] tracking-[-0.01em] text-[var(--color-ink)] mb-6">
                Every tool knows part of the work.
              </h2>
              <p className="text-[16px] text-[#4B5563] leading-relaxed">
                The problem is not a lack of intelligence. It is a lack of connection. Every handoff currently starts with catching the next tool up — manually copying snippets, losing constraints, and repeating rationale.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "ChatGPT", role: "Reasoning & Ideation", mark: "◎" },
                { name: "Claude", role: "Architecture & Rules", mark: "◈" },
                { name: "GitHub", role: "Codebase & PRs", mark: "⬡" },
                { name: "Cursor", role: "Implementation", mark: "❖" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="bg-white/70 backdrop-blur-md p-5 rounded-[20px] border border-[rgba(10,10,10,0.06)] hover:border-[rgba(10,10,10,0.14)] hover:translate-y-[-2px] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
                >
                  <div className="text-sm text-[#9CA3AF] font-mono mb-2">{p.mark}</div>
                  <div className="text-[15px] font-medium text-[var(--color-ink)] mb-1">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-[#6B7280] font-mono tracking-wide uppercase">
                    {p.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── §3 PLATFORM ───────────────────────────────────────────────────── */}
        <section
          id="platform"
          ref={platformRef}
          className="min-h-[75dvh] flex items-center w-full max-w-5xl mx-auto px-6 py-28 relative border-t border-[rgba(10,10,10,0.06)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center w-full">
            <div className="order-2 md:order-1">
              <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[24px] border border-[rgba(10,10,10,0.08)] shadow-[0_16px_40px_rgba(0,0,0,0.04)] space-y-5">
                <div className="flex items-center justify-between border-b border-[rgba(10,10,10,0.06)] pb-4">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280]">
                    Mesh Topology
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    Synchronized
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { tool: "Model Context Protocol (MCP)", desc: "Bi-directional tool & memory federation", active: true },
                    { tool: "State Ledger", desc: "Verifiable timeline of agent handoffs & artifacts", active: true },
                    { tool: "Intent Router", desc: "Automated routing of tasks to specialized agents", active: true },
                    { tool: "Constraint Guard", desc: "Preserves architecture contracts across tool boundaries", active: true },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[rgba(17,19,21,0.02)] border border-[rgba(17,19,21,0.06)] flex items-start gap-3"
                    >
                      <Check size={16} className="text-[var(--color-ink)] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] font-medium text-[var(--color-ink)]">{item.tool}</div>
                        <div className="text-[11px] text-[#6B7280]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="text-[11px] uppercase tracking-widest text-[#9CA3AF] mb-5 font-mono">
                The platform
              </div>
              <h2 className="font-display text-[clamp(40px,4.5vw,58px)] leading-[1.06] tracking-[-0.01em] text-[var(--color-ink)] mb-6">
                One coordination layer for every tool.
              </h2>
              <p className="text-[16px] text-[#4B5563] leading-relaxed mb-6">
                Metaphor sits beneath your AI toolchain as an open, protocol-driven coordination layer. It standardizes context representation across models, tracks dependencies, and coordinates execution without vendor lock-in.
              </p>
              <div className="flex items-center gap-6 text-[12px] font-mono text-[#6B7280]">
                <span>✓ 6 Standard Integrations</span>
                <span>✓ Zero-Copy Handoffs</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── §4 SECURITY ───────────────────────────────────────────────────── */}
        <section
          id="security"
          ref={securityRef}
          className="min-h-[70dvh] flex items-center w-full max-w-5xl mx-auto px-6 py-28 relative border-t border-[rgba(10,10,10,0.06)]"
        >
          <div className="w-full">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="text-[11px] uppercase tracking-widest text-[#9CA3AF] mb-4 font-mono">
                Trust & Architecture
              </div>
              <h2 className="font-display text-[clamp(40px,4.5vw,58px)] leading-[1.06] tracking-[-0.01em] text-[var(--color-ink)] mb-6">
                Your context is yours.
              </h2>
              <p className="text-[16px] text-[#4B5563] leading-relaxed">
                Metaphor is engineered with strict cryptographic workspace isolation, local-first runtime capabilities, and zero secondary training on your proprietary context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-md p-6 rounded-[22px] border border-[rgba(10,10,10,0.06)]">
                <ShieldCheck size={24} className="text-[var(--color-ink)] mb-4" />
                <h3 className="text-[16px] font-medium text-[var(--color-ink)] mb-2">No Training on Data</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">
                  Your prompt payloads, codebase context, and architectural diagrams are never used to train foundation models.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-md p-6 rounded-[22px] border border-[rgba(10,10,10,0.06)]">
                <Lock size={24} className="text-[var(--color-ink)] mb-4" />
                <h3 className="text-[16px] font-medium text-[var(--color-ink)] mb-2">Workspace Isolation</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">
                  Row-level security and tenant sandboxing guarantee strict partitioning between distinct development scopes.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-md p-6 rounded-[22px] border border-[rgba(10,10,10,0.06)]">
                <Key size={24} className="text-[var(--color-ink)] mb-4" />
                <h3 className="text-[16px] font-medium text-[var(--color-ink)] mb-2">Ephemeral Handoffs</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">
                  Context payloads expire upon transaction acknowledgment, minimizing attack surface and persistent exposure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── §5 FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="w-full py-24 text-center border-t border-[rgba(10,10,10,0.06)] bg-white/40">
          <p className="font-display text-[28px] md:text-[32px] italic text-[var(--color-ink)] mb-8">
            Your workspace is waiting.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="text-[14px] font-medium text-white bg-[#111315] hover:bg-[#2A2E33] transition-all h-[46px] px-9 rounded-full flex items-center justify-center gap-2 shadow-md hover:translate-y-[-1px]"
            >
              Begin
              <ArrowRight size={15} />
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
