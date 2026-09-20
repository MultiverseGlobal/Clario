import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Target, ArrowRight, ArrowLeft, Check, CheckCircle2,
  HelpCircle, Layers, DollarSign, Clock, Users, X, Database, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { soundManager } from "@/lib/audioFeedback";
import {
  createCustomValidationCampaign,
  type CreateCampaignParams,
  type ValidationCampaign
} from "@/services/campaignValidationStore";

interface NewCampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: ValidationCampaign) => void;
}

export function NewCampaignWizardModal({
  isOpen,
  onClose,
  onCampaignCreated,
}: NewCampaignWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Plain English Prompt
  const [prompt, setPrompt] = useState(
    "Find out whether small paid-media agencies (5–15 employees) have a painful recurring client reporting workflow we can solve, then get 1–2 of them to pay $300–$500 to solve it."
  );

  // Extracted Strategy Parameters
  const [parsed, setParsed] = useState({
    name: "Agency Reporting Validation",
    industry: "Small Paid-Media Agencies",
    headcount: "5–15 employees",
    workflow: "Monthly recurring client performance reporting",
    geography: "US, UK & Remote",
  });

  // Step 2: Clarifying Questions State
  const [qDataSources, setQDataSources] = useState<string>("Meta Ads + Google Ads");
  const [qPilotPrice, setQPilotPrice] = useState<number>(400);
  const [qTurnaroundDays, setQTurnaroundDays] = useState<number>(8);
  const [qDiscoveryTarget, setQDiscoveryTarget] = useState<number>(8);

  const PROMPT_SUGGESTIONS = [
    {
      title: "Agency Reporting Validation",
      text: "Find out whether small paid-media agencies (5–15 employees) have a painful recurring client reporting workflow we can solve, then get 1–2 of them to pay $300–$500 to solve it.",
      sources: "Meta Ads + Google Ads",
      industry: "Paid Media Agencies",
      headcount: "5–15 team",
    },
    {
      title: "E-Commerce Retention Automation",
      text: "Validate whether boutique DTC Shopify brands (under 20 employees) struggle with manual retention email segmentation, and get 1 brand to pay $500 for an automated flow.",
      sources: "Klaviyo + Shopify",
      industry: "DTC E-Commerce",
      headcount: "5–20 team",
    },
    {
      title: "B2B SaaS Onboarding Friction",
      text: "Find out whether seed-stage B2B SaaS companies have manual user onboarding setup bottlenecks, then get 1–2 founders to pay $400 for a streamlined pipeline.",
      sources: "Stripe + HubSpot",
      industry: "B2B SaaS",
      headcount: "3–12 team",
    },
  ];

  const handleAnalyzePrompt = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a campaign prompt");
      return;
    }

    soundManager.playClick();

    // Intelligent prompt decomposition
    const p = prompt.toLowerCase();

    // 1. Extract Headcount
    let detectedHeadcount = "5–15 employees";
    const rangeMatch = prompt.match(/(\d+)\s*[-–to~]+\s*(\d+)\s*(?:employees?|people|staff|team)?/i);
    if (rangeMatch) {
      detectedHeadcount = `${rangeMatch[1]}–${rangeMatch[2]} employees`;
    } else {
      const underMatch = prompt.match(/(?:under|<)\s*(\d+)/i);
      if (underMatch) detectedHeadcount = `1–${underMatch[1]} employees`;
    }

    // 2. Extract Industry
    let detectedIndustry = "Boutique Agencies";
    let detectedName = "Validation Campaign";
    let detectedSources = "Meta Ads + Google Ads";

    if (p.includes("paid-media") || p.includes("media") || p.includes("advertising") || p.includes("agency")) {
      detectedIndustry = "Small Paid-Media Agencies";
      detectedName = "Agency Reporting Validation";
      detectedSources = "Meta Ads + Google Ads";
    } else if (p.includes("ecommerce") || p.includes("shopify") || p.includes("dtc")) {
      detectedIndustry = "DTC E-Commerce Brands";
      detectedName = "E-Commerce Retention Pilot";
      detectedSources = "Klaviyo + Shopify";
    } else if (p.includes("saas") || p.includes("software")) {
      detectedIndustry = "Early-Stage B2B SaaS";
      detectedName = "B2B SaaS Onboarding Validation";
      detectedSources = "HubSpot + Stripe";
    }

    // 3. Extract Price
    const priceMatch = prompt.match(/\$(\d+)(?:\s*[-–to]+\s*\$?(\d+))?/);
    if (priceMatch) {
      setQPilotPrice(parseInt(priceMatch[1], 10));
    }

    setParsed({
      name: detectedName,
      industry: detectedIndustry,
      headcount: detectedHeadcount,
      workflow: "Recurring operational reporting & data consolidation",
      geography: "US, UK & Remote",
    });

    setQDataSources(detectedSources);
    setStep(2);
  };

  const handleLaunchCampaign = () => {
    soundManager.playSuccess();

    const created = createCustomValidationCampaign({
      name: parsed.name,
      hypothesis: prompt.trim(),
      industry: parsed.industry,
      headcount: parsed.headcount,
      workflow: parsed.workflow,
      geography: parsed.geography,
      data_sources: qDataSources.split("+").map((s) => s.trim()).filter(Boolean),
      pilot_price_usd: qPilotPrice,
      pilot_turnaround_days: qTurnaroundDays,
      discovery_target: qDiscoveryTarget,
      pilot_target: 2,
    });

    toast.success(`Campaign "${created.name}" launched!`, {
      description: "Mission cockpit configured with your targets and sequence.",
    });

    onCampaignCreated(created);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Start a New Validation Campaign
              </h3>
              <p className="text-xs text-muted-foreground">
                Step {step} of 2: {step === 1 ? "Define in Plain English" : "Calibrate & Clarify"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP 1: Plain English Prompt ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Describe your campaign hypothesis in plain English:</span>
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Find out whether [Target Group] has a painful [Workflow] we can solve, then get 1–2 to pay us [$X] to solve it..."
                className="w-full rounded-2xl border border-input bg-background/80 p-4 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-sans resize-none"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
                Or pick a pre-tested playbook template:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PROMPT_SUGGESTIONS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(item.text);
                      setQDataSources(item.sources);
                      soundManager.playClick();
                    }}
                    className="p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 text-left transition-colors space-y-1"
                  >
                    <div className="text-xs font-bold text-foreground truncate">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">{item.industry} ({item.headcount})</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <div className="text-xs text-muted-foreground">
                Next: Atlas will parse the ICP and ask 3 clarifying questions.
              </div>
              <Button
                onClick={handleAnalyzePrompt}
                className="gap-2 bg-primary text-primary-foreground rounded-xl text-xs h-9 px-4 font-semibold"
              >
                Analyze Hypothesis <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Clarifying Questions & Calibration ─────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Parsed Badges Banner */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              <div className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                ✓ Extracted Campaign Parameters
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-background border border-border/40 font-semibold text-foreground">
                  🎯 ICP: {parsed.industry}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-background border border-border/40 font-mono text-muted-foreground">
                  👥 Size: {parsed.headcount}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-background border border-border/40 text-muted-foreground">
                  📍 {parsed.geography}
                </span>
              </div>
            </div>

            {/* 3 Clarifying Questions */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-foreground">
                Calibrate 3 Key Playbook Variables:
              </div>

              {/* Question 1 */}
              <div className="p-4 rounded-2xl border border-border/40 bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <label className="text-xs font-bold text-foreground">
                    1. Which specific data sources or tools are causing the friction?
                  </label>
                </div>
                <Input
                  value={qDataSources}
                  onChange={(e) => setQDataSources(e.target.value)}
                  placeholder="e.g. Meta Ads + Google Ads, or Shopify + Klaviyo"
                  className="rounded-xl h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Defines the exact scope for your minimal Stage 5 Micro-Demo.
                </p>
              </div>

              {/* Question 2 */}
              <div className="p-4 rounded-2xl border border-border/40 bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <label className="text-xs font-bold text-foreground">
                    2. What pilot offer terms do you want to test?
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground">Pilot Investment ($ USD)</span>
                    <Input
                      type="number"
                      value={qPilotPrice}
                      onChange={(e) => setQPilotPrice(parseInt(e.target.value, 10) || 400)}
                      className="rounded-xl h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground">Turnaround Time (Days)</span>
                    <Input
                      type="number"
                      value={qTurnaroundDays}
                      onChange={(e) => setQTurnaroundDays(parseInt(e.target.value, 10) || 7)}
                      className="rounded-xl h-9 text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Playbook recommendation: $300–$500 in 7–10 days with human-in-the-loop approval.
                </p>
              </div>

              {/* Question 3 */}
              <div className="p-4 rounded-2xl border border-border/40 bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <label className="text-xs font-bold text-foreground">
                    3. How many discovery conversations before evaluating the Stage 4 Decision Gate?
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  {[5, 8, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQDiscoveryTarget(num)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                        qDiscoveryTarget === num
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {num} Conversations {num === 8 ? "(Recommended)" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Prevents building software before at least 5 potential buyers confirm the exact pain.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-1.5 text-xs rounded-xl h-9"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Prompt
              </Button>
              <Button
                onClick={handleLaunchCampaign}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Initialize Campaign Hub
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
