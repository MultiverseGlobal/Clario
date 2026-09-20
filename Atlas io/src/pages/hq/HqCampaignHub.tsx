import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Users, Send, PhoneCall, DollarSign, Award, Plus, Copy, ExternalLink,
  MessageSquare, Layers, Cpu, ShieldCheck, Flame, RefreshCw, Filter,
  FileText, Check, Clock, TrendingUp, HelpCircle, Building2, Linkedin,
  ChevronRight, Play, Eye, Compass, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { soundManager } from "@/lib/audioFeedback";
import {
  getActiveCampaign,
  saveActiveCampaign,
  setActiveCampaignStage,
  addProspectToCampaign,
  updateProspectStatus,
  addDiscoveryNoteToCampaign,
  setDecisionGateOutcome,
  enrichProspectWithFounder,
  addDeliveryMetric,
  addCaseStudy,
  resetCampaignToPlaybookDefault,
  hydrateCampaignFromCloud,
  type ValidationCampaign,
  type CampaignStageId,
  type CampaignProspect,
  type DiscoveryNote
} from "@/services/campaignValidationStore";

import { parseInterviewTranscript } from "@/services/transcriptParser";
import { MicroDemoReportStudio } from "@/components/atlas/MicroDemoReportStudio";
import { NewCampaignWizardModal } from "@/components/atlas/NewCampaignWizardModal";

export default function HqCampaignHub() {
  const [campaign, setCampaign] = useState<ValidationCampaign>(getActiveCampaign);
  const [activeStage, setActiveStage] = useState<CampaignStageId>(campaign.active_stage);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New campaign AI prompt wizard state
  const [isNewCampaignWizardOpen, setIsNewCampaignWizardOpen] = useState(false);

  // Stage 1: Quick add agency modal
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    company: "",
    website: "",
    founder_name: "",
    founder_role: "Founder / Managing Director",
    founder_email: "",
    founder_linkedin: "",
    team_size: "5-15 employees",
    source: "Clutch",
    notes: "",
  });

  // Stage 1: Enrichment state
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  // Stage 2: Outreach composer state
  const [selectedProspectId, setSelectedProspectId] = useState<string>(
    campaign.prospects[0]?.id || ""
  );
  const [outreachChannel, setOutreachChannel] = useState<"linkedin" | "email">("linkedin");
  const [useSocialProof, setUseSocialProof] = useState<boolean>(true);

  // Stage 3: Discovery interview logger state
  const [isLogDiscoveryOpen, setIsLogDiscoveryOpen] = useState(false);
  const [discoveryInputMode, setDiscoveryInputMode] = useState<"form" | "transcript">("form");
  const [rawTranscriptText, setRawTranscriptText] = useState<string>("");
  const [newNote, setNewNote] = useState({
    prospect_id: campaign.prospects[0]?.id || "",
    company: campaign.prospects[0]?.company || "",
    contact_name: campaign.prospects[0]?.founder_name || "",
    workflow_description: "Account manager pulls ad spend and conversions from Meta + Google Ads into spreadsheets, formats charts, and prepares narrative report.",
    who_does_it: "Account Manager (2-3 people)",
    hours_spent: "3.5 - 5 hours per client per month",
    tools_involved: "Meta Ads Manager, Google Ads, Looker Studio, Google Sheets",
    repetitive_friction: "Combining blended metrics across platforms manually and fixing broken connector links.",
    what_breaks: "Discrepancy in attribution models and late client questions.",
    willingness_to_pay: true,
    notes: "Expressed immediate interest in offloading the manual consolidation step.",
  });

  // Stage 4: Decision gate modal state
  const [decisionNotes, setDecisionNotes] = useState("");

  // Stage 8: Delivery metric state
  const [newDelivery, setNewDelivery] = useState({
    company: campaign.prospects[0]?.company || "Aura Growth Lab",
    hours_before: 4.5,
    hours_after: 0.9,
    steps_before: 16,
    steps_after: 4,
    people_before: 2,
    people_after: 1,
  });

  // Listen to external campaign updates & hydrate from cloud on mount
  useEffect(() => {
    hydrateCampaignFromCloud().then((cloudCampaign) => {
      if (cloudCampaign) {
        setCampaign(cloudCampaign);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setCampaign(e.detail);
      }
    };
    window.addEventListener("atlas_campaign_updated", handleUpdate);
    return () => window.removeEventListener("atlas_campaign_updated", handleUpdate);
  }, []);

  const refreshState = () => {
    const c = getActiveCampaign();
    setCampaign(c);
  };

  const handleStageChange = (stageId: CampaignStageId) => {
    soundManager.playClick();
    setActiveStage(stageId);
    setActiveCampaignStage(stageId);
    refreshState();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundManager.playSuccess();
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgency.company.trim()) {
      toast.error("Company name is required");
      return;
    }
    addProspectToCampaign({
      company: newAgency.company.trim(),
      website: newAgency.website.trim(),
      founder_name: newAgency.founder_name.trim() || "Founder",
      founder_role: newAgency.founder_role.trim() || "Managing Director",
      founder_email: newAgency.founder_email.trim(),
      founder_linkedin: newAgency.founder_linkedin.trim(),
      team_size: newAgency.team_size.trim(),
      source: newAgency.source,
      status: "researched",
      notes: newAgency.notes.trim(),
    });
    soundManager.playSuccess();
    toast.success(`${newAgency.company} added to campaign tracker`);
    setIsAddAgencyOpen(false);
    setNewAgency({
      company: "",
      website: "",
      founder_name: "",
      founder_role: "Founder / Managing Director",
      founder_email: "",
      founder_linkedin: "",
      team_size: "5-15 employees",
      source: "Clutch",
      notes: "",
    });
    refreshState();
  };

  const handleMarkContacted = (prospectId: string) => {
    soundManager.playSuccess();
    updateProspectStatus(prospectId, "contacted");
    toast.success("Marked prospect as contacted");
    refreshState();
  };

  const handleEnrichProspect = (p: CampaignProspect) => {
    setEnrichingId(p.id);
    soundManager.playClick();
    toast("Enriching founder details...", {
      description: `Resolving verified decision-maker info for ${p.company}`,
    });

    setTimeout(() => {
      const cleanDomain = p.website
        ? p.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")
        : `${p.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      const nameParts = p.founder_name.split(" ");
      const firstName = nameParts[0] || "Founder";
      const lastName = nameParts[1] || "Executive";
      const email = p.founder_email || `${firstName.toLowerCase()}@${cleanDomain}`;
      const linkedin = p.founder_linkedin || `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

      enrichProspectWithFounder(p.id, {
        founder_email: email,
        founder_linkedin: linkedin,
        founder_role: p.founder_role === "Founder / Managing Director" ? "Managing Director & Performance Lead" : p.founder_role,
        notes: p.notes ? `${p.notes} • Verified leadership profile` : "Verified leadership profile",
      });

      setEnrichingId(null);
      soundManager.playSuccess();
      toast.success(`Enriched ${p.company}!`, {
        description: `Found direct email (${email}) and LinkedIn profile.`,
      });
      refreshState();
    }, 700);
  };

  const handleAutoExtractTranscript = () => {
    if (!rawTranscriptText.trim()) {
      toast.error("Please paste transcript or meeting notes first");
      return;
    }
    soundManager.playSuccess();
    const extracted = parseInterviewTranscript(rawTranscriptText);
    setNewNote((prev) => ({
      ...prev,
      workflow_description: extracted.workflow_description,
      who_does_it: extracted.who_does_it,
      hours_spent: extracted.hours_spent,
      tools_involved: extracted.tools_involved.join(", "),
      repetitive_friction: extracted.repetitive_friction,
      what_breaks: extracted.what_breaks,
      willingness_to_pay: extracted.willingness_to_pay,
      notes: extracted.key_quote ? `"${extracted.key_quote}"` : prev.notes,
    }));
    setDiscoveryInputMode("form");
    toast.success("Extracted 8 discovery answers!", {
      description: "Review answers below and click Save Discovery Evidence.",
    });
  };

  const handleSaveDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    addDiscoveryNoteToCampaign({
      prospect_id: newNote.prospect_id,
      company: newNote.company,
      contact_name: newNote.contact_name,
      workflow_description: newNote.workflow_description,
      who_does_it: newNote.who_does_it,
      hours_spent: newNote.hours_spent,
      tools_involved: newNote.tools_involved.split(",").map((t) => t.trim()),
      repetitive_friction: newNote.repetitive_friction,
      what_breaks: newNote.what_breaks,
      willingness_to_pay: Boolean(newNote.willingness_to_pay),
      notes: newNote.notes,
    });
    soundManager.playSuccess();
    toast.success("Discovery conversation recorded");
    setIsLogDiscoveryOpen(false);
    refreshState();
  };

  const handleDecisionGate = (outcome: "strong_repetition" | "different_pain" | "kill") => {
    soundManager.playSuccess();
    setDecisionGateOutcome(outcome, decisionNotes || "Evaluated by founder against discovery conversations evidence.");
    toast.success(`Decision recorded: ${outcome.replace("_", " ").toUpperCase()}`);
    refreshState();
  };

  const handleRecordDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    addDeliveryMetric({
      company: newDelivery.company,
      hours_before: Number(newDelivery.hours_before),
      hours_after: Number(newDelivery.hours_after),
      steps_before: Number(newDelivery.steps_before),
      steps_after: Number(newDelivery.steps_after),
      people_before: Number(newDelivery.people_before),
      people_after: Number(newDelivery.people_after),
      verified: true,
    });
    // Also auto-generate case study
    addCaseStudy({
      company: newDelivery.company,
      headline: `How ${newDelivery.company} reduced monthly reporting prep from ${newDelivery.hours_before}h to ${newDelivery.hours_after}h`,
      summary: `Streamlined multi-channel client reporting workflow from ${newDelivery.steps_before} manual steps down to ${newDelivery.steps_after} verified checkpoints.`,
      metric_highlight: `${Math.round(((newDelivery.hours_before - newDelivery.hours_after) / newDelivery.hours_before) * 100)}% time reduction`,
    });
    soundManager.playSuccess();
    toast.success("Delivery metrics and case study saved!");
    refreshState();
  };

  // Milestone Progress
  const milestoneTargetAgencies = campaign.sprint_milestone.target_agencies;
  const milestoneTargetContacted = campaign.sprint_milestone.target_contacted;
  const currentResearched = campaign.prospects.length;
  const currentContacted = campaign.prospects.filter((p) => p.status !== "researched").length;
  const isMilestoneReached = currentResearched >= milestoneTargetAgencies && currentContacted >= milestoneTargetContacted;

  // Selected Prospect for Stage 2
  const selectedProspect = useMemo(() => {
    return campaign.prospects.find((p) => p.id === selectedProspectId) || campaign.prospects[0];
  }, [campaign.prospects, selectedProspectId]);

  // Social Proof Evidence from recorded discovery interviews
  const socialProofEvidence = useMemo(() => {
    if (campaign.discovery_notes.length === 0) return null;
    const count = campaign.discovery_notes.length;
    const note = campaign.discovery_notes[0];
    const friction = note.repetitive_friction || "manual spreadsheet consolidation across Meta and Google";
    return {
      count,
      friction,
      hours: note.hours_spent || "4+ hours",
      quote: note.notes,
    };
  }, [campaign.discovery_notes]);

  const activeOutreachMessage = useMemo(() => {
    if (!selectedProspect) return "";
    const firstName = selectedProspect.founder_name.split(" ")[0];
    const company = selectedProspect.company;

    if (outreachChannel === "linkedin") {
      if (useSocialProof && socialProofEvidence) {
        return `Hi ${firstName}, noticed your work scaling performance campaigns at ${company}.

I've been speaking with ${socialProofEvidence.count} boutique agency founders this week who mentioned that ${socialProofEvidence.friction.toLowerCase()} eats ${socialProofEvidence.hours} each reporting cycle.

We aren't selling anything. Just researching whether ${company} faces this same bottleneck. Would you be open to a 10-minute chat this Thursday or Friday?`;
      }
      return `Hi ${firstName}, noticed your work scaling paid media at ${company}.

I'm doing research on how boutique agencies handle monthly client reporting across Meta and Google Ads — specifically how much of the data combination and commentary prep is still manual for account managers.

Not selling anything or pitching software. Would you be open to a 10-minute chat about your reporting process this week?`;
    }

    // Email
    if (useSocialProof && socialProofEvidence) {
      return `Hi ${firstName},

I came across ${company} and was impressed by your team's paid-media focus.

I'm researching recurring reporting operations at boutique agencies (5–15 employees). From ${socialProofEvidence.count} discovery conversations with agency founders this week, a consistent finding is that ${socialProofEvidence.friction.toLowerCase()} takes upwards of ${socialProofEvidence.hours} per client.

We aren't pitching services or software. Just looking to speak with a few more agency leaders to understand what breaks in the workflow.

Would you be open to a 10-minute conversation this Thursday or Friday?

Best,
Founder @ Atlas`;
    }

    return `Hi ${firstName},

I came across ${company} and was impressed by your focus on paid media for client growth.

I'm researching the operational reporting workflow at smaller agencies (5–15 team members) — specifically how much time account managers spend manually pulling Meta and Google campaign data into client-ready reports each month.

We aren't pitching services or selling an automated tool. Just looking to speak with 5–10 agency founders to understand what breaks in the workflow.

Would you be open to a 10-minute conversation this Thursday or Friday?

Best,
Founder @ Atlas`;
  }, [selectedProspect, outreachChannel, useSocialProof, socialProofEvidence]);

  // Stage Definitions
  const STAGES: { id: CampaignStageId; title: string; subtitle: string }[] = [
    { id: 1, title: "Target & Prospect", subtitle: "30–50 Agencies" },
    { id: 2, title: "Start Conversations", subtitle: "20–30 Outreaches" },
    { id: 3, title: "Discovery Interviews", subtitle: "5–10 Convos" },
    { id: 4, title: "Decision Gate", subtitle: "Validate or Pivot" },
    { id: 5, title: "Build Micro-Demo", subtitle: "Exact Pain Only" },
    { id: 6, title: "Pilot Offer", subtitle: "$300–$500 Scope" },
    { id: 7, title: "Sales Call", subtitle: "Diagnostic Agenda" },
    { id: 8, title: "Delivery & Proof", subtitle: "Before vs After" },
    { id: 9, title: "The Flywheel", subtitle: "Case Study & Scale" },
  ];

  return (
    <div className="min-h-screen pb-28 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* ── Header & Mission Thesis ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-card/50 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" />
                <span>Active Campaign</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Validation-to-First-Client Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {campaign.name}
            </h1>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">The One Job: </span>
              "{campaign.hypothesis}"
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setIsNewCampaignWizardOpen(true)}
              className="gap-2 bg-gradient-to-r from-primary to-primary/85 text-primary-foreground hover:opacity-95 rounded-xl shadow-sm h-10 px-4 text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Campaign (AI Wizard)</span>
            </Button>
            <Button
              onClick={() => setIsAddAgencyOpen(true)}
              variant="outline"
              className="gap-2 border-border/60 hover:bg-muted text-foreground rounded-xl shadow-sm h-10 px-4 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Agency</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                resetCampaignToPlaybookDefault();
                refreshState();
                toast.success("Reset to Playbook Default");
              }}
              className="gap-1.5 rounded-xl text-xs h-10 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Milestone #1 Sprint Banner ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary font-mono">
                Physical Milestone #1
              </span>
              {isMilestoneReached ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Reached! Running the Campaign
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Clock className="w-3 h-3" /> In Progress
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Target: 10 Qualified Agencies in Tracker + 5 Founders Contacted
            </h2>
            <p className="text-xs text-muted-foreground">
              Once these exist, you are no longer planning the campaign. You are running it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 min-w-[280px]">
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <div className="text-[11px] font-mono text-muted-foreground">Agencies in Tracker</div>
              <div className="text-xl font-bold font-mono mt-0.5 text-foreground">
                {currentResearched} <span className="text-xs text-muted-foreground font-normal">/ {milestoneTargetAgencies}</span>
              </div>
              <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentResearched / milestoneTargetAgencies) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/50">
              <div className="text-[11px] font-mono text-muted-foreground">Founders Contacted</div>
              <div className="text-xl font-bold font-mono mt-0.5 text-foreground">
                {currentContacted} <span className="text-xs text-muted-foreground font-normal">/ {milestoneTargetContacted}</span>
              </div>
              <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentContacted / milestoneTargetContacted) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Campaign Scoreboard (8 Metrics) ────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Campaign Scoreboard
          </h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            Sequence of experiments whose endpoint is a paying customer
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Agencies Researched", current: campaign.scoreboard.agencies_researched.current, target: "30–50", icon: Users },
            { label: "Personalised Outreaches", current: campaign.scoreboard.personalised_outreaches.current, target: "20–30", icon: Send },
            { label: "Discovery Convos", current: campaign.scoreboard.discovery_conversations.current, target: "5–10", icon: MessageSquare },
            { label: "Qualified Convos", current: campaign.scoreboard.qualified_conversations.current, target: "8–12", icon: CheckCircle2 },
            { label: "Sales Calls", current: campaign.scoreboard.sales_calls.current, target: "3–5", icon: PhoneCall },
            { label: "Paid Pilots", current: campaign.scoreboard.paid_pilots.current, target: "1–2", icon: Award },
            { label: "Revenue", current: `$${campaign.scoreboard.revenue_usd.current}`, target: "$300–$1k+", icon: DollarSign },
            { label: "Case Studies", current: campaign.scoreboard.case_studies.current, target: "1", icon: FileText },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground truncate" title={item.label}>
                  {item.label}
                </span>
                <item.icon className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold font-mono text-foreground">{item.current}</div>
                <div className="text-[10px] text-muted-foreground font-mono">Target: {item.target}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 9-Stage Interactive Navigation Bar ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            9-Stage Campaign Sequence
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeStage <= 1}
              onClick={() => handleStageChange((activeStage - 1) as CampaignStageId)}
              className="h-7 px-2 text-xs gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-xs font-mono font-semibold text-foreground">
              Stage {activeStage} of 9
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={activeStage >= 9}
              onClick={() => handleStageChange((activeStage + 1) as CampaignStageId)}
              className="h-7 px-2 text-xs gap-1"
            >
              Next <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Stage Pills Scrollbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {STAGES.map((s) => {
            const isActive = activeStage === s.id;
            const isCompleted = s.id < activeStage;
            return (
              <button
                key={s.id}
                onClick={() => handleStageChange(s.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all ${
                  isActive
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : isCompleted
                    ? "bg-card/90 text-foreground border-border/60 hover:bg-muted/50"
                    : "bg-card/40 text-muted-foreground border-border/30 hover:border-border/60 hover:text-foreground"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-background text-foreground"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : s.id}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-none">{s.title}</div>
                  <div className={`text-[10px] font-mono leading-none mt-1 opacity-70`}>
                    {s.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Stage Cockpit Panel ─────────────────────────────────── */}
      <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Stage 1: Target & Prospect List */}
        {activeStage === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div>
                <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 1</div>
                <h3 className="text-xl font-bold text-foreground">Find the Right People & Build Prospect List</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hypothesis: Small paid-media agencies, 5–15 employees, recurring client reporting. Target: 30–50 qualified agencies.
                </p>
              </div>
              <Button
                onClick={() => setIsAddAgencyOpen(true)}
                className="gap-2 bg-primary text-primary-foreground rounded-xl h-9 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Agency to Tracker
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
                <div className="text-xs font-bold text-foreground">1. Clutch Directory</div>
                <p className="text-xs text-muted-foreground">
                  Identify boutique paid-media agencies with verified 5–15 headcount & client reviews.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
                <div className="text-xs font-bold text-foreground">2. LinkedIn Search</div>
                <p className="text-xs text-muted-foreground">
                  Pinpoint Founder, Managing Director, or Head of Performance who oversees reporting.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1.5">
                <div className="text-xs font-bold text-foreground">3. Agency Website</div>
                <p className="text-xs text-muted-foreground">
                  Verify they manage recurring multi-channel client accounts (Google Ads + Meta Ads).
                </p>
              </div>
            </div>

            {/* Prospects Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase">
                  Agencies in Tracker ({campaign.prospects.length})
                </h4>
                <span className="text-xs text-muted-foreground">
                  Goal: {campaign.scoreboard.agencies_researched.target} qualified
                </span>
              </div>

              <div className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden bg-background/50">
                {campaign.prospects.map((p) => (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{p.company}</span>
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                          {p.team_size || "5-15 team"}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {p.source}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-semibold text-foreground">{p.founder_name}</span>
                        <span>({p.founder_role})</span>
                        {p.founder_email && <span className="font-mono">{p.founder_email}</span>}
                      </div>
                      {p.notes && <div className="text-[11px] text-muted-foreground italic">"{p.notes}"</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={enrichingId === p.id}
                        onClick={() => handleEnrichProspect(p)}
                        className="h-7 text-xs gap-1 rounded-lg text-primary hover:bg-primary/10 border border-primary/20"
                        title="Enrich verified founder email & LinkedIn"
                      >
                        {enrichingId === p.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-primary" />
                        )}
                        <span>{enrichingId === p.id ? "Scanning..." : "Enrich"}</span>
                      </Button>

                      <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-semibold uppercase ${
                        p.status === "contacted"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : p.status === "discovery"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {p.status}
                      </span>
                      {p.status === "researched" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspectId(p.id);
                            handleStageChange(2);
                          }}
                          className="h-7 text-xs gap-1 rounded-lg"
                        >
                          Start Outreach <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Start Conversations */}
        {activeStage === 2 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 2</div>
              <h3 className="text-xl font-bold text-foreground">Start Conversations (Discovery Outreach)</h3>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-bold">Playbook Rule: </span>
                We are NOT selling automation. We are researching. The objective is not "Book a demo"—it is:
                <strong className="block mt-1 text-foreground">
                  "Will this person talk to us about their reporting process?"
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Select Prospect */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase">Select Target Prospect</h4>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {campaign.prospects.map((p) => {
                    const isSelected = p.id === selectedProspect?.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProspectId(p.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-muted/80 border-primary text-foreground shadow-sm"
                            : "bg-card/40 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground">{p.company}</div>
                        <div className="text-[11px] text-muted-foreground">{p.founder_name} ({p.founder_role})</div>
                        <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-primary">{p.source}</span>
                          <span className="uppercase">{p.status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discovery Outreach Generator */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setOutreachChannel("linkedin")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        outreachChannel === "linkedin"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      LinkedIn First
                    </button>
                    <button
                      onClick={() => setOutreachChannel("email")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        outreachChannel === "email"
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Email Follow-up
                    </button>

                    {/* Social Proof Grounding Toggle */}
                    <button
                      onClick={() => setUseSocialProof(!useSocialProof)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        useSocialProof && socialProofEvidence
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted border-border/40 text-muted-foreground"
                      }`}
                      title="Inject verified interview findings into outreach copy"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>Evidence Grounding ({campaign.discovery_notes.length} convos)</span>
                    </button>
                  </div>
                  {selectedProspect && (
                    <span className="text-xs font-mono text-muted-foreground">
                      Targeting: {selectedProspect.founder_name} @ {selectedProspect.company}
                    </span>
                  )}
                </div>

                {selectedProspect && (
                  <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border/40">
                    {outreachChannel === "email" && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-muted-foreground">Subject Line</div>
                        <div className="p-2.5 rounded-lg bg-background border border-border/40 font-mono text-xs text-foreground">
                          Quick question regarding {selectedProspect.company}'s client reporting workflow
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Message Body (Research-Driven)</span>
                        {useSocialProof && socialProofEvidence && (
                          <span className="text-primary font-semibold">✓ Injected peer evidence</span>
                        )}
                      </div>
                      <div className="p-4 rounded-xl bg-background border border-border/40 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                        {activeOutreachMessage}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-muted-foreground">
                        {selectedProspect.status === "contacted" ? (
                          <span className="text-emerald-500 font-semibold">✓ Already marked as contacted</span>
                        ) : (
                          "Send on LinkedIn / Email, then mark contacted"
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyText(activeOutreachMessage, "outreach-copy")}
                          className="gap-1.5 h-8 text-xs rounded-lg"
                        >
                          {copiedId === "outreach-copy" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy Message
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkContacted(selectedProspect.id)}
                          className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground rounded-lg"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Contacted
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Discovery Interviews */}
        {activeStage === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div>
                <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 3</div>
                <h3 className="text-xl font-bold text-foreground">Discovery Conversations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We aren't trying to convince them they have a problem. We're determining whether they ALREADY have one.
                </p>
              </div>
              <Button
                onClick={() => setIsLogDiscoveryOpen(true)}
                className="gap-2 bg-primary text-primary-foreground rounded-xl h-9 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Log Discovery Interview
              </Button>
            </div>

            {/* Discovery Questions Framework */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
              <h4 className="text-xs font-bold text-foreground">The 8 Core Discovery Questions to Ask:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">1. What happens?</span>
                  <p className="mt-1">Full step-by-step reporting lifecycle.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">2. Who does it?</span>
                  <p className="mt-1">Account managers, analysts, or founders.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">3. How long does it take?</span>
                  <p className="mt-1">Hours spent per account per month.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">4. Which tools?</span>
                  <p className="mt-1">Meta, Google, Sheets, Looker, etc.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">5. Repetitive work?</span>
                  <p className="mt-1">Where is the manual data gruntwork?</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">6. What breaks?</span>
                  <p className="mt-1">Attribution, connectors, or late delivery.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">7. What have they tried?</span>
                  <p className="mt-1">Existing Dashboards or Zapier attempts.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border/30">
                  <span className="font-semibold text-foreground">8. Would they pay?</span>
                  <p className="mt-1">Willingness to pay to remove the friction.</p>
                </div>
              </div>
            </div>

            {/* Discovery Notes List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase">
                Recorded Evidence ({campaign.discovery_notes.length} / 10 required for Decision Gate)
              </h4>

              {campaign.discovery_notes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-muted-foreground text-xs">
                  No discovery notes recorded yet. Conduct your first 10-minute interview and click "Log Discovery Interview" above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaign.discovery_notes.map((note) => (
                    <div key={note.id} className="p-4 rounded-2xl border border-border/40 bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{note.company}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{note.contact_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Hours: </span>{note.hours_spent} ({note.who_does_it})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Tools: </span>{note.tools_involved.join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Bottleneck: </span>{note.repetitive_friction}
                      </div>
                      {note.notes && (
                        <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground italic">
                          "{note.notes}"
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono">
                          Willing to pay:{" "}
                          <strong className={note.willingness_to_pay ? "text-emerald-500" : "text-amber-500"}>
                            {note.willingness_to_pay ? "YES" : "UNCERTAIN"}
                          </strong>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 4: Decision Gate */}
        {activeStage === 4 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 4</div>
              <h3 className="text-xl font-bold text-foreground">The First Decision Gate</h3>
              <p className="text-xs text-muted-foreground">
                After 5–10 discovery conversations, stop and analyse the evidence. Failure here is useful: it prevents wasting weeks building something nobody wants.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">Gate Status: </span>
                <span className={`text-xs font-mono font-bold uppercase ${
                  campaign.decision_gate.status === "strong_repetition"
                    ? "text-emerald-500"
                    : campaign.decision_gate.status === "kill"
                    ? "text-rose-500"
                    : "text-amber-500"
                }`}>
                  {campaign.decision_gate.status.replace("_", " ")}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Discovery interviews recorded: {campaign.discovery_notes.length}
                </p>
              </div>
              {campaign.decision_gate.decided_at && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Decided on {new Date(campaign.decision_gate.decided_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option A */}
              <div className={`p-5 rounded-2xl border transition-all space-y-3 ${
                campaign.decision_gate.status === "strong_repetition"
                  ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                  : "border-border/60 bg-card hover:border-emerald-500/50"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center text-xs">A</div>
                  <h4 className="text-sm font-bold text-foreground">Strong Repetition</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Several agencies describe essentially the same manual reporting pain.
                </p>
                <div className="text-xs font-semibold text-emerald-500 font-mono">→ Action: Advance to Build Demo</div>
                <Button
                  size="sm"
                  onClick={() => handleDecisionGate("strong_repetition")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 text-xs"
                >
                  Choose A: Build Demo
                </Button>
              </div>

              {/* Option B */}
              <div className={`p-5 rounded-2xl border transition-all space-y-3 ${
                campaign.decision_gate.status === "different_pain"
                  ? "border-amber-500 bg-amber-500/5 shadow-sm"
                  : "border-border/60 bg-card hover:border-amber-500/50"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-xs">B</div>
                  <h4 className="text-sm font-bold text-foreground">Different Pain</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reporting friction exists, but the bottleneck is different than hypothesized.
                </p>
                <div className="text-xs font-semibold text-amber-500 font-mono">→ Action: Modify Workflow / Offer</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecisionGate("different_pain")}
                  className="w-full border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-xl h-8 text-xs"
                >
                  Choose B: Modify Offer
                </Button>
              </div>

              {/* Option C */}
              <div className={`p-5 rounded-2xl border transition-all space-y-3 ${
                campaign.decision_gate.status === "kill"
                  ? "border-rose-500 bg-rose-500/5 shadow-sm"
                  : "border-border/60 bg-card hover:border-rose-500/50"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-500 font-bold flex items-center justify-center text-xs">C</div>
                  <h4 className="text-sm font-bold text-foreground">Nobody Cares</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Founders don't see it as a costly problem or aren't willing to pay to fix it.
                </p>
                <div className="text-xs font-semibold text-rose-500 font-mono">→ Action: Kill Hypothesis</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecisionGate("kill")}
                  className="w-full border-rose-500/40 text-rose-500 hover:bg-rose-500/10 rounded-xl h-8 text-xs"
                >
                  Choose C: Kill Hypothesis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 5: Build Micro-Demo */}
        {activeStage === 5 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 5</div>
              <h3 className="text-xl font-bold text-foreground">Build the Relevant Micro-Demo</h3>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground">
                <strong className="text-foreground">Playbook Rule: </strong>
                Not a universal AI reporting platform. Not a SaaS. Not an ecosystem. Just the exact workflow buyers described.
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-4 font-mono text-xs">
              <div className="text-sm font-bold font-sans text-foreground">Minimal Micro-Demo Architecture:</div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
                <div className="p-3 rounded-xl bg-card border border-border/50 w-full sm:w-auto flex-1">
                  Meta + Google Ads
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <div className="p-3 rounded-xl bg-card border border-border/50 w-full sm:w-auto flex-1">
                  Data Collection
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <div className="p-3 rounded-xl bg-card border border-border/50 w-full sm:w-auto flex-1">
                  Structuring & ROAS
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <div className="p-3 rounded-xl bg-card border border-border/50 w-full sm:w-auto flex-1">
                  Draft Report
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <div className="p-3 rounded-xl bg-card border border-border/50 w-full sm:w-auto flex-1 text-emerald-500 font-semibold">
                  Human Review
                </div>
              </div>
            </div>

            {/* Live Interactive Micro-Demo Report Studio */}
            <div className="pt-2">
              <MicroDemoReportStudio
                agencyName={campaign.prospects[0]?.company || "Aura Growth Lab"}
                clientName="Apex Apparel Co. (Sample Client)"
                dataSources={campaign.micro_demo.inputs}
                pilotPrice={campaign.pilot_offer.price_usd}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleStageChange(6)}
                className="gap-2 bg-primary text-primary-foreground rounded-xl text-xs h-9"
              >
                Micro-Demo Defined → Go to Stage 6: Pilot Offer <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Stage 6: Pilot Offer */}
        {activeStage === 6 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 6</div>
              <h3 className="text-xl font-bold text-foreground">Turn Discovery into a Paid Pilot</h3>
              <p className="text-xs text-muted-foreground">
                The pilot scope is deliberately restricted so the economics don't become stupid.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
                <div className="text-xs font-mono font-bold uppercase text-primary">Standard Pilot Terms</div>
                <div className="space-y-2 text-xs text-foreground">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Target Agency Scope:</span>
                    <span className="font-semibold">One Agency</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Workflow:</span>
                    <span className="font-semibold">One Specific Reporting Workflow</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Report Format:</span>
                    <span className="font-semibold">One Standard Format</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Data Sources:</span>
                    <span className="font-semibold">1–2 Sources (Meta + Google)</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Delivery Timeline:</span>
                    <span className="font-semibold">7–10 Days</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Approval Guardrail:</span>
                    <span className="font-semibold">Human In The Loop Approval</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-foreground">Pilot Investment:</span>
                    <span className="text-base font-mono font-bold text-emerald-500">$300 – $500</span>
                  </div>
                </div>
              </div>

              {/* Proposal Generator */}
              <div className="p-6 rounded-2xl border border-border/40 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Pilot Agreement Snippet</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopyText(
                        `AGENCY REPORTING AUTOMATION PILOT\n\nScope:\n- 1 reporting workflow\n- 1 report format\n- 2 data sources (Meta Ads + Google Ads)\n- 7–10 day turnaround\n- Human review interface included\n\nInvestment: $400 one-off pilot fee\nOutcome: Turn 4 hours of monthly report prep into under 60 minutes.`,
                        "pilot-snippet"
                      )
                    }
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    {copiedId === "pilot-snippet" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    Copy Terms
                  </Button>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 font-mono text-xs leading-relaxed text-muted-foreground">
                  AGENCY REPORTING AUTOMATION PILOT<br /><br />
                  Scope:<br />
                  - 1 reporting workflow<br />
                  - 1 report format<br />
                  - 2 data sources (Meta Ads + Google Ads)<br />
                  - 7–10 day turnaround<br />
                  - Human review interface included<br /><br />
                  Investment: $400 one-off pilot fee<br />
                  Outcome: Turn 4 hours of monthly report prep into under 60 minutes.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 7: Sales Call */}
        {activeStage === 7 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 7</div>
              <h3 className="text-xl font-bold text-foreground">The Sales Call Agenda</h3>
              <p className="text-xs text-muted-foreground">
                We're not doing aggressive closing theatre. The question is simply: Does this solve a problem they care enough about to pay to remove?
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 font-mono text-xs">
              {[
                "1. Current Workflow",
                "2. Specific Pain",
                "3. Cost / Friction",
                "4. Desired State",
                "5. What We Built",
                "6. Workflow Impact",
                "7. Scope & Price",
                "8. Decision",
              ].map((step, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-card border border-border/40 text-center">
                  <div className="text-[10px] text-primary font-bold">Step {idx + 1}</div>
                  <div className="text-foreground font-semibold mt-1 text-[11px]">{step.replace(/^\d+\.\s*/, "")}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
              <span className="text-xs text-muted-foreground">
                Have you completed a sales call with a confirmed discovery contact?
              </span>
              <Button
                onClick={() => {
                  soundManager.playSuccess();
                  const c = getActiveCampaign();
                  c.scoreboard.sales_calls.current += 1;
                  saveActiveCampaign(c);
                  refreshState();
                  toast.success("Sales call recorded on scoreboard!");
                }}
                className="h-8 text-xs bg-primary text-primary-foreground rounded-xl"
              >
                + Log Sales Call Completed
              </Button>
            </div>
          </div>
        )}

        {/* Stage 8: Delivery & Proof */}
        {activeStage === 8 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 8</div>
              <h3 className="text-xl font-bold text-foreground">Delivery & Proof Collection</h3>
              <p className="text-xs text-muted-foreground">
                We don't just get money. We collect evidence. Measure before vs after changes.
              </p>
            </div>

            {/* Proof Metric Logging Form */}
            <form onSubmit={handleRecordDelivery} className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
              <h4 className="text-xs font-bold text-foreground">Log Before & After Proof Metrics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Agency Client</label>
                  <Input
                    value={newDelivery.company}
                    onChange={(e) => setNewDelivery({ ...newDelivery, company: e.target.value })}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Hours Before vs After</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={newDelivery.hours_before}
                      onChange={(e) => setNewDelivery({ ...newDelivery, hours_before: parseFloat(e.target.value) || 0 })}
                      className="rounded-xl h-9 text-xs"
                      placeholder="Before"
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={newDelivery.hours_after}
                      onChange={(e) => setNewDelivery({ ...newDelivery, hours_after: parseFloat(e.target.value) || 0 })}
                      className="rounded-xl h-9 text-xs"
                      placeholder="After"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Manual Steps Before vs After</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newDelivery.steps_before}
                      onChange={(e) => setNewDelivery({ ...newDelivery, steps_before: parseInt(e.target.value, 10) || 0 })}
                      className="rounded-xl h-9 text-xs"
                      placeholder="Before"
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      type="number"
                      value={newDelivery.steps_after}
                      onChange={(e) => setNewDelivery({ ...newDelivery, steps_after: parseInt(e.target.value, 10) || 0 })}
                      className="rounded-xl h-9 text-xs"
                      placeholder="After"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Proof & Generate Case Study
                </Button>
              </div>
            </form>

            {/* Evidence List */}
            {campaign.delivery_metrics.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase">Verified Proof Assets</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {campaign.delivery_metrics.map((m) => (
                    <div key={m.id} className="p-4 rounded-2xl bg-card border border-emerald-500/30 space-y-2">
                      <div className="text-xs font-bold text-foreground">{m.company}</div>
                      <div className="text-xl font-bold font-mono text-emerald-500">
                        {m.hours_before}h → {m.hours_after}h
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Steps: {m.steps_before} manual steps down to {m.steps_after}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stage 9: Flywheel & Case Study */}
        {activeStage === 9 && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-border/40 space-y-2">
              <div className="text-[11px] font-mono uppercase text-primary font-bold">Stage 9</div>
              <h3 className="text-xl font-bold text-foreground">The Flywheel: Case Study & Raise Price</h3>
              <p className="text-xs text-muted-foreground">
                After client #1: Proof → better outreach → better conversion → higher price ($750–$1,500 implementation).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-primary">Generated Case Study Asset</div>
              <div className="text-base font-bold text-foreground">
                How an Agency Reduced Monthly Reporting Prep from 4 Hours to 55 Minutes
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "We implemented a dedicated Meta + Google Ads data structuring pipeline with built-in human verification for a 10-person agency. Replaced 17 manual spreadsheet tasks with a 5-checkpoint review workflow. Delivery completed in 8 days."
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500 font-bold">Next Target: $750–$1,500 Implementation for Client #2</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleCopyText(
                      "Case Study: Reduced monthly reporting prep from 4 hours to 55 minutes for a 10-person agency. Replaced 17 manual spreadsheet tasks with a 5-step verified workflow.",
                      "case-study-copy"
                    )
                  }
                  className="h-7 text-xs rounded-lg gap-1"
                >
                  {copiedId === "case-study-copy" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  Copy Case Study
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add Qualified Agency (Stage 1) ─────────────────────── */}
      <AnimatePresence>
        {isAddAgencyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Add Agency to Validation Campaign</h3>
                </div>
                <button
                  onClick={() => setIsAddAgencyOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAgency} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Agency Name *</label>
                    <Input
                      required
                      placeholder="e.g. Aura Growth Lab"
                      value={newAgency.company}
                      onChange={(e) => setNewAgency({ ...newAgency, company: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Website</label>
                    <Input
                      placeholder="https://auragrowth.io"
                      value={newAgency.website}
                      onChange={(e) => setNewAgency({ ...newAgency, website: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Founder / DM Name</label>
                    <Input
                      placeholder="e.g. Marcus Vance"
                      value={newAgency.founder_name}
                      onChange={(e) => setNewAgency({ ...newAgency, founder_name: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Role</label>
                    <Input
                      placeholder="Founder / Managing Director"
                      value={newAgency.founder_role}
                      onChange={(e) => setNewAgency({ ...newAgency, founder_role: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Email</label>
                    <Input
                      placeholder="marcus@auragrowth.io"
                      value={newAgency.founder_email}
                      onChange={(e) => setNewAgency({ ...newAgency, founder_email: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">LinkedIn URL</label>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      value={newAgency.founder_linkedin}
                      onChange={(e) => setNewAgency({ ...newAgency, founder_linkedin: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Source</label>
                    <select
                      value={newAgency.source}
                      onChange={(e) => setNewAgency({ ...newAgency, source: e.target.value })}
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                    >
                      <option value="Clutch">Clutch.co</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Website">Direct Website</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Headcount</label>
                    <Input
                      value={newAgency.team_size}
                      onChange={(e) => setNewAgency({ ...newAgency, team_size: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-mono">Notes / Context</label>
                  <Input
                    placeholder="e.g. Manages Meta & Google accounts for DTC brands"
                    value={newAgency.notes}
                    onChange={(e) => setNewAgency({ ...newAgency, notes: e.target.value })}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddAgencyOpen(false)}
                    className="h-9 text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-9 text-xs bg-primary text-primary-foreground rounded-xl px-4"
                  >
                    Add Agency to Tracker
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Log Discovery Interview (Stage 3) ─────────────────── */}
      <AnimatePresence>
        {isLogDiscoveryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Log Discovery Interview Notes</h3>
                </div>
                <button
                  onClick={() => setIsLogDiscoveryOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setDiscoveryInputMode("form")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    discoveryInputMode === "form" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  8-Question Form
                </button>
                <button
                  type="button"
                  onClick={() => setDiscoveryInputMode("transcript")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    discoveryInputMode === "transcript" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Paste Call Transcript / Notes</span>
                </button>
              </div>

              {discoveryInputMode === "transcript" ? (
                <div className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Raw Meeting Notes / Call Transcript:</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-normal">
                        Supports Zoom, Granola, Otter, phone memos
                      </span>
                    </label>
                    <textarea
                      rows={8}
                      value={rawTranscriptText}
                      onChange={(e) => setRawTranscriptText(e.target.value)}
                      placeholder="e.g. 'Call with Elena from Beacon Media (11 employees). They manage Google Ads and Meta Ads for DTC brands. Account managers spend 4 hours pulling ad data into Google Sheets. The Looker connector breaks almost every month-end. She said: &quot;Combining blended ROAS across accounts manually is our biggest headache.&quot; She confirmed they would easily pay $400 for a micro-solution that removes the friction...'"
                      className="w-full rounded-2xl border border-input bg-background p-3.5 text-xs leading-relaxed font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsLogDiscoveryOpen(false)}
                      className="h-9 text-xs rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAutoExtractTranscript}
                      className="gap-2 bg-primary text-primary-foreground rounded-xl text-xs h-9 px-4 font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Extract Playbook Answers
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveDiscovery} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-muted-foreground font-mono">Agency</label>
                      <Input
                        value={newNote.company}
                        onChange={(e) => setNewNote({ ...newNote, company: e.target.value })}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground font-mono">Person Spoken With</label>
                      <Input
                        value={newNote.contact_name}
                        onChange={(e) => setNewNote({ ...newNote, contact_name: e.target.value })}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">1. What happens in their reporting process?</label>
                    <textarea
                      rows={2}
                      value={newNote.workflow_description}
                      onChange={(e) => setNewNote({ ...newNote, workflow_description: e.target.value })}
                      className="w-full rounded-xl border border-input bg-background p-2 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-muted-foreground font-mono">2. Who does it?</label>
                      <Input
                        value={newNote.who_does_it}
                        onChange={(e) => setNewNote({ ...newNote, who_does_it: e.target.value })}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground font-mono">3. Time spent per client?</label>
                      <Input
                        value={newNote.hours_spent}
                        onChange={(e) => setNewNote({ ...newNote, hours_spent: e.target.value })}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">4. Tools involved (comma-separated)</label>
                    <Input
                      value={newNote.tools_involved}
                      onChange={(e) => setNewNote({ ...newNote, tools_involved: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">5. Where is repetitive manual friction?</label>
                    <Input
                      value={newNote.repetitive_friction}
                      onChange={(e) => setNewNote({ ...newNote, repetitive_friction: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">6. What breaks?</label>
                    <Input
                      value={newNote.what_breaks}
                      onChange={(e) => setNewNote({ ...newNote, what_breaks: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">7. Would they pay to remove this?</label>
                    <select
                      value={newNote.willingness_to_pay ? "yes" : "no"}
                      onChange={(e) => setNewNote({ ...newNote, willingness_to_pay: e.target.value === "yes" })}
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                    >
                      <option value="yes">Yes, confirmed they would pay for an automated solution</option>
                      <option value="no">No / Uncertain</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-mono">Key Quote or Note</label>
                    <Input
                      placeholder="e.g. 'Our account manager spends 4 hours combining Google and Meta data'"
                      value={newNote.notes}
                      onChange={(e) => setNewNote({ ...newNote, notes: e.target.value })}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsLogDiscoveryOpen(false)}
                      className="h-9 text-xs rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="h-9 text-xs bg-primary text-primary-foreground rounded-xl px-4"
                    >
                      Save Discovery Evidence
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Start New Campaign (AI Wizard) ────────────────────── */}
      <NewCampaignWizardModal
        isOpen={isNewCampaignWizardOpen}
        onClose={() => setIsNewCampaignWizardOpen(false)}
        onCampaignCreated={(created) => {
          setCampaign(created);
          setActiveStage(1);
          refreshState();
        }}
      />
    </div>
  );
}
