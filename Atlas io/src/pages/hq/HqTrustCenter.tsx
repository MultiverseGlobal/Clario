import React, { useState } from "react";
import { Shield, CreditCard, Lock, Eye, Video, Brain, Activity, ArrowUpRight } from "lucide-react";

// ─── Shared tokens ────────────────────────────────────────────────────────────
const SURFACE = "rgba(16,19,27,0.8)";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED = "rgba(255,255,255,0.35)";
const TEXT = "rgba(255,255,255,0.9)";
const EMERALD = "#10b981";
const VIOLET = "#8b5cf6";
const ROSE = "#ec4899";

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, accent = EMERALD }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <button
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? accent : "rgba(255,255,255,0.1)",
        border: `1px solid ${on ? accent : "rgba(255,255,255,0.12)"}`,
        cursor: "pointer",
        transition: "background 0.2s ease, border-color 0.2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 22 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

// ─── Permission Row ───────────────────────────────────────────────────────────
function PermissionRow({
  icon,
  label,
  description,
  accent,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${on ? `${accent}25` : BORDER}`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        backdropFilter: "blur(12px)",
        transition: "border-color 0.2s ease",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 18, color: accent })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: TEXT,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            color: MUTED,
            margin: "3px 0 0",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
      <Toggle on={on} onToggle={onToggle} accent={accent} />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      {React.cloneElement(icon as React.ReactElement, { size: 14, color: MUTED })}
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HqTrustCenter() {
  const [permissions, setPermissions] = useState({
    metaphor: true,
    atlas: false,
    clario: true,
  });
  const [spendingLimit, setSpendingLimit] = useState(100);
  const currentSpend = 32.5;
  const spendPct = Math.min(100, (currentSpend / spendingLimit) * 100);

  const toggle = (key: keyof typeof permissions) =>
    setPermissions((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07080c",
        padding: "40px 32px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(16,185,129,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={18} color={EMERALD} />
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
              Trust Center
            </h1>
          </div>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: MUTED,
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            Control what your cognitive intelligences can access and set financial limits for autonomous workflows.
          </p>
        </div>

        {/* Main grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Permissions ──────────────────────────────── */}
          <section>
            <SectionHeader icon={<Lock />} label="Agent Permissions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PermissionRow
                icon={<Brain />}
                label="Metaphor Intelligence"
                description="Continuously read Notion, Jira, and Slack to populate the Knowledge Graph."
                accent={VIOLET}
                on={permissions.metaphor}
                onToggle={() => toggle("metaphor")}
              />
              <PermissionRow
                icon={<Activity />}
                label="Atlas Outreach"
                description="Autonomously dispatch emails and LinkedIn messages without manual approval."
                accent={EMERALD}
                on={permissions.atlas}
                onToggle={() => toggle("atlas")}
              />
              <PermissionRow
                icon={<Video />}
                label="Clario Video Engine"
                description="Use your cloned voice and likeness to generate synthetic outreach videos."
                accent={ROSE}
                on={permissions.clario}
                onToggle={() => toggle("clario")}
              />
            </div>

            {/* Audit log hint */}
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: BORDER,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Eye size={13} color={MUTED} />
              <span style={{ fontSize: 11, color: MUTED, fontFamily: "Inter, sans-serif" }}>
                All agent actions are logged and auditable.
              </span>
            </div>
          </section>

          {/* ── RIGHT: Financial ───────────────────────────────── */}
          <section>
            <SectionHeader icon={<CreditCard />} label="Financial Controls" />

            {/* Spend card */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 20,
                backdropFilter: "blur(12px)",
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 10,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Current Billing Cycle — Sept
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "2rem",
                    fontWeight: 600,
                    color: TEXT,
                    letterSpacing: "-0.02em",
                  }}
                >
                  £{currentSpend.toFixed(2)}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: MUTED,
                  }}
                >
                  / £{spendingLimit}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 2,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: `${spendPct}%`,
                    height: "100%",
                    background: spendPct > 80 ? "#ef4444" : EMERALD,
                    borderRadius: 2,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {/* Breakdown */}
              {[
                { label: "Clario GPU Time", value: "£15.00", color: ROSE },
                { label: "Metaphor Processing", value: "£12.20", color: VIOLET },
                { label: "Atlas Inference", value: "£5.30", color: EMERALD },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: MUTED, fontFamily: "Inter, sans-serif" }}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: TEXT,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Limit control */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 20,
                backdropFilter: "blur(12px)",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT,
                  margin: "0 0 4px",
                  letterSpacing: "-0.01em",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Monthly Spending Limit
              </p>
              <p style={{ fontSize: 12, color: MUTED, margin: "0 0 16px", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
                Hard cap on autonomous AI spend. Operations pause when reached.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(Number(e.target.value))}
                  style={{ flex: 1, accentColor: EMERALD }}
                />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: EMERALD,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    padding: "4px 10px",
                    borderRadius: 6,
                    minWidth: 52,
                    textAlign: "center",
                  }}
                >
                  £{spendingLimit}
                </span>
              </div>

              <button
                style={{
                  marginTop: 16,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "-0.005em",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              >
                View Detailed Invoices <ArrowUpRight size={13} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
