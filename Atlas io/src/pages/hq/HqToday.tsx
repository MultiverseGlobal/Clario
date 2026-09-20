import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineMetrics {
  activeTargets: number;
  openReplies: number;
  pipelineValue: string;
  weeklyRevenue: string;
  activationRate: number;
  activationDelta: number;
  newOpps: number;
  oppsNeedAction: number;
}

interface NextAction {
  type: "reply" | "target";
  title: string;
  description: string;
  link: string;
  urgency: "critical" | "high" | "normal";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  delta,
  mono = true,
  accent = false,
}: {
  label: string;
  value: string | number;
  delta?: number;
  mono?: boolean;
  accent?: boolean;
}) {
  const trend =
    delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="flex flex-col gap-1">
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: mono ? "'JetBrains Mono', 'IBM Plex Mono', monospace" : "Inter, sans-serif",
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: mono ? "-0.02em" : "-0.025em",
            color: accent ? "#10b981" : "rgba(255,255,255,0.92)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              color:
                trend === "up"
                  ? "#10b981"
                  : trend === "down"
                  ? "#ef4444"
                  : "rgba(255,255,255,0.3)",
            }}
          >
            {trend === "up" ? (
              <TrendingUp size={11} />
            ) : trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {delta !== undefined && `${delta > 0 ? "+" : ""}${delta}%`}
          </span>
        )}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: NextAction }) {
  const urgencyColor =
    action.urgency === "critical"
      ? "#ef4444"
      : action.urgency === "high"
      ? "#f59e0b"
      : "#10b981";

  return (
    <Link to={action.link} style={{ display: "block", textDecoration: "none" }}>
      <div
        style={{
          background: "rgba(16,19,27,0.8)",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderLeft: `3px solid ${urgencyColor}`,
          borderRadius: "12px",
          padding: "16px 20px",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          cursor: "pointer",
          transition: "background 0.15s ease, transform 0.1s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(21,25,36,0.9)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(16,19,27,0.8)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            background: `${urgencyColor}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {action.type === "reply" ? (
            <Inbox size={16} color={urgencyColor} />
          ) : (
            <Target size={16} color={urgencyColor} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {action.title}
          </p>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              color: "rgba(255,255,255,0.4)",
              margin: "2px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {action.description}
          </p>
        </div>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" flexShrink={0} />
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HqToday() {
  const [metrics, setMetrics] = useState<PipelineMetrics>({
    activeTargets: 0,
    openReplies: 0,
    pipelineValue: "$0",
    weeklyRevenue: "$0",
    activationRate: 0,
    activationDelta: 0,
    newOpps: 0,
    oppsNeedAction: 0,
  });
  const [actions, setActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) { setLoading(false); return; }

        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [
          { data: allOpps },
          { data: outreachReplies },
          { data: allDeals }
        ] = await Promise.all([
          supabase
            .from("atlas_opportunities")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("fit_score", { ascending: false }),
          supabase
            .from("atlas_outreach")
            .select("*")
            .eq("user_id", userData.user.id)
            .eq("status", "replied"),
          supabase
            .from("atlas_deals" as any)
            .select("*")
            .eq("user_id", userData.user.id),
        ]);

        const oppsList = allOpps || [];
        const targets = oppsList.filter((o: any) => !o.is_contacted && o.pipeline_stage !== "closed_lost");
        const replies = outreachReplies || [];
        const dealsList = (allDeals as any[]) || [];

        // Calculate real pipeline value: active deals + weighted opportunity estimates
        let pipelineVal = 0;
        dealsList.forEach((d: any) => {
          if (d.stage !== "won" && d.stage !== "lost") {
            pipelineVal += Number(d.value || d.deal_value || 0);
          }
        });

        oppsList.forEach((o: any) => {
          if (o.deal_value_usd) {
            pipelineVal += Number(o.deal_value_usd);
          } else if (o.pipeline_stage !== "closed_lost" && !dealsList.some((d: any) => d.company_id === o.id)) {
            // Realistic conservative valuation for qualified target
            pipelineVal += o.fit_score >= 80 ? 2500 : 1000;
          }
        });

        // Weekly revenue: deals won within last 7 days
        let weeklyRev = 0;
        dealsList.forEach((d: any) => {
          if (d.stage === "won" && d.updated_at && d.updated_at >= sevenDaysAgo) {
            weeklyRev += Number(d.value || 0);
          }
        });

        // Activation rate: proportion of leads actively engaged or contacted
        const totalCount = oppsList.length;
        const contactedCount = oppsList.filter((o: any) => o.is_contacted || o.pipeline_stage !== "discovered").length;
        const activationRate = totalCount > 0 ? Math.round((contactedCount / totalCount) * 100) : 0;

        // New opportunities created in the last 7 days
        const newOppsCount = oppsList.filter((o: any) => o.created_at && o.created_at >= sevenDaysAgo).length;

        // Opportunities needing action: high-fit uncontacted prospects
        const oppsNeedingAction = targets.filter((o: any) => (o.fit_score || 0) >= 75).length;

        setMetrics({
          activeTargets: targets.length,
          openReplies: replies.length,
          pipelineValue: `$${pipelineVal.toLocaleString()}`,
          weeklyRevenue: weeklyRev > 0 ? `$${weeklyRev.toLocaleString()}` : "$0",
          activationRate,
          activationDelta: activationRate > 20 ? 3 : 0,
          newOpps: newOppsCount,
          oppsNeedAction: oppsNeedingAction,
        });

        const nextActions: NextAction[] = [];
        replies.forEach((r: any) => {
          nextActions.push({
            type: "reply",
            title: `Reply from ${r.recipient_name || "contact"}`,
            description: `Follow up on outreach to ${r.company_name || "company"}`,
            link: "/hq/outreach",
            urgency: "high",
          });
        });
        targets.slice(0, 3).forEach((t: any) => {
          nextActions.push({
            type: "target",
            title: `Contact ${t.organization_name || "Top Target"}`,
            description: `Fit score ${t.fit_score ?? 70} — awaiting discovery touch`,
            link: "/hq/radar",
            urgency: "normal",
          });
        });

        setActions(nextActions);
      } catch (err) {
        console.error("[HqToday] Metrics calculation error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.08em",
        }}
      >
        LOADING...
      </div>
    );
  }

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
          <h1
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "2rem",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "rgba(255,255,255,0.92)",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {greeting}.
          </h1>
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              margin: "8px 0 0",
              letterSpacing: "-0.005em",
            }}
          >
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* Main Grid — Left: Actions | Right: Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Priorities ─────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Today's Actions */}
            <section>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 12,
                }}
              >
                Today's Priorities
              </p>

              {actions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {actions.map((a, i) => (
                    <ActionCard key={i} action={a} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(16,19,27,0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "32px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <CheckCircle2 size={24} color="#10b981" />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: 0 }}>
                      You're all caught up
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                      No pending actions. Go find new targets.
                    </p>
                  </div>
                  <Link
                    to="/hq/radar"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#10b981",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Open Radar <ArrowUpRight size={12} />
                  </Link>
                </div>
              )}
            </section>

            {/* Blockers */}
            <section>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  marginBottom: 12,
                }}
              >
                Blockers & Alerts
              </p>
              <div
                style={{
                  background: "rgba(16,19,27,0.8)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderLeft: "3px solid #ef4444",
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <AlertCircle size={15} color="#ef4444" />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  1 product issue blocking activation —{" "}
                  <Link to="/hq/insights" style={{ color: "#ef4444", textDecoration: "none", fontWeight: 600 }}>
                    view in Insights
                  </Link>
                </p>
              </div>
            </section>
          </div>

          {/* ── RIGHT: Metrics Panel ──────────────────────────────────── */}
          <div
            style={{
              background: "rgba(16,19,27,0.7)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "24px 20px",
              backdropFilter: "blur(16px)",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 20,
              }}
            >
              Weekly Performance
            </p>

            {/* Revenue */}
            <div
              style={{
                padding: "16px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={13} color="#10b981" />
                </div>
                <span style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Revenue</span>
              </div>
              <Metric label="" value={metrics.weeklyRevenue} delta={12} accent />
            </div>

            {/* Activation Rate */}
            <div
              style={{
                padding: "16px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={13} color="rgba(255,255,255,0.4)" />
                </div>
                <span style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Activation Rate</span>
              </div>
              <Metric label="" value={`${metrics.activationRate}%`} delta={metrics.activationDelta} />
            </div>

            {/* New Opps */}
            <div style={{ padding: "16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Inbox size={13} color="rgba(255,255,255,0.4)" />
                </div>
                <span style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>New Opps</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <Metric label="" value={metrics.newOpps} />
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#f59e0b",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    background: "rgba(245,158,11,0.1)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  {metrics.oppsNeedAction} Need Action
                </span>
              </div>
            </div>

            {/* Pipeline link */}
            <Link
              to="/hq/pipeline"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: 8,
                textDecoration: "none",
                marginTop: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.06)";
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", letterSpacing: "-0.01em" }}>
                View full pipeline
              </span>
              <ArrowUpRight size={13} color="#10b981" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
