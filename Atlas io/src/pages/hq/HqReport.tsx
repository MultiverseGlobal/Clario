import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, MessageSquare, DollarSign, AlertCircle, Zap,
  Calendar, ArrowRight, CheckCircle2, Copy, Check, Sparkles,
  Share2, Compass, Clock, Target, ShieldAlert, ListChecks,
  Activity, ArrowUpRight, CheckSquare, Square
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { invokeSourcingMachine } from "@/lib/sourcingMachineProxy";
import { soundManager } from "@/lib/audioFeedback";
import { EvidenceChip } from "@pseudonyms/ui/src/components/EvidenceChip";

interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  generated_at: string;
  content: {
    revenue_this_month: number;
    pipeline_weighted: number;
    deals_won: number;
    deals_lost: number;
    outreach_sent: number;
    replies: number;
    advanced: Array<{ company: string; from_stage: string; to_stage: string }>;
    stalled: Array<{ company: string; days: number }>;
    lost_deals: Array<{ company: string; reason: string | null }>;
    whats_working: string;
    whats_not: string;
    next_week_priorities: string[];
    the_decision: string;
  };
}

function formatMoney(n: number) {
  if (n >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${Math.round(n).toLocaleString()}`;
}

const GOAL = 10000;

interface TelemetryStage {
  id: number;
  label: string;
  detail: string;
}

const TELEMETRY_STAGES: TelemetryStage[] = [
  { id: 1, label: "Auditing Deals & Pipeline Velocity", detail: "Querying active revenue summary, win/loss ratios, and pipeline aging..." },
  { id: 2, label: "Analyzing Outreach & Conversion Cadence", detail: "Correlating multi-channel dispatches with positive response velocity..." },
  { id: 3, label: "Detecting Pipeline Friction & Stalled Revenue", detail: "Scanning for accounts with zero momentum (>5 days inactive)..." },
  { id: 4, label: "Synthesizing The Single Weekly Move", detail: "Executing AI reasoning to lock your primary strategic directive..." },
];

export default function HqReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [telemetryStage, setTelemetryStage] = useState<number>(1);
  const [telemetryPercent, setTelemetryPercent] = useState<number>(0);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [checkedPriorities, setCheckedPriorities] = useState<Record<string, boolean>>({});

  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("atlas_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setReports(
          data.map((r: any) => ({
            id: r.id,
            week_start: r.week_start,
            week_end: r.week_end,
            generated_at: r.created_at,
            content: r.content,
          }))
        );
      }
    } catch (err: any) {
      toast.error("Failed to load reports: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const report = reports[currentIdx];

  // Load checked priority states from Supabase content
  useEffect(() => {
    if (!report?.id) return;
    const checked = (report.content as any).checked_priorities || {};
    setCheckedPriorities(checked);
  }, [report?.id, (report?.content as any)?.checked_priorities]);

  const togglePriority = async (idx: number) => {
    soundManager.playClick();
    if (!report?.id) return;
    const key = `p_${idx}`;
    const updated = { ...checkedPriorities, [key]: !checkedPriorities[key] };
    setCheckedPriorities(updated);
    
    try {
      await supabase.from("atlas_reports").update({
        content: {
          ...report.content,
          checked_priorities: updated
        }
      }).eq("id", report.id);
      
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, content: { ...r.content, checked_priorities: updated } } : r));
    } catch (err) {
      console.warn("Could not save priority state to Supabase:", err);
    }
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const generateReport = async () => {
    if (!user) return;
    setGenerating(true);
    setTelemetryStage(1);
    setTelemetryPercent(15);
    soundManager.playClick();

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      await delay(450);
      setTelemetryStage(2);
      setTelemetryPercent(45);

      // Fetch Supabase data in parallel
      const [revRes, outRes, dealRes, oppRes] = await Promise.all([
        supabase.from("atlas_revenue_summary").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("atlas_outreach").select("status, created_at").eq("user_id", user.id),
        supabase.from("atlas_deals").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("atlas_opportunities").select("*").eq("user_id", user.id),
      ]);

      const rev = revRes.data ?? {};
      const outData = (outRes.data ?? []) as any[];
      const deals = (dealRes.data ?? []) as any[];
      const opps = (oppRes.data ?? []) as any[];

      const weeklyOutreach = outData.filter((o: any) => new Date(o.created_at) >= weekStart);
      const activeOutreach = weeklyOutreach.length > 0 ? weeklyOutreach : outData;

      let outreach_sent = activeOutreach.filter((o: any) => o.status !== "draft").length;
      let replies = activeOutreach.filter((o: any) => ["replied", "booked"].includes(o.status)).length;

      await delay(400);
      setTelemetryStage(3);
      setTelemetryPercent(70);

      const wonDeals = deals.filter((d) => d.stage === "won");
      const lostDeals = deals.filter((d) => d.stage === "lost");
      const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));

      const wonFromOpps = opps.filter((o) => o.pipeline_stage === "closed_won");
      const lostFromOpps = opps.filter((o) => o.pipeline_stage === "closed_lost");
      const activeOpps = opps.filter((o) => !["closed_won", "closed_lost"].includes(o.pipeline_stage));

      const totalDealsWon = wonDeals.length + wonFromOpps.length;
      const totalDealsLost = lostDeals.length + lostFromOpps.length;

      const oppsPipelineValue = activeOpps.reduce((sum, o) => sum + (Number(o.deal_value_usd) || 0), 0);
      const pipeline_weighted = Number(rev.pipeline_weighted ?? 0) > 0 ? Number(rev.pipeline_weighted) : oppsPipelineValue;

      const wonRevenue = wonFromOpps.reduce((sum, o) => sum + (Number(o.deal_value_usd) || 0), 0);
      const revenue_this_month = Number(rev.revenue_this_month ?? 0) > 0 ? Number(rev.revenue_this_month) : wonRevenue;

      const replyRate = outreach_sent > 0 ? Math.round((replies / outreach_sent) * 100) : 0;
      const pct = Math.round((revenue_this_month / GOAL) * 100);

      const stalledDeals = [
        ...activeDeals.map((d) => ({
          company: d.company_name || d.name || "Target Account",
          company_name: d.company_name || d.name || "Target Account",
          daysSince: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000),
        })),
        ...activeOpps.map((o) => ({
          company: o.organization_name || o.title || "Target Prospect",
          company_name: o.organization_name || o.title || "Target Prospect",
          daysSince: Math.floor((Date.now() - new Date(o.updated_at || o.created_at).getTime()) / 86400000),
        })),
      ]
        .filter((d) => d.daysSince >= 5 && Boolean(d.company || d.company_name))
        .slice(0, 4);

      await delay(450);
      setTelemetryStage(4);
      setTelemetryPercent(92);

      // Generate strategic narrative
      let aiContent: { whats_working: string; whats_not: string; the_decision: string } = {
        whats_working: "",
        whats_not: "",
        the_decision: "",
      };

      try {
        const { data: aiData } = await invokeSourcingMachine({
          body: {
            action: "generate-report",
            report_data: {
              revenue_this_month,
              pipeline_weighted,
              outreach_sent,
              replies,
              replyRate,
              deals_won: totalDealsWon,
              deals_lost: totalDealsLost,
              active_deals: activeDeals.length + activeOpps.length,
              stalled_deals: stalledDeals.length,
              goal: GOAL,
              pct_of_goal: pct,
            },
          },
        });
        if (aiData) {
          aiContent.whats_working =
            aiData.whats_working ??
            aiData.what_is_working ??
            generateWorkingInsight(outreach_sent, replies, replyRate, totalDealsWon);
          aiContent.whats_not =
            aiData.whats_not ??
            aiData.what_is_not ??
            generateNotWorkingInsight(stalledDeals.length, outreach_sent, replyRate);
          aiContent.the_decision =
            aiData.the_decision ??
            aiData.decision ??
            generateDecision(outreach_sent, stalledDeals, [...activeDeals, ...activeOpps], pct);
        }
      } catch {
        aiContent.whats_working = generateWorkingInsight(outreach_sent, replies, replyRate, totalDealsWon);
        aiContent.whats_not = generateNotWorkingInsight(stalledDeals.length, outreach_sent, replyRate);
        aiContent.the_decision = generateDecision(outreach_sent, stalledDeals, [...activeDeals, ...activeOpps], pct);
      }

      const reportContent = {
        revenue_this_month,
        pipeline_weighted,
        deals_won: totalDealsWon,
        deals_lost: totalDealsLost,
        outreach_sent,
        replies,
        advanced: [],
        stalled: stalledDeals.map((d) => ({
          company: d.company || d.company_name || "Stalled Account",
          days: d.daysSince || 5,
        })),
        lost_deals: lostDeals
          .slice(0, 3)
          .map((d) => ({ company: d.company_name || "Closed Account", reason: d.lost_reason || "Unspecified" })),
        whats_working: aiContent.whats_working,
        whats_not: aiContent.whats_not,
        next_week_priorities: generatePriorities(stalledDeals, outreach_sent, [...activeDeals, ...activeOpps], pct),
        the_decision: aiContent.the_decision,
      };

      const { data: insertedReport, error: insertError } = await (supabase as any)
        .from("atlas_reports")
        .insert({
          user_id: user.id,
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
          content: reportContent,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setTelemetryPercent(100);
      await delay(300);

      const newRep: WeeklyReport = {
        id: insertedReport.id,
        week_start: insertedReport.week_start,
        week_end: insertedReport.week_end,
        generated_at: insertedReport.created_at,
        content: insertedReport.content as any,
      };

      setReports((prev) => [newRep, ...prev]);
      setCurrentIdx(0);
      soundManager.playSuccess();
      toast.success("Executive Founder Report generated and saved");
    } catch (err: any) {
      toast.error("Report generation failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  function generateWorkingInsight(sent: number, replies: number, rate: number, won: number): string {
    if (won > 0)
      return `You closed ${won} deal${won > 1 ? "s" : ""} this period — that's empirical proof your value proposition converts. Double down on the exact channel and script angle that secured them.`;
    if (rate >= 15)
      return `${rate}% reply rate — outperforming the industry standard of 8–12%. Your targeting thesis and hook resonance are validated. Prioritize outbound volume.`;
    if (sent > 8 && rate > 0)
      return `${replies} positive response${replies === 1 ? "" : "s"} logged from ${sent} dispatched messages. Momentum is compounding. Keep cadence active.`;
    if (sent > 0)
      return `Outbound engine is active with ${sent} message${sent > 1 ? "s" : ""} sent. Market feedback loops are now open.`;
    return "Outbound engine is currently quiet. Log touches or launch a campaign to populate diagnostic feedback.";
  }

  function generateNotWorkingInsight(stalled: number, sent: number, rate: number): string {
    if (sent === 0)
      return "Zero outbound dispatches recorded this week. Pipeline velocity cannot compound without active touches.";
    if (stalled >= 2)
      return `${stalled} high-potential accounts have sat dormant for 5+ days without follow-up. Stalled deals are perishable assets.`;
    if (rate === 0 && sent > 5)
      return "0% response rate across recent touches. Consider sharpening the acute pain hook or shifting the ICP role focus.";
    return "No structural roadblocks detected. The primary growth lever remains daily dispatch cadence.";
  }

  function generateDecision(sent: number, stalled: any[], active: any[], pct: number): string {
    if (stalled.length > 0) {
      const topStall = stalled[0];
      const targetName = topStall.company || topStall.company_name || topStall.name || "top account";
      const days = topStall.daysSince || topStall.days || 5;
      return `Nudge ${targetName} immediately — quiet for ${days} days. Deploy a 90-second teardown or diagnostic proof asset to reignite decision momentum.`;
    }
    if (sent < 10)
      return "Dispatch 10 personalized ICP messages before Friday. Outbound volume is the sole constraint on closing your £10k goal.";
    if (pct >= 70)
      return `You are at ${pct}% of your monthly target. Focus 100% of executive bandwidth on closing the single largest active opportunity in pipeline.`;
    if (active.length === 0)
      return "Pipeline is dry. Launch a new 15-target campaign in Radar and secure 2 exploratory calls before the week concludes.";
    return `Pipeline holds ${active.length} active opportunities. Pick the single deal with the highest conviction and drive it to decision.`;
  }

  function generatePriorities(stalled: any[], sent: number, active: any[], pct: number): string[] {
    const p: string[] = [];
    if (stalled.length > 0) {
      const validNames = stalled.map((d) => d.company || d.company_name || d.name).filter(Boolean);
      if (validNames.length > 0) {
        p.push(`Re-engage stalled accounts: ${validNames.slice(0, 2).join(", ")} (dormant 5+ days)`);
      }
    }
    if (sent < 10) p.push("Dispatch at least 10 personalized messages through Outreach Tracker");
    if (active.length < 5) p.push("Source 5 new high-intent ICP targets using Atlas Radar");
    if (pct < 50) p.push("Review daily 10:00 AM briefing and triage top 3 qualified leads");
    p.push("Log every offline response and call touchpoint to preserve accurate telemetry");
    return p.slice(0, 5);
  }

  // Health Score Calculation (0 - 100)
  const healthScore = useMemo(() => {
    if (!report) return 0;
    const { outreach_sent, replies, stalled, revenue_this_month } = report.content;
    let score = 0;
    // Volume: up to 30 pts
    score += Math.min(30, Math.round((outreach_sent / 10) * 30));
    // Replies: up to 30 pts
    if (replies > 0) score += 30;
    else if (outreach_sent > 0) score += 15;
    // Revenue goal pacing: up to 25 pts
    const revRatio = Math.min(1, revenue_this_month / GOAL);
    score += Math.round(revRatio * 25);
    // Hygiene: up to 15 pts
    const stalledCount = (stalled || []).length;
    score += Math.max(0, 15 - stalledCount * 4);

    return Math.min(100, Math.max(15, score));
  }, [report]);

  const copyExecutiveBriefing = () => {
    if (!report) return;
    soundManager.playClick();
    const memo = `### 📊 ATLAS WEEKLY FOUNDER REPORT
**Period:** Week of ${format(new Date(report.week_start), "d MMM")} – ${format(new Date(report.week_end), "d MMM yyyy")}
**Atlas Pipeline Health Score:** ${healthScore}/100

---
### 🎯 THE SINGLE MOVE
${report.content.the_decision}

---
### 💰 REVENUE & VELOCITY
- **Closed This Month:** ${formatMoney(report.content.revenue_this_month)} (${Math.round((report.content.revenue_this_month / GOAL) * 100)}% of £10k goal)
- **Weighted Pipeline:** ${formatMoney(report.content.pipeline_weighted)}
- **Deals Won / Lost:** ${report.content.deals_won} won · ${report.content.deals_lost} lost

---
### ✉️ OUTBOUND METRICS
- **Sent This Week:** ${report.content.outreach_sent}
- **Replies:** ${report.content.replies}
- **Reply Rate:** ${report.content.outreach_sent > 0 ? Math.round((report.content.replies / report.content.outreach_sent) * 100) + "%" : "—"}

---
### ⚡ KEY TACTICAL PRIORITIES
${(report.content.next_week_priorities || []).map((p, i) => `${i + 1}. ${p}`).join("\n")}

---
*Generated autonomously via Atlas Commercial Operating System*`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    toast.success("Executive briefing copied to clipboard for Slack / Investors!");
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  const copyNudge = (company: string) => {
    soundManager.playClick();
    const text = `Hi, following up on our note from last week. Wanted to share a 90-second diagnostic teardown on how we streamlined this exact bottleneck for peers in your space — would a quick link be useful?`;
    navigator.clipboard.writeText(text);
    toast.success(`Nudge template for ${company} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen text-foreground pb-20">
      {/* ── Top Executive Control Bar ── */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-foreground">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold font-sans tracking-tight text-foreground">
                  Weekly Founder Report
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-foreground border border-border/40 font-semibold">
                  Autonomous Audit
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Evidence-backed commercial telemetry · One clear decision per week
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {reports.length > 1 && (
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    soundManager.playClick();
                    setCurrentIdx((i) => Math.min(i + 1, reports.length - 1));
                  }}
                  disabled={currentIdx >= reports.length - 1}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono px-2">
                  {currentIdx + 1} of {reports.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    soundManager.playClick();
                    setCurrentIdx((i) => Math.max(i - 1, 0));
                  }}
                  disabled={currentIdx <= 0}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {report && (
              <button
                type="button"
                onClick={copyExecutiveBriefing}
                className="h-8 px-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {copiedMemo ? <Check className="h-3.5 w-3.5 text-foreground" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMemo ? "Copied" : "Export Briefing"}</span>
              </button>
            )}

            <Button
              size="sm"
              onClick={generateReport}
              disabled={generating}
              className="h-8 px-3.5 rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-1.5 text-xs font-semibold font-mono cursor-pointer shadow-sm"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{generating ? "Auditing Pipeline..." : report ? "Recalibrate Report" : "Generate Report"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Report Content ── */}
      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Retrieving founder audits...
            </span>
          </div>
        ) : !report ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-border/60 bg-white dark:bg-[#0c0d12] p-16 text-center shadow-sm max-w-2xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-border/50 flex items-center justify-center mx-auto text-foreground">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">No Founder Report Generated Yet</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1.5 max-w-md mx-auto leading-relaxed">
                Atlas audits your live pipeline deals, outreach conversion cadence, and stalled revenue to formulate ONE authoritative decision each week.
              </p>
            </div>
            <Button
              onClick={generateReport}
              disabled={generating}
              className="h-10 px-6 rounded-2xl bg-foreground text-background hover:bg-foreground/90 gap-2 font-semibold text-xs font-mono cursor-pointer shadow-md"
            >
              <Zap className="h-4 w-4" />
              Generate First Weekly Report
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Report Metadata & Executive Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-foreground font-mono text-xs font-bold">
                  W{format(new Date(report.week_start), "w")}
                </div>
                <div>
                  <h2 className="text-base font-bold font-sans text-foreground">
                    Week of {format(new Date(report.week_start), "d MMM")} – {format(new Date(report.week_end), "d MMM yyyy")}
                  </h2>
                  <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                    <span>Generated {format(new Date(report.generated_at), "PP · HH:mm")}</span>
                    <span>•</span>
                    <span className="text-foreground/50">Autonomous Evidence Check Complete</span>
                  </p>
                </div>
              </div>

              {/* Health Score Pill */}
              <div className="flex items-center gap-3 bg-white dark:bg-[#0f1118] border border-border/80 px-4 py-2 rounded-2xl shadow-xs">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Atlas Pipeline Health</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {healthScore >= 75 ? "High Momentum" : healthScore >= 50 ? "Active Traction" : "Ignition Phase"}
                  </span>
                </div>
                <div className="h-8 w-8 rounded-xl bg-[#0c0f1d] border border-[#1d2642] flex items-center justify-center font-mono font-bold text-foreground text-xs">
                  {healthScore}
                </div>
              </div>
            </div>

            {/* ── The Single Move (Spotlight Banner) ── */}
            <div className="rounded-3xl border border-foreground/15 bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-transparent p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground/60">
                      The Single Weekly Move · Tactical North Star
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed font-sans">
                    {report.content.the_decision}
                  </p>
                  <div className="pt-2">
                    <EvidenceChip sourceName="Atlas Decision Engine" confidence={98} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/hq/outreach")}
                  className="shrink-0 h-9 px-3.5 rounded-xl bg-foreground text-background text-xs font-mono font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  <span>Execute Move</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* ── Core Telemetry: Revenue & Outreach Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Revenue & Pipeline Card */}
              <div className="rounded-3xl border border-border bg-white dark:bg-[#0c0d12] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-border/50 flex items-center justify-center text-foreground">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-foreground">
                      Financial Pacing
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Target: {formatMoney(GOAL)} / mo
                  </span>
                </div>

                {/* Metric Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">This Month Closed</span>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {formatMoney(report.content.revenue_this_month)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Weighted Pipeline</span>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      {formatMoney(report.content.pipeline_weighted)}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Deals Won</span>
                    <span className="text-sm font-bold font-mono text-foreground">{report.content.deals_won}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Deals Lost</span>
                    <span className="text-sm font-bold font-mono text-muted-foreground">{report.content.deals_lost}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Monthly Goal Coverage</span>
                    <span className="font-bold text-foreground">
                      {Math.min(100, Math.round((report.content.revenue_this_month / GOAL) * 100))}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/80 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(4, Math.min(100, Math.round((report.content.revenue_this_month / GOAL) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Outreach Velocity Card */}
              <div className="rounded-3xl border border-border bg-white dark:bg-[#0c0d12] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-border/50 flex items-center justify-center text-foreground">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-foreground">
                      Outbound Velocity
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Benchmark: 12–18% Reply
                  </span>
                </div>

                {/* Metric Tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Sent This Week</span>
                    <div className="text-2xl font-bold font-mono text-foreground mt-1">
                      {report.content.outreach_sent}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Replies</span>
                    <div className="text-2xl font-bold font-mono text-foreground mt-1">
                      {report.content.replies}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/60 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Reply Rate</span>
                    <div className="text-2xl font-bold font-mono text-foreground mt-1">
                      {report.content.outreach_sent > 0
                        ? `${Math.round((report.content.replies / report.content.outreach_sent) * 100)}%`
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Conversion Guidance */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#13151f] border border-border/40 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-foreground/50" />
                    <span>Outreach Cadence Status:</span>
                    <span className="font-bold text-foreground">
                      {report.content.outreach_sent >= 10
                        ? "Optimal Pace"
                        : report.content.outreach_sent > 0
                        ? "In Motion"
                        : "Awaiting Dispatch"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Higher reply rates correlate with acute 3-minute video proofs and 1-sentence diagnostic questions.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Stalled Deals Action Matrix ── */}
            {(report.content?.stalled || []).length > 0 && (
              <div className="rounded-3xl border border-[#1d2642] bg-[#0c0f1d] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-foreground/70" />
                    <h3 className="text-xs font-bold text-foreground uppercase font-mono tracking-wider">
                      Stalled Accounts · Direct Intervention Required
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {report.content.stalled.length} deal{report.content.stalled.length > 1 ? "s" : ""} quiet &gt;5 days
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.content.stalled.map((d, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#0e1118] border border-[#1d2642]/60 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground truncate block font-sans">
                          {d.company}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                          {d.days} days with zero movement
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyNudge(d.company)}
                        className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-[11px] font-mono font-semibold transition-colors cursor-pointer shrink-0 border border-border/40"
                      >
                        Copy Nudge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Qualitative Strategic Diagnosis ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* What's Working */}
              <div className="rounded-3xl border border-[#1d2642] bg-[#0c0f1d] p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-foreground/60" />
                  <h3 className="text-xs font-bold text-foreground uppercase font-mono tracking-wider">
                    What's Working (Traction Signals)
                  </h3>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed font-sans font-medium">
                  {report.content.whats_working}
                </p>
                <div className="pt-2 border-t border-border/40 mt-3">
                  <EvidenceChip sourceName="Atlas AI Synthesis" confidence={92} />
                </div>
              </div>

              {/* What's Dragging */}
              <div className="rounded-3xl border border-border/50 bg-white dark:bg-[#0c0d12] p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-foreground/50" />
                  <h3 className="text-xs font-bold text-foreground/70 uppercase font-mono tracking-wider">
                    What's Dragging (Pipeline Friction)
                  </h3>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed font-sans font-medium">
                  {report.content.whats_not}
                </p>
                <div className="pt-2 border-t border-border/40 mt-3">
                  <EvidenceChip sourceName="Atlas AI Synthesis" confidence={87} />
                </div>
              </div>
            </div>

            {/* ── Checkable Weekly Tactical Priorities ── */}
            <div className="rounded-3xl border border-border bg-white dark:bg-[#0c0d12] p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-foreground" />
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-foreground">
                    Next Week Tactical Priorities
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Interactive Founder Checklist
                </span>
              </div>

              <div className="space-y-2.5">
                {(report.content?.next_week_priorities || []).map((priority, i) => {
                  const isChecked = Boolean(checkedPriorities[`p_${i}`]);
                  return (
                    <div
                      key={i}
                      onClick={() => togglePriority(i)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-muted/40 border-border/40 opacity-60"
                          : "bg-slate-50 dark:bg-[#13151f] border-border/60 hover:border-foreground/30"
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-foreground hover:text-foreground/80 transition-colors cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-foreground" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <span
                        className={`text-xs font-sans font-medium leading-relaxed ${
                          isChecked ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Live AI Generation Telemetry Modal (Portaled) ── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {generating && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[998] bg-black/70 dark:bg-black/85 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="fixed inset-0 m-auto max-w-lg h-fit max-h-[85vh] w-full z-[999] bg-white dark:bg-[#0c0d12] border border-border shadow-2xl rounded-3xl p-6 flex flex-col space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0c0f1d] border border-[#1d2642] flex items-center justify-center text-foreground">
                      <Sparkles className="h-4 w-4 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm font-sans text-foreground">
                        Synthesizing Founder Audit
                      </h3>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Atlas Autonomous Commercial Intelligence
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {telemetryPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-foreground/80 rounded-full"
                    animate={{ width: `${telemetryPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Stages Checklist */}
                <div className="space-y-3 py-1 font-mono text-xs">
                  {TELEMETRY_STAGES.map((stage) => {
                    const isDone = telemetryStage > stage.id;
                    const isCurrent = telemetryStage === stage.id;
                    return (
                      <div
                        key={stage.id}
                        className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors ${
                          isCurrent
                            ? "bg-white/[0.03] border-border/50 text-foreground"
                            : isDone
                            ? "bg-muted/20 border-border/40 text-muted-foreground"
                            : "opacity-40 border-transparent text-muted-foreground"
                        }`}
                      >
                        <div className="mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-foreground" />
                          ) : isCurrent ? (
                            <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-border" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className={`font-semibold block ${isCurrent ? "text-foreground" : ""}`}>
                            {stage.label}
                          </span>
                          <span className="text-[10px] opacity-75 block truncate">
                            {stage.detail}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Terminal Footer */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Live telemetry link established
                  </span>
                  <span>Atlas v5.2</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
