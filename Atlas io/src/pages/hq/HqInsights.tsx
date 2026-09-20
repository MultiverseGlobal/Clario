import React, { useState } from "react";
import {
  BrainCircuit, GitPullRequest, ArrowUpRight,
  MessageSquare, Zap, AlertTriangle, CheckCircle2, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const SURFACE = "rgba(16,19,27,0.8)";
const SURFACE2 = "rgba(21,25,36,0.8)";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED = "rgba(255,255,255,0.35)";
const TEXT = "rgba(255,255,255,0.9)";
const VIOLET = "#8b5cf6";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const EMERALD = "#10b981";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Theme {
  id: number;
  title: string;
  mentions: number;
  impact: string;
  impactType: "revenue" | "churn";
  status: "suggested" | "accepted";
  signals: string[];
}

interface Signal {
  id: number;
  source: string;
  company: string;
  text: string;
  time: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HqInsights() {
  const [themes, setThemes] = useState<Theme[]>([
    {
      id: 1,
      title: "Enterprise SSO Integration",
      mentions: 42,
      impact: "$150k Pipeline Blocked",
      impactType: "revenue",
      status: "suggested",
      signals: ["Acme Corp (Sales Call)", "Nebula AI (Support)", "GlobalTech (Email)"],
    },
    {
      id: 2,
      title: "Custom AI Voice Selection",
      mentions: 28,
      impact: "High Churn Risk",
      impactType: "churn",
      status: "suggested",
      signals: ["Creative Studios (Exit Interview)", "Marketing Pro (Support)"],
    },
  ]);

  const rawSignals: Signal[] = [
    { id: 101, source: "Gong / Sales Call", company: "Acme Corp", text: "We need SAML SSO before we can deploy to our 500 reps. It's a hard infosec requirement.", time: "2h ago" },
    { id: 102, source: "Intercom / Support", company: "Nebula AI", text: "Can we connect this to Okta? Our team is growing and manual auth is a pain.", time: "5h ago" },
    { id: 103, source: "Zendesk / Ticket", company: "Creative Studios", text: "The default voice is okay, but we need to clone our own spokesperson for brand compliance.", time: "1d ago" },
    { id: 104, source: "Email", company: "GlobalTech", text: "Checking in on the Enterprise SSO roadmap. Any timeline you can share?", time: "2d ago" },
  ];

  const pushToLinear = (id: number) => {
    setThemes((p) => p.map((t) => (t.id === id ? { ...t, status: "accepted" } : t)));
    toast.success("Pushed to Linear as an Epic", { description: "Engineering has been notified." });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07080c",
        padding: "40px 32px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${VIOLET}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrainCircuit size={18} color={VIOLET} />
            </div>
            <h1
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: TEXT,
                margin: 0,
              }}
            >
              Product Intelligence
            </h1>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED, margin: 0 }}>
            Synthesised from customer calls, support tickets, and sales signals — powered by Metaphor.
          </p>
        </div>

        {/* Main grid — 2:1 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Themes ─────────────────────────────────────── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingUp size={14} color={MUTED} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                Prioritised Roadmap Themes
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  style={{
                    background: SURFACE,
                    border: `1px solid ${theme.status === "accepted" ? `${EMERALD}25` : BORDER}`,
                    borderRadius: 12,
                    padding: 20,
                    backdropFilter: "blur(12px)",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title + mentions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <h3
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 15,
                            fontWeight: 600,
                            color: TEXT,
                            letterSpacing: "-0.015em",
                            margin: 0,
                          }}
                        >
                          {theme.title}
                        </h3>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            fontWeight: 600,
                            color: MUTED,
                            background: "rgba(255,255,255,0.05)",
                            border: `1px solid ${BORDER}`,
                            padding: "2px 8px",
                            borderRadius: 4,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {theme.mentions} signals
                        </span>
                      </div>

                      {/* Impact badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        {theme.impactType === "revenue" ? (
                          <Zap size={13} color={AMBER} />
                        ) : (
                          <AlertTriangle size={13} color={RED} />
                        )}
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.impactType === "revenue" ? AMBER : RED,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {theme.impact}
                        </span>
                      </div>

                      {/* Signal chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {theme.signals.map((sig, i) => (
                          <span
                            key={i}
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontSize: 11,
                              color: MUTED,
                              background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${BORDER}`,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div style={{ flexShrink: 0 }}>
                      {theme.status === "suggested" ? (
                        <button
                          onClick={() => pushToLinear(theme.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            background: `${VIOLET}18`,
                            border: `1px solid ${VIOLET}40`,
                            borderRadius: 8,
                            color: VIOLET,
                            fontSize: 12,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "-0.005em",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${VIOLET}28`; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${VIOLET}18`; }}
                        >
                          <GitPullRequest size={13} />
                          Push to Linear
                        </button>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            background: `${EMERALD}10`,
                            border: `1px solid ${EMERALD}30`,
                            borderRadius: 8,
                            color: EMERALD,
                            fontSize: 12,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          In Linear
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── RIGHT: Signal Feed ───────────────────────────────── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <MessageSquare size={14} color={MUTED} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                Recent Signals
              </span>
            </div>

            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
                backdropFilter: "blur(12px)",
              }}
            >
              {rawSignals.map((signal, i) => (
                <div
                  key={signal.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: i < rawSignals.length - 1 ? `1px solid rgba(255,255,255,0.05)` : undefined,
                    transition: "background 0.15s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: VIOLET,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {signal.source}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                      {signal.time}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.7)",
                      margin: "0 0 4px",
                    }}
                  >
                    {signal.company}
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: MUTED,
                      margin: 0,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    "{signal.text}"
                  </p>
                </div>
              ))}

              {/* Footer */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: `1px solid rgba(255,255,255,0.05)`,
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    color: VIOLET,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    letterSpacing: "-0.005em",
                  }}
                >
                  View all raw feedback <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
