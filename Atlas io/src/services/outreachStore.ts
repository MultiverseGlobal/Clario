import { supabase } from "@/integrations/supabase/client";

export interface OutreachRecord {
  id: string;
  campaign_prompt: string;
  company_name: string;
  website?: string;
  recipient_name: string;
  recipient_email: string;
  recipient_role?: string;
  channel: "email" | "linkedin" | "clario_video";
  subject: string;
  body: string;
  status: "sent" | "delivered" | "replied" | "opened" | "waiting_for_clario" | "failed";
  delivery_provider: "Gmail SMTP" | "Resend" | "Manual";
  sent_at: string;
  resend_id?: string;
  clario_video_url?: string;
  notes?: string;
}

const STORAGE_KEY = "atlas_dispatched_outreach_v1";

const SEED_OUTREACH_RECORDS: OutreachRecord[] = [
  {
    id: "outreach-seed-01",
    campaign_prompt: "Target YC seed AI startups scaling SDR pipeline and outbound demos",
    company_name: "Synthex AI",
    website: "https://synthex.ai",
    recipient_name: "Marcus Vance",
    recipient_email: "marcus@synthex.ai",
    recipient_role: "Co-Founder & CEO",
    channel: "email",
    subject: "Question on Synthex AI's outbound SDR ramp",
    body: "Hi Marcus,\n\nSaw what you're building with Synthex AI out of the recent YC cohort. Impressive momentum on the autonomous eval benchmarks.\n\nQuick question: as your team scales outbound past seed stage, are you handling SDR qualification in-house or systematizing pipeline delivery with autonomous tooling?\n\nWould you be open to comparing notes for 10 minutes this Thursday?\n\nBest,\nAtlas Partner",
    status: "replied",
    delivery_provider: "Gmail SMTP",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    notes: "Replied: 'Interested — send over your calendar or deck.'",
  },
  {
    id: "outreach-seed-02",
    campaign_prompt: "Cold outreach to creative design agency founders 10-50 headcount",
    company_name: "Kite Design Works",
    website: "https://kitedesign.co",
    recipient_name: "Elena Rostova",
    recipient_email: "elena@kitedesign.co",
    recipient_role: "Founder & Creative Director",
    channel: "email",
    subject: "Delivery bottlenecks on Kite's multi-client retainers",
    body: "Hi Elena,\n\nNoticed Kite Design Works handles high-touch brand and product retainers. When agencies scale past 15 clients, client onboarding and asset handoffs often create friction between Figma and Notion.\n\nWe built an autonomous system that unifies the intake-to-delivery loop in 48 hours.\n\nRecorded a quick 45s walkthrough of how it works for agencies like yours: https://clario.pseudonyms.dev/v/kite-demo\n\nBest,\nAtlas Partner",
    status: "delivered",
    delivery_provider: "Resend",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    clario_video_url: "https://clario.pseudonyms.dev/v/kite-demo",
  },
  {
    id: "outreach-seed-03",
    campaign_prompt: "Find B2B SaaS teams hiring engineers on Hacker News",
    company_name: "Verve Infrastructure",
    website: "https://verveinfra.dev",
    recipient_name: "David K.",
    recipient_email: "david@verveinfra.dev",
    recipient_role: "VP of Engineering",
    channel: "email",
    subject: "Hiring engineering leads @ Verve Infrastructure (Hacker News thread)",
    body: "Hi David,\n\nSaw your posting on the Hacker News 'Who is Hiring' thread for senior distributed systems engineers.\n\nCurious if technical onboarding latency is currently a bottleneck as you scale the core team this quarter?\n\nBest regards,\nAtlas Partner",
    status: "opened",
    delivery_provider: "Gmail SMTP",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(), // Yesterday
  },
  {
    id: "outreach-seed-04",
    campaign_prompt: "Target founders with manual client onboarding friction",
    company_name: "Beacon Ventures Advisory",
    website: "https://beaconadvisory.io",
    recipient_name: "Arthur Pendelton",
    recipient_email: "arthur@beaconadvisory.io",
    recipient_role: "Managing Director",
    channel: "email",
    subject: "Operational friction in B2B pipeline intake",
    body: "Hi Arthur,\n\nNoticed Beacon Advisory's cross-border advisory work. Quick question on how your team prevents deal briefs and client diligence from getting fragmented across Slack and CRM tabs?\n\nHappy to share how other partners automated this.\n\nBest,\nAtlas Partner",
    status: "sent",
    delivery_provider: "Gmail SMTP",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
];

export function getStoredOutreachRecords(): OutreachRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_OUTREACH_RECORDS));
      return SEED_OUTREACH_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_OUTREACH_RECORDS;
  } catch (err) {
    console.warn("[OutreachStore] Failed to read from localStorage:", err);
    return SEED_OUTREACH_RECORDS;
  }
}

export async function recordOutreachDispatch(
  entry: Omit<OutreachRecord, "id" | "sent_at"> & { id?: string; sent_at?: string }
): Promise<OutreachRecord> {
  const newRecord: OutreachRecord = {
    id: entry.id || `outreach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sent_at: entry.sent_at || new Date().toISOString(),
    campaign_prompt: entry.campaign_prompt,
    company_name: entry.company_name,
    website: entry.website,
    recipient_name: entry.recipient_name,
    recipient_email: entry.recipient_email,
    recipient_role: entry.recipient_role,
    channel: entry.channel || "email",
    subject: entry.subject,
    body: entry.body,
    status: entry.status || "sent",
    delivery_provider: entry.delivery_provider || "Gmail SMTP",
    resend_id: entry.resend_id,
    clario_video_url: entry.clario_video_url,
    notes: entry.notes,
  };

  // 1. Update localStorage
  try {
    const existing = getStoredOutreachRecords();
    const updated = [newRecord, ...existing.filter((r) => r.id !== newRecord.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: newRecord }));
  } catch (err) {
    console.error("[OutreachStore] Error persisting outreach record:", err);
  }

  // 2. Best-effort Supabase sync
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      await (supabase as any).from("atlas_outreach").insert({
        user_id: userData.user.id,
        to_name: newRecord.recipient_name,
        to_email: newRecord.recipient_email,
        subject: newRecord.subject,
        draft_subject: newRecord.subject,
        body: newRecord.body,
        draft_body: newRecord.body,
        status: newRecord.status,
        channel: newRecord.channel,
        type: "cold_email",
        clario_video_url: newRecord.clario_video_url,
        sent_at: newRecord.sent_at,
      });
    }
  } catch (err) {
    // Non-blocking: localStorage acts as source of truth when edge table or auth is offline
    console.debug("[OutreachStore] Supabase remote sync notice:", err);
  }

  return newRecord;
}

export function updateOutreachStatus(
  id: string,
  newStatus: OutreachRecord["status"],
  notes?: string
): OutreachRecord | null {
  try {
    const existing = getStoredOutreachRecords();
    const target = existing.find((r) => r.id === id);
    if (!target) return null;

    target.status = newStatus;
    if (notes !== undefined) target.notes = notes;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: target }));
    return target;
  } catch (err) {
    console.error("[OutreachStore] Failed to update outreach status:", err);
    return null;
  }
}
