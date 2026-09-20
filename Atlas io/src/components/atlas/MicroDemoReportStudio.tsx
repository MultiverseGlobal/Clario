import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Copy, Download, ExternalLink, Sparkles,
  TrendingUp, DollarSign, ShieldCheck, Eye, RefreshCw, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { soundManager } from "@/lib/audioFeedback";

interface MicroDemoReportStudioProps {
  clientName?: string;
  agencyName?: string;
  dataSources?: string[];
  pilotPrice?: number;
}

export function MicroDemoReportStudio({
  clientName = "Apex Apparel Co.",
  agencyName = "Aura Growth Lab",
  dataSources = ["Meta Ads", "Google Ads"],
  pilotPrice = 400,
}: MicroDemoReportStudioProps) {
  const [isApproved, setIsApproved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");

  const reportData = {
    client: clientName,
    agency: agencyName,
    period: "Monthly Executive Performance Review (August 1–31)",
    kpis: [
      { label: "Blended Ad Spend", value: "$14,250.00", change: "+4.2%", trend: "up" },
      { label: "Blended Attributed Revenue", value: "$48,735.00", change: "+14.8%", trend: "up" },
      { label: "Blended ROAS", value: "3.42x", change: "+0.32x vs target", trend: "up" },
      { label: "Blended CPA", value: "$41.80", change: "-12.4%", trend: "down" },
    ],
    channels: [
      { channel: "Meta Ads (Advantage+ & DPA)", spend: "$8,500.00", conversions: 203, cpa: "$41.87", roas: "3.65x" },
      { channel: "Google Ads (PMax & Brand Search)", spend: "$5,750.00", conversions: 138, cpa: "$41.66", roas: "3.08x" },
    ],
    executiveSummary: `Across the 30-day reporting cycle, total spend across Meta Ads and Google Ads totaled $14,250.00, returning $48,735.00 in verified revenue at a 3.42x blended ROAS (outperforming target by 14%).

Key findings:
1. Meta Advantage+ retargeting drove 59% of conversions with an acquisition cost of $41.87.
2. Google Brand & Non-Brand Search captured high-intent demand at a steady 3.08x ROAS.
3. Recommendation for next cycle: Reallocate $1,200 from underperforming broad Meta adsets into Google high-ROAS product clusters.`,
  };

  const handleCopy = () => {
    soundManager.playSuccess();
    const markdown = `# ${reportData.agency} — ${reportData.client}
## ${reportData.period}

### Executive KPI Summary
- Blended Ad Spend: ${reportData.kpis[0].value}
- Blended Attributed Revenue: ${reportData.kpis[1].value}
- Blended ROAS: ${reportData.kpis[2].value}
- Blended CPA: ${reportData.kpis[3].value}

### Channel Breakdown
| Channel | Spend | Conversions | CPA | ROAS |
| :--- | :---: | :---: | :---: | :---: |
| Meta Ads | $8,500.00 | 203 | $41.87 | 3.65x |
| Google Ads | $5,750.00 | 138 | $41.66 | 3.08x |

### Executive Commentary
${reportData.executiveSummary}

---
Verified & Human-Approved by ${reportData.agency} on ${new Date().toLocaleDateString()}`;

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Client report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-primary uppercase">Stage 5 Micro-Demo Spec</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live Mockup Ready
            </span>
          </div>
          <h4 className="text-sm font-bold text-foreground mt-0.5">
            Client-Ready Executive Performance Report
          </h4>
          <p className="text-xs text-muted-foreground">
            This is the exact tangible deliverable you screen-share during your Stage 7 sales call.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-8 text-xs gap-1.5 rounded-xl border-border/60"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Report
          </Button>
          <div className="flex items-center gap-1 p-1 bg-background rounded-xl border border-border/40 text-xs">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "raw" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Markdown
            </button>
          </div>
        </div>
      </div>

      {/* Visual Report Card */}
      {activeTab === "preview" ? (
        <div className="p-6 sm:p-8 rounded-3xl border border-border/60 bg-gradient-to-br from-card to-card/70 shadow-lg space-y-6">
          {/* Client Branding Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/40">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Prepared by <strong className="text-foreground">{agencyName}</strong>
              </div>
              <h3 className="text-xl font-bold text-foreground">{clientName}</h3>
              <div className="text-xs text-muted-foreground">{reportData.period}</div>
            </div>

            {/* Human Approval Badge */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/40 self-start sm:self-auto">
              <ShieldCheck className={`w-4 h-4 ${isApproved ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div className="text-xs">
                <span className="font-semibold text-foreground">Human Approval: </span>
                <span className={isApproved ? "text-emerald-500 font-mono font-bold" : "text-muted-foreground"}>
                  {isApproved ? "VERIFIED" : "PENDING"}
                </span>
              </div>
              <button
                onClick={() => setIsApproved(!isApproved)}
                className="text-[10px] text-primary hover:underline ml-1"
              >
                Toggle
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {reportData.kpis.map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
                <div className="text-[11px] font-mono text-muted-foreground">{kpi.label}</div>
                <div className="text-lg sm:text-xl font-bold font-mono text-foreground">{kpi.value}</div>
                <div className={`text-[10px] font-mono font-semibold ${kpi.trend === "up" ? "text-emerald-500" : "text-blue-500"}`}>
                  {kpi.change}
                </div>
              </div>
            ))}
          </div>

          {/* Channel Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold font-mono uppercase text-muted-foreground">
              Multi-Channel Attribution Breakdown
            </div>
            <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-background">
              <div className="grid grid-cols-5 p-3 text-[11px] font-mono text-muted-foreground bg-muted/30">
                <div className="col-span-2">Source / Channel</div>
                <div className="text-right">Ad Spend</div>
                <div className="text-right">CPA</div>
                <div className="text-right">ROAS</div>
              </div>
              {reportData.channels.map((ch, idx) => (
                <div key={idx} className="grid grid-cols-5 p-3 text-xs items-center hover:bg-muted/20">
                  <div className="col-span-2 font-semibold text-foreground">{ch.channel}</div>
                  <div className="text-right font-mono text-muted-foreground">{ch.spend}</div>
                  <div className="text-right font-mono text-muted-foreground">{ch.cpa}</div>
                  <div className="text-right font-mono font-bold text-emerald-500">{ch.roas}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Commentary */}
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Automated Strategic Commentary (Drafted for Client Review)</span>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {reportData.executiveSummary}
            </div>
          </div>
        </div>
      ) : (
        <pre className="p-5 rounded-2xl bg-background border border-border/40 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
{`# ${reportData.agency} — ${reportData.client}
## ${reportData.period}

### Executive KPI Summary
- Blended Ad Spend: ${reportData.kpis[0].value}
- Blended Attributed Revenue: ${reportData.kpis[1].value}
- Blended ROAS: ${reportData.kpis[2].value}
- Blended CPA: ${reportData.kpis[3].value}

### Multi-Channel Breakdown
| Channel | Spend | Conversions | CPA | ROAS |
| :--- | :---: | :---: | :---: | :---: |
| Meta Ads | $8,500.00 | 203 | $41.87 | 3.65x |
| Google Ads | $5,750.00 | 138 | $41.66 | 3.08x |

### Executive Commentary
${reportData.executiveSummary}

---
Verified & Human-Approved by ${reportData.agency}`}
        </pre>
      )}
    </div>
  );
}
