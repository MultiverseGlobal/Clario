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
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 24px 120px" }}>
      
      {/* Hero Section */}
      <div className="animate-enter" style={{ marginBottom: "64px", textAlign: "center" }}>
        <span className="label-mono" style={{ display: "inline-block", marginBottom: "16px" }}>
          Pseudonyms Sovereign ID
        </span>
        <h1 
          className="font-serif-title"
          style={{
            fontSize: "48px",
            color: "var(--text-primary)",
            margin: "0 0 16px",
            lineHeight: 1.1,
          }}
        >
          {user ? `Welcome back, ${user.user_metadata?.username || user.email?.split("@")[0]}.` : "Initializing Workspace..."}
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            maxWidth: "480px",
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          The central cognitive context and identity layer across your entire multi-agent ecosystem.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {features.map((f, i) => (
          <div
            key={f.index}
            className={`animate-enter delay-${i + 1} glass-panel interactive-card`}
            style={{
              padding: "32px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "24px",
              alignItems: "start",
              borderRadius: "16px",
            }}
          >
            {/* Index Badge */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-primary)",
              }}
            >
              <span className="label-mono">{f.index}</span>
            </div>

            {/* Content */}
            <div style={{ padding: "4px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                  {f.title}
                </h2>
                
                {/* Status Pill */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "20px",
                  background: f.status ? "rgba(16, 185, 129, 0.1)" : "var(--bg-canvas)",
                  border: `1px solid ${f.status ? "rgba(16, 185, 129, 0.2)" : "var(--border-strong)"}`,
                }}>
                  <div className={`status-dot ${f.status ? "active" : "inactive"}`} />
                  <span className="label-mono" style={{ color: f.status ? "var(--green)" : "var(--text-muted)" }}>
                    {f.statusLabel}
                  </span>
                </div>
              </div>
              
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {f.body}
              </p>

              {f.href && f.cta && (
                <Link
                  href={f.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  {f.cta}
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
