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

export function getStoredOutreachRecords(): OutreachRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out any legacy fake seed records (outreach-seed-*)
    const clean = parsed.filter((r) => !r.id?.startsWith("outreach-seed-"));
    if (clean.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch (err) {
    console.warn("[OutreachStore] Failed to read from localStorage:", err);
    return [];
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

export function deleteOutreachRecord(id: string): boolean {
  try {
    const existing = getStoredOutreachRecords();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: { id, deleted: true } }));
    return true;
  } catch (err) {
    console.error("[OutreachStore] Failed to delete outreach record:", err);
    return false;
  }
}

export function clearAllOutreachRecords(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("atlas_outreach_updated", { detail: { cleared: true } }));
    return true;
  } catch (err) {
    console.error("[OutreachStore] Failed to clear outreach records:", err);
    return false;
  }
}
