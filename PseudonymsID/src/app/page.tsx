"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function OverviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [apiKeysSet, setApiKeysSet] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const meta = user.user_metadata ?? {};
      if (!meta.username) {
        window.location.href = "/onboarding";
        return;
      }
      setUser(user);
      setApiKeysSet(!!(meta.gemini_api_key || meta.openai_api_key || meta.anthropic_api_key));
    });
  }, []);

  const features = [
    {
      index: "01",
      title: "Identity & Session",
      body: user
        ? `Signed in as ${user.email}. This secure session is valid across Atlas and Metaphor via the unified Supabase layer.`
        : "Loading session...",
      status: !!user,
      statusLabel: user ? "Secure" : "Syncing",
      href: null,
      cta: null,
    },
    {
      index: "02",
      title: "Universal API Keys",
      body: apiKeysSet
        ? "Your API keys are encrypted in your sovereign profile. All ecosystem apps read them dynamically."
        : "No keys saved. Set them once and every tool picks them up automatically without .env files.",
      status: apiKeysSet,
      statusLabel: apiKeysSet ? "Configured" : "Not set",
      href: "/settings",
      cta: "Manage keys",
    },
    {
      index: "03",
      title: "Active Continuity",
      body: "Drafting 'System Architecture V3' in Metaphor. Open Atlas to instantly inject this context into your design canvas.",
      status: true,
      statusLabel: "Live Context",
      href: "http://localhost:5173",
      cta: "Resume in Atlas",
    },
    {
      index: "04",
      title: "Orion Handoff",
      body: "Scan a secure QR code to instantly push your active session to Orion on your Redmi 14C. Zero re-login friction.",
      status: false,
      statusLabel: "Ready",
      href: "/devices",
      cta: "Pair device",
    },
  ];

  return (
    <div className="max-w-[680px] mx-auto px-6 pt-20 pb-32">
      
      {/* Hero Section */}
      <div className="pds-animate-fade mb-16">
        <span className="pds-label mb-4 inline-block">
          Pseudonyms Sovereign ID
        </span>
        <h1 className="pds-title text-4xl mb-4">
          {user ? `Welcome back, ${user.user_metadata?.username || user.email?.split("@")[0]}.` : "Initializing Workspace..."}
        </h1>
        <p className="text-base text-[var(--pds-text-secondary)] leading-relaxed">
          The central cognitive context and identity layer across your entire multi-agent ecosystem.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="flex flex-col gap-6">
        {features.map((f, i) => (
          <div
            key={f.index}
            className={`pds-animate-slide-up pds-feature-card ${f.status ? 'active' : 'inactive'} p-6 flex flex-col gap-3 delay-${Math.min(i + 1, 5)}`}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold text-[var(--pds-text-primary)] m-0">
                {f.title}
              </h2>
              
              {/* Status Pill */}
              <div className={`pds-status-badge ${f.status ? 'active' : ''}`}>
                <div className={`pds-status-dot ${f.status ? 'active' : ''}`} />
                {f.statusLabel}
              </div>
            </div>
            
            <p className="text-[14px] text-[var(--pds-text-secondary)] leading-relaxed m-0">
              {f.body}
            </p>

            {f.href && f.cta && (
              <div className="mt-2">
                <Link
                  href={f.href}
                  className="pds-btn-text no-underline"
                >
                  {f.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
