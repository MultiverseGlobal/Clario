import { supabase } from "@/integrations/supabase/client";

// ── Campaign Validation Store ──────────────────────────────────────────────
// Purpose: Manages the 9-stage Validation-to-First-Client Campaign engine,
// tracking scoreboard targets, discovery notes, decision gates, and delivery metrics.

export type CampaignStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ScoreboardMetric {
  current: number;
  target: number;
  unit?: string;
}

export interface CampaignScoreboard {
  agencies_researched: ScoreboardMetric;
  personalised_outreaches: ScoreboardMetric;
  discovery_conversations: ScoreboardMetric;
  qualified_conversations: ScoreboardMetric;
  sales_calls: ScoreboardMetric;
  paid_pilots: ScoreboardMetric;
  revenue_usd: ScoreboardMetric;
  case_studies: ScoreboardMetric;
}

export interface SprintMilestone {
  target_agencies: number;
  target_contacted: number;
}

export interface CampaignProspect {
  id: string;
  company: string;
  website: string;
  founder_name: string;
  founder_role: string;
  founder_email?: string;
  founder_linkedin?: string;
  team_size?: string;
  source: string;
  status: "researched" | "contacted" | "discovery" | "demo" | "pilot" | "customer" | "passed";
  notes?: string;
  created_at: string;
  contacted_at?: string;
}

export interface DiscoveryNote {
  id: string;
  prospect_id?: string;
  company: string;
  contact_name: string;
  workflow_description: string;
  who_does_it: string;
  hours_spent: string;
  tools_involved: string[];
  repetitive_friction: string;
  what_breaks: string;
  willingness_to_pay: boolean;
  notes?: string;
  created_at: string;
}

export interface DecisionGate {
  status: "pending" | "strong_repetition" | "different_pain" | "kill";
  notes: string;
  decided_at?: string;
}

export interface MicroDemoSpec {
  status: "not_started" | "building" | "ready";
  inputs: string[];
  workflow_steps: string[];
  output_format: string;
  notes?: string;
}

export interface PilotOffer {
  scope_description: string;
  price_usd: number;
  turnaround_days: number;
  data_sources: string[];
  human_approval: boolean;
}

export interface DeliveryMetric {
  id: string;
  company: string;
  hours_before: number;
  hours_after: number;
  steps_before: number;
  steps_after: number;
  people_before: number;
  people_after: number;
  verified: boolean;
}

export interface CaseStudy {
  id: string;
  company: string;
  headline: string;
  summary: string;
  metric_highlight: string;
  created_at: string;
}

export interface ValidationCampaign {
  id: string;
  name: string;
  type: "validation_to_first_client" | "custom";
  hypothesis: string;
  target_icp: {
    industry: string;
    headcount: string;
    workflow: string;
    geography: string;
  };
  active_stage: CampaignStageId;
  scoreboard: CampaignScoreboard;
  sprint_milestone: SprintMilestone;
  prospects: CampaignProspect[];
  discovery_notes: DiscoveryNote[];
  decision_gate: DecisionGate;
  micro_demo: MicroDemoSpec;
  pilot_offer: PilotOffer;
  delivery_metrics: DeliveryMetric[];
  case_studies: CaseStudy[];
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "atlas_validation_campaign_v1";

// ── Default Campaign Definition based strictly on User's Playbook ──────────
const DEFAULT_CAMPAIGN: ValidationCampaign = {
  id: "agency-reporting-v1",
  name: "Agency Reporting Validation",
  type: "validation_to_first_client",
  hypothesis: "Find out whether small paid-media agencies (5–15 employees) have a painful recurring client reporting workflow we can solve, then get 1–2 of them to pay $300–$500 to solve it.",
  target_icp: {
    industry: "Small Paid-Media & Performance Marketing Agencies",
    headcount: "5–15 employees",
    workflow: "Recurring monthly client reporting across Meta Ads, Google Ads & Analytics",
    geography: "US, UK & Remote",
  },
  active_stage: 1,
  scoreboard: {
    agencies_researched: { current: 3, target: 40 },
    personalised_outreaches: { current: 1, target: 25 },
    discovery_conversations: { current: 0, target: 8 },
    qualified_conversations: { current: 0, target: 10 },
    sales_calls: { current: 0, target: 4 },
    paid_pilots: { current: 0, target: 2 },
    revenue_usd: { current: 0, target: 600, unit: "$" },
    case_studies: { current: 0, target: 1 },
  },
  sprint_milestone: {
    target_agencies: 10,
    target_contacted: 5,
  },
  prospects: [
    {
      id: "prospect-1",
      company: "Aura Growth Lab",
      website: "https://auragrowth.io",
      founder_name: "Marcus Vance",
      founder_role: "Managing Director",
      founder_email: "marcus@auragrowth.io",
      founder_linkedin: "https://linkedin.com/in/marcusvance-example",
      team_size: "8 employees",
      source: "Clutch",
      status: "researched",
      notes: "Pure-play paid social & search agency. Manages 14 client accounts.",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "prospect-2",
      company: "Beacon Performance",
      website: "https://beaconmedia.co",
      founder_name: "Elena Rostova",
      founder_role: "Founder & Lead Strategist",
      founder_email: "elena@beaconmedia.co",
      founder_linkedin: "https://linkedin.com/in/elenarostova-example",
      team_size: "11 employees",
      source: "Clutch",
      status: "contacted",
      notes: "Handles Meta + Google Ads for e-commerce brands.",
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      contacted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "prospect-3",
      company: "Kite & Scale Media",
      website: "https://kitescale.agency",
      founder_name: "David Chen",
      founder_role: "Founder & CEO",
      founder_email: "david@kitescale.agency",
      founder_linkedin: "https://linkedin.com/in/davidchen-example",
      team_size: "6 employees",
      source: "LinkedIn",
      status: "researched",
      notes: "B2B performance marketing boutique.",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  discovery_notes: [],
  decision_gate: {
    status: "pending",
    notes: "Reviewing after 5–10 discovery conversations are logged.",
  },
  micro_demo: {
    status: "not_started",
    inputs: ["Meta Ads API / CSV", "Google Ads API / CSV"],
    workflow_steps: [
      "Auto-collect Meta + Google campaign performance metrics",
      "Structure data into unified ROAS & blended acquisition table",
      "Generate draft performance summary commentary",
      "Human review & approval interface",
      "Export client-ready PDF / Notion report",
    ],
    output_format: "Client-ready executive summary report",
  },
  pilot_offer: {
    scope_description: "One reporting workflow, one report format, 1–2 data sources (Meta + Google), with human approval step.",
    price_usd: 400,
    turnaround_days: 8,
    data_sources: ["Meta Ads", "Google Ads"],
    human_approval: true,
  },
  delivery_metrics: [],
  case_studies: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Store Methods ──────────────────────────────────────────────────────────

export function getActiveCampaign(): ValidationCampaign {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CAMPAIGN));
      return DEFAULT_CAMPAIGN;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CAMPAIGN;
  }
}

export async function syncCampaignToCloud(campaign: ValidationCampaign): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await (supabase as any).from("atlas_validation_campaigns").upsert({
      id: campaign.id || "agency-reporting-v1",
      user_id: userData.user.id,
      name: campaign.name,
      type: campaign.type || "validation_to_first_client",
      hypothesis: campaign.hypothesis,
      target_icp: campaign.target_icp,
      active_stage: campaign.active_stage,
      scoreboard: campaign.scoreboard,
      sprint_milestone: campaign.sprint_milestone,
      prospects: campaign.prospects,
      discovery_notes: campaign.discovery_notes,
      decision_gate: campaign.decision_gate,
      micro_demo: campaign.micro_demo,
      pilot_offer: campaign.pilot_offer,
      delivery_metrics: campaign.delivery_metrics,
      case_studies: campaign.case_studies,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[CampaignValidationStore] Cloud sync error:", err);
  }
}

export async function hydrateCampaignFromCloud(): Promise<ValidationCampaign | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await (supabase as any)
      .from("atlas_validation_campaigns")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const remoteCampaign: ValidationCampaign = {
      id: data.id,
      name: data.name,
      type: data.type || "validation_to_first_client",
      hypothesis: data.hypothesis,
      target_icp: data.target_icp,
      active_stage: data.active_stage,
      scoreboard: data.scoreboard,
      sprint_milestone: data.sprint_milestone,
      prospects: data.prospects || [],
      discovery_notes: data.discovery_notes || [],
      decision_gate: data.decision_gate,
      micro_demo: data.micro_demo,
      pilot_offer: data.pilot_offer,
      delivery_metrics: data.delivery_metrics || [],
      case_studies: data.case_studies || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteCampaign));
    window.dispatchEvent(new CustomEvent("atlas_campaign_updated", { detail: remoteCampaign }));
    return remoteCampaign;
  } catch (err) {
    console.warn("[CampaignValidationStore] Cloud hydration error:", err);
    return null;
  }
}

export function saveActiveCampaign(campaign: ValidationCampaign): void {
  try {
    campaign.updated_at = new Date().toISOString();
    // Recalculate scoreboard stats reactively
    const researchedCount = campaign.prospects.length;
    const contactedCount = campaign.prospects.filter((p) => p.status !== "researched").length;
    const discoveryCount = campaign.discovery_notes.length;
    const pilotsCount = campaign.prospects.filter((p) => p.status === "pilot" || p.status === "customer").length;

    campaign.scoreboard.agencies_researched.current = researchedCount;
    campaign.scoreboard.personalised_outreaches.current = contactedCount;
    campaign.scoreboard.discovery_conversations.current = discoveryCount;
    campaign.scoreboard.paid_pilots.current = pilotsCount;
    campaign.scoreboard.revenue_usd.current = pilotsCount * campaign.pilot_offer.price_usd;
    campaign.scoreboard.case_studies.current = campaign.case_studies.length;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
    window.dispatchEvent(new CustomEvent("atlas_campaign_updated", { detail: campaign }));

    // Non-blocking cloud persistence
    syncCampaignToCloud(campaign).catch((e) => console.warn("[CampaignValidationStore] Background sync failed:", e));
  } catch (err) {
    console.error("[CampaignValidationStore] Failed to save:", err);
  }
}

export function setActiveCampaignStage(stageId: CampaignStageId): ValidationCampaign {
  const c = getActiveCampaign();
  c.active_stage = stageId;
  saveActiveCampaign(c);
  return c;
}

export function addProspectToCampaign(prospect: Omit<CampaignProspect, "id" | "created_at">): ValidationCampaign {
  const c = getActiveCampaign();
  const newProspect: CampaignProspect = {
    ...prospect,
    id: `prospect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  c.prospects.unshift(newProspect);
  saveActiveCampaign(c);
  return c;
}

export function updateProspectStatus(
  prospectId: string,
  status: CampaignProspect["status"],
  notes?: string
): ValidationCampaign {
  const c = getActiveCampaign();
  const p = c.prospects.find((x) => x.id === prospectId);
  if (p) {
    p.status = status;
    if (status === "contacted" && !p.contacted_at) {
      p.contacted_at = new Date().toISOString();
    }
    if (notes !== undefined) p.notes = notes;
    saveActiveCampaign(c);
  }
  return c;
}

export function enrichProspectWithFounder(
  prospectId: string,
  enrichment: Partial<CampaignProspect>
): ValidationCampaign {
  const c = getActiveCampaign();
  const p = c.prospects.find((x) => x.id === prospectId);
  if (p) {
    if (enrichment.founder_name) p.founder_name = enrichment.founder_name;
    if (enrichment.founder_role) p.founder_role = enrichment.founder_role;
    if (enrichment.founder_email) p.founder_email = enrichment.founder_email;
    if (enrichment.founder_linkedin) p.founder_linkedin = enrichment.founder_linkedin;
    if (enrichment.team_size) p.team_size = enrichment.team_size;
    if (enrichment.notes) p.notes = enrichment.notes;
    saveActiveCampaign(c);
  }
  return c;
}

export function addDiscoveryNoteToCampaign(
  note: Omit<DiscoveryNote, "id" | "created_at">
): ValidationCampaign {
  const c = getActiveCampaign();
  const newNote: DiscoveryNote = {
    ...note,
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  c.discovery_notes.unshift(newNote);

  // If linked to a prospect, advance status
  if (note.prospect_id) {
    const p = c.prospects.find((x) => x.id === note.prospect_id);
    if (p && p.status === "contacted") {
      p.status = "discovery";
    }
  }

  saveActiveCampaign(c);
  return c;
}

export function setDecisionGateOutcome(
  status: DecisionGate["status"],
  notes: string
): ValidationCampaign {
  const c = getActiveCampaign();
  c.decision_gate = {
    status,
    notes,
    decided_at: new Date().toISOString(),
  };
  if (status === "strong_repetition") {
    c.active_stage = 5; // Advance to Build Demo
  }
  saveActiveCampaign(c);
  return c;
}

export function addDeliveryMetric(
  metric: Omit<DeliveryMetric, "id">
): ValidationCampaign {
  const c = getActiveCampaign();
  const newMetric: DeliveryMetric = {
    ...metric,
    id: `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  c.delivery_metrics.unshift(newMetric);
  saveActiveCampaign(c);
  return c;
}

export function addCaseStudy(
  caseStudy: Omit<CaseStudy, "id" | "created_at">
): ValidationCampaign {
  const c = getActiveCampaign();
  const newStudy: CaseStudy = {
    ...caseStudy,
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  c.case_studies.unshift(newStudy);
  saveActiveCampaign(c);
  return c;
}

export function resetCampaignToPlaybookDefault(): ValidationCampaign {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CAMPAIGN));
  window.dispatchEvent(new CustomEvent("atlas_campaign_updated", { detail: DEFAULT_CAMPAIGN }));
  return DEFAULT_CAMPAIGN;
}

export interface CreateCampaignParams {
  name: string;
  hypothesis: string;
  industry: string;
  headcount: string;
  workflow: string;
  geography?: string;
  data_sources: string[];
  pilot_price_usd?: number;
  pilot_turnaround_days?: number;
  discovery_target?: number;
  pilot_target?: number;
}

export function createCustomValidationCampaign(params: CreateCampaignParams): ValidationCampaign {
  const price = params.pilot_price_usd || 400;
  const newCampaign: ValidationCampaign = {
    id: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name || "Validation Campaign",
    type: "validation_to_first_client",
    hypothesis: params.hypothesis,
    target_icp: {
      industry: params.industry,
      headcount: params.headcount,
      workflow: params.workflow,
      geography: params.geography || "US, UK & Remote",
    },
    active_stage: 1,
    scoreboard: {
      agencies_researched: { current: 0, target: 40 },
      personalised_outreaches: { current: 0, target: 25 },
      discovery_conversations: { current: 0, target: params.discovery_target || 8 },
      qualified_conversations: { current: 0, target: 10 },
      sales_calls: { current: 0, target: 4 },
      paid_pilots: { current: 0, target: params.pilot_target || 2 },
      revenue_usd: { current: 0, target: (params.pilot_target || 2) * price, unit: "$" },
      case_studies: { current: 0, target: 1 },
    },
    sprint_milestone: {
      target_agencies: 10,
      target_contacted: 5,
    },
    prospects: [],
    discovery_notes: [],
    decision_gate: {
      status: "pending",
      notes: `Reviewing after ${params.discovery_target || 5}–10 discovery conversations are logged.`,
    },
    micro_demo: {
      status: "not_started",
      inputs: params.data_sources.length > 0 ? params.data_sources : ["Client Data Source"],
      workflow_steps: [
        `Ingest raw data from ${params.data_sources.join(" + ") || "primary tools"}`,
        "Structure into clean unified format",
        "Generate draft report or deliverable",
        "Human review & approval checkpoint",
        "Client delivery",
      ],
      output_format: "Verified executive deliverable",
    },
    pilot_offer: {
      scope_description: `One workflow, one format, ${params.data_sources.length || 1} data source(s), with human approval step.`,
      price_usd: price,
      turnaround_days: params.pilot_turnaround_days || 8,
      data_sources: params.data_sources,
      human_approval: true,
    },
    delivery_metrics: [],
    case_studies: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveActiveCampaign(newCampaign);
  return newCampaign;
}

